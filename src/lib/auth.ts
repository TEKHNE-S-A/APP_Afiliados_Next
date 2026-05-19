import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'
import { pbkdf2Sync, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

/**
 * Verifica una contraseña contra el hash almacenado en nuusuauth.
 * Formato: "salt:hash" (PBKDF2-SHA512, 1000 iter, 64 bytes).
 */
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

/**
 * Configura Auth.js v5.
 * authorize() valida credenciales directamente contra PostgreSQL via Prisma,
 * usando la tabla nuusuauth (PBKDF2-SHA512, formato salt:hash).
 */
export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        username: { label: 'Usuario / Email / N° Afiliado', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const username = typeof credentials?.username === 'string' ? credentials.username.trim() : ''
        const password = typeof credentials?.password === 'string' ? credentials.password : ''

        if (!username || !password) return null

        try {
          // Busca el usuario por email o número de afiliado (igual que el backend legado)
          const user = await prisma.nuusuari.findFirst({
            where: {
              OR: [
                { nuusumail: { equals: username, mode: 'insensitive' } },
                { nuusunroaf: username },
              ],
              nuusuactiv: 'S',
            },
            select: {
              nuusuid: true,
              nuusumail: true,
              nuusuapell: true,
              nurolid: true,
              nuusuauth: { select: { nuusupass: true } },
            },
          })

          if (!user || !user.nuusuauth?.nuusupass) return null

          const valid = verifyPbkdf2(password, user.nuusuauth.nuusupass)
          if (!valid) return null

          // Cualquier usuario con nurolid configurado tiene acceso al panel admin
          const role = user.nurolid != null ? 'admin' : 'user'

          return {
            id: user.nuusuid,
            name: user.nuusuapell.trim(),
            email: user.nuusumail,
            role,
            accessToken: '',
            refreshToken: null,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'user'
        token.accessToken = (user as { accessToken?: string }).accessToken
        token.refreshToken = (user as { refreshToken?: string }).refreshToken
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.accessToken = token.accessToken as string
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas — igual que el backend
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
