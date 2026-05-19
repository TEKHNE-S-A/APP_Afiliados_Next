import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, context: Context) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')

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
