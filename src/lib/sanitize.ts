import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS: sanitizeHtml.IOptions['allowedTags'] = []
const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {}

/**
 * Elimina todo HTML/JS de un string de texto libre provisto por el usuario.
 * Usar en cualquier campo de texto antes de persistir en BD.
 */
export function sanitize(value: unknown): string {
  if (typeof value !== 'string') return ''
  return sanitizeHtml(value.trim(), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
  })
}

/**
 * Sanitiza un objeto: aplica `sanitize()` a cada propiedad string.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    result[key] = typeof val === 'string' ? sanitize(val) : val
  }
  return result as T
}
