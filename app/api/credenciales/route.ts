import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fail, ok, parsePagination } from '@/lib/api-response'
import crypto from 'node:crypto'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')

  const url = new URL(req.url)
  const { take, skip } = parsePagination(url, { take: 20, maxTake: 50 })

  const [items, total] = await prisma.$transaction([
    prisma.crcredus.findMany({
      where: { nuusuid: session.user.id },
      include: {
        crcreden: {
          include: {
            nuplan: true,
          },
        },
      },
      orderBy: {
        crcreden: {
          crcreifech: 'desc',
        },
      },
      take,
      skip,
    }),
    prisma.crcredus.count({ where: { nuusuid: session.user.id } }),
  ])

  const data = items.map((row: any) => {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000)
    const hash = crypto
      .createHash('sha256')
      .update(`${row.crcreid}:${now.toISOString().slice(0, 16)}`)
      .digest('hex')
    const tokenTemporal = String(parseInt(hash.slice(0, 6), 16) % 1000).padStart(3, '0')

    return {
    crcreid: row.crcreid,
    crcrepropi: row.crcrepropi,
    ...row.crcreden,
    crcrepladesc: row.crcreden.nuplan?.nupladescr ?? null,
    tokenTemporal,
    tokenTemporalGeneradoEn: now.toISOString(),
    tokenTemporalVenceEn: expiresAt.toISOString(),
  }
  })

  return ok({ data, total, take, skip })
}
