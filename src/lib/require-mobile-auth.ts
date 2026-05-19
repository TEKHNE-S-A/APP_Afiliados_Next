/**
 * require-mobile-auth.ts — Guards para rutas API consumidas por la app mobile.
 *
 * La mobile envía Authorization: Bearer <jwt> (no cookies NextAuth).
 * Estas helpers validan el token y retornan el payload o un error estructurado.
 */
import { fail } from '@/lib/api-response'
import { verifyBearerToken, type MobileTokenPayload } from '@/lib/mobile-jwt'

type MobileAuthFailure = { error: ReturnType<typeof fail>; payload?: undefined }
type MobileAuthSuccess = { error?: undefined; payload: MobileTokenPayload }
export type MobileAuthResult = MobileAuthFailure | MobileAuthSuccess

export async function requireMobileAuth(req: Request): Promise<MobileAuthResult> {
  const payload = await verifyBearerToken(req)
  if (!payload) {
    return { error: fail(401, 'UNAUTHORIZED', 'Token inválido o ausente') }
  }
  return { payload }
}
