import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { config } from './config.js'

const DB_FILE = path.join(config.dataDir, 'videos.json')

let writeChain = Promise.resolve()

async function ensureStorage() {
  await fs.mkdir(config.uploadsDir, { recursive: true })
  await fs.mkdir(config.dataDir, { recursive: true })
  try {
    await fs.access(DB_FILE)
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify([], null, 2), 'utf8')
  }
}

async function readAll() {
  await ensureStorage()
  const raw = await fs.readFile(DB_FILE, 'utf8')
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function withLock(fn) {
  const run = writeChain.then(fn, fn)
  writeChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function writeAll(videos) {
  const tmp = `${DB_FILE}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(videos, null, 2), 'utf8')
  await fs.rename(tmp, DB_FILE)
}

export function newId() {
  return crypto.randomUUID()
}

export async function listVideos() {
  const videos = await readAll()
  return videos
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function getVideo(id) {
  const videos = await readAll()
  return videos.find((v) => v.id === id) || null
}

export async function createVideo(data) {
  return withLock(async () => {
    const videos = await readAll()
    const video = {
      id: data.id || newId(),
      title: data.title,
      description: data.description || '',
      filename: data.filename,
      originalName: data.originalName,
      mimeType: data.mimeType,
      size: data.size,
      views: 0,
      createdAt: new Date().toISOString()
    }
    videos.push(video)
    await writeAll(videos)
    return video
  })
}

export async function incrementViews(id) {
  return withLock(async () => {
    const videos = await readAll()
    const video = videos.find((v) => v.id === id)
    if (!video) return null
    video.views = (video.views || 0) + 1
    await writeAll(videos)
    return video
  })
}

export async function removeVideo(id) {
  return withLock(async () => {
    const videos = await readAll()
    const index = videos.findIndex((v) => v.id === id)
    if (index === -1) return null
    const [removed] = videos.splice(index, 1)
    await writeAll(videos)
    if (removed.filename) {
      const filePath = path.join(config.uploadsDir, removed.filename)
      await fs.rm(filePath, { force: true })
    }
    return removed
  })
}

export async function updateVideo(id, patch) {
  return withLock(async () => {
    const videos = await readAll()
    const video = videos.find((v) => v.id === id)
    if (!video) return null
    if (typeof patch.title === 'string') video.title = patch.title
    if (typeof patch.description === 'string') video.description = patch.description
    await writeAll(videos)
    return video
  })
}

export { ensureStorage }
