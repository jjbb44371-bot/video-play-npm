import {
  findUserByUsername,
  findUserByEmail,
  createUser,
  getUserSafe,
  verifyUserPassword
} from '../store.js'
import {
  getSessionUser,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH
} from '../auth/index.js'
import { config } from '../config.js'

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,30}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function setSessionUser(req, user) {
  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role
  }
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) return resolve()
    req.session.destroy((err) => (err ? reject(err) : resolve()))
  })
}

export default async function authRoutes(fastify) {
  fastify.post('/api/auth/register', async (req, reply) => {
    const body = req.body || {}
    const username = normalizeUsername(body.username)
    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password : ''

    if (!USERNAME_RE.test(username)) {
      return reply
        .code(400)
        .send({ error: 'Tên đăng nhập không hợp lệ (3-30 ký tự, a-z, 0-9, _, .)' })
    }
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      return reply
        .code(400)
        .send({ error: `Mật khẩu phải có từ ${MIN_PASSWORD_LENGTH} đến ${MAX_PASSWORD_LENGTH} ký tự` })
    }
    if (email && !EMAIL_RE.test(email)) {
      return reply.code(400).send({ error: 'Email không hợp lệ' })
    }

    if (await findUserByUsername(username)) {
      return reply.code(409).send({ error: 'Tên đăng nhập đã tồn tại' })
    }
    if (email && (await findUserByEmail(email))) {
      return reply.code(409).send({ error: 'Email đã tồn tại' })
    }

    const user = await createUser({
      username,
      email: email || null,
      passwordPlain: password
    })
    setSessionUser(req, user)
    return reply.code(201).send({ data: user })
  })

  fastify.post('/api/auth/login', async (req, reply) => {
    const body = req.body || {}
    const username = normalizeUsername(body.username)
    const password = typeof body.password === 'string' ? body.password : ''

    if (!username || !password) {
      return reply
        .code(400)
        .send({ error: 'Tên đăng nhập và mật khẩu là bắt buộc' })
    }

    const user = await verifyUserPassword(username, password)
    if (!user) {
      return reply
        .code(401)
        .send({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' })
    }

    setSessionUser(req, user)
    return { data: user }
  })

  fastify.post('/api/auth/logout', async (req, reply) => {
    await destroySession(req)
    reply.clearCookie(config.auth.cookieName, { path: '/' })
    return { data: { ok: true } }
  })

  fastify.get('/api/auth/me', async (req, reply) => {
    const sessionUser = getSessionUser(req)
    if (!sessionUser) {
      return reply.code(401).send({ error: 'Bạn cần đăng nhập' })
    }
    const user = (await getUserSafe(sessionUser.id)) || sessionUser
    return { data: user }
  })
}
