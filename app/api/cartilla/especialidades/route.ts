import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')

  const url = new URL(req.url)
  const rubroid = (url.searchParams.get('rubroid') ?? '').trim()

  const data = await prisma.caespeci.findMany({
    where: rubroid ? { carubid: rubroid } : undefined,
    orderBy: { caespdescr: 'asc' },
  })

  return ok(data)
}
