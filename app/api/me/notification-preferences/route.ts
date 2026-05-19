import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'
import { z } from 'zod'

const CATEGORIAS_DEFAULT = ['credencial', 'autorizaciones', 'noticias', 'sistema'] as const
type Categoria = typeof CATEGORIAS_DEFAULT[number]

async function resolveUserId(req: Request): Promise<{ userId: string } | { error: NextResponse }> {
  const bearer = await requireMobileAuth(req)
  if (!bearer.error) return { userId: bearer.payload.sub }
  const session = await auth()
  if (!session) return { error: fail(401, 'UNAUTHORIZED', 'Sesión requerida') }
  return { userId: session.user.id }
}

function buildPreference(nuusuid: string, categoria: Categoria, push = true, in_app = true, updated_at: Date | null = null) {
  return {
    categoria,
    push,
    in_app,
    updated_at: updated_at?.toISOString() ?? null,
  }
}

/**
 * GET /api/me/notification-preferences
 * Mobile: data.preferences → [{ categoria, push, in_app, updated_at }]
 */
export async function GET(req: Request) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  const rows = await prisma.nu_notif_prefs.findMany({
    where: { nuusuid: res.userId },
  })

  const rowMap = new Map(rows.map((r) => [r.categoria, r]))

  // Devolver todas las categorías con defaults si no existen en BD
  const preferences = CATEGORIAS_DEFAULT.map((cat) => {
    const row = rowMap.get(cat)
    return buildPreference(res.userId, cat, row?.push ?? true, row?.in_app ?? true, row?.updated_at ?? null)
  })

  return NextResponse.json({ preferences, timestamp: new Date().toISOString() })
}

const prefItemSchema = z.object({
  categoria: z.enum(CATEGORIAS_DEFAULT),
  push: z.boolean().optional(),
  in_app: z.boolean().optional(),
})
const updateSchema = z.object({
  preferences: z.array(prefItemSchema).min(1),
})

/**
 * PUT /api/me/notification-preferences
 * Body: { preferences: [{ categoria, push?, in_app? }] }
 */
export async function PUT(req: Request) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  let body: unknown
  try { body = await req.json() } catch { return fail(400, 'BAD_REQUEST', 'JSON inválido') }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())

  const { preferences } = parsed.data

  // Upsert each preference
  await Promise.all(
    preferences.map((p) =>
      prisma.nu_notif_prefs.upsert({
        where: { nuusuid_categoria: { nuusuid: res.userId, categoria: p.categoria } },
        create: {
          nuusuid: res.userId,
          categoria: p.categoria,
          push: p.push ?? true,
          in_app: p.in_app ?? true,
          updated_at: new Date(),
        },
        update: {
          ...(p.push !== undefined ? { push: p.push } : {}),
          ...(p.in_app !== undefined ? { in_app: p.in_app } : {}),
          updated_at: new Date(),
        },
      })
    )
  )

  // Devolver estado actualizado
  const rows = await prisma.nu_notif_prefs.findMany({ where: { nuusuid: res.userId } })
  const rowMap = new Map(rows.map((r) => [r.categoria, r]))
  const updated = CATEGORIAS_DEFAULT.map((cat) => {
    const row = rowMap.get(cat)
    return buildPreference(res.userId, cat, row?.push ?? true, row?.in_app ?? true, row?.updated_at ?? null)
  })

  return NextResponse.json({ preferences: updated, timestamp: new Date().toISOString() })
}
