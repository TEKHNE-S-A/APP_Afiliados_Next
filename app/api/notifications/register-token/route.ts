import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'

async function resolveUserId(req: Request): Promise<{ userId: string } | { error: NextResponse }> {
  const bearer = await requireMobileAuth(req)
  if (!bearer.error) return { userId: bearer.payload.sub }
  const session = await auth()
  if (!session) return { error: fail(401, 'UNAUTHORIZED', 'Sesión requerida') }
  return { userId: session.user.id }
}

const schema = z.object({
  token: z.string().min(1).max(500),
  platform: z.string().min(1).max(20),
})

/**
 * POST /api/notifications/register-token
 * Body: { token, platform }
 */
export async function POST(req: Request) {
  const res = await resolveUserId(req)
  if ('error' in res) return res.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'Cuerpo de solicitud inválido')
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return fail(400, 'VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Datos inválidos')
  }

  const { token, platform } = parsed.data

  await prisma.push_tokens.upsert({
    where: { nuusuid_push_token: { nuusuid: res.userId, push_token: token } },
    create: {
      nuusuid: res.userId,
      push_token: token,
      plataforma: platform,
      activo: true,
    },
    update: {
      plataforma: platform,
      activo: true,
      fecha_ultima_actualizacion: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
