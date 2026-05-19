import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'

async function resolveUserId(req: Request): Promise<{ userId: string } | { error: NextResponse }> {
  const bearer = await requireMobileAuth(req)
  if (!bearer.error) return { userId: bearer.payload.sub }
  const session = await auth()
  if (!session) return { error: fail(401, 'UNAUTHORIZED', 'Sesión requerida') }
  return { userId: session.user.id }
}

function mapNotif(n: {
  id: string; tipo: string; titulo: string; mensaje: string;
  leida: boolean | null; fecha_creacion: Date | null;
  fecha_leida: Date | null; metadata: unknown;
}) {
  return {
    id: n.id,
    tipo: n.tipo,
    titulo: n.titulo,
    mensaje: n.mensaje,
    leida: n.leida ?? false,
    fecha_creacion: n.fecha_creacion?.toISOString() ?? null,
    fecha_leida: n.fecha_leida?.toISOString() ?? null,
    metadata: n.metadata as Record<string, unknown> | null,
  }
}

/**
 * GET /api/notifications
 * Params: page, limit, tipo, leida, fecha_desde, fecha_hasta, orderBy, orderDir
 * Mobile: response.notifications, response.pagination
 */
export async function GET(req: Request) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 100)
  const skip = (page - 1) * limit

  const tipoParam = url.searchParams.get('tipo')
  const leidaParam = url.searchParams.get('leida')
  const fechaDesde = url.searchParams.get('fecha_desde')
  const fechaHasta = url.searchParams.get('fecha_hasta')

  const where: Record<string, unknown> = { nuusuid: res.userId }
  if (tipoParam) where.tipo = tipoParam
  if (leidaParam !== null) where.leida = leidaParam === 'true'
  if (fechaDesde || fechaHasta) {
    where.fecha_creacion = {
      ...(fechaDesde ? { gte: new Date(fechaDesde) } : {}),
      ...(fechaHasta ? { lte: new Date(`${fechaHasta}T23:59:59.999Z`) } : {}),
    }
  }

  const orderBy = url.searchParams.get('orderBy') ?? 'fecha_creacion'
  const orderDir = url.searchParams.get('orderDir') === 'asc' ? 'asc' : 'desc'
  const validOrderFields = ['fecha_creacion', 'leida', 'tipo'] as const
  const safeOrderBy = validOrderFields.includes(orderBy as (typeof validOrderFields)[number])
    ? (orderBy as (typeof validOrderFields)[number])
    : 'fecha_creacion'

  const [rows, totalCount] = await prisma.$transaction([
    prisma.notifications.findMany({
      where,
      orderBy: { [safeOrderBy]: orderDir },
      skip,
      take: limit,
    }),
    prisma.notifications.count({ where }),
  ])

  return NextResponse.json({
    notifications: rows.map(mapNotif),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  })
}
