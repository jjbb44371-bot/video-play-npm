import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const ROOT_DIR = path.resolve(__dirname, '..')

export const config = {
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT) || 4000,
  uploadsDir: process.env.UPLOADS_DIR || path.join(ROOT_DIR, 'uploads'),
  dataDir: process.env.DATA_DIR || path.join(ROOT_DIR, 'data'),
  clientDist: process.env.CLIENT_DIST || path.resolve(ROOT_DIR, '..', 'client', 'dist'),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 1024 * 1024 * 1024,
  allowedMimePrefix: 'video/'
}
