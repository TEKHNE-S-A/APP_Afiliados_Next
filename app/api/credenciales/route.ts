import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fail } from '@/lib/api-response'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { mapCredenciales } from '@/lib/credencial-mapper'

async function fetchCredenciales(userId: string) {
  return prisma.crcredus.findMany({
    where: { nuusuid: userId },
    include: { crcreden: { include: { nuplan: true } } },
    orderBy: { crcreden: { crcreifech: 'desc' } },
  })
}

/**
 * GET /api/credenciales
 * Acepta tanto sesión NextAuth (web) como Bearer token (mobile).
 * Respuesta: { credenciales: [...] }  ← formato mobile
 */
export async function GET(req: Request) {
  // Intentar Bearer primero (mobile), luego sesión NextAuth (web)
  const bearer = await requireMobileAuth(req)
  let userId: string

  if (!bearer.error) {
    userId = bearer.payload.sub
  } else {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')
    userId = session.user.id
  }

  const rows = await fetchCredenciales(userId)
  const credenciales = mapCredenciales(rows)
  return NextResponse.json({ credenciales })
}
