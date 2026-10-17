import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const testBase = path.join(here, '..', '.tmp-test')
await mkdir(testBase, { recursive: true })
const tmp = await mkdtemp(path.join(testBase, path.sep)) // eslint-disable-line

process.env.DATA_DIR = path.join(tmp, 'data')
process.env.UPLOADS_DIR = path.join(tmp, 'uploads')
process.env.CLIENT_DIST = path.join(tmp, 'no-client')

const { buildServer } = await import('../src/index.js')

const BOUNDARY = '----videoPlayNpmBoundary'
const JSON_HEADERS = { 'content-type': 'application/json' }

function buildMultipart({ title, description, filename, contentType, content }) {
  const chunks = []
  const field = (name, value) =>
    chunks.push(
      Buffer.from(
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
      )
    )
  if (title !== undefined) field('title', title)
  if (description !== undefined) field('description', description)
  chunks.push(
    Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`
    )
  )
  chunks.push(Buffer.from(content))
  chunks.push(Buffer.from(`\r\n--${BOUNDARY}--\r\n`))
  return Buffer.concat(chunks)
}

function cookieHeader(res) {
  return (res.cookies || []).map((c) => `${c.name}=${c.value}`).join('; ')
}

async function registerUser(app, username = 'tester', password = 'secret123') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    headers: JSON_HEADERS,
    payload: { username, password }
  })
  assert.equal(res.statusCode, 201)
  return cookieHeader(res)
}

const mp4Bytes = Buffer.alloc(4096, 7)

test('health check responds ok', async () => {
  const app = await buildServer()
  try {
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.equal(body.status, 'ok')
    assert.equal(body.service, 'video-play-npm')
  } finally {
    await app.close()
  }
})

test('register, login, me, and logout lifecycle', async () => {
  const app = await buildServer()
  try {
    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: JSON_HEADERS,
      payload: { username: 'alice', email: 'alice@example.com', password: 'secret123' }
    })
    assert.equal(register.statusCode, 201)
    assert.equal(register.json().data.username, 'alice')
    assert.equal(register.json().data.password, undefined)
    assert.equal(register.json().data.password_hash, undefined)
    let cookie = cookieHeader(register)

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie }
    })
    assert.equal(me.statusCode, 200)
    assert.equal(me.json().data.username, 'alice')

    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie }
    })
    assert.equal(logout.statusCode, 200)

    const afterLogout = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie }
    })
    assert.equal(afterLogout.statusCode, 401)

    const badLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: JSON_HEADERS,
      payload: { username: 'alice', password: 'wrong-password' }
    })
    assert.equal(badLogin.statusCode, 401)

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: JSON_HEADERS,
      payload: { username: 'alice', password: 'secret123' }
    })
    assert.equal(login.statusCode, 200)
    cookie = cookieHeader(login)

    const meAgain = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie }
    })
    assert.equal(meAgain.statusCode, 200)

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      headers: JSON_HEADERS,
      payload: { username: 'alice', password: 'secret123' }
    })
    assert.equal(duplicate.statusCode, 409)
  } finally {
    await app.close()
  }
})

test('upload without auth is rejected with 401', async () => {
  const app = await buildServer()
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/api/videos',
      headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
      payload: buildMultipart({
        title: 'Anonymous',
        filename: 'anon.mp4',
        contentType: 'video/mp4',
        content: mp4Bytes
      })
    })
    assert.equal(res.statusCode, 401)
  } finally {
    await app.close()
  }
})

test('full upload, list, stream, view, and delete lifecycle', async () => {
  const app = await buildServer()
  try {
    const cookie = await registerUser(app, 'creator')

    const empty = await app.inject({ method: 'GET', url: '/api/videos' })
    assert.equal(empty.statusCode, 200)
    const beforeIds = empty.json().data.map((v) => v.id)

    const upload = await app.inject({
      method: 'POST',
      url: '/api/videos',
      headers: {
        'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
        cookie
      },
      payload: buildMultipart({
        title: 'Demo clip',
        description: 'Integration test',
        filename: 'clip.mp4',
        contentType: 'video/mp4',
        content: mp4Bytes
      })
    })
    assert.equal(upload.statusCode, 201)
    const created = upload.json().data
    assert.equal(created.title, 'Demo clip')
    assert.equal(created.mimeType, 'video/mp4')
    assert.equal(created.size, mp4Bytes.length)
    assert.equal(created.views, 0)

    const list = await app.inject({ method: 'GET', url: '/api/videos' })
    const listIds = list.json().data.map((v) => v.id)
    assert.ok(listIds.includes(created.id))

    const full = await app.inject({ method: 'GET', url: `/api/videos/${created.id}/stream` })
    assert.equal(full.statusCode, 200)
    assert.equal(Number(full.headers['content-length']), mp4Bytes.length)
    assert.equal(full.headers['accept-ranges'], 'bytes')

    const ranged = await app.inject({
      method: 'GET',
      url: `/api/videos/${created.id}/stream`,
      headers: { range: 'bytes=0-99' }
    })
    assert.equal(ranged.statusCode, 206)
    assert.equal(ranged.headers['content-range'], `bytes 0-99/${mp4Bytes.length}`)
    assert.equal(Number(ranged.headers['content-length']), 100)

    const view = await app.inject({ method: 'POST', url: `/api/videos/${created.id}/view` })
    assert.equal(view.json().data.views, 1)

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/videos/${created.id}`,
      headers: { cookie }
    })
    assert.equal(del.statusCode, 200)

    const after = await app.inject({ method: 'GET', url: '/api/videos' })
    const afterIds = after.json().data.map((v) => v.id)
    assert.ok(!afterIds.includes(created.id))
    assert.deepEqual(afterIds, beforeIds)
  } finally {
    await app.close()
  }
})

test('rejects non-video uploads', async () => {
  const app = await buildServer()
  try {
    const cookie = await registerUser(app, 'notvideo')
    const res = await app.inject({
      method: 'POST',
      url: '/api/videos',
      headers: {
        'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
        cookie
      },
      payload: buildMultipart({
        title: 'note',
        filename: 'note.txt',
        contentType: 'text/plain',
        content: Buffer.from('hello')
      })
    })
    assert.equal(res.statusCode, 415)
    assert.equal(res.json().error, 'Chỉ chấp nhận file video')
  } finally {
    await app.close()
  }
})

test('unknown video returns 404', async () => {
  const app = await buildServer()
  try {
    const res = await app.inject({ method: 'GET', url: '/api/videos/does-not-exist' })
    assert.equal(res.statusCode, 404)
  } finally {
    await app.close()
    await rm(tmp, { recursive: true, force: true })
  }
})
