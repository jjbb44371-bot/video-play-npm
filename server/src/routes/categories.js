import { listCategories, getCategory, createCategory } from '../store.js'
import { requireAuth } from '../auth/index.js'

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export default async function categoryRoutes(fastify) {
  fastify.get('/api/categories', async () => {
    const categories = await listCategories()
    return { data: categories }
  })

  fastify.get('/api/categories/:id', async (req, reply) => {
    const category = await getCategory(req.params.id)
    if (!category) return reply.code(404).send({ error: 'Category not found' })
    return { data: category }
  })

  fastify.post(
    '/api/categories',
    { preHandler: requireAuth },
    async (req, reply) => {
      const body = req.body || {}
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      const description =
        typeof body.description === 'string' ? body.description.trim() : ''
      if (!name) return reply.code(400).send({ error: 'Tên danh mục là bắt buộc' })

      const slug = slugify(body.slug || name)
      if (!slug) {
        return reply.code(400).send({ error: 'Slug danh mục không hợp lệ' })
      }

      const existing = (await listCategories()).find(
        (c) => c.slug === slug || c.name.toLowerCase() === name.toLowerCase()
      )
      if (existing) {
        return reply.code(409).send({ error: 'Danh mục đã tồn tại' })
      }

      const category = await createCategory({ name, slug, description })
      return reply.code(201).send({ data: category })
    }
  )
}
