import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fail, ok, parsePagination } from '@/lib/api-response'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')

  const url = new URL(req.url)
  const { take, skip } = parsePagination(url, { take: 20, maxTake: 100 })
  const q = (url.searchParams.get('q') ?? '').trim()
  const rubro = (url.searchParams.get('rubro') ?? '').trim()
  const especialidad = (url.searchParams.get('especialidad') ?? '').trim()
  const localidad = (url.searchParams.get('localidad') ?? '').trim()

  const where = {
    caentactivo: true,
    ...(q
      ? {
          OR: [
            { caentapeno: { contains: q, mode: 'insensitive' as const } },
            { caentmail: { contains: q, mode: 'insensitive' as const } },
            { caentmatri: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(rubro ? { carubid: rubro } : {}),
    ...(especialidad ? { caespid: especialidad } : {}),
    ...(localidad
      ? {
          caendire: {
            some: {
              nulocid: localidad,
            },
          },
        }
      : {}),
  }

  const [data, total] = await prisma.$transaction([
    prisma.caentida.findMany({
      where,
      include: {
        caendire: {
          include: {
            caentele: true,
            nulocali: true,
          },
        },
      },
      orderBy: [{ caentprior: 'desc' }, { caentapeno: 'asc' }],
      take,
      skip,
    }),
    prisma.caentida.count({ where }),
  ])

  return ok({ data, total, take, skip })
}
