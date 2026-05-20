import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'
import { NextResponse } from 'next/server'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { executeSIA, parseSoapResult } from '@/lib/siaClient'

export async function POST(req: Request) {
  const bearer = await requireMobileAuth(req)
  if (bearer.error) {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* empty body ok */ }

  try {
    const result = await executeSIA('CREAR_SOLICITUD_APP', body)
    const parsed = parseSoapResult(result)
    if (!parsed.ok) return fail(400, 'SIA_ERROR', parsed.errorDsc ?? 'Error en servicio SIA', { mensajes: parsed.mensajes })
    return NextResponse.json({ success: true, data: parsed.payload })
  } catch (error) {
    console.error('[SIA crear-solicitud]', error)
    return fail(500, 'INTERNAL_ERROR', 'Error inesperado en crear solicitud')
  }
}
