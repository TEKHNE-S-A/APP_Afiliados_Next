import { ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { clearRolePermissionCache, requirePermission } from '@/lib/permission-middleware'

export async function POST(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const perm = await requirePermission('usuarios', authz.session)
  if (perm.error) return perm.error

  await clearRolePermissionCache()

  return ok({ message: 'Cache recargado' })
}
