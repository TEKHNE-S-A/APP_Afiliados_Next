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
 * PUT /api/notifications/[id]/mark-read
 * Mobile: response.notification
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  const { id } = await params

  const existing = await prisma.notifications.findFirst({
    where: { id, nuusuid: res.userId },
  })
  if (!existing) return fail(404, 'NOT_FOUND', 'Notificación no encontrada')

  const updated = await prisma.notifications.update({
    where: { id },
    data: { leida: true, fecha_leida: new Date() },
  })

  return NextResponse.json({
    notification: {
      id: updated.id,
      tipo: updated.tipo,
      titulo: updated.titulo,
      mensaje: updated.mensaje,
      leida: updated.leida ?? true,
      fecha_creacion: updated.fecha_creacion?.toISOString() ?? null,
      fecha_leida: updated.fecha_leida?.toISOString() ?? null,
      metadata: updated.metadata,
    },
  })
}
