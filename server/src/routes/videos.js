import { promises as fs, createReadStream, createWriteStream } from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { config } from '../config.js'
import {
  listVideos,
  countVideos,
  getVideo,
  createVideo,
  incrementViews,
  removeVideo,
  updateVideo,
  newId
} from '../store.js'
import { requireAuth, requireOwnerOrAdmin } from '../auth/index.js'

const EXT_BY_MIME = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
  'video/quicktime': '.mov',
  'video/x-matroska': '.mkv'
}

const PAGE_LIMIT_DEFAULT = 20
const PAGE_LIMIT_MAX = 100

function parsePage(query = {}) {
  const limitRaw = query.limit
  const offsetRaw = query.offset
  const limit = limitRaw === undefined ? PAGE_LIMIT_DEFAULT : Number(limitRaw)
  const offset = offsetRaw === undefined ? 0 : Number(offsetRaw)
  if (!Number.isInteger(limit) || limit < 1 || limit > PAGE_LIMIT_MAX) {
    return { error: `limit phải là số nguyên từ 1 đến ${PAGE_LIMIT_MAX}` }
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return { error: 'offset phải là số nguyên không âm' }
  }
  return { limit, offset }
}

function hasVideoMagic(head) {
  if (head.length >= 12 && head.toString('ascii', 4, 8) === 'ftyp') return true
  if (
    head.length >= 4 &&
    head[0] === 0x1a &&
    head[1] === 0x45 &&
    head[2] === 0xdf &&
    head[3] === 0xa3
  ) {
    return true
  }
  if (head.length >= 4 && head.toString('ascii', 0, 4) === 'OggS') return true
  return false
}

function publicVideo(video, { baseUrl } = {}) {
  const base = baseUrl ? `${baseUrl}/api/videos/${video.id}` : `/api/videos/${video.id}`
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    mimeType: video.mimeType,
    size: video.size,
    views: video.views,
    createdAt: video.createdAt,
    streamUrl: `${base}/stream`
  }
}

