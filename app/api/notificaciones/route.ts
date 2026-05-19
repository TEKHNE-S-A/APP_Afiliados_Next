import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fail, ok, parsePagination } from '@/lib/api-response'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { sanitizeObject } from '@/lib/sanitize'
import crypto from 'node:crypto'

const createNotificationSchema = z.object({
  tipo: z.string().min(1).max(50),
  titulo: z.string().min(1).max(255),
  mensaje: z.string().min(1).max(5000),
  metadata: z.record(z.unknown()).optional(),
})

const patchNotificationSchema = z.object({
  leida: z.boolean().optional(),
  titulo: z.string().min(1).max(255).optional(),
  mensaje: z.string().min(1).max(5000).optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')

  const url = new URL(req.url)
  const { take, skip } = parsePagination(url, { take: 20, maxTake: 100 })

  const [data, total] = await prisma.$transaction([
    prisma.notifications.findMany({
      where: { nuusuid: session.user.id },
      orderBy: { fecha_creacion: 'desc' },
      take,
      skip,
    }),
    prisma.notifications.count({ where: { nuusuid: session.user.id } }),
  ])

  return ok({ data, total, take, skip })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = createNotificationSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const clean = sanitizeObject(parsed.data)

  const created = await prisma.notifications.create({
    data: {
      id: crypto.randomUUID(),
      nuusuid: session.user.id,
      tipo: String(clean.tipo),
      titulo: String(clean.titulo),
      mensaje: String(clean.mensaje),
      metadata: ((clean.metadata as Record<string, unknown> | undefined) ?? {}) as Prisma.InputJsonValue,
    },
  })

  return ok(created, 201)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail(400, 'BAD_REQUEST', 'Falta id')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = patchNotificationSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const data = sanitizeObject(parsed.data)
  const existing = await prisma.notifications.findFirst({ where: { id, nuusuid: session.user.id } })
  if (!existing) return fail(404, 'NOT_FOUND', 'Notificación no encontrada')

  const updated = await prisma.notifications.update({
    where: { id },
    data: {
      ...(data as Record<string, unknown>),
      fecha_leida: (data as { leida?: boolean }).leida ? new Date() : null,
    },
  })

  return ok(updated)
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail(400, 'BAD_REQUEST', 'Falta id')

  const existing = await prisma.notifications.findFirst({ where: { id, nuusuid: session.user.id } })
  if (!existing) return fail(404, 'NOT_FOUND', 'Notificación no encontrada')

  await prisma.notifications.delete({ where: { id } })
  return ok({ deleted: true })
}
