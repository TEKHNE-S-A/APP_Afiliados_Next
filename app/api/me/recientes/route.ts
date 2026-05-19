import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'
import { z } from 'zod'

async function resolveUserId(req: Request): Promise<{ userId: string } | { error: NextResponse }> {
  const bearer = await requireMobileAuth(req)
  if (!bearer.error) return { userId: bearer.payload.sub }
  const session = await auth()
  if (!session) return { error: fail(401, 'UNAUTHORIZED', 'Sesión requerida') }
  return { userId: session.user.id }
}

/**
 * GET /api/me/recientes?limit=20
 * POST /api/me/recientes  { caentid }  — upsert (mueve al tope)
 * DELETE /api/me/recientes            — limpia todos los recientes
 */
export async function GET(req: Request) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 100)

  const rows = await prisma.nu_favoritos_prestadores.findMany({
    where: { nuusuid: res.userId, tipo: 'reciente' },
    orderBy: { nufecult: 'desc' },
    take: limit,
  })

  const recientes = rows.map((r) => ({
    nufavid: r.nufavid,
    nuusuid: r.nuusuid,
    caentid: r.caentid.trim(),
    tipo: r.tipo,
    nufeccrea: r.nufeccrea?.toISOString() ?? null,
  }))

  return NextResponse.json({ recientes })
}

const addRecSchema = z.object({
  caentid: z.string().trim().min(1).max(30),
})

export async function POST(req: Request) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  let body: unknown
  try { body = await req.json() } catch { return fail(400, 'BAD_REQUEST', 'JSON inválido') }

  const parsed = addRecSchema.safeParse(body)
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'caentid requerido', parsed.error.flatten())

  const { caentid } = parsed.data
  const now = new Date()

  const existing = await prisma.nu_favoritos_prestadores.findFirst({
    where: { nuusuid: res.userId, caentid, tipo: 'reciente' },
  })

  if (existing) {
    await prisma.nu_favoritos_prestadores.update({
      where: { nufavid: existing.nufavid },
      data: { nufecult: now },
    })
  } else {
    await prisma.nu_favoritos_prestadores.create({
      data: {
        nuusuid: res.userId,
        caentid,
        tipo: 'reciente',
        nufeccrea: now,
        nufecult: now,
      },
    })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  await prisma.nu_favoritos_prestadores.deleteMany({
    where: { nuusuid: res.userId, tipo: 'reciente' },
  })

  return NextResponse.json({ ok: true })
}
