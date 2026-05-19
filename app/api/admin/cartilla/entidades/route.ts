import { prisma } from '@/lib/prisma'
import { fail, ok, parsePagination } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { z } from 'zod'
import { sanitizeObject } from '@/lib/sanitize'

const createEntidadSchema = z.object({
  caentid: z.string().min(1).max(30),
  caentapeno: z.string().min(1).max(50),
  caentmail: z.string().max(100),
  caentweb: z.string().max(1000),
  caentmarca: z.boolean().default(false),
  caentprior: z.number().int().min(0).max(9999),
  caentmatri: z.string().max(100).optional(),
  caentobs: z.string().max(5000).optional(),
  carubid: z.string().max(30).optional(),
  caespid: z.string().max(30).optional(),
})

const patchEntidadSchema = createEntidadSchema.partial().extend({
  version: z.number().int().min(1),
})

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const url = new URL(req.url)
  const { take, skip } = parsePagination(url, { take: 20, maxTake: 100 })
  const q = (url.searchParams.get('q') ?? '').trim()
  const rubroid = (url.searchParams.get('rubroid') ?? '').trim()
  const conGeo = (url.searchParams.get('conGeo') ?? '').trim() // 'S' | 'N' | ''
  const includeInactivas = url.searchParams.get('includeInactivas') === 'true'

  const where: Record<string, unknown> = {}

  if (!includeInactivas) {
    where.caentactivo = true
  }

  if (q) {
    where.OR = [
      { caentapeno: { contains: q, mode: 'insensitive' as const } },
      { caentid: { contains: q } },
    ]
  }

  if (rubroid) {
    where.carubid = rubroid
  }

  if (conGeo === 'S') {
    where.caendire = {
      some: {
        caendlat: { not: null },
        caendlng: { not: null },
      },
    }
  } else if (conGeo === 'N') {
    where.caendire = {
      none: {
        caendlat: { not: null },
        caendlng: { not: null },
      },
    }
  }

  const [data, total] = await prisma.$transaction([
    prisma.caentida.findMany({
      where,
      include: {
        caendire: {
          include: {
            nulocali: true,
            caentele: true,
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

export async function POST(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = createEntidadSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const clean = sanitizeObject(parsed.data)
  const created = await prisma.caentida.create({ data: clean })
  return ok(created, 201)
}

export async function PATCH(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail(400, 'BAD_REQUEST', 'Falta id')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = patchEntidadSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const { version, ...payload } = sanitizeObject(parsed.data)
  const current = await prisma.caentida.findUnique({ where: { caentid: id } })
  if (!current) return fail(404, 'NOT_FOUND', 'Entidad no encontrada')

  // Concurrencia optimista (timestamp->version)
  const currentVersion = current.caentupdated
    ? Math.floor(new Date(current.caentupdated).getTime() / 1000)
    : 1
  if (version !== currentVersion) {
    return fail(409, 'CONFLICT', 'La entidad fue modificada por otro proceso')
  }

  const updated = await prisma.caentida.update({
    where: { caentid: id },
    data: {
      ...(payload as Record<string, unknown>),
      caentupdated: new Date(),
    },
  })

  return ok(updated)
}

export async function DELETE(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail(400, 'BAD_REQUEST', 'Falta id')

  const exists = await prisma.caentida.findUnique({ where: { caentid: id } })
  if (!exists) return fail(404, 'NOT_FOUND', 'Entidad no encontrada')

  // Eliminación lógica: desactivar entidad (no borrar físicamente)
  await prisma.caentida.update({
    where: { caentid: id },
    data: { caentactivo: false, caentmarca: true, caentupdated: new Date() },
  })
  return ok({ deleted: true })
}
