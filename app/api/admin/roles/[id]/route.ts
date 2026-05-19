import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import {
  PERMISSION_MODULES,
  clearRolePermissionCache,
  requirePermission,
} from '@/lib/permission-middleware'

const updateRoleSchema = z.object({
  nombre: z.string().trim().min(3).max(100).optional(),
  permisos: z.array(z.enum(PERMISSION_MODULES)).min(1).optional(),
}).refine((value) => value.nombre !== undefined || value.permisos !== undefined, {
  message: 'Debe enviar nombre y/o permisos',
})

function parsePermisos(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}

function parseRoleId(param: string) {
  const id = Number(param)
  if (!Number.isInteger(id) || id <= 0) return null
  return id
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const perm = await requirePermission('usuarios', authz.session)
  if (perm.error) return perm.error

  const { id: rawId } = await context.params
  const id = parseRoleId(rawId)
  if (!id) return fail(400, 'BAD_REQUEST', 'Id de rol inválido')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = updateRoleSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  if (parsed.data.nombre) {
    const duplicate = await prisma.nurolper.findFirst({
      where: {
        nurolid: { not: id },
        nurolnombre: { equals: parsed.data.nombre, mode: 'insensitive' },
      },
      select: { nurolid: true },
    })

    if (duplicate) {
      return fail(409, 'ROLE_EXISTS', 'Ya existe un rol con ese nombre')
    }
  }

  const updated = await prisma.nurolper.updateMany({
    where: { nurolid: id, nurolactivo: 'S' },
    data: {
      ...(parsed.data.nombre !== undefined ? { nurolnombre: parsed.data.nombre.toLowerCase() } : {}),
      ...(parsed.data.permisos !== undefined ? { nurolpermisos: JSON.stringify(parsed.data.permisos) } : {}),
      nurolultm: new Date(),
    },
  })

  if (updated.count === 0) {
    return fail(404, 'NOT_FOUND', 'Rol no encontrado')
  }

  const role = await prisma.nurolper.findUnique({
    where: { nurolid: id },
    select: {
      nurolid: true,
      nurolnombre: true,
      nurolpermisos: true,
      nurolactivo: true,
    },
  })

  await clearRolePermissionCache()

  return ok({
    id: role?.nurolid,
    nombre: role?.nurolnombre,
    permisos: parsePermisos(role?.nurolpermisos ?? '[]'),
    activo: role?.nurolactivo === 'S',
  })
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const perm = await requirePermission('usuarios', authz.session)
  if (perm.error) return perm.error

  const { id: rawId } = await context.params
  const id = parseRoleId(rawId)
  if (!id) return fail(400, 'BAD_REQUEST', 'Id de rol inválido')

  const assignedUsers = await prisma.nuusuari.count({
    where: {
      nurolid: id,
      nuusuactiv: 'S',
    },
  })

  if (assignedUsers > 0) {
    return fail(409, 'ROLE_IN_USE', 'No se puede eliminar un rol asignado', { users: assignedUsers })
  }

  const deleted = await prisma.nurolper.updateMany({
    where: { nurolid: id, nurolactivo: 'S' },
    data: { nurolactivo: 'N', nurolultm: new Date() },
  })

  if (deleted.count === 0) {
    return fail(404, 'NOT_FOUND', 'Rol no encontrado')
  }

  await clearRolePermissionCache()

  return ok({ message: 'Rol desactivado' })
}
