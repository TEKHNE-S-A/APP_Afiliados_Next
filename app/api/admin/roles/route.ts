import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import {
  PERMISSION_MODULES,
  clearRolePermissionCache,
  requirePermission,
} from '@/lib/permission-middleware'

const createRoleSchema = z.object({
  nombre: z.string().trim().min(3).max(100),
  permisos: z.array(z.enum(PERMISSION_MODULES)).min(1),
})

function parsePermisos(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const perm = await requirePermission('usuarios', authz.session)
  if (perm.error) return perm.error

  const roles = await prisma.nurolper.findMany({
    where: { nurolactivo: 'S' },
    select: {
      nurolid: true,
      nurolnombre: true,
      nurolpermisos: true,
      nurolactivo: true,
      _count: {
        select: { nuusuari: true },
      },
    },
    orderBy: { nurolnombre: 'asc' },
  })

  return ok(
    roles.map((role) => ({
      id: role.nurolid,
      nombre: role.nurolnombre,
      permisos: parsePermisos(role.nurolpermisos),
      activo: role.nurolactivo === 'S',
      usuariosAsignados: role._count.nuusuari,
    })),
  )
}

export async function POST(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const perm = await requirePermission('usuarios', authz.session)
  if (perm.error) return perm.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail(400, 'BAD_REQUEST', 'JSON inválido')
  }

  const parsed = createRoleSchema.safeParse(body)
  if (!parsed.success) {
    return fail(422, 'VALIDATION_ERROR', 'Datos inválidos', parsed.error.flatten())
  }

  const roleName = parsed.data.nombre.toLowerCase()

  const existing = await prisma.nurolper.findFirst({
    where: {
      nurolnombre: {
        equals: roleName,
        mode: 'insensitive',
      },
    },
    select: { nurolid: true },
  })

  if (existing) {
    return fail(409, 'ROLE_EXISTS', 'Ya existe un rol con ese nombre')
  }

  const created = await prisma.nurolper.create({
    data: {
      nurolnombre: roleName,
      nurolpermisos: JSON.stringify(parsed.data.permisos),
      nurolactivo: 'S',
    },
    select: {
      nurolid: true,
      nurolnombre: true,
      nurolpermisos: true,
      nurolactivo: true,
    },
  })

  await clearRolePermissionCache()

  return ok(
    {
      id: created.nurolid,
      nombre: created.nurolnombre,
      permisos: parsePermisos(created.nurolpermisos),
      activo: created.nurolactivo === 'S',
    },
    201,
  )
}
