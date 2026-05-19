import { auth } from '@/lib/auth'
import { fail, ok } from '@/lib/api-response'
import { httpClient, HttpError } from '@/lib/httpClient'
import { requireMobileAuth } from '@/lib/require-mobile-auth'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let proxyToken = ''
  const bearer = await requireMobileAuth(req)
  if (!bearer.error) {
    proxyToken = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  } else {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')
    proxyToken = session.user.accessToken
  }

  const { id } = await params
  try {
    const data = await httpClient.get<unknown>(`/mis-autorizaciones/${id}/fotos`, { token: proxyToken })
    return ok(data)
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, 'BACKEND_ERROR', 'Error en backend', error.body)
    return fail(500, 'INTERNAL_ERROR', 'Error inesperado en fotos de autorización')
  }
}
