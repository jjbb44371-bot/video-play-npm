import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import session from '@fastify/session'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { existsSync } from 'node:fs'
import { config } from './config.js'
import { ensureStorage } from './store.js'
import videoRoutes from './routes/videos.js'
import authRoutes from './routes/auth.js'
import commentRoutes from './routes/comments.js'
import likeRoutes from './routes/likes.js'
import tagRoutes from './routes/tags.js'
import playlistRoutes from './routes/playlists.js'
import categoryRoutes from './routes/categories.js'

export async function buildServer() {
  await ensureStorage()
  const fastify = Fastify({
    logger: true,
    bodyLimit: 1024 * 1024
  })

  await fastify.register(cors, { origin: true })
  await fastify.register(cookie)
  await fastify.register(session, {
    secret: config.auth.sessionSecret,
    cookieName: config.auth.cookieName,
    cookie: {
      path: '/',
      httpOnly: true,
      secure: config.auth.cookieSecure,
      sameSite: 'lax',
      maxAge: config.auth.sessionMaxAge
    },
    saveUninitialized: false,
    rolling: true
  })
  await fastify.register(multipart, {
    limits: {
      fileSize: config.maxUploadBytes,
      files: 1
    }
  })

  fastify.get('/api/health', async () => ({
    status: 'ok',
    service: 'video-play-npm',
    time: new Date().toISOString()
  }))

  await fastify.register(authRoutes)
  await fastify.register(videoRoutes)
  await fastify.register(categoryRoutes)
  await fastify.register(tagRoutes)
  await fastify.register(commentRoutes)
  await fastify.register(likeRoutes)
  await fastify.register(playlistRoutes)

  if (existsSync(config.clientDist)) {
    await fastify.register(fastifyStatic, {
      root: config.clientDist,
      prefix: '/'
    })
    fastify.setNotFoundHandler((req, reply) => {
      if (req.raw.url?.startsWith('/api/')) {
        return reply.code(404).send({ error: 'Not found' })
      }
      return reply.sendFile('index.html')
    })
  }

  return fastify
}

async function start() {
  await ensureStorage()
  const fastify = await buildServer()
  try {
    await fastify.listen({ host: config.host, port: config.port })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

const isDirectRun = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (isDirectRun) {
  start()
}
