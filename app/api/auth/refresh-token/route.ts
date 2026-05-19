/**
 * POST /api/auth/refresh-token
 *
 * Renueva el access token a partir de un refresh token válido.
 * Contrato mobile: { refresh_token } → { token, refresh_token }
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { fail } from '@/lib/api-response'
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/mobile-jwt'

const schema = z.object({ refresh_token: z.string().min(1) })

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return fail(400, 'VALIDATION_ERROR', 'refresh_token requerido')
  }

  const verified = await verifyRefreshToken(parsed.data.refresh_token)
  if (!verified) {
    return fail(401, 'TOKEN_EXPIRED', 'Refresh token inválido o expirado')
  }

  const user = await prisma.nuusuari.findUnique({
    where: { nuusuid: verified.sub },
    select: { nuusuid: true, nuusumail: true, nuusuapell: true, nurolid: true, nuusuactiv: true },
  })

  if (!user || user.nuusuactiv !== 'S') {
    return fail(401, 'UNAUTHORIZED', 'Usuario inactivo')
  }

  const role = user.nurolid != null ? 'admin' : 'user'

  const [accessToken, newRefreshToken] = await Promise.all([
    signAccessToken({ sub: user.nuusuid, email: user.nuusumail, name: user.nuusuapell.trim(), role }),
    signRefreshToken(user.nuusuid),
  ])

  return NextResponse.json({ token: accessToken, refresh_token: newRefreshToken })
}
