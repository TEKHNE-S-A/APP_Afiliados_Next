import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/noticias — Noticias activas (público, sin auth)
 * Mobile: res?.success && Array.isArray(res.noticias)
 */
export async function GET() {
  try {
    const now = new Date()

    const rows = await prisma.app_noticias.findMany({
      where: {
        activa: true,
        OR: [
          { fecha_inicio: null },
          { fecha_inicio: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { fecha_fin: null },
              { fecha_fin: { gte: now } },
            ],
          },
        ],
      },
      orderBy: { orden: 'asc' },
      select: {
        id: true,
        titulo: true,
        contenido: true,
        imagen_url: true,
        tipo: true,
        orden: true,
        fecha_inicio: true,
        fecha_fin: true,
        created_at: true,
        updated_at: true,
      },
    })

    const noticias = rows.map((r) => ({
      ...r,
      fecha_inicio: r.fecha_inicio?.toISOString() ?? null,
      fecha_fin: r.fecha_fin?.toISOString() ?? null,
      created_at: r.created_at?.toISOString() ?? null,
      updated_at: r.updated_at?.toISOString() ?? null,
    }))

    return NextResponse.json({ success: true, noticias })
  } catch (error) {
    console.error('[GET /api/noticias]', error)
    return NextResponse.json({ success: false, noticias: [] }, { status: 500 })
  }
}
