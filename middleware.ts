import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/admin/login', '/login', '/api/auth']

/**
 * Protege rutas de navegación.
 * ⚠️ Los API route handlers DEBEN verificar sesión individualmente con `await auth()`
 *    ya que este middleware NO protege las rutas /api/* (excepto /api/auth).
 */
export default auth(function middleware(req: NextRequest & { auth: unknown }) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (isPublic) return NextResponse.next()

  const session = (req as unknown as { auth?: { user?: { role?: string } } }).auth

  if (!session) {
    const loginUrl = new URL('/admin/login', req.nextUrl.origin)
    // Sanitizar callbackUrl: solo aceptar paths relativos
    if (pathname.startsWith('/') && !pathname.startsWith('//')) {
      loginUrl.searchParams.set('callbackUrl', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // Proteger rutas /admin solo para role=admin
  if (pathname.startsWith('/admin') && session.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads/).*)',
  ],
}
