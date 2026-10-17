import { listLikes, getLike, setLike, removeLike, getVideo } from '../store.js'
import { requireAuth } from '../auth/index.js'

function summarize(likes) {
  let likeCount = 0
  let dislikeCount = 0
  for (const row of likes) {
    if (row.reaction === 'dislike') dislikeCount += 1
    else likeCount += 1
  }
  return { likeCount, dislikeCount, total: likes.length }
}

export default async function likeRoutes(fastify) {
  fastify.get('/api/videos/:id/likes', async (req, reply) => {
    const video = await getVideo(req.params.id)
    if (!video) return reply.code(404).send({ error: 'Video not found' })
    const likes = await listLikes(video.id)
    return { data: summarize(likes) }
  })

  fastify.post(
    '/api/videos/:id/likes',
    { preHandler: requireAuth },
    async (req, reply) => {
      const video = await getVideo(req.params.id)
      if (!video) return reply.code(404).send({ error: 'Video not found' })

      const body = req.body || {}
      const reaction = body.reaction === 'dislike' ? 'dislike' : 'like'
      await setLike({ videoId: video.id, userId: req.user.id, reaction })
      const likes = await listLikes(video.id)
      return { data: { myReaction: reaction, ...summarize(likes) } }
    }
  )

  fastify.delete('/api/videos/:id/likes', { preHandler: requireAuth }, async (req, reply) => {
    const video = await getVideo(req.params.id)
    if (!video) return reply.code(404).send({ error: 'Video not found' })

    const existing = await getLike(video.id, req.user.id)
    if (existing) await removeLike(video.id, req.user.id)
    const likes = await listLikes(video.id)
    return { data: { myReaction: null, ...summarize(likes) } }
  })
}
