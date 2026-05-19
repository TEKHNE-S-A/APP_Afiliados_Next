import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const data = await prisma.nulocali.findMany({
    orderBy: { nulocdescr: 'asc' },
  })

  return ok(data)
}
