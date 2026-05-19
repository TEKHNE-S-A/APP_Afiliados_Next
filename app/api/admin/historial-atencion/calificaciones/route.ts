import { ok, fail } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)))
  const puntuacion = url.searchParams.get('puntuacion') ?? ''
  const q = url.searchParams.get('q') ?? ''
  const offset = (page - 1) * limit

  try {
    type Row = {
      id: number; nuusuid: string; afiliado_id: string; atencion_id: string
      entidad_id: string | null; entidad_nombre: string | null
      puntuacion: number; comentario: string | null; created_at: Date
      usuario_email: string | null; usuario_nombre: string | null
    }
    type CountRow = { total: bigint }
    const puntuacionNum = puntuacion ? parseInt(puntuacion, 10) : null

    const [items, countRows] = await Promise.all([
      prisma.$queryRaw<Row[]>`
        SELECT c.id, c.nuusuid, c.afiliado_id, c.atencion_id,
               c.entidad_id, c.entidad_nombre, c.puntuacion, c.comentario, c.created_at,
               u.nuusumail AS usuario_email,
               TRIM(u.nuusuapell) AS usuario_nombre
        FROM app_calificaciones c
        LEFT JOIN nuusuari u ON u.nuusuid = c.nuusuid
        WHERE (${puntuacionNum}::int IS NULL OR c.puntuacion = ${puntuacionNum}::int)
          AND (${q} = '' OR c.afiliado_id ILIKE ${'%' + q + '%'}
               OR c.entidad_nombre ILIKE ${'%' + q + '%'})
        ORDER BY c.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::bigint AS total FROM app_calificaciones
        WHERE (${puntuacionNum}::int IS NULL OR puntuacion = ${puntuacionNum}::int)
          AND (${q} = '' OR afiliado_id ILIKE ${'%' + q + '%'}
               OR entidad_nombre ILIKE ${'%' + q + '%'})
      `,
    ])

    const total = Number((countRows[0] as CountRow)?.total ?? 0)
    return ok({
      items: items.map(r => ({ ...r, created_at: r.created_at.toISOString() })),
      pagination: { page, limit, total },
    })
  } catch {
    return fail(500, 'DB_ERROR', 'Error obteniendo calificaciones')
  }
}
