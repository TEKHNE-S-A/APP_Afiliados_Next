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
 * POST /api/notifications/mark-all-read
 * Mobile: response.success, response.count, response.message
 */
export async function POST(req: Request) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  const result = await prisma.notifications.updateMany({
    where: { nuusuid: res.userId, leida: false },
    data: { leida: true, fecha_leida: new Date() },
  })

  return NextResponse.json({
    success: true,
    count: result.count,
    message: `${result.count} notificaciones marcadas como leídas`,
  })
}
