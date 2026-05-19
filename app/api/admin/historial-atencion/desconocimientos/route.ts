import { ok, fail } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)))
  const estado = url.searchParams.get('estado') ?? ''
  const q = url.searchParams.get('q') ?? ''
  const offset = (page - 1) * limit

  try {
    type Row = {
      id: number; nuusuid: string; afiliado_id: string; atencion_id: string
      nro_delegacion: string | null; nro_autorizacion: string | null
      prestador_nombre: string | null; motivo: string; descripcion: string | null
      estado: string; created_at: Date; updated_at: Date
      usuario_email: string | null; usuario_nombre: string | null
    }
    type CountRow = { total: bigint }

    const [items, countRows] = await Promise.all([
      prisma.$queryRaw<Row[]>`
        SELECT d.id, d.nuusuid, d.afiliado_id, d.atencion_id,
               d.nro_delegacion, d.nro_autorizacion, d.prestador_nombre,
               d.motivo, d.descripcion, d.estado, d.created_at, d.updated_at,
               u.nuusumail AS usuario_email,
               TRIM(u.nuusuapell) AS usuario_nombre
        FROM app_desconocimientos d
        LEFT JOIN nuusuari u ON u.nuusuid = d.nuusuid
        WHERE (${estado} = '' OR d.estado = ${estado})
          AND (${q} = '' OR d.afiliado_id ILIKE ${'%' + q + '%'}
               OR d.prestador_nombre ILIKE ${'%' + q + '%'})
        ORDER BY d.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::bigint AS total FROM app_desconocimientos
        WHERE (${estado} = '' OR estado = ${estado})
          AND (${q} = '' OR afiliado_id ILIKE ${'%' + q + '%'}
               OR prestador_nombre ILIKE ${'%' + q + '%'})
      `,
    ])

    const total = Number((countRows[0] as CountRow)?.total ?? 0)
    return ok({
      items: items.map(r => ({ ...r, created_at: r.created_at.toISOString(), updated_at: r.updated_at.toISOString() })),
      pagination: { page, limit, total },
    })
  } catch {
    return fail(500, 'DB_ERROR', 'Error obteniendo desconocimientos')
  }
}
