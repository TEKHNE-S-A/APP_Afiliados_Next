import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fail, ok, parsePagination } from '@/lib/api-response'
import { z } from 'zod'
import { sanitizeObject } from '@/lib/sanitize'
import crypto from 'node:crypto'
import {
  EstadoSolicitudValues,
  TipoAutorizacionValues,
  type EstadoSolicitud,
} from '@/types/enums'

const ESTADO_INICIAL: EstadoSolicitud = 'PEN'

const createSolicitudSchema = z.object({
  ausoldescr: z.string().min(1).max(40),
  ausoltexto: z.string().min(1).max(5000),
  ausolentid: z.string().min(1).max(30),
  ausolextid: z.string().min(1).max(30),
  ausoltipo: z.enum(TipoAutorizacionValues),
  ausolpsoco: z.string().min(1).max(40),
  ausolcantp: z.number().int().min(1).max(99),
  ausolobspr: z.string().max(40),
})

const patchSolicitudSchema = z.object({
  ausoltexto: z.string().min(1).max(5000).optional(),
  ausolestad: z.enum(EstadoSolicitudValues).optional(),
  version: z.number().int().min(1),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')

  const url = new URL(req.url)
  const { take, skip } = parsePagination(url, { take: 20, maxTake: 50 })

  const [data, total] = await prisma.$transaction([
    prisma.ausolici.findMany({
      where: { nuusuid: session.user.id },
      orderBy: [
        { ausolfecal: 'desc' },
        { ausolfecor: 'desc' },
      ],
      take,
      skip,
    }),
    prisma.ausolici.count({ where: { nuusuid: session.user.id } }),
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

  const parsed = createSolicitudSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const clean = sanitizeObject(parsed.data)

  const created = await prisma.ausolici.create({
    data: {
      ausolicid: crypto.randomUUID(),
      nuusuid: session.user.id,
      ausolfecal: new Date(),
      ausolfecor: new Date(),
      ausolnroaf: '',
      ausolfecve: new Date(),
      ausolrechd: 'N',
      ausolestad: ESTADO_INICIAL,
      ausolentno: '',
      ausolautnu: '',
      ausolgravc: 0,
      ...clean,
    },
  })

  return ok(created, 201)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = patchSolicitudSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const { version, ...partialData } = sanitizeObject(parsed.data)
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail(400, 'BAD_REQUEST', 'Falta id')

  const current = await prisma.ausolici.findFirst({
    where: { ausolicid: id, nuusuid: session.user.id },
  })

  if (!current) return fail(404, 'NOT_FOUND', 'Solicitud no encontrada')

  // Concurrencia optimista usando campo version virtual sobre updated timestamp
  // En esta tabla legada no existe "version", validamos con estrategia equivalente.
  const currentVersion = Math.floor(new Date(current.ausolfecal).getTime() / 1000)
  if (version !== currentVersion) {
    return fail(409, 'CONFLICT', 'La solicitud fue modificada por otro proceso')
  }

  const updated = await prisma.ausolici.update({
    where: { ausolicid: id },
    data: partialData as Partial<typeof current>,
  })

  return ok(updated)
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return fail(401, 'UNAUTHORIZED', 'Sesión requerida')

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail(400, 'BAD_REQUEST', 'Falta id')

  const target = await prisma.ausolici.findFirst({
    where: { ausolicid: id, nuusuid: session.user.id },
  })

  if (!target) return fail(404, 'NOT_FOUND', 'Solicitud no encontrada')

  await prisma.ausolici.delete({ where: { ausolicid: id } })
  return ok({ deleted: true })
}
