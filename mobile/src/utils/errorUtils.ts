import { isNetworkError, TimeoutError } from '../services/api'

// Patrones técnicos que nunca deben mostrarse al usuario final
const TECHNICAL_PATTERNS = [
  'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'ENOTCONN', 'ENETUNREACH',
  'SyntaxError', 'TypeError', 'Cannot read propert', 'Cannot set propert',
  'unexpected token', 'JSON.parse', ' at Object.', ' at Function.',
  'localhost:', '10.0.2.2:', '192.168.', 'Error en el servidor (',
  'Error de autenticación:', 'SOAP', 'stack trace',
]

function isTechnical(msg: string): boolean {
  return TECHNICAL_PATTERNS.some(p => msg.includes(p))
}

/**
 * Normaliza cualquier error en un mensaje amigable para el usuario final.
 * Nunca expone mensajes técnicos, stack traces ni detalles internos del backend.
 *
 * @param error    El error capturado en un catch
 * @param fallback Mensaje genérico de fallback (opcional)
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error. Por favor intentá nuevamente.'
): string {
  // Sin conexión / red
  if (isNetworkError(error)) {
    return 'Sin conexión a internet. Verificá tu conexión e intentá nuevamente.'
  }

  // Timeout
  if (error instanceof TimeoutError) {
    return 'La solicitud tardó demasiado. Verificá tu conexión e intentá nuevamente.'
  }

  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>
    const msg = typeof e['message'] === 'string' ? e['message'] : null

    if (msg) {
      // Mapear patrones conocidos a mensajes amigables
      if (msg.includes('Usuario no encontrado')) {
        return 'Usuario no encontrado. Verificá tus credenciales o registrate.'
      }
      if (
        msg.includes('incorrectos') ||
        msg.includes('Contraseña incorrecta') ||
        msg.includes('credenciales inválidas')
      ) {
        return 'Usuario o contraseña incorrectos.'
      }
      if (msg.includes('TOKEN_EXPIRED') || msg.toLowerCase().includes('sesión ha expirado')) {
        return 'Tu sesión ha expirado. Por favor iniciá sesión nuevamente.'
      }
      if (msg.toLowerCase().includes('vencida')) {
        return 'La credencial está vencida. Conectate a internet para actualizarla.'
      }
      if (msg.toLowerCase().includes('no autorizado') || msg.includes('Unauthorized')) {
        return 'No tenés permiso para realizar esta acción.'
      }
      // Filtrar mensajes técnicos → devolver fallback
      if (isTechnical(msg)) return fallback
      // Mensaje legible proveniente del backend
      return msg
    }
  }

  return fallback
}
