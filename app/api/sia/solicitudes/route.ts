import { auth } from '@/lib/auth'
import { fail, ok } from '@/lib/api-response'
import { httpClient, HttpError } from '@/lib/httpClient'
import { z } from 'zod'

const createSolicitudSiaSchema = z.object({
  payload: z.record(z.unknown()),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON invalido')
  }

  const parsed = createSolicitudSiaSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos invalidos', parsed.error.flatten())
  }

  try {
    const data = await httpClient.post<unknown>('/sia/solicitudes', parsed.data.payload, {
      token: session.user.accessToken,
    })
    return ok(data, 201)
  } catch (error) {
    if (error instanceof HttpError) {
      return fail(error.status, 'BACKEND_ERROR', 'Error en backend SIA', error.body)
    }
    return fail(500, 'INTERNAL_ERROR', 'Error inesperado al crear solicitud SIA')
  }
}
