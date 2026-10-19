import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { config } from './config.js'
import { getDb } from './db/connection.js'
import { hashPassword, verifyPassword } from './auth/index.js'

let writeChain = Promise.resolve()

function withLock(fn) {
  const run = writeChain.then(fn, fn)
  writeChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function ensureStorage() {
  await fs.mkdir(config.uploadsDir, { recursive: true })
  await fs.mkdir(config.dataDir, { recursive: true })
  getDb()
  await cleanupPartialUploads()
}

async function cleanupPartialUploads() {
  let entries
  try {
    entries = await fs.readdir(config.uploadsDir)
  } catch {
    return
  }
  const partials = entries.filter((name) => name.endsWith('.part'))
  await Promise.all(
    partials.map((name) => fs.rm(path.join(config.uploadsDir, name), { force: true }))
  )
}

const DEFAULT_PAGE_LIMIT = 20
const MAX_PAGE_LIMIT = 100

function normalizePage({ limit, offset } = {}) {
  const safeLimit = Number.isInteger(limit)
    ? Math.min(Math.max(limit, 1), MAX_PAGE_LIMIT)
    : DEFAULT_PAGE_LIMIT
  const safeOffset = Number.isInteger(offset) && offset > 0 ? offset : 0
  return { limit: safeLimit, offset: safeOffset }
}

function newId() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

function toSafeUser(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? null,
    role: row.role,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

/* ------------------------------- Users ---------------------------------- */

async function createUser({ username, email, passwordPlain, role = 'user' }) {
  if (typeof username !== 'string' || username.length === 0) {
    throw new Error('username is required')
  }
  if (typeof passwordPlain !== 'string' || passwordPlain.length === 0) {
    throw new Error('passwordPlain is required')
  }
  const passwordHash = await hashPassword(passwordPlain)
  const db = getDb()
  const id = newId()
  const ts = now()
  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, role, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, username, email ?? null, passwordHash, role, ts, ts)
  return toSafeUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(id))
}

async function findUserByUsername(username) {
  const db = getDb()
  const row = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username)
  return row || null
}

async function findUserById(id) {
  const db = getDb()
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id)
  return row || null
}

async function findUserByEmail(email) {
  if (!email) return null
  const db = getDb()
  const row = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email)
  return row || null
}

async function getUserSafe(id) {
  const row = await findUserById(id)
  return toSafeUser(row)
}

async function verifyUserPassword(username, passwordPlain) {
  const user = await findUserByUsername(username)
  if (!user) return null
  const ok = await verifyPassword(passwordPlain, user.password_hash)
  return ok ? toSafeUser(user) : null
}

async function updateUserPassword(id, passwordPlain) {
  if (typeof passwordPlain !== 'string' || passwordPlain.length === 0) {
    throw new Error('passwordPlain is required')
  }
  const passwordHash = await hashPassword(passwordPlain)
  const db = getDb()
  const info = db
    .prepare(
      `UPDATE users SET password_hash = ?, updatedAt = ? WHERE id = ?`
    )
    .run(passwordHash, now(), id)
  if (info.changes === 0) return null
  return toSafeUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(id))
}

/* ------------------------------ Videos ---------------------------------- */

const VIDEO_COLUMNS =
  `id, title, description, filename, originalName, mimeType, size, views, userId, createdAt`

async function listVideos(page) {
  const { limit, offset } = normalizePage(page)
  const db = getDb()
  return db
    .prepare(
      `SELECT ${VIDEO_COLUMNS}
       FROM videos
       ORDER BY createdAt DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset)
}

async function countVideos() {
  const db = getDb()
  const row = db.prepare(`SELECT COUNT(*) AS count FROM videos`).get()
  return row ? Number(row.count) : 0
}

async function getVideosByUser(userId, page) {
  const { limit, offset } = normalizePage(page)
  const db = getDb()
  return db
    .prepare(
      `SELECT ${VIDEO_COLUMNS}
       FROM videos
       WHERE userId = ?
       ORDER BY createdAt DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(userId, limit, offset)
}

async function countVideosByUser(userId) {
  const db = getDb()
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM videos WHERE userId = ?`)
    .get(userId)
  return row ? Number(row.count) : 0
}

async function getVideo(id) {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT ${VIDEO_COLUMNS}
       FROM videos
       WHERE id = ?`
    )
    .get(id)
  return row || null
}

