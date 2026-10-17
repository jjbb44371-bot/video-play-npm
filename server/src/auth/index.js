import crypto from 'node:crypto'
import { hash as bcryptHash, compare as bcryptCompare } from 'bcryptjs'
import { config } from '../config.js'

const DEFAULT_SALT_ROUNDS = 10
const MIN_PASSWORD_LENGTH = 6
const MAX_PASSWORD_LENGTH = 200

function hashPassword(plain, saltRounds = DEFAULT_SALT_ROUNDS) {
  if (typeof plain !== 'string' || plain.length === 0) {
    return Promise.reject(new Error('Password must be a non-empty string'))
  }
  return bcryptHash(plain, saltRounds)
}

async function verifyPassword(plain, hash) {
  if (typeof plain !== 'string' || plain.length === 0) return false
  if (typeof hash !== 'string' || hash.length === 0) return false
  try {
    return await bcryptCompare(plain, hash)
  } catch {
    return false
  }
}

function newId() {
  return crypto.randomUUID()
}

function getSessionUser(request) {
  const session = request && request.session
  if (!session) return null
  if (session.user && session.user.id) {
    return {
      id: session.user.id,
      username: session.user.username || null,
      role: session.user.role || 'user'
    }
  }
  if (session.userId) {
    return {
      id: session.userId,
      username: session.username || null,
      role: session.role || 'user'
    }
  }
  return null
}

function isAdmin(user) {
  return Boolean(user) && user.role === 'admin'
}

function requireAuth(req, reply, done) {
  if (!config.auth.authEnabled) {
    req.user = null
    return done()
  }
  const user = getSessionUser(req)
  if (!user) {
    reply.code(401).send({ error: 'Bạn cần đăng nhập' })
    return done()
  }
  req.user = user
  return done()
}

function requireAdmin(req, reply, done) {
  if (!config.auth.authEnabled) {
    req.user = null
    return done()
  }
  const user = getSessionUser(req)
  if (!user) {
    reply.code(401).send({ error: 'Bạn cần đăng nhập' })
    return done()
  }
  req.user = user
  if (user.role !== 'admin') {
    reply.code(403).send({ error: 'Bạn không có quyền thực hiện thao tác này' })
    return done()
  }
  return done()
}

function requireOwnerOrAdmin({ getResource, ownerKey = 'userId' } = {}) {
  if (typeof getResource !== 'function') {
    throw new Error('requireOwnerOrAdmin requires a getResource function')
  }
  return async function ownerOrAdminGuard(req, reply) {
    const user = getSessionUser(req)
    if (config.auth.authEnabled && !user) {
      return reply.code(401).send({ error: 'Bạn cần đăng nhập' })
    }
    req.user = user

    const resource = await getResource(req)
    if (!resource) {
      return reply.code(404).send({ error: 'Not found' })
    }
    req.resource = resource

    if (!config.auth.authEnabled) return undefined

    const ownerId = resource[ownerKey] || null
    if (!isAdmin(user) && ownerId !== user.id) {
      return reply
        .code(403)
        .send({ error: 'Bạn không có quyền thực hiện thao tác này' })
    }
    return undefined
  }
}

export {
  DEFAULT_SALT_ROUNDS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  hashPassword,
  verifyPassword,
  newId,
  getSessionUser,
  getSessionUser as sessionUserFromRequest,
  requireAuth,
  requireAdmin,
  requireOwnerOrAdmin
}
