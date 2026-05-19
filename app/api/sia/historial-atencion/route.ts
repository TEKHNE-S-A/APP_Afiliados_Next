import { auth } from '@/lib/auth'
import { fail, ok } from '@/lib/api-response'
import { httpClient, HttpError } from '@/lib/httpClient'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')

  const qs = new URL(req.url).search

  try {
    const data = await httpClient.get<unknown>(`/sia/historial-atencion${qs}`, {
      token: session.user.accessToken,
    })
    return ok(data)
  } catch (error) {
    if (error instanceof HttpError) {
      return fail(error.status, 'BACKEND_ERROR', 'Error en backend SIA', error.body)
    }
    return fail(500, 'INTERNAL_ERROR', 'Error inesperado en historial de atencion')
  }
}