async function isVideoOwner(videoId, userId) {
  if (!videoId || !userId) return false
  const db = getDb()
  const row = db.prepare(`SELECT userId FROM videos WHERE id = ?`).get(videoId)
  if (!row) return false
  return row.userId != null && row.userId === userId
}

async function createVideo(data) {
  return withLock(async () => {
    const db = getDb()
    const id = data.id || newId()
    const video = {
      id,
      title: data.title,
      description: data.description || '',
      filename: data.filename,
      originalName: data.originalName,
      mimeType: data.mimeType,
      size: data.size,
      views: 0,
      userId: data.userId || null,
      createdAt: new Date().toISOString()
    }
    db.prepare(
      `INSERT INTO videos (id, title, description, filename, originalName, mimeType, size, views, userId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      video.id,
      video.title,
      video.description,
      video.filename,
      video.originalName,
      video.mimeType,
      video.size,
      video.views,
      video.userId,
      video.createdAt
    )
    return video
  })
}

async function incrementViews(id) {
  const db = getDb()
  const row = db
    .prepare(
      `UPDATE videos SET views = COALESCE(views, 0) + 1 WHERE id = ?
       RETURNING ${VIDEO_COLUMNS}`
    )
    .get(id)
  return row || null
}

async function removeVideo(id) {
  return withLock(async () => {
    const db = getDb()
    const existing = getVideo(id)
    if (!existing) return null
    db.prepare(`DELETE FROM videos WHERE id = ?`).run(id)
    if (existing.filename) {
      const filePath = path.join(config.uploadsDir, existing.filename)
      await fs.rm(filePath, { force: true })
    }
    return existing
  })
}

async function updateVideo(id, patch) {
  return withLock(async () => {
    const db = getDb()
    const existing = await getVideo(id)
    if (!existing) return null
    const title =
      typeof patch.title === 'string' ? patch.title : existing.title
    const description =
      typeof patch.description === 'string' ? patch.description : existing.description
    db.prepare(
      `UPDATE videos SET title = ?, description = ? WHERE id = ?`
    ).run(title, description, id)
    return getVideo(id)
  })
}

/* ---------------------------- Categories -------------------------------- */

async function listCategories() {
  const db = getDb()
  return db
    .prepare(`SELECT * FROM categories ORDER BY name COLLATE NOCASE ASC`)
    .all()
}

async function getCategory(id) {
  const db = getDb()
  return db.prepare(`SELECT * FROM categories WHERE id = ?`).get(id) || null
}

async function createCategory({ name, slug, description = '' }) {
  const db = getDb()
  const id = newId()
  db.prepare(
    `INSERT INTO categories (id, name, slug, description, createdAt)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, name, slug, description, now())
  return db.prepare(`SELECT * FROM categories WHERE id = ?`).get(id)
}

/* -------------------------------- Tags ---------------------------------- */

async function listTags() {
  const db = getDb()
  return db.prepare(`SELECT * FROM tags ORDER BY name COLLATE NOCASE ASC`).all()
}

async function getTag(id) {
  const db = getDb()
  return db.prepare(`SELECT * FROM tags WHERE id = ?`).get(id) || null
}

async function findTagByName(name) {
  const db = getDb()
  return db.prepare(`SELECT * FROM tags WHERE name = ?`).get(name) || null
}

async function createTag({ name }) {
  const db = getDb()
  const id = newId()
  db.prepare(`INSERT INTO tags (id, name, createdAt) VALUES (?, ?, ?)`).run(
    id,
    name,
    now()
  )
  return db.prepare(`SELECT * FROM tags WHERE id = ?`).get(id)
}

async function getVideoTags(videoId) {
  const db = getDb()
  return db
    .prepare(
      `SELECT t.* FROM tags t
       JOIN video_tags vt ON vt.tagId = t.id
       WHERE vt.videoId = ?
       ORDER BY t.name COLLATE NOCASE ASC`
    )
    .all(videoId)
}

async function addVideoTag(videoId, tagId) {
  return withLock(() => {
    const db = getDb()
    db.prepare(
      `INSERT OR IGNORE INTO video_tags (videoId, tagId, createdAt)
       VALUES (?, ?, ?)`
    ).run(videoId, tagId, now())
    return getVideoTags(videoId)
  })
}

async function removeVideoTag(videoId, tagId) {
  return withLock(() => {
    const db = getDb()
    db.prepare(`DELETE FROM video_tags WHERE videoId = ? AND tagId = ?`).run(
      videoId,
      tagId
    )
    return getVideoTags(videoId)
  })
}

/* ------------------------------ Comments -------------------------------- */

async function listComments(videoId) {
  const db = getDb()
  return db
    .prepare(
      `SELECT c.*, u.username AS username
       FROM comments c
       LEFT JOIN users u ON u.id = c.userId
       WHERE c.videoId = ?
       ORDER BY c.createdAt ASC, c.id ASC`
    )
    .all(videoId)
}

async function getComment(id) {
  const db = getDb()
  return db.prepare(`SELECT * FROM comments WHERE id = ?`).get(id) || null
}

async function createComment({ videoId, userId, body, parentId = null }) {
  const db = getDb()
  const id = newId()
  const ts = now()
  db.prepare(
    `INSERT INTO comments (id, videoId, userId, parentId, body, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, videoId, userId, parentId, body, ts, ts)
  return db.prepare(`SELECT * FROM comments WHERE id = ?`).get(id)
}

async function removeComment(id) {
  const db = getDb()
  const existing = db.prepare(`SELECT * FROM comments WHERE id = ?`).get(id)
  if (!existing) return null
  db.prepare(`DELETE FROM comments WHERE id = ?`).run(id)
  return existing
}

/* -------------------------------- Likes --------------------------------- */

async function listLikes(videoId) {
  const db = getDb()
  return db
    .prepare(`SELECT * FROM likes WHERE videoId = ?`)
    .all(videoId)
}

async function getLike(videoId, userId) {
  const db = getDb()
  return (
    db
      .prepare(`SELECT * FROM likes WHERE videoId = ? AND userId = ?`)
      .get(videoId, userId) || null
  )
}

async function setLike({ videoId, userId, reaction = 'like' }) {
  const db = getDb()
  const id = newId()
  const ts = now()
  db.prepare(
    `INSERT INTO likes (id, videoId, userId, reaction, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(videoId, userId)
     DO UPDATE SET reaction = excluded.reaction, updatedAt = excluded.updatedAt`
  ).run(id, videoId, userId, reaction, ts, ts)
  return getLike(videoId, userId)
}

async function removeLike(videoId, userId) {
  const db = getDb()
  const info = db
    .prepare(`DELETE FROM likes WHERE videoId = ? AND userId = ?`)
    .run(videoId, userId)
  return info.changes > 0
}

/* ------------------------------ Playlists ------------------------------- */

async function listPlaylists(userId) {
  const db = getDb()
  return db
    .prepare(
      `SELECT * FROM playlists WHERE userId = ?
       ORDER BY createdAt DESC, id DESC`
    )
    .all(userId)
}

async function getPlaylist(id) {
  const db = getDb()
  return db.prepare(`SELECT * FROM playlists WHERE id = ?`).get(id) || null
}

async function createPlaylist({
  userId,
  name,
  description = '',
  visibility = 'private'
}) {
  const db = getDb()
  const id = newId()
  const ts = now()
  db.prepare(
    `INSERT INTO playlists (id, userId, name, description, visibility, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, name, description, visibility, ts, ts)
  return db.prepare(`SELECT * FROM playlists WHERE id = ?`).get(id)
}

async function updatePlaylist(id, patch) {
  const db = getDb()
  const existing = db.prepare(`SELECT * FROM playlists WHERE id = ?`).get(id)
  if (!existing) return null
  const name = typeof patch.name === 'string' ? patch.name : existing.name
  const description =
    typeof patch.description === 'string'
      ? patch.description
      : existing.description
  const visibility =
    typeof patch.visibility === 'string'
      ? patch.visibility
      : existing.visibility
  db.prepare(
    `UPDATE playlists SET name = ?, description = ?, visibility = ?, updatedAt = ? WHERE id = ?`
  ).run(name, description, visibility, now(), id)
  return db.prepare(`SELECT * FROM playlists WHERE id = ?`).get(id)
}

async function listPlaylistItems(playlistId) {
  const db = getDb()
  return db
    .prepare(
      `SELECT pi.*, v.title, v.mimeType, v.size, v.createdAt AS videoCreatedAt
       FROM playlist_items pi
       LEFT JOIN videos v ON v.id = pi.videoId
       WHERE pi.playlistId = ?
       ORDER BY pi.position ASC, pi.createdAt ASC, pi.id ASC`
    )
    .all(playlistId)
}

async function addPlaylistItem({ playlistId, videoId, position = 0 }) {
  return withLock(() => {
    const db = getDb()
    const id = newId()
    db.prepare(
      `INSERT OR IGNORE INTO playlist_items (id, playlistId, videoId, position, createdAt)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, playlistId, videoId, position, now())
    return listPlaylistItems(playlistId)
  })
}

async function removePlaylistItem(playlistId, videoId) {
  return withLock(() => {
    const db = getDb()
    db.prepare(
      `DELETE FROM playlist_items WHERE playlistId = ? AND videoId = ?`
    ).run(playlistId, videoId)
    return listPlaylistItems(playlistId)
  })
}

/* --------------------------- Video metrics ------------------------------ */

async function getVideoMetrics(videoId) {
  const db = getDb()
  return (
    db.prepare(`SELECT * FROM video_metrics WHERE videoId = ?`).get(videoId) ||
    null
  )
}

async function ensureVideoMetrics(videoId) {
  const db = getDb()
  const existing = db
    .prepare(`SELECT * FROM video_metrics WHERE videoId = ?`)
    .get(videoId)
  if (existing) return existing
  db.prepare(
    `INSERT INTO video_metrics (videoId, views, likes, dislikes, comments, shares, updatedAt)
     VALUES (?, 0, 0, 0, 0, 0, ?)`
  ).run(videoId, now())
  return db.prepare(`SELECT * FROM video_metrics WHERE videoId = ?`).get(videoId)
}

async function updateVideoMetrics(videoId, patch = {}) {
  await ensureVideoMetrics(videoId)
  return withLock(() => {
    const db = getDb()
    const existing = db
      .prepare(`SELECT * FROM video_metrics WHERE videoId = ?`)
      .get(videoId)
    if (!existing) return null
    const pick = (key) =>
      Number.isFinite(patch[key]) ? Math.max(0, Math.trunc(patch[key])) : existing[key]
    db.prepare(
      `UPDATE video_metrics SET views = ?, likes = ?, dislikes = ?, comments = ?, shares = ?, updatedAt = ?
       WHERE videoId = ?`
    ).run(
      pick('views'),
      pick('likes'),
      pick('dislikes'),
      pick('comments'),
      pick('shares'),
      now(),
      videoId
    )
    return db.prepare(`SELECT * FROM video_metrics WHERE videoId = ?`).get(videoId)
  })
}

export {
  ensureStorage,
  newId,
  toSafeUser,
  // users
  createUser,
  findUserByUsername,
  findUserById,
  findUserByEmail,
  getUserSafe,
  verifyUserPassword,
  updateUserPassword,
  // videos
  listVideos,
  countVideos,
  getVideosByUser,
  countVideosByUser,
  getVideo,
  isVideoOwner,
  createVideo,
  incrementViews,
  removeVideo,
  updateVideo,
  // categories
  listCategories,
  getCategory,
  createCategory,
  // tags
  listTags,
  getTag,
  findTagByName,
  createTag,
  getVideoTags,
  addVideoTag,
  removeVideoTag,
  // comments
  listComments,
  getComment,
  createComment,
  removeComment,
  // likes
  listLikes,
  getLike,
  setLike,
  removeLike,
  // playlists
  listPlaylists,
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  listPlaylistItems,
  addPlaylistItem,
  removePlaylistItem,
  // metrics
  getVideoMetrics,
  ensureVideoMetrics,
  updateVideoMetrics
}
