import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { config } from '../config.js'

const DB_FILE = path.join(config.dataDir, 'videos.db')

const LATEST_SCHEMA_VERSION = 2

let db

function getDb() {
  if (!db) {
    mkdirSync(config.dataDir, { recursive: true })
    db = new DatabaseSync(DB_FILE)
    // Enforce foreign keys and reasonable defaults
    db.exec('PRAGMA foreign_keys = ON')
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA synchronous = NORMAL')
    migrate(db)
  }
  return db
}

function tableExists(database, name) {
  const row = database
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(name)
  return Boolean(row)
}

function columnExists(database, table, column) {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all()
  return rows.some((row) => row.name === column)
}

function ensureSchemaVersionTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      appliedAt TEXT NOT NULL
    )
  `)
}

function readMaxVersion(database) {
  const row = database
    .prepare(`SELECT MAX(version) AS version FROM schema_version`)
    .get()
  return row && row.version != null ? Number(row.version) : null
}

function detectBaselineVersion(database) {
  return tableExists(database, 'videos') ? 1 : 0
}

function recordVersion(database, version) {
  database
    .prepare(
      `INSERT OR REPLACE INTO schema_version (version, appliedAt) VALUES (?, ?)`
    )
    .run(version, new Date().toISOString())
}

function migrateV1(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      filename TEXT NOT NULL,
      originalName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      size INTEGER NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    )
  `)
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_videos_createdAt ON videos(createdAt DESC)
  `)
}

function migrateV2(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS video_metrics (
      videoId TEXT PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
      views INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      dislikes INTEGER NOT NULL DEFAULT 0,
      comments INTEGER NOT NULL DEFAULT 0,
      shares INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS video_tags (
      videoId TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      tagId TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (videoId, tagId)
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      videoId TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parentId TEXT REFERENCES comments(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      videoId TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reaction TEXT NOT NULL DEFAULT 'like' CHECK (reaction IN ('like', 'dislike')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE (videoId, userId)
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS playlist_items (
      id TEXT PRIMARY KEY,
      playlistId TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      videoId TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      UNIQUE (playlistId, videoId)
    )
  `)

  if (!columnExists(database, 'videos', 'userId')) {
    database.exec(
      `ALTER TABLE videos ADD COLUMN userId TEXT REFERENCES users(id) ON DELETE SET NULL`
    )
  }

  database.exec(`CREATE INDEX IF NOT EXISTS idx_videos_userId ON videos(userId)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_comments_videoId ON comments(videoId)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_comments_userId ON comments(userId)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_comments_parentId ON comments(parentId)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_likes_videoId ON likes(videoId)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_likes_userId ON likes(userId)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_video_tags_tagId ON video_tags(tagId)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_playlists_userId ON playlists(userId)`)
  database.exec(
    `CREATE INDEX IF NOT EXISTS idx_playlist_items_videoId ON playlist_items(videoId)`
  )
}

const migrations = {
  1: migrateV1,
  2: migrateV2
}

function migrate(database) {
  database.exec('BEGIN')
  try {
    ensureSchemaVersionTable(database)
    let current = readMaxVersion(database)
    if (current == null) {
      current = detectBaselineVersion(database)
      if (current > 0) recordVersion(database, current)
    }
    for (let version = current + 1; version <= LATEST_SCHEMA_VERSION; version += 1) {
      const migration = migrations[version]
      if (migration) migration(database)
      recordVersion(database, version)
    }
    database.exec('COMMIT')
  } catch (err) {
    database.exec('ROLLBACK')
    throw err
  }
}

function getSchemaVersion() {
  const database = getDb()
  return readMaxVersion(database)
}

export { getDb, DB_FILE, LATEST_SCHEMA_VERSION, getSchemaVersion }
