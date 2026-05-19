import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'
import { requireMobileAuth } from '@/lib/require-mobile-auth'

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, context: Context) {
  const bearer = await requireMobileAuth(req)
  if (bearer.error) {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')
  }

  const { id } = await context.params

  const data = await prisma.caentida.findFirst({
    where: { caentid: id, caentactivo: true },
    include: {
      caendire: {
        include: {
          caentele: true,
          nulocali: true,
        },
      },
    },
  })

  if (!data) return fail(404, 'NOT_FOUND', 'Entidad no encontrada')
  return ok(data)
}
