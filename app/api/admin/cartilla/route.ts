import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'

/**
 * GET /api/admin/cartilla
 * Resumen de estadísticas del módulo cartilla.
 * Usado también como health-check por el diagnóstico de conectividad.
 */
export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const [entidades, entidadesActivas, rubros, especialidades] = await prisma.$transaction([
    prisma.caentida.count(),
    prisma.caentida.count({ where: { caentactivo: true } }),
    prisma.carubro.count(),
    prisma.caespeci.count(),
  ])

  return ok({
    entidades,
    entidadesActivas,
    rubros,
    especialidades,
  })
}
