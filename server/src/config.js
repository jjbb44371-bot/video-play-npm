import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const ROOT_DIR = path.resolve(__dirname, '..')

export const NODE_ENV = process.env.NODE_ENV || 'development'
export const isProduction = NODE_ENV === 'production'

function resolveSessionSecret() {
  const fromEnv = process.env.SESSION_SECRET
  if (fromEnv && fromEnv.length > 0) return fromEnv
  if (isProduction) {
    throw new Error('SESSION_SECRET must be set when NODE_ENV=production')
  }
  return 'video-play-npm-insecure-dev-session-secret'
}

export const config = {
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT) || 4000,
  uploadsDir: process.env.UPLOADS_DIR || path.join(ROOT_DIR, 'uploads'),
  dataDir: process.env.DATA_DIR || path.join(ROOT_DIR, 'data'),
  clientDist: process.env.CLIENT_DIST || path.resolve(ROOT_DIR, '..', 'client', 'dist'),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 1024 * 1024 * 1024,
  allowedMimePrefix: 'video/',
  auth: {
    authEnabled: process.env.AUTH_ENABLED !== 'false' && process.env.AUTH_ENABLED !== '0',
    sessionSecret: resolveSessionSecret(),
    cookieName: process.env.SESSION_COOKIE_NAME || 'video_play_sid',
    cookieSecure: isProduction,
    sessionMaxAge: Number(process.env.SESSION_MAX_AGE) || 7 * 24 * 60 * 60 * 1000
  }
}
