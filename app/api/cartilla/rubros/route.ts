import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'

export async function GET() {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')

  const data = await prisma.carubro.findMany({
    orderBy: { carubdescr: 'asc' },
  })

  return ok(data)
}
