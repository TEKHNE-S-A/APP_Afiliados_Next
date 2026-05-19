import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  type CountRow = { val: bigint }

  const [total, noLeidas, leidas, usuariosRows] = await Promise.all([
    prisma.notifications.count(),
    prisma.notifications.count({ where: { leida: false } }),
    prisma.notifications.count({ where: { leida: true } }),
    prisma.$queryRaw<CountRow[]>`SELECT COUNT(DISTINCT nuusuid)::bigint AS val FROM notifications`,
  ])

  return ok({
    total,
    unread: noLeidas,
    noLeidas,
    leidas,
    usuariosConNotificaciones: Number((usuariosRows[0] as CountRow)?.val ?? 0),
  })
}
