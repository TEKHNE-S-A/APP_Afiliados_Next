import { prisma } from '@/lib/prisma'
import { ok, fail } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { z } from 'zod'
import crypto from 'node:crypto'

const createInfoUtilSchema = z.object({
  tipo: z.string().trim().min(1).max(50),
  titulo: z.string().trim().min(1).max(40),
  contenido: z.string().trim().max(1000).default(''),
  orden: z.number().int().min(0).max(9999).default(0),
  activo: z.boolean().default(true),
})

/** Tipo legible → código 1-char interno */
function tipoCodigo(tipo: string): string {
  const u = tipo.trim().toUpperCase()
  if (u === 'TEL' || u === 'TELÉFONO' || u === 'TELEFONO') return 'T'
  if (u === 'LINK') return 'L'
  if (u === 'DIRECCION' || u === 'DIRECCIÓN') return 'D'
  if (u === 'TEXT' || u === 'TEXTO') return 'X'
  if (u.length === 1) return u
  return 'X'
}

/** Código interno → tipo legible estable */
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

const SELECT = {
  noinfutili: true,
  noinftipo: true,
  noinfdescr: true,
  noinftelef: true,
  noinfldire: true,
  noinfgeolo: true,
  noinim_gxi: true,
  noinflink: true,
  noinfcate: true,
  noinforden: true,
} as const

function mapRow(row: {
  noinfutili: string; noinftipo: string; noinfdescr: string;
  noinftelef: string; noinfldire: string; noinfgeolo: string;
  noinim_gxi: string | null; noinflink: string | null;
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

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const rows = await prisma.noinfuti.findMany({
    select: SELECT,
    orderBy: [{ noinforden: 'asc' }, { noinftipo: 'asc' }, { noinfdescr: 'asc' }],
  })

  return ok({ items: rows.map(mapRow) })
}

export async function POST(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = createInfoUtilSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const { tipo, titulo, contenido, orden } = parsed.data

  const created = await prisma.noinfuti.create({
    select: SELECT,
    data: {
      noinfutili: crypto.randomUUID(),
      noinftipo: tipoCodigo(tipo),
      noinfdescr: titulo.substring(0, 40),
      noinftelef: '',
      noinfldire: '',
      noinfgeolo: '',
      noinim: Buffer.from(''),
      noinflink: contenido || null,
      noinfcate: 'general',
      noinforden: orden,
    },
  })

  return ok(mapRow(created), 201)
}
