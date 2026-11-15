import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import session from '@fastify/session'
import multipart from '@fastify/multipart'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import compress from '@fastify/compress'
import { config } from '../config.js'
import { setErrorHandler } from './error-handler.js'

export async function registerPlugins(fastify) {
  // Global error handler must be registered first.
  setErrorHandler(fastify)

  // Security headers (CSP disabled: the Vite SPA loads inline styles/scripts).
  await fastify.register(helmet, {
    contentSecurityPolicy: false
  })

  // CORS: explicit allow-list from config.
  await fastify.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  })

  await fastify.register(cookie)

  await fastify.register(session, {
    secret: config.auth.sessionSecret,
    cookieName: config.auth.cookieName,
    cookie: {
      path: '/',
      httpOnly: true,
      secure: config.auth.cookieSecure,
      sameSite: 'strict',
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

  // Global rate limit (generous default; stricter limits set per-route).
  await fastify.register(rateLimit, {
    global: true,
    max: 1000,
    timeWindow: '1 minute'
  })

  // Compress JSON API responses (video streams are not compressible types).
  await fastify.register(compress, {
    global: true,
    threshold: 1024
  })
}
