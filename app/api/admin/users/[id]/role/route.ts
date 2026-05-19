import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { clearRolePermissionCache, isBackendAdminEmail, requirePermission } from '@/lib/permission-middleware'

const assignRoleSchema = z.object({
  roleId: z.number().int().positive().nullable(),
})

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const perm = await requirePermission('usuarios', authz.session)
  if (perm.error) return perm.error

  const { id } = await context.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = assignRoleSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const user = await prisma.nuusuari.findUnique({
    where: { nuusuid: id },
    select: {
      nuusuid: true,
      nuusumail: true,
    },
  })

  if (!user) return fail(404, 'NOT_FOUND', 'Usuario no encontrado')

  const isBackendAdmin = await isBackendAdminEmail(user.nuusumail)
  if (!isBackendAdmin) {
    return fail(400, 'NOT_BACKEND_ADMIN', 'El usuario no pertenece a BackendAdminEmails')
  }

  const roleId = parsed.data.roleId
  if (roleId !== null) {
    const role = await prisma.nurolper.findFirst({
      where: {
        nurolid: roleId,
        nurolactivo: 'S',
      },
      select: { nurolid: true },
    })

    if (!role) {
      return fail(404, 'ROLE_NOT_FOUND', 'Rol inexistente o inactivo')
    }
  }

  const updated = await prisma.nuusuari.update({
    where: { nuusuid: id },
    data: {
      nurolid: roleId,
    },
    select: {
      nuusuid: true,
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

  await clearRolePermissionCache()

  return ok({
    userId: updated.nuusuid,
    roleId: updated.nurolid,
    role: updated.nurolper
      ? {
          id: updated.nurolper.nurolid,
          nombre: updated.nurolper.nurolnombre,
        }
      : null,
    sessionsInvalidated: true,
  })
}
