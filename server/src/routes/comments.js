import { listComments, getComment, createComment, removeComment, getVideo } from '../store.js'
import { requireAuth, requireOwnerOrAdmin } from '../auth/index.js'

const MAX_BODY_LENGTH = 2000

export default async function commentRoutes(fastify) {
  const requireCommentOwner = requireOwnerOrAdmin({
    getResource: (req) => getComment(req.params.id)
  })

  fastify.get('/api/videos/:id/comments', async (req, reply) => {
    const video = await getVideo(req.params.id)
    if (!video) return reply.code(404).send({ error: 'Video not found' })
    const comments = await listComments(video.id)
    return { data: comments }
  })

  fastify.post(
    '/api/videos/:id/comments',
    { preHandler: requireAuth },
    async (req, reply) => {
      const video = await getVideo(req.params.id)
      if (!video) return reply.code(404).send({ error: 'Video not found' })

      const body = req.body || {}
      const text = typeof body.body === 'string' ? body.body.trim() : ''
      if (!text) return reply.code(400).send({ error: 'Nội dung bình luận là bắt buộc' })
      if (text.length > MAX_BODY_LENGTH) {
        return reply
          .code(400)
          .send({ error: `Bình luận tối đa ${MAX_BODY_LENGTH} ký tự` })
      }

      let parentId = null
      if (body.parentId) {
        const parent = await getComment(body.parentId)
        if (!parent || parent.videoId !== video.id) {
          return reply.code(400).send({ error: 'Bình luận cha không hợp lệ' })
        }
        parentId = parent.id
      }

      const comment = await createComment({
        videoId: video.id,
        userId: req.user.id,
        body: text,
        parentId
      })
      return reply.code(201).send({ data: { ...comment, username: req.user.username } })
    }
  )

  fastify.delete(
    '/api/comments/:id',
    { preHandler: [requireAuth, requireCommentOwner] },
    async (req, reply) => {
      const comment = await removeComment(req.params.id)
      if (!comment) return reply.code(404).send({ error: 'Comment not found' })
      return { data: { id: comment.id } }
    }
  )
}
