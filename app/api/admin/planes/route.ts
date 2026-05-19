import { ok, fail } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  try {
    const rows = await prisma.nuplan.findMany({
      select: {
        nuplaid: true,
        nupladescr: true,
        nuplim_gxi: true,
        nuplimfech: true,
      },
      orderBy: { nuplaid: 'asc' },
    })

    const planes = rows.map((p) => ({
      id: p.nuplaid.trim(),
      descripcion: (p.nupladescr ?? '').trim(),
      imagen_url: p.nuplim_gxi ?? null,
      fecha_img: p.nuplimfech ? p.nuplimfech.toISOString() : null,
    }))

    return ok({ planes })
  } catch {
    return fail(500, 'DB_ERROR', 'Error obteniendo planes')
  }
}
