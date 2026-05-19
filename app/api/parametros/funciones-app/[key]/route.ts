import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'

/**
 * GET /api/parametros/funciones-app/[key]
 * Lee un parámetro específico de nusispar (grupo FUNCIONES_APP).
 * Mobile: apiGet('/parametros/funciones-app/habilitar-autoriz-sin-orden')
 * Requiere Bearer o NextAuth.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const bearer = await requireMobileAuth(req)
  if (bearer.error) {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')
  }

  const { key } = await params

  // Normalizar: kebab-case → PascalCase para coincidir con nusistippa
  // Ej: habilitar-autoriz-sin-orden → HabilitarAutorizSinOrden
  const normalized = key
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('')

  try {
    // Intentar coincidencia exacta primero
    let row = await prisma.nusispar.findUnique({
      where: {
        nusisgrupa_nusistippa: {
          nusisgrupa: 'FUNCIONES_APP',
          nusistippa: normalized,
        },
      },
    })

    // Si no encuentra, buscar case-insensitive
    if (!row) {
      const rows = await prisma.nusispar.findMany({
        where: { nusisgrupa: 'FUNCIONES_APP' },
      })
      row = rows.find(
        (r) => r.nusistippa.trim().toLowerCase() === normalized.toLowerCase()
      ) ?? null
    }

    if (!row) {
      return NextResponse.json({ key, valor: null, habilitado: false }, { status: 404 })
    }

    const valor = row.nusisvalpa.trim()
    return NextResponse.json({
      key: row.nusistippa.trim(),
      valor,
      habilitado: valor === 'S',
    })
  } catch (error) {
    console.error('[GET /api/parametros/funciones-app]', error)
    return NextResponse.json({ key, valor: null, habilitado: false }, { status: 500 })
  }
}
