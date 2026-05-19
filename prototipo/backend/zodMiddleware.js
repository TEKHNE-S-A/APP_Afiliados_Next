const { ZodError } = require('zod')

function toZodIssues(error) {
  if (!error) return []
  if (error instanceof ZodError) {
    return error.issues.map((i) => ({
      path: i.path?.join('.') || '',
      code: i.code,
      message: i.message
    }))
  }
  return []
}

function sendValidationError(res, error, context) {
  return res.status(422).json({
    error: 'VALIDATION_ERROR',
    message: 'Solicitud inválida',
    context: context || null,
    issues: toZodIssues(error)
  })
}

function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      return sendValidationError(res, error, 'body')
    }
  }
}

function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query)
      next()
    } catch (error) {
      return sendValidationError(res, error, 'query')
    }
  }
}

function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params)
      next()
    } catch (error) {
      return sendValidationError(res, error, 'params')
    }
  }
}

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  sendValidationError
}
