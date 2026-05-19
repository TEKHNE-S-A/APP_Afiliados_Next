import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SELECT = {
  noinfutili: true,
  noinftipo: true,
  noinfdescr: true,
  noinftelef: true,
  noinfldire: true,
  noinflink: true,
  noinfcate: true,
  noinforden: true,
} as const

function deriveTipo(code: string, link: string | null, telef: string, dire: string): string {
  const c = code.trim().toUpperCase()
  const hasUrl = !!(link && (link.startsWith('http') || link.startsWith('www.')))
  const hasTel = telef.trim().length > 0
  const hasDir = dire.trim().length > 0
  if (c === 'T' && hasTel) return 'tel'
  if (c === 'L' && hasUrl) return 'link'
  if (c === 'D' && hasDir) return 'direccion'
  if (c === 'X') return 'text'
  if (hasUrl) return 'link'
  if (hasTel) return 'tel'
  if (hasDir) return 'direccion'
  return 'text'
}

function mapRow(row: {
  noinfutili: string; noinftipo: string; noinfdescr: string;
  noinftelef: string; noinfldire: string; noinflink: string | null;
  noinfcate: string | null; noinforden: number | null;
}) {
  return {
    id: row.noinfutili.trim(),
    tipo: deriveTipo(row.noinftipo, row.noinflink, row.noinftelef, row.noinfldire),
    titulo: row.noinfdescr.trim(),
    contenido: row.noinflink?.trim() ?? '',
    telefono: row.noinftelef.trim() || null,
    direccion: row.noinfldire.trim() || null,
    orden: row.noinforden ?? 0,
    activo: true,
    categoria: row.noinfcate?.trim() || 'general',
  }
}

/**
 * GET /api/info-util — Información útil pública (teléfonos, links, direcciones)
 * Sin auth requerida. Mobile: response.items o response (array)
 */
export async function GET() {
  try {
    const rows = await prisma.noinfuti.findMany({
      select: SELECT,
      orderBy: [{ noinforden: 'asc' }, { noinftipo: 'asc' }, { noinfdescr: 'asc' }],
    })

    return NextResponse.json({ items: rows.map(mapRow) })
  } catch (error) {
    console.error('[GET /api/info-util]', error)
    return NextResponse.json({ items: [] }, { status: 500 })
  }
}
