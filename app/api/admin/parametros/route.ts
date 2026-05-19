import { prisma } from '@/lib/prisma'
import { fail, ok, parsePagination } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { sanitizeObject } from '@/lib/sanitize'
import { z } from 'zod'

const createSchema = z.object({
  nusisgrupa: z.string().trim().min(1).max(30),
  nusistippa: z.string().trim().min(1).max(30),
  nusisvalpa: z.string().trim().min(1),
})

const updateSchema = z.object({
  nusisvalpa: z.string().trim().min(1),
})

function normalizeKey(input: string | null): string {
  return (input ?? '').trim()
}

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const url = new URL(req.url)
  const q = normalizeKey(url.searchParams.get('q'))
  const grupo = normalizeKey(url.searchParams.get('grupo'))
  const { take, skip } = parsePagination(url, { take: 50, maxTake: 300 })

  const where = {
    ...(q
      ? {
          OR: [
            { nusisgrupa: { contains: q, mode: 'insensitive' as const } },
            { nusistippa: { contains: q, mode: 'insensitive' as const } },
            { nusisvalpa: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(grupo ? { nusisgrupa: grupo } : {}),
  }

  const [data, total, grupos] = await prisma.$transaction([
    prisma.nusispar.findMany({
      where,
      orderBy: [{ nusisgrupa: 'asc' }, { nusistippa: 'asc' }],
      take,
      skip,
    }),
    prisma.nusispar.count({ where }),
    prisma.nusispar.findMany({
      select: { nusisgrupa: true },
      distinct: ['nusisgrupa'],
      orderBy: { nusisgrupa: 'asc' },
    }),
  ])

  return ok({
    data,
    total,
    take,
    skip,
    grupos: grupos.map((g) => g.nusisgrupa),
  })
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

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const clean = sanitizeObject(parsed.data)

  const exists = await prisma.nusispar.findUnique({
    where: {
      nusisgrupa_nusistippa: {
        nusisgrupa: String(clean.nusisgrupa),
        nusistippa: String(clean.nusistippa),
      },
    },
  })
  if (exists) return fail(409, 'CONFLICT', 'El parámetro ya existe')

  const created = await prisma.nusispar.create({
    data: {
      nusisgrupa: String(clean.nusisgrupa),
      nusistippa: String(clean.nusistippa),
      nusisvalpa: String(clean.nusisvalpa),
    },
  })

  return ok(created, 201)
}

export async function PATCH(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const url = new URL(req.url)
  const grupo = normalizeKey(url.searchParams.get('grupo'))
  const tipo = normalizeKey(url.searchParams.get('tipo'))

  if (!grupo || !tipo) return fail(400, 'BAD_REQUEST', 'Faltan grupo/tipo')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const clean = sanitizeObject(parsed.data)

  const exists = await prisma.nusispar.findUnique({
    where: {
      nusisgrupa_nusistippa: {
        nusisgrupa: grupo,
        nusistippa: tipo,
      },
    },
  })

  if (!exists) return fail(404, 'NOT_FOUND', 'Parámetro no encontrado')

  const updated = await prisma.nusispar.update({
    where: {
      nusisgrupa_nusistippa: {
        nusisgrupa: grupo,
        nusistippa: tipo,
      },
    },
    data: {
      nusisvalpa: String(clean.nusisvalpa),
    },
  })

  return ok(updated)
}

export async function DELETE(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const url = new URL(req.url)
  const grupo = normalizeKey(url.searchParams.get('grupo'))
  const tipo = normalizeKey(url.searchParams.get('tipo'))

  if (!grupo || !tipo) return fail(400, 'BAD_REQUEST', 'Faltan grupo/tipo')

  const exists = await prisma.nusispar.findUnique({
    where: {
      nusisgrupa_nusistippa: {
        nusisgrupa: grupo,
        nusistippa: tipo,
      },
    },
  })

  if (!exists) return fail(404, 'NOT_FOUND', 'Parámetro no encontrado')

  await prisma.nusispar.delete({
    where: {
      nusisgrupa_nusistippa: {
        nusisgrupa: grupo,
        nusistippa: tipo,
      },
    },
  })

  return ok({ deleted: true })
}
