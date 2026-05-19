import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const url = new URL(req.url)
  const rubroid = (url.searchParams.get('rubroid') ?? '').trim()

  const data = await prisma.caespeci.findMany({
    where: rubroid ? { carubid: rubroid } : undefined,
    orderBy: { caespdescr: 'asc' },
  })

  return ok(data)
}
