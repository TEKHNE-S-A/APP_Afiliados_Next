import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

/**
 * GET /api/planes — Listado de planes de cobertura (público, sin auth)
 * Mobile: resp.planes && Array.isArray(resp.planes)
 * Cada plan: { id, descripcion, imagen_url }
 */
export async function GET() {
  try {
    const rows = await prisma.nuplan.findMany({
      orderBy: { nuplaid: 'asc' },
      select: {
        nuplaid: true,
        nupladescr: true,
        nuplim_gxi: true,
      },
    })

    const planes = rows.map((r) => {
      let imagen_url: string | null = null
      if (r.nuplim_gxi) {
        const v = r.nuplim_gxi.trim()
        imagen_url = v.startsWith('http') ? v : `${NEXT_PUBLIC_APP_URL}${v}`
      }
      return {
        id: r.nuplaid.trim(),
        descripcion: r.nupladescr.trim(),
        imagen_url,
      }
    })

    return NextResponse.json({ planes })
  } catch (error) {
    console.error('[GET /api/planes]', error)
    return NextResponse.json({ planes: [] }, { status: 500 })
  }
}
