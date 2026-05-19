import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'

async function resolveUserId(req: Request): Promise<{ userId: string } | { error: NextResponse }> {
  const bearer = await requireMobileAuth(req)
  if (!bearer.error) return { userId: bearer.payload.sub }
  const session = await auth()
  if (!session) return { error: fail(401, 'UNAUTHORIZED', 'Sesión requerida') }
  return { userId: session.user.id }
}

/**
 * DELETE /api/me/favoritos/[caentid]
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ caentid: string }> }
) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  const { caentid } = await params

  await prisma.nu_favoritos_prestadores.deleteMany({
    where: { nuusuid: res.userId, caentid, tipo: 'favorito' },
  })

  return NextResponse.json({ ok: true })
}
