import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fail } from '@/lib/api-response'

export const PERMISSION_MODULES = [
  'parametros',
  'usuarios',
  'credenciales',
  'sia',
  'reportes',
  'salud',
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]

type RoleCacheEntry = {
  id: number
  nombre: string
  permisos: Set<PermissionModule>
}

type RoleCacheState = {
  loadedAt: number
  rolesById: Map<number, RoleCacheEntry>
}

const ROLE_CACHE_TTL_MS = 5 * 60 * 1000

const roleCache: RoleCacheState = {
  loadedAt: 0,
  rolesById: new Map(),
}

function parsePermissionList(raw: string): PermissionModule[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is PermissionModule => {
      return typeof item === 'string' && PERMISSION_MODULES.includes(item as PermissionModule)
    })
  } catch {
    return []
  }
}

async function loadRoleCache(force = false) {
  const now = Date.now()
  if (!force && roleCache.loadedAt > 0 && now - roleCache.loadedAt < ROLE_CACHE_TTL_MS) {
    return roleCache
  }

  const rows = await prisma.nurolper.findMany({
    where: { nurolactivo: 'S' },
    select: {
      nurolid: true,
      nurolnombre: true,
      nurolpermisos: true,
    },
    orderBy: { nurolnombre: 'asc' },
  })

  const rolesById = new Map<number, RoleCacheEntry>()
  for (const row of rows) {
    rolesById.set(row.nurolid, {
      id: row.nurolid,
      nombre: row.nurolnombre,
      permisos: new Set(parsePermissionList(row.nurolpermisos)),
    })
  }

  roleCache.loadedAt = now
  roleCache.rolesById = rolesById

  return roleCache
}

export async function clearRolePermissionCache() {
  roleCache.loadedAt = 0
  roleCache.rolesById.clear()
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

export async function getBackendAdminEmails() {
  const row = await prisma.nusispar.findUnique({
    where: {
      nusisgrupa_nusistippa: {
        nusisgrupa: 'SEGURIDAD_APP',
        nusistippa: 'BackendAdminEmails',
      },
    },
    select: { nusisvalpa: true },
  })

  const configured = (row?.nusisvalpa ?? '')
    .split(',')
    .map((value) => normalizeEmail(value))
    .filter(Boolean)

  if (configured.length) return configured

  return ['admin@test.local', 'admin@osep.gob.ar']
}

export async function isBackendAdminEmail(email: string | null | undefined) {
  const normalized = normalizeEmail(email)
  if (!normalized) return false

  const allowed = await getBackendAdminEmails()
  return allowed.includes(normalized)
}

export async function hasModulePermission(session: Session, moduleName: PermissionModule) {
  const userEmail = session.user.email ?? null

  const user = await prisma.nuusuari.findFirst({
    where: { nuusumail: normalizeEmail(userEmail) },
    select: { nurolid: true },
  })

  const isBackendAdmin = await isBackendAdminEmail(userEmail)

  // Retrocompatibilidad: admins backend sin rol asignado mantienen acceso total.
  if (isBackendAdmin && !user?.nurolid) {
    return { allowed: true as const }
  }

  // Retrocompatibilidad: sin rol asignado => acceso total.
  if (!user?.nurolid) {
    return { allowed: true as const }
  }

  const cache = await loadRoleCache()
  const role = cache.rolesById.get(user.nurolid)
  if (!role) {
    return { allowed: false as const, reason: 'ROLE_NOT_FOUND' as const }
  }

  if (!role.permisos.has(moduleName)) {
    return { allowed: false as const, reason: 'PERMISSION_DENIED' as const }
  }

  return { allowed: true as const }
}

export async function requirePermission(moduleName: PermissionModule, currentSession?: Session | null) {
  const session = currentSession ?? await auth()

  if (!session) {
    return { error: fail(401, 'UNAUTHORIZED', 'Sesión requerida') }
  }

  const allowed = await hasModulePermission(session, moduleName)

  if (!allowed.allowed) {
    if (allowed.reason === 'ROLE_NOT_FOUND') {
      return { error: fail(404, 'ROLE_NOT_FOUND', 'Rol no encontrado') }
    }

    return {
      error: fail(403, 'PERMISSION_DENIED', `No tiene permiso para el módulo ${moduleName}`, {
        module: moduleName,
      }),
    }
  }

  return { session }
}
