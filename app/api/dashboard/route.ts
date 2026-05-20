import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'

/**
 * GET /api/dashboard — Datos del dashboard del afiliado (Bearer o NextAuth)
 * Mobile: response.data — { saldo, plan, estado, proximoTurno?, tramitesPendientes, notificacionesNoLeidas }
 */
export async function GET(req: Request) {
  let userId: string
  let planDesc = ''

  const bearer = await requireMobileAuth(req)
  if (!bearer.error) {
    userId = bearer.payload.sub
  } else {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')
    userId = session.user.id
  }

  try {
    // Notificaciones no leídas
    const notifCount = await prisma.notifications.count({
      where: { nuusuid: userId, leida: false },
    })

    // Solicitudes pendientes
    const tramitesPendientes = await prisma.ausolici.count({
      where: { nuusuid: userId, ausolestad: 'Pendiente' },
    })

    // Plan del usuario
    const usuario = await prisma.nuusuari.findFirst({
      where: { nuusuid: userId },
      select: { nuplan: { select: { nupladescr: true } } },
    })
    planDesc = usuario?.nuplan?.nupladescr?.trim() ?? ''

    const dashboard = {
      saldo: 0,
      plan: planDesc,
      estado: 'Activo',
      proximoTurno: null,
      tramitesPendientes,
      notificacionesNoLeidas: notifCount,
    }

    return NextResponse.json({ data: dashboard })
  } catch (error) {
    console.error('[GET /api/dashboard]', error)
    return NextResponse.json(
      { data: { saldo: 0, plan: '', estado: 'Activo', proximoTurno: null, tramitesPendientes: 0, notificacionesNoLeidas: 0 } },
      { status: 500 }
    )
  }
}
