import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'
import { NextResponse } from 'next/server'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { executeSIA, parseSoapResult } from '@/lib/siaClient'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  let nuusuid: string | null = null

  const bearer = await requireMobileAuth(req)
  if (!bearer.error) {
    nuusuid = bearer.payload.sub
  } else {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')
    nuusuid = session.user.id
  }

  if (!nuusuid) return fail(401, 'UNAUTHORIZED', 'Sesion invalida')

  const url = new URL(req.url)
  const AfiliadoIdQuery = url.searchParams.get('AfiliadoId')

  let afiliadoId = AfiliadoIdQuery?.trim() ?? null
  if (!afiliadoId) {
    const user = await prisma.nuusuari.findUnique({ where: { nuusuid }, select: { nuusuafili: true } })
    if (!user?.nuusuafili) return fail(400, 'NO_AFILIADO_ID', 'Usuario sin AfiliadoId asociado')
    afiliadoId = user.nuusuafili.trim()
  }

  try {
    const result = await executeSIA('ENROLAMIENTOS_AFILIADO_APP', { AfiliadoId: afiliadoId })
    const parsed = parseSoapResult(result)
    if (!parsed.ok) return fail(400, 'SIA_ERROR', parsed.errorDsc ?? 'Error en servicio SIA', { mensajes: parsed.mensajes })
    return NextResponse.json({ success: true, data: parsed.payload })
  } catch (error) {
    console.error('[SIA enrolamientos-afiliado]', error)
    return fail(500, 'INTERNAL_ERROR', 'Error inesperado en enrolamientos')
  }
}
