import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'
import { NextResponse } from 'next/server'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { executeSIA, parseSoapResult } from '@/lib/siaClient'

export async function GET(req: Request) {
  const bearer = await requireMobileAuth(req)
  if (bearer.error) {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')
  }

  const url = new URL(req.url)
  const NumeroDelegacion = url.searchParams.get('NumeroDelegacion')
  const NumeroAutorizacion = url.searchParams.get('NumeroAutorizacion')

  if (!NumeroDelegacion || !NumeroAutorizacion) {
    return fail(400, 'VALIDATION_ERROR', 'NumeroDelegacion y NumeroAutorizacion son requeridos')
  }

  try {
    const result = await executeSIA('AUDETALLE_CONSUMO_APP', {
      NumeroDelegacion: parseInt(NumeroDelegacion),
      NumeroAutorizacion: parseInt(NumeroAutorizacion),
    })
    const parsed = parseSoapResult(result)
    if (!parsed.ok) return fail(400, 'SIA_ERROR', parsed.errorDsc ?? 'Error en servicio SIA', { mensajes: parsed.mensajes })
    return NextResponse.json({ success: true, data: parsed.payload })
  } catch (error) {
    console.error('[SIA detalle-consumo]', error)
    return fail(500, 'INTERNAL_ERROR', 'Error inesperado en detalle de consumo')
  }
}
