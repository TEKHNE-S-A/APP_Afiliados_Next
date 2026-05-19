import { z } from 'zod'
import { fail, ok } from '@/lib/api-response'
import { httpClient, HttpError } from '@/lib/httpClient'

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
  dni: z.string().max(20).optional().default(''),
  cuil: z.string().max(20).optional().default(''),
  nroAfiliado: z.string().max(40).optional().default(''),
  sexo: z.string().max(1).optional().default('M'),
  fechaNacimiento: z.string().max(20),
  cantidadIntegrantes: z.number().int().min(1).optional().default(1),
  telefono: z.string().max(30).optional().default(''),
  registracionconnroafiliado: z.string().max(1).optional(),
  registracioncondni: z.string().max(1).optional(),
  registracionconcuil: z.string().max(1).optional(),
})

/**
 * POST /api/register
 * Proxea el registro al backend legacy que hace SOAP → GAM → PostgreSQL
 */
export async function POST(req: Request) {
  let body: unknown
  try { body = await req.json() } catch {
    return fail(400, 'BAD_REQUEST', 'Cuerpo de solicitud inválido')
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return fail(400, 'VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Datos inválidos')
  }

  try {
    const data = await httpClient.post<unknown>('/register', parsed.data, { token: '' })
    return ok(data)
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, 'BACKEND_ERROR', error.body?.message ?? 'Error en registro', error.body)
    return fail(500, 'INTERNAL_ERROR', 'Error inesperado en registro')
  }
}
