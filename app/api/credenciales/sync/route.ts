/**
 * GET /api/credenciales/sync
 *
 * Sincroniza credenciales del afiliado.
 * En esta fase: lectura desde BD (sin SOAP). Cuando se integre SOAP,
 * este endpoint se actualizará para disparar el sync real.
 *
 * Respuesta: { credenciales, sync: { inserted, updated, unchanged } }
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

  return NextResponse.json({
    credenciales,
    sync: { inserted: 0, updated: 0, unchanged: credenciales.length },
  })
}
