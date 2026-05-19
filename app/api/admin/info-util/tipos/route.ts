import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const groups = await prisma.noinfuti.groupBy({
    by: ['noinftipo'],
    _count: { _all: true },
    orderBy: [{ noinftipo: 'asc' }],
  })

  const codeToTipo: Record<string, string> = { T: 'tel', L: 'link', D: 'direccion', X: 'text' }

  const tipos = groups.map((g) => ({
    noinftipo: codeToTipo[g.noinftipo.trim().toUpperCase()] ?? g.noinftipo.trim(),
    count: g._count._all,
  }))

  return ok({ tipos })
}
