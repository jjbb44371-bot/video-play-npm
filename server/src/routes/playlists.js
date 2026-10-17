import {
  listPlaylists,
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  listPlaylistItems,
  addPlaylistItem,
  removePlaylistItem,
  getVideo
} from '../store.js'
import { requireAuth, requireOwnerOrAdmin, getSessionUser } from '../auth/index.js'

const VISIBILITIES = new Set(['private', 'public', 'unlisted'])

export default async function playlistRoutes(fastify) {
  const requirePlaylistOwner = requireOwnerOrAdmin({
    getResource: (req) => getPlaylist(req.params.id)
  })

  fastify.get('/api/playlists', { preHandler: requireAuth }, async (req) => {
    const playlists = await listPlaylists(req.user.id)
    return { data: playlists }
  })

  fastify.post('/api/playlists', { preHandler: requireAuth }, async (req, reply) => {
    const body = req.body || {}
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description =
      typeof body.description === 'string' ? body.description.trim() : ''
    const visibility = VISIBILITIES.has(body.visibility) ? body.visibility : 'private'
    if (!name) return reply.code(400).send({ error: 'Tên playlist là bắt buộc' })

    const playlist = await createPlaylist({
      userId: req.user.id,
      name,
      description,
      visibility
    })
    return reply.code(201).send({ data: playlist })
  })

  fastify.get('/api/playlists/:id', async (req, reply) => {
    const playlist = await getPlaylist(req.params.id)
    if (!playlist) return reply.code(404).send({ error: 'Playlist not found' })

    const user = getSessionUser(req)
    const isOwner = user && user.id === playlist.userId
    if (playlist.visibility !== 'public' && !isOwner) {
      if (!user) return reply.code(401).send({ error: 'Bạn cần đăng nhập' })
      return reply
        .code(403)
        .send({ error: 'Bạn không có quyền thực hiện thao tác này' })
    }
    const items = await listPlaylistItems(playlist.id)
    return { data: { ...playlist, items } }
  })

  fastify.patch(
    '/api/playlists/:id',
    { preHandler: [requireAuth, requirePlaylistOwner] },
    async (req, reply) => {
      const body = req.body || {}
      const patch = {}
      if (typeof body.name === 'string') patch.name = body.name.trim()
      if (typeof body.description === 'string') {
        patch.description = body.description.trim()
      }
      if (VISIBILITIES.has(body.visibility)) patch.visibility = body.visibility
      const playlist = await updatePlaylist(req.params.id, patch)
      if (!playlist) return reply.code(404).send({ error: 'Playlist not found' })
      return { data: playlist }
    }
  )

  fastify.get('/api/playlists/:id/items', async (req, reply) => {
    const playlist = await getPlaylist(req.params.id)
    if (!playlist) return reply.code(404).send({ error: 'Playlist not found' })

    const user = getSessionUser(req)
    const isOwner = user && user.id === playlist.userId
    if (playlist.visibility !== 'public' && !isOwner) {
      if (!user) return reply.code(401).send({ error: 'Bạn cần đăng nhập' })
      return reply
        .code(403)
        .send({ error: 'Bạn không có quyền thực hiện thao tác này' })
    }
    const items = await listPlaylistItems(playlist.id)
    return { data: items }
  })

  fastify.post(
    '/api/playlists/:id/items',
    { preHandler: [requireAuth, requirePlaylistOwner] },
    async (req, reply) => {
      const body = req.body || {}
      const videoId = typeof body.videoId === 'string' ? body.videoId : ''
      if (!videoId) return reply.code(400).send({ error: 'Thiếu videoId' })
      const video = await getVideo(videoId)
      if (!video) return reply.code(404).send({ error: 'Video not found' })

      const position = Number.isFinite(Number(body.position))
        ? Math.max(0, Math.trunc(Number(body.position)))
        : 0
      const items = await addPlaylistItem({
        playlistId: req.params.id,
        videoId,
        position
      })
      return reply.code(201).send({ data: items })
    }
  )

  fastify.delete(
    '/api/playlists/:id/items/:videoId',
    { preHandler: [requireAuth, requirePlaylistOwner] },
    async (req) => {
      const items = await removePlaylistItem(req.params.id, req.params.videoId)
      return { data: items }
    }
  )
}