export default async function videoRoutes(fastify) {
  const requireVideoOwner = requireOwnerOrAdmin({
    getResource: (req) => getVideo(req.params.id)
  })

  fastify.get('/api/videos', async (req, reply) => {
    const page = parsePage(req.query)
    if (page.error) return reply.code(400).send({ error: page.error })
    const videos = await listVideos(page)
    const count = await countVideos()
    return {
      data: videos.map((v) => publicVideo(v)),
      page: { limit: page.limit, offset: page.offset, count }
    }
  })

  fastify.get('/api/videos/:id', async (req, reply) => {
    const video = await getVideo(req.params.id)
    if (!video) return reply.code(404).send({ error: 'Video not found' })
    return { data: publicVideo(video) }
  })

  fastify.get('/api/videos/:id/stream', async (req, reply) => {
    const video = await getVideo(req.params.id)
    if (!video) return reply.code(404).send({ error: 'Video not found' })

    const filePath = path.join(config.uploadsDir, video.filename)
    let stat
    try {
      stat = await fs.stat(filePath)
    } catch {
      return reply.code(404).send({ error: 'Video file missing on server' })
    }

    reply.header('Accept-Ranges', 'bytes')
    reply.header('Content-Type', video.mimeType || 'application/octet-stream')

    const range = req.headers.range
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
      if (!match) {
        reply.header('Content-Range', `bytes */${stat.size}`)
        return reply.code(416).send()
      }
      let start = match[1] === '' ? null : Number(match[1])
      let end = match[2] === '' ? null : Number(match[2])
      if (start === null && end === null) {
        reply.header('Content-Range', `bytes */${stat.size}`)
        return reply.code(416).send()
      }
      if (start === null) {
        start = Math.max(stat.size - end, 0)
        end = stat.size - 1
      } else if (end === null || end >= stat.size) {
        end = stat.size - 1
      }
      if (start > end || start >= stat.size) {
        reply.header('Content-Range', `bytes */${stat.size}`)
        return reply.code(416).send()
      }
      const chunkSize = end - start + 1
      reply.code(206)
      reply.header('Content-Range', `bytes ${start}-${end}/${stat.size}`)
      reply.header('Content-Length', chunkSize)
      return reply.send(createReadStream(filePath, { start, end }))
    }

    reply.header('Content-Length', stat.size)
    return reply.send(createReadStream(filePath))
  })

  fastify.post('/api/videos/:id/view', async (req, reply) => {
    const video = await incrementViews(req.params.id)
    if (!video) return reply.code(404).send({ error: 'Video not found' })
    return { data: publicVideo(video) }
  })

  fastify.post(
    '/api/videos',
    { preHandler: requireAuth, bodyLimit: config.maxUploadBytes },
    async (req, reply) => {
      const id = newId()
      let tmpPath = null
      let destPath = null
      let filename = null
      let size = 0
      let head = Buffer.alloc(0)
      let fileMeta = null
      let extraFile = false
      let title = ''
      let description = ''

      try {
        for await (const part of req.parts({
          limits: { fileSize: config.maxUploadBytes, files: 1 }
        })) {
          if (part.type === 'field') {
            if (part.fieldname === 'title') {
              title = String(part.value ?? '').trim()
            } else if (part.fieldname === 'description') {
              description = String(part.value ?? '').trim()
            }
            continue
          }

          if (fileMeta) {
            part.file.resume()
            extraFile = true
            continue
          }

          const mimeType = part.mimetype || ''
          const ext =
            EXT_BY_MIME[mimeType] || path.extname(part.filename || '') || '.bin'
          filename = `${id}${ext}`
          destPath = path.join(config.uploadsDir, filename)
          tmpPath = `${destPath}.part`

          await pipeline(
            part.file,
            async function* (source) {
              for await (const chunk of source) {
                if (head.length < 12) {
                  head = Buffer.concat([
                    head,
                    chunk.subarray(0, 12 - head.length)
                  ])
                }
                size += chunk.length
                yield chunk
              }
            },
            createWriteStream(tmpPath)
          )

          if (part.file.truncated) {
            await fs.rm(tmpPath, { force: true })
            return reply.code(413).send({ error: 'File quá lớn' })
          }

          fileMeta = { mimeType, originalName: part.filename }
        }
      } catch (err) {
        req.log.error(err)
        if (tmpPath) await fs.rm(tmpPath, { force: true })
        if (
          err.code === 'FST_REQ_FILE_TOO_LARGE' ||
          err.code === 'FST_FILES_LIMIT'
        ) {
          return reply.code(413).send({ error: 'File quá lớn' })
        }
        return reply.code(400).send({ error: 'Upload không hợp lệ' })
      }

      if (extraFile) {
        if (tmpPath) await fs.rm(tmpPath, { force: true })
        return reply.code(400).send({ error: 'Chỉ được gửi 1 file' })
      }
      if (!fileMeta) return reply.code(400).send({ error: 'Thiếu file video' })

      if (
        !fileMeta.mimeType.startsWith(config.allowedMimePrefix) ||
        !hasVideoMagic(head)
      ) {
        await fs.rm(tmpPath, { force: true })
        return reply.code(415).send({ error: 'Chỉ chấp nhận file video' })
      }

      try {
        await fs.rename(tmpPath, destPath)
      } catch (err) {
        req.log.error(err)
        await fs.rm(tmpPath, { force: true })
        return reply.code(500).send({ error: 'Không thể lưu file' })
      }

      const video = await createVideo({
        id,
        title: title || fileMeta.originalName || 'Untitled',
        description,
        filename,
        originalName: fileMeta.originalName,
        mimeType: fileMeta.mimeType,
        size,
        userId: req.user ? req.user.id : null
      })

      return reply.code(201).send({ data: publicVideo(video) })
    }
  )

  fastify.patch(
    '/api/videos/:id',
    { preHandler: [requireAuth, requireVideoOwner] },
    async (req, reply) => {
      const body = req.body || {}
      const patch = {}
      if (typeof body.title === 'string') patch.title = body.title.trim().slice(0, 200)
      if (typeof body.description === 'string') {
        patch.description = body.description.trim().slice(0, 5000)
      }
      const video = await updateVideo(req.params.id, patch)
      if (!video) return reply.code(404).send({ error: 'Video not found' })
      return { data: publicVideo(video) }
    }
  )

  fastify.delete(
    '/api/videos/:id',
    { preHandler: [requireAuth, requireVideoOwner] },
    async (req, reply) => {
      const video = await removeVideo(req.params.id)
      if (!video) return reply.code(404).send({ error: 'Video not found' })
      return { data: { id: video.id } }
    }
  )
}
