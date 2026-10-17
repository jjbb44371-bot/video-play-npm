import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { existsSync } from 'node:fs'
import { config } from './config.js'
import { ensureStorage } from './store.js'
import videoRoutes from './routes/videos.js'

export async function buildServer() {
  const fastify = Fastify({
    logger: true,
    bodyLimit: config.maxUploadBytes
  })

  await fastify.register(cors, { origin: true })
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

  await fastify.register(videoRoutes)

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
