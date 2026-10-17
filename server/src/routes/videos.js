import { promises as fs, createReadStream, createWriteStream } from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { config } from '../config.js'
import {
  listVideos,
  getVideo,
  createVideo,
  incrementViews,
  removeVideo,
  updateVideo,
  newId
} from '../store.js'

const EXT_BY_MIME = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
  'video/quicktime': '.mov',
  'video/x-matroska': '.mkv'
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
  fastify.get('/api/videos', async (req, reply) => {
    const videos = await listVideos()
    return { data: videos.map((v) => publicVideo(v)) }
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

  fastify.post('/api/videos', async (req, reply) => {
    let data
    try {
      data = await req.file({ limits: { fileSize: config.maxUploadBytes } })
    } catch (err) {
      req.log.error(err)
      if (err.code === 'FST_REQ_FILE_TOO_LARGE' || err.code === 'FST_FILES_LIMIT') {
        return reply.code(413).send({ error: 'File quá lớn' })
      }
      return reply.code(400).send({ error: 'Upload không hợp lệ' })
    }
    if (!data) return reply.code(400).send({ error: 'Thiếu file video' })

    const mimeType = data.mimetype || ''
    if (!mimeType.startsWith(config.allowedMimePrefix)) {
      data.file.resume()
      return reply.code(415).send({ error: 'Chỉ chấp nhận file video' })
    }

    const fields = data.fields || {}
    const rawTitle = fields.title
    const rawDescription = fields.description
    const title =
      (typeof rawTitle === 'object' ? rawTitle?.value : rawTitle)?.toString().trim() ||
      data.filename ||
      'Untitled'
    const description =
      (typeof rawDescription === 'object' ? rawDescription?.value : rawDescription)
        ?.toString()
        .trim() || ''

    const id = newId()
    const ext = EXT_BY_MIME[mimeType] || path.extname(data.filename || '') || '.bin'
    const filename = `${id}${ext}`
    const destPath = path.join(config.uploadsDir, filename)
    const tmpPath = `${destPath}.part`

    let size = 0
    try {
      await pipeline(
        data.file,
        async function* (source) {
          for await (const chunk of source) {
            size += chunk.length
            yield chunk
          }
        },
        createWriteStream(tmpPath)
      )
      if (data.file.truncated) {
        await fs.rm(tmpPath, { force: true })
        return reply.code(413).send({ error: 'File quá lớn' })
      }
      await fs.rename(tmpPath, destPath)
    } catch (err) {
      req.log.error(err)
      await fs.rm(tmpPath, { force: true })
      return reply.code(500).send({ error: 'Không thể lưu file' })
    }

    const video = await createVideo({
      id,
      title,
      description,
      filename,
      originalName: data.filename,
      mimeType,
      size
    })

    return reply.code(201).send({ data: publicVideo(video) })
  })

  fastify.patch('/api/videos/:id', async (req, reply) => {
    const body = req.body || {}
    const patch = {}
    if (typeof body.title === 'string') patch.title = body.title.trim().slice(0, 200)
    if (typeof body.description === 'string') {
      patch.description = body.description.trim().slice(0, 5000)
    }
    const video = await updateVideo(req.params.id, patch)
    if (!video) return reply.code(404).send({ error: 'Video not found' })
    return { data: publicVideo(video) }
  })

  fastify.delete('/api/videos/:id', async (req, reply) => {
    const video = await removeVideo(req.params.id)
    if (!video) return reply.code(404).send({ error: 'Video not found' })
    return { data: { id: video.id } }
  })
}
