import { auth } from '@/lib/auth'
import { fail, ok } from '@/lib/api-response'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { gamCancelRegistration, GamError } from '@/lib/gamClient'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  let nuusuid: string | null = null
  let authType: 'mobile' | 'session' = 'session'

  const bearer = await requireMobileAuth(req)
  if (!bearer.error) {
    nuusuid = bearer.payload.sub
    authType = 'mobile'
  } else {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')
    nuusuid = session.user.id
  }

  if (!nuusuid) return fail(400, 'BAD_REQUEST', 'No se pudo determinar el ID del usuario')

  // Detectar si es usuario GAM (UUID) o legacy (numérico)
  const isGAMUser = !/^\d+$/.test(nuusuid)

  if (isGAMUser) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return fail(400, 'GAM_TOKEN_REQUIRED', 'Usuario GAM requiere token activo para anular. Cierre sesión e inicie nuevamente.')
    }
    const accessToken = authHeader.substring(7)
    try {
      await gamCancelRegistration(accessToken)
    } catch (error) {
      if (error instanceof GamError) {
        return fail(error.statusCode >= 500 ? 500 : 400, 'GAM_ERROR', error.message)
      }
      console.error('[GAM cancel-registration]', error)
      return fail(500, 'INTERNAL_ERROR', 'Error al anular en GAM')
    }
  }

  // Desactivar en BD local
  const motivo = isGAMUser
    ? `Usuario GAM anuló su registración desde la app (UserID GAM: ${nuusuid})`
    : `Usuario legacy anuló su registración desde la app (nuusuid: ${nuusuid})`

  try {
    await prisma.$executeRaw`SELECT * FROM desactivar_usuario(${nuusuid}, ${motivo})`
  } catch (error) {
    console.error('[GAM cancel-registration] Error desactivando usuario en BD:', error)
    return fail(500, 'INTERNAL_ERROR', 'Error al desactivar usuario en base de datos')
  }

  return ok({ success: true, message: 'Registración anulada exitosamente. Su cuenta ha sido desactivada.' })
}
