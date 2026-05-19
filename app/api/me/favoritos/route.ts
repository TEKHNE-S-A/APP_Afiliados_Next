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
 * GET /api/me/favoritos?limit=50
 * POST /api/me/favoritos  { caentid }
 */
export async function GET(req: Request) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200)

  const rows = await prisma.nu_favoritos_prestadores.findMany({
    where: { nuusuid: res.userId, tipo: 'favorito' },
    orderBy: { nufecult: 'desc' },
    take: limit,
  })

  const favoritos = rows.map((r) => ({
    nufavid: r.nufavid,
    nuusuid: r.nuusuid,
    caentid: r.caentid.trim(),
    tipo: r.tipo,
    nufeccrea: r.nufeccrea?.toISOString() ?? null,
  }))

  return NextResponse.json({ favoritos })
}

const addFavSchema = z.object({
  caentid: z.string().trim().min(1).max(30),
})

export async function POST(req: Request) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  let body: unknown
  try { body = await req.json() } catch { return fail(400, 'BAD_REQUEST', 'JSON inválido') }

  const parsed = addFavSchema.safeParse(body)
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'caentid requerido', parsed.error.flatten())

  const { caentid } = parsed.data

  // Upsert: si ya existe como favorito, actualiza fecha
  const existing = await prisma.nu_favoritos_prestadores.findFirst({
    where: { nuusuid: res.userId, caentid, tipo: 'favorito' },
  })

  if (existing) {
    await prisma.nu_favoritos_prestadores.update({
      where: { nufavid: existing.nufavid },
      data: { nufecult: new Date() },
    })
    return NextResponse.json({ ok: true, created: false })
  }

  await prisma.nu_favoritos_prestadores.create({
    data: {
      nuusuid: res.userId,
      caentid,
      tipo: 'favorito',
      nufeccrea: new Date(),
      nufecult: new Date(),
    },
  })

  return NextResponse.json({ ok: true, created: true }, { status: 201 })
}
