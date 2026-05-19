/**
 * GET /api/credenciales/refresh
 *
 * Regenera tokens temporales en credenciales ya cargadas.
 * Misma lógica que /sync — retorna credenciales frescas desde BD.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fail } from '@/lib/api-response'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { mapCredenciales } from '@/lib/credencial-mapper'

export async function GET(req: Request) {
  const auth = await requireMobileAuth(req)
  if (auth.error) return auth.error

  const rows = await prisma.crcredus.findMany({
    where: { nuusuid: auth.payload.sub },
    include: { crcreden: { include: { nuplan: true } } },
    orderBy: { crcreden: { crcreifech: 'desc' } },
  })

  const credenciales = mapCredenciales(rows)
  return NextResponse.json({ credenciales })
}
