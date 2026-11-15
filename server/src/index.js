import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { existsSync } from 'node:fs'
import { config } from './config.js'
import { ensureStorage } from './store.js'
import { registerPlugins } from './plugins/register-plugins.js'
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

  await registerPlugins(fastify)

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
  }

  // Unified not-found handler: API routes get a JSON envelope, the SPA gets index.html.
  fastify.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith('/api/')) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Not found' }
      })
    }
    if (existsSync(config.clientDist)) {
      return reply.sendFile('index.html')
    }
    return reply.code(404).send({
      error: { code: 'NOT_FOUND', message: 'Not found' }
    })
  })

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
