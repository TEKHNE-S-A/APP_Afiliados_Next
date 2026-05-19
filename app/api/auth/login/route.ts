/**
 * POST /api/auth/login
 *
 * Endpoint de autenticación para la app mobile.
 * Devuelve access token Bearer + refresh token + credenciales del afiliado.
 *
 * Contrato con mobile (AuthContext.tsx):
 *   { token, refresh_token, tokenTimeout, user, credenciales, sync }
 */
import { NextResponse } from 'next/server'
import { pbkdf2Sync, timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { fail } from '@/lib/api-response'
import { signAccessToken, signRefreshToken } from '@/lib/mobile-jwt'
import { mapCredenciales } from '@/lib/credencial-mapper'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

function verifyPbkdf2(password: string, stored: string): boolean {
  const sep = stored.indexOf(':')
  if (sep === -1) return false
  const salt = stored.slice(0, sep)
  const expectedHex = stored.slice(sep + 1)
  const actualHex = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  try {
    return timingSafeEqual(Buffer.from(actualHex, 'hex'), Buffer.from(expectedHex, 'hex'))
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return fail(400, 'VALIDATION_ERROR', 'username y password requeridos')
  }

  const { username, password } = parsed.data

  // Buscar usuario por email o número de afiliado
  const user = await prisma.nuusuari.findFirst({
    where: {
      OR: [
        { nuusumail: { equals: username, mode: 'insensitive' } },
        { nuusunroaf: username },
      ],
      nuusuactiv: 'S',
    },
    select: {
      nuusuid:   true,
      nuusumail: true,
      nuusuapell: true,
      nuusunroaf: true,
      nurolid:   true,
      nuplaid:   true,
      nuusuauth: { select: { nuusupass: true } },
    },
  })

  if (!user || !user.nuusuauth?.nuusupass) {
    return fail(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos')
  }

  const valid = verifyPbkdf2(password, user.nuusuauth.nuusupass)
  if (!valid) {
    return fail(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos')
  }

  const role = user.nurolid != null ? 'admin' : 'user'

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: user.nuusuid, email: user.nuusumail, name: user.nuusuapell.trim(), role }),
    signRefreshToken(user.nuusuid),
  ])

  // Cargar credenciales del afiliado
  const rows = await prisma.crcredus.findMany({
    where: { nuusuid: user.nuusuid },
    include: {
      crcreden: {
        include: { nuplan: true },
      },
    },
    orderBy: {
      crcreden: { crcreifech: 'desc' },
    },
  })

  const credenciales = mapCredenciales(rows)

  return NextResponse.json({
    token:         accessToken,
    refresh_token: refreshToken,
    tokenTimeout:  10, // minutos (valor del parámetro TIMEOUT_TOKEN_CREDENCIAL)
    user: {
      id:       user.nuusuid,
      username: user.nuusumail,
      email:    user.nuusumail,
      name:     user.nuusuapell.trim(),
      role,
      nroAfiliado: user.nuusunroaf?.trim() ?? '',
      planId:   user.nuplaid?.trim() ?? null,
    },
    credenciales,
    sync: { inserted: 0, updated: 0, unchanged: credenciales.length },
  })
}
