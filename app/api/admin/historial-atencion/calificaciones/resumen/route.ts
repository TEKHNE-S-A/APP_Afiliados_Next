import { ok, fail } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  try {
    type ResumenRow = {
      total: bigint; promedio: string | null
      estrellas_1: bigint; estrellas_2: bigint; estrellas_3: bigint
      estrellas_4: bigint; estrellas_5: bigint
    }
    const rows = await prisma.$queryRaw<ResumenRow[]>`
      SELECT
        COUNT(*)::bigint AS total,
        AVG(puntuacion::numeric)::text AS promedio,
        COUNT(*) FILTER (WHERE puntuacion = 1)::bigint AS estrellas_1,
        COUNT(*) FILTER (WHERE puntuacion = 2)::bigint AS estrellas_2,
        COUNT(*) FILTER (WHERE puntuacion = 3)::bigint AS estrellas_3,
        COUNT(*) FILTER (WHERE puntuacion = 4)::bigint AS estrellas_4,
        COUNT(*) FILTER (WHERE puntuacion = 5)::bigint AS estrellas_5
      FROM app_calificaciones
    `
    const r = rows[0]
    return ok({
      resumen: {
        total: Number(r?.total ?? 0),
        promedio: r?.promedio != null ? parseFloat(r.promedio) : null,
        estrellas_1: Number(r?.estrellas_1 ?? 0),
        estrellas_2: Number(r?.estrellas_2 ?? 0),
        estrellas_3: Number(r?.estrellas_3 ?? 0),
        estrellas_4: Number(r?.estrellas_4 ?? 0),
        estrellas_5: Number(r?.estrellas_5 ?? 0),
      },
    })
  } catch {
    return fail(500, 'DB_ERROR', 'Error obteniendo resumen de calificaciones')
  }
}
