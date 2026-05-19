import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { requirePermission } from '@/lib/permission-middleware'

function parsePermisos(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const perm = await requirePermission('usuarios', authz.session)
  if (perm.error) return perm.error

  const { id } = await context.params

  const user = await prisma.nuusuari.findUnique({
    where: { nuusuid: id },
    select: {
      nuusuid: true,
      nuusuafili: true,
      nuusuapell: true,
      nuusumail: true,
      nuusunroaf: true,
      nuusubajaf: true,
      nuusuactiv: true,
      nurolid: true,
      nurolper: {
        select: {
          nurolid: true,
          nurolnombre: true,
          nurolpermisos: true,
        },
      },
    },
  })

  if (!user) return fail(404, 'NOT_FOUND', 'Usuario no encontrado')

  return ok({
    ...user,
    role: user.nurolper
      ? {
          id: user.nurolper.nurolid,
          nombre: user.nurolper.nurolnombre,
          permisos: parsePermisos(user.nurolper.nurolpermisos),
        }
      : null,
    isFullAdmin: user.nurolid == null,
  })
}
