/**
 * mobile-jwt.ts — JWT Bearer para autenticación mobile.
 *
 * Usa `jose` (incluido en next-auth) para firmar/verificar tokens.
 * Secret: AUTH_SECRET del entorno (mismo que NextAuth, distinto propósito).
 *
 * Access token:  24 h
 * Refresh token: 30 d
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'fallback-secret-cambiar-en-produccion'
)

export interface MobileTokenPayload extends JWTPayload {
  sub: string       // nuusuid
  email: string
  name: string
  role: 'user' | 'admin'
  type: 'access' | 'refresh'
}

export async function signAccessToken(payload: Omit<MobileTokenPayload, 'type' | 'iat' | 'exp'>) {
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
}

export async function signRefreshToken(userId: string) {
  return new SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
}

export async function verifyAccessToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if ((payload as MobileTokenPayload).type !== 'access') return null
    return payload as MobileTokenPayload
  } catch {
    return null
  }
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if ((payload as MobileTokenPayload).type !== 'refresh') return null
    return { sub: payload.sub! }
  } catch {
    return null
  }
}

/** Extrae y verifica el Bearer token del header Authorization. */
export async function verifyBearerToken(req: Request): Promise<MobileTokenPayload | null> {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  return verifyAccessToken(auth.slice(7))
}
