import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'
import { NextResponse } from 'next/server'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { executeSIA, parseSoapResult } from '@/lib/siaClient'
import { z } from 'zod'

const createSolicitudSiaSchema = z.object({
  payload: z.record(z.unknown()),
})

export async function POST(req: Request) {
  const bearer = await requireMobileAuth(req)
  if (bearer.error) {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')
  }

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
    const result = await executeSIA('REC_SOLICITUDES_APP', parsed.data.payload)
    const siaResult = parseSoapResult(result)
    if (!siaResult.ok) return fail(400, 'SIA_ERROR', siaResult.errorDsc ?? 'Error en servicio SIA', { mensajes: siaResult.mensajes })
    return NextResponse.json({ success: true, data: siaResult.payload }, { status: 201 })
  } catch (error) {
    console.error('[SIA solicitudes]', error)
    return fail(500, 'INTERNAL_ERROR', 'Error inesperado al crear solicitud SIA')
  }
}
