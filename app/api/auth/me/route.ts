/**
 * GET  /api/auth/me — Perfil del usuario autenticado (Bearer token).
 * La mobile también espera este contrato desde /auth/me.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fail } from '@/lib/api-response'
import { requireMobileAuth } from '@/lib/require-mobile-auth'

export async function GET(req: Request) {
  const auth = await requireMobileAuth(req)
  if (auth.error) return auth.error

  const user = await prisma.nuusuari.findUnique({
    where: { nuusuid: auth.payload.sub },
    select: {
      nuusuid:   true,
      nuusumail: true,
      nuusuapell: true,
      nuusunroaf: true,
      nuplaid:   true,
      nurolid:   true,
      nuusuactiv: true,
    },
  })

  if (!user || user.nuusuactiv !== 'S') {
    return fail(401, 'UNAUTHORIZED', 'Usuario inactivo o no encontrado')
  }

  return NextResponse.json({
    id:          user.nuusuid,
    username:    user.nuusumail,
    email:       user.nuusumail,
    name:        user.nuusuapell.trim(),
    role:        auth.payload.role,
    nroAfiliado: user.nuusunroaf?.trim() ?? '',
    planId:      user.nuplaid?.trim() ?? null,
  })
}
