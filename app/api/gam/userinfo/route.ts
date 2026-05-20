import { fail, ok } from '@/lib/api-response'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { gamGetUserInfo, GamError } from '@/lib/gamClient'

export async function GET(req: Request) {
  const bearer = await requireMobileAuth(req)
  if (bearer.error) return bearer.error

  // El token GAM viaja en Authorization: Bearer <gamToken>
  // (distinto al JWT mobile: en este endpoint se reenvía tal cual a GAM)
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return fail(401, 'UNAUTHORIZED', 'Token de autorización requerido')

  const gamToken = authHeader.substring(7)

  try {
    const data = await gamGetUserInfo(gamToken)
    return ok(data)
  } catch (error) {
    if (error instanceof GamError && error.statusCode === 401) {
      return fail(401, 'GAM_UNAUTHORIZED', 'Token inválido o expirado')
    }
    console.error('[GAM userinfo]', error)
    return fail(500, 'INTERNAL_ERROR', 'Error inesperado en GAM userinfo')
  }
}
