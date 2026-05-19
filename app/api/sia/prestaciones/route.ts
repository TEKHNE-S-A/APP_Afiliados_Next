import { auth } from '@/lib/auth'
import { fail, ok } from '@/lib/api-response'
import { httpClient, HttpError } from '@/lib/httpClient'
import { requireMobileAuth } from '@/lib/require-mobile-auth'

export async function POST(req: Request) {
  let proxyToken = ''
  const bearer = await requireMobileAuth(req)
  if (!bearer.error) {
    proxyToken = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  } else {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')
    proxyToken = session.user.accessToken
  }

  let body: unknown = {}
  try { body = await req.json() } catch { /* empty body ok */ }

  try {
    const data = await httpClient.post<unknown>('/sia/prestaciones', body, { token: proxyToken })
    return ok(data)
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, 'BACKEND_ERROR', 'Error en backend SIA', error.body)
    return fail(500, 'INTERNAL_ERROR', 'Error inesperado en prestaciones')
  }
}
