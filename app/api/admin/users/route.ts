import { prisma } from '@/lib/prisma'
import { fail, ok, parsePagination } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { z } from 'zod'
import { sanitizeObject } from '@/lib/sanitize'
import { requirePermission } from '@/lib/permission-middleware'
import { randomBytes, pbkdf2Sync } from 'crypto'
import { BooleanFlagValues } from '@/types/enums'

function hashPbkdf2(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

const createUserSchema = z.object({
  nombre: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(100),
  password: z.string().min(6).max(120),
  roleId: z.number().int().positive().nullable().optional(),
})

const patchUserSchema = z.object({
  nuusuapell: z.string().min(1).max(60).optional(),
  nuusumail: z.string().email().max(100).optional(),
  nuusutelef: z.string().max(20).optional(),
  nuusuactiv: z.enum(BooleanFlagValues).optional(),
})

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const perm = await requirePermission('usuarios', authz.session)
  if (perm.error) return perm.error

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  const { take, skip } = parsePagination(url, { take: 20, maxTake: 200 })

  const where = q
    ? {
        OR: [
          { nuusuapell: { contains: q, mode: 'insensitive' as const } },
          { nuusumail: { contains: q, mode: 'insensitive' as const } },
          { nuusunroaf: { contains: q } },
        ],
      }
    : {}

  const [data, total] = await prisma.$transaction([
    prisma.nuusuari.findMany({
      where,
      select: {
        nuusuid: true,
        nuusuafili: true,
        nuusuapell: true,
        nuusumail: true,
        nuusunroaf: true,
        nuusubajaf: true,
        nuusuactiv: true,
        nurolid: true,
        nurolper: {
          select: {
            nurolid: true,
            nurolnombre: true,
            nurolpermisos: true,
          },
        },
      },
      orderBy: [{ nuusuapell: 'asc' }],
      take,
      skip,
    }),
    prisma.nuusuari.count({ where }),
  ])

  return ok({ data, total, take, skip })
}

export async function POST(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const perm = await requirePermission('usuarios', authz.session)
  if (perm.error) return perm.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const payload = sanitizeObject(parsed.data)

  const targetEmail = payload.email.toLowerCase().trim()

  const existing = await prisma.nuusuari.findFirst({
    where: { nuusumail: { equals: targetEmail, mode: 'insensitive' } },
    select: { nuusuid: true },
  })

  if (existing) {
    if (typeof payload.roleId === 'number') {
      await prisma.nuusuari.update({
        where: { nuusuid: existing.nuusuid },
        data: { nurolid: payload.roleId },
      })
    }
    return ok({ message: 'Usuario existente actualizado', nuusuid: existing.nuusuid, createdInDb: false })
  }

  const nombreFinal = payload.nombre.toUpperCase().substring(0, 60)
  const passwordHash = hashPbkdf2(payload.password)

  try {
    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.nuusuari.create({
        data: {
          nuusuafili: '',
          nuusufecha: new Date(),
          nuusunroaf: '',
          nuusuapell: nombreFinal,
          nuusutelef: '',
          nuusumail: targetEmail,
          nuusubajaf: null,
          nuusunivel: 0,
          nurolid: typeof payload.roleId === 'number' ? payload.roleId : null,
        },
        select: { nuusuid: true },
      })
      await tx.nuusuauth.create({
        data: { nuusuid: created.nuusuid, nuusupass: passwordHash },
      })
      return created
    })

    return ok({ message: 'Usuario admin creado', nuusuid: newUser.nuusuid, createdInDb: true }, 201)
  } catch {
    return fail(500, 'DB_ERROR', 'No se pudo crear el usuario admin')
  }
}

export async function PATCH(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const perm = await requirePermission('usuarios', authz.session)
  if (perm.error) return perm.error

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail(400, 'BAD_REQUEST', 'Falta id')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = patchUserSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const clean = sanitizeObject(parsed.data)

  const exists = await prisma.nuusuari.findUnique({ where: { nuusuid: id } })
  if (!exists) return fail(404, 'NOT_FOUND', 'Usuario no encontrado')

  const updated = await prisma.nuusuari.update({
    where: { nuusuid: id },
    data: clean,
    select: {
      nuusuid: true,
      nuusuafili: true,
      nuusuapell: true,
      nuusumail: true,
      nuusunroaf: true,
      nuusubajaf: true,
      nuusuactiv: true,
      nurolid: true,
      nurolper: {
        select: {
          nurolid: true,
          nurolnombre: true,
          nurolpermisos: true,
        },
      },
    },
  })

  return ok(updated)
}
