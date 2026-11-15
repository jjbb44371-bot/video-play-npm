export function ok(reply, data, code = 200) {
  return reply.code(code).send({ data })
}

export function setErrorHandler(fastify) {
  fastify.setErrorHandler((err, req, reply) => {
    // Fastify validation errors (from Ajv schemas)
    if (err.validation) {
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: err.message, details: err.validation }
      })
    }

    // Rate limit exceeded
    if (err.statusCode === 429 || err.code === 'FST_ERR_RATE_LIMIT') {
      return reply.code(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many requests' }
      })
    }

    const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500
    if (statusCode >= 500) {
      req.log.error({ err }, 'unhandled error')
    }

    const message = statusCode >= 500 ? 'Internal server error' : (err.message || 'Request failed')
    return reply.code(statusCode).send({
      error: { code: err.code || 'ERROR', message }
    })
  })
}
