import {
  listTags,
  getTag,
  findTagByName,
  createTag,
  getVideoTags,
  addVideoTag,
  removeVideoTag,
  getVideo
} from '../store.js'
import { requireAuth, requireOwnerOrAdmin } from '../auth/index.js'

function normalizeName(value) {
  return typeof value === 'string' ? value.trim().slice(0, 60) : ''
}

export default async function tagRoutes(fastify) {
  const requireVideoOwner = requireOwnerOrAdmin({
    getResource: (req) => getVideo(req.params.id)
  })

  fastify.get('/api/tags', async () => {
    const tags = await listTags()
    return { data: tags }
  })

  fastify.get('/api/tags/:id', async (req, reply) => {
    const tag = await getTag(req.params.id)
    if (!tag) return reply.code(404).send({ error: 'Tag not found' })
    return { data: tag }
  })

  fastify.post('/api/tags', { preHandler: requireAuth }, async (req, reply) => {
    const name = normalizeName((req.body || {}).name)
    if (!name) return reply.code(400).send({ error: 'Tên tag là bắt buộc' })

    const existing = await findTagByName(name)
    if (existing) return { data: existing }

    const tag = await createTag({ name })
    return reply.code(201).send({ data: tag })
  })

  fastify.get('/api/videos/:id/tags', async (req, reply) => {
    const video = await getVideo(req.params.id)
    if (!video) return reply.code(404).send({ error: 'Video not found' })
    const tags = await getVideoTags(video.id)
    return { data: tags }
  })

  fastify.post(
    '/api/videos/:id/tags',
    { preHandler: [requireAuth, requireVideoOwner] },
    async (req, reply) => {
      const body = req.body || {}
      let tag = null
      if (body.tagId) {
        tag = await getTag(body.tagId)
        if (!tag) return reply.code(404).send({ error: 'Tag not found' })
      } else {
        const name = normalizeName(body.name)
        if (!name) {
          return reply.code(400).send({ error: 'Thiếu tagId hoặc name' })
        }
        tag = (await findTagByName(name)) || (await createTag({ name }))
      }
      const tags = await addVideoTag(req.params.id, tag.id)
      return reply.code(201).send({ data: tags })
    }
  )

  fastify.delete(
    '/api/videos/:id/tags/:tagId',
    { preHandler: [requireAuth, requireVideoOwner] },
    async (req, reply) => {
      const tags = await removeVideoTag(req.params.id, req.params.tagId)
      return { data: tags }
    }
  )
}
