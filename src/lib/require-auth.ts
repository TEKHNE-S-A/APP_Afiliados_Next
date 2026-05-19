import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'
import { requirePermission, type PermissionModule } from '@/lib/permission-middleware'
import type { Session } from 'next-auth'

type AppSession = Session
type AuthFailure = { error: ReturnType<typeof fail>; session?: undefined }
type AuthSuccess = { error?: undefined; session: AppSession }
type AuthResult = AuthFailure | AuthSuccess

export async function requireAuth(): Promise<AuthResult> {
  const session = await auth()
  if (!session) {
    return { error: fail(401, 'UNAUTHORIZED', 'Sesión requerida') }
  }
  return { session }
}

function resolveAdminModule(pathname: string): PermissionModule | null {
  if (!pathname.startsWith('/api/admin/')) return null

  if (pathname.startsWith('/api/admin/parametros')) return 'parametros'
  if (pathname.startsWith('/api/admin/users') || pathname.startsWith('/api/admin/roles')) return 'usuarios'
  if (pathname.startsWith('/api/admin/credenciales') || pathname.startsWith('/api/admin/planes')) return 'credenciales'
  if (
    pathname.startsWith('/api/admin/analytics')
    || pathname.startsWith('/api/admin/soporte')
    || pathname.startsWith('/api/admin/historial-atencion')
    || pathname.startsWith('/api/admin/notifications')
    || pathname.startsWith('/api/admin/noticias')
  ) return 'reportes'
  if (
    pathname.startsWith('/api/admin/cartilla')
    || pathname.startsWith('/api/admin/diagnostico')
    || pathname.startsWith('/api/admin/info-util')
  ) return 'salud'

  return null
}

export async function requireAdmin(req?: Request): Promise<AuthResult> {
  const session = await auth()
  if (!session) {
    return { error: fail(401, 'UNAUTHORIZED', 'Sesión requerida') }
  }
  if (session.user.role !== 'admin') {
    return { error: fail(403, 'FORBIDDEN', 'Rol insuficiente') }
  }

  if (req) {
    const pathname = new URL(req.url).pathname
    const moduleName = resolveAdminModule(pathname)
    if (moduleName) {
      const perm = await requirePermission(moduleName, session)
      if (perm.error) return { error: perm.error }
    }
  }

  return { session }
}
