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
 * GET /api/notifications/unread-count
 * Mobile: response.unreadCount
 */
export async function GET(req: Request) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  const unreadCount = await prisma.notifications.count({
    where: { nuusuid: res.userId, leida: false },
  })

  return NextResponse.json({ unreadCount })
}
