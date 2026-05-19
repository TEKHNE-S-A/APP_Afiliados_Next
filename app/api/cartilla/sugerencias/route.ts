import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fail } from '@/lib/api-response'

/**
 * GET /api/cartilla/sugerencias?q=...&limit=8&rubroId=...&excludeRubroId=...
 * Autocomplete de entidades en cartilla. Público (mobile ya autentica en cartilla principal).
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ sugerencias: [] })

  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '8', 10) || 8, 50)
  const rubroId = url.searchParams.get('rubroId')
  const excludeRubroIds = url.searchParams.getAll('excludeRubroId')

  const where: Record<string, unknown> = {
    caentactivo: true,
    caentapeno: { contains: q, mode: 'insensitive' },
  }
  if (rubroId) where.carubid = rubroId
  if (excludeRubroIds.length > 0) where.carubid = { notIn: excludeRubroIds }

  const rows = await prisma.caentida.findMany({
    where,
    select: {
      caentid: true,
      caentapeno: true,
      carubid: true,
      caespid: true,
      caendire: {
        where: { caendirpri: 'S' },
        select: { caendirecc: true },
        take: 1,
      },
    },
    orderBy: [{ caentprior: 'desc' }, { caentapeno: 'asc' }],
    take: limit,
  })

  const sugerencias = rows.map(r => ({
    caentid: r.caentid.trim(),
    caentapeno: r.caentapeno.trim(),
    carubdescr: r.carubid?.trim() ?? undefined,
    caespecial: r.caespid?.trim() ?? undefined,
    caendirecc: r.caendire[0]?.caendirecc?.trim() ?? undefined,
  }))

  return NextResponse.json({ sugerencias })
}
