import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'

/**
 * GET /api/home/botonera — Configuración de la botonera del home (Bearer o NextAuth)
 * Lee BOTONERA_PRINCIPAL.Botones desde nusispar y filtra por feature flags FUNCIONES_APP.
 * Mobile: response.data as HomeBotoneraResponse  OR  response as HomeBotoneraResponse
 *
 * Si no hay config en BD devuelve 404 para que el mobile use sus defaults offline.
 */
export async function GET(req: Request) {
  // Auth: aceptar Bearer (mobile) o NextAuth (web)
  const bearer = await requireMobileAuth(req)
  if (bearer.error) {
    const session = await auth()
    if (!session) {
      return fail(401, 'UNAUTHORIZED', 'Sesión requerida')
    }
  }

  try {
    // 1. Leer JSON de botones desde nusispar
    const botoneraRow = await prisma.nusispar.findUnique({
      where: {
        nusisgrupa_nusistippa: {
          nusisgrupa: 'BOTONERA_PRINCIPAL',
          nusistippa: 'Botones',
        },
      },
    })

    if (!botoneraRow) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Botonera no configurada' }, { status: 404 })
    }

    let botones: unknown[]
    try {
      botones = JSON.parse(botoneraRow.nusisvalpa)
      if (!Array.isArray(botones)) throw new Error('not array')
    } catch {
      return NextResponse.json({ error: 'INVALID_DATA', message: 'Formato de botonera inválido' }, { status: 500 })
    }

    // 2. Leer feature flags para filtrar botones deshabilitados
    const flagRows = await prisma.nusispar.findMany({
      where: { nusisgrupa: 'FUNCIONES_APP' },
      select: { nusistippa: true, nusisvalpa: true },
    })
    const flags: Record<string, string> = {}
    for (const r of flagRows) {
      flags[r.nusistippa.trim()] = r.nusisvalpa.trim()
    }

    // 3. Filtrar botones según featureFlagKey
    const botonesActivos = (botones as Array<Record<string, unknown>>).filter((btn) => {
      const flagKey = btn.featureFlagKey as string | undefined
      if (!flagKey) return true // sin flag → siempre visible
      const val = flags[flagKey]
      // Default: habilitado si no hay registro en BD
      return val === undefined ? true : val === 'S'
    })

    const response = {
      botones: botonesActivos,
      generadoEn: new Date().toISOString(),
      version: 1,
    }

    return NextResponse.json({ data: response })
  } catch (error) {
    console.error('[GET /api/home/botonera]', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Error al cargar botonera' }, { status: 500 })
  }
}
