import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)))
  const skip = (page - 1) * limit
  const q = url.searchParams.get('q') ?? ''
  const tipo = url.searchParams.get('tipo') ?? ''
  const leidaParam = url.searchParams.get('leida') ?? ''
  const fechaDesde = url.searchParams.get('fecha_desde') ?? ''
  const fechaHasta = url.searchParams.get('fecha_hasta') ?? ''

  const where: Prisma.notificationsWhereInput = {}

  if (q) {
    where.nuusuari = {
      OR: [
        { nuusumail: { contains: q, mode: 'insensitive' } },
        { nuusuapell: { contains: q, mode: 'insensitive' } },
      ],
    }
  }
  if (tipo) where.tipo = tipo
  if (leidaParam !== '') where.leida = leidaParam === 'true'
  if (fechaDesde || fechaHasta) {
    where.fecha_creacion = {}
    if (fechaDesde) (where.fecha_creacion as Prisma.DateTimeNullableFilter).gte = new Date(fechaDesde)
    if (fechaHasta) {
      const hasta = new Date(fechaHasta)
      hasta.setDate(hasta.getDate() + 1)
      ;(where.fecha_creacion as Prisma.DateTimeNullableFilter).lt = hasta
    }
  }

  const [data, total, noLeidas, leidas] = await prisma.$transaction([
    prisma.notifications.findMany({
      where,
      include: {
        nuusuari: { select: { nuusuid: true, nuusuapell: true, nuusumail: true } },
      },
      orderBy: { fecha_creacion: 'desc' },
      take: limit,
      skip,
    }),
    prisma.notifications.count({ where }),
    prisma.notifications.count({ where: { ...where, leida: false } }),
    prisma.notifications.count({ where: { ...where, leida: true } }),
  ])

  const totalPages = Math.ceil(total / limit)

  return ok({
    data: data.map((n) => ({
      id: n.id,
      nuusuid: n.nuusuid,
      tipo: n.tipo,
      titulo: n.titulo,
      mensaje: n.mensaje,
      leida: n.leida,
      fecha_creacion: n.fecha_creacion?.toISOString() ?? null,
      fecha_leida: n.fecha_leida?.toISOString() ?? null,
      metadata: n.metadata,
      usuario_email: n.nuusuari?.nuusumail ?? null,
      usuario_nombre: (n.nuusuari?.nuusuapell ?? '').trim() || null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    },
    stats: {
      total,
      noLeidas,
      leidas,
      usuariosDistintos: new Set(data.map((n) => n.nuusuid)).size,
    },
  })
}
