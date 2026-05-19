'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { UsuarioAdmin } from '@/types'

interface UsersResponse {
  data: UsuarioAdmin[]
  total: number
  take: number
  skip: number
}

type AdminRole = {
  id: number
  nombre: string
  permisos: string[]
  activo: boolean
  usuariosAsignados: number
}

const PERMISSION_OPTIONS = [
  'parametros',
  'usuarios',
  'credenciales',
  'sia',
  'reportes',
  'salud',
] as const

const PAGE_SIZE = 20

async function fetchUsers(search: string, page: number): Promise<UsersResponse> {
  const params = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(page * PAGE_SIZE), q: search })
  const res = await fetch(`/api/admin/users?${params}`)
  if (!res.ok) throw new Error('No se pudieron cargar usuarios')
  const json = await res.json()
  return json.data
}

async function fetchRoles(): Promise<AdminRole[]> {
  const res = await fetch('/api/admin/roles')
  if (!res.ok) throw new Error('No se pudieron cargar roles')
  const json = await res.json()
  return json.data
}

async function toggleUser(id: string, current: string | null | undefined) {
  const next = current === 'S' ? 'N' : 'S'
  const res = await fetch(`/api/admin/users?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nuusuactiv: next }),
  })
  if (!res.ok) throw new Error('No se pudo actualizar usuario')
}

async function assignRole(userId: string, roleId: number | null) {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleId }),
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    throw new Error(payload?.message ?? 'No se pudo asignar rol')
  }
}

async function createRole(nombre: string, permisos: string[]) {
  const res = await fetch('/api/admin/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, permisos }),
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    throw new Error(payload?.message ?? 'No se pudo crear rol')
  }
}

async function updateRole(id: number, nombre: string, permisos: string[]) {
  const res = await fetch(`/api/admin/roles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, permisos }),
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    throw new Error(payload?.message ?? 'No se pudo actualizar rol')
  }
}

async function deleteRole(id: number) {
  const res = await fetch(`/api/admin/roles/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    throw new Error(payload?.message ?? 'No se pudo eliminar rol')
  }
}

async function createAdminUser(payload: {
  nombre: string
  email: string
  password: string
  roleId: number | null
}) {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.message ?? 'No se pudo crear el usuario admin')
  }
}

export function AdminUsuariosTable() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRoleId, setNewRoleId] = useState('')
  const [roleDraftByUser, setRoleDraftByUser] = useState<Record<string, string>>({})
  const [roleName, setRoleName] = useState('')
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null)

  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.adminUsers.list(page + 1, search),
    queryFn: () => fetchUsers(search, page),
  })

  const rolesQuery = useQuery({
    queryKey: queryKeys.adminRoles.list(),
    queryFn: fetchRoles,
  })

  const mutation = useMutation({
    mutationFn: ({ id, current }: { id: string; current: string | null | undefined }) => toggleUser(id, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.me() })
    },
  })

  const createAdminUserMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewRoleId('')
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.all() })
    },
  })

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: number | null }) => assignRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.all() })
    },
  })

  const createRoleMutation = useMutation({
    mutationFn: ({ nombre, permisos }: { nombre: string; permisos: string[] }) => createRole(nombre, permisos),
    onSuccess: () => {
      setRoleName('')
      setRolePermissions([])
      queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.all() })
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, nombre, permisos }: { id: number; nombre: string; permisos: string[] }) => updateRole(id, nombre, permisos),
    onSuccess: () => {
      setRoleName('')
      setRolePermissions([])
      setEditingRoleId(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.all() })
    },
  })

  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all() })
    },
  })

  const onSubmitRole = () => {
    if (!roleName.trim() || rolePermissions.length === 0) return

    if (editingRoleId != null) {
      updateRoleMutation.mutate({
        id: editingRoleId,
        nombre: roleName.trim(),
        permisos: rolePermissions,
      })
      return
    }

    createRoleMutation.mutate({
      nombre: roleName.trim(),
      permisos: rolePermissions,
    })
  }

  const roleFormPending = createRoleMutation.isPending || updateRoleMutation.isPending

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Usuarios</h2>
          <p className="mt-1 text-xs text-gray-500">Alta/edición de usuarios mantiene flujo actual. Aquí se agrega gestión de rol asignado.</p>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Contraseña (min 6)"
              type="password"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <select
              value={newRoleId}
              onChange={(e) => setNewRoleId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Sin rol (acceso total)</option>
              {(rolesQuery.data ?? []).map((role) => (
                <option key={`new-user-role-${role.id}`} value={String(role.id)}>{role.nombre}</option>
              ))}
            </select>
            <button
              onClick={() => {
                createAdminUserMutation.mutate({
                  nombre: newName.trim(),
                  email: newEmail.trim(),
                  password: newPassword,
                  roleId: newRoleId ? Number(newRoleId) : null,
                })
              }}
              disabled={
                createAdminUserMutation.isPending
                || !newName.trim()
                || !newEmail.trim()
                || newPassword.length < 6
              }
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {createAdminUserMutation.isPending ? 'Creando...' : 'Nuevo usuario'}
            </button>
          </div>
          {createAdminUserMutation.isError && (
            <p className="mt-2 text-xs text-red-700">{(createAdminUserMutation.error as Error).message}</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Roles</h2>
            <p className="mt-1 text-xs text-gray-500">Sección de gestión de roles y permisos para backend admin.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="Nombre del rol"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={onSubmitRole}
            disabled={roleFormPending || !roleName.trim() || rolePermissions.length === 0}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {editingRoleId != null ? 'Guardar cambios' : 'Crear rol'}
          </button>
          {editingRoleId != null && (
            <button
              onClick={() => {
                setEditingRoleId(null)
                setRoleName('')
                setRolePermissions([])
              }}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {PERMISSION_OPTIONS.map((perm) => {
            const selected = rolePermissions.includes(perm)
            return (
              <button
                key={perm}
                onClick={() => {
                  setRolePermissions((prev) =>
                    prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
                  )
                }}
                className={`text-xs px-2 py-1 rounded-full border ${selected ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300 bg-white text-gray-700'}`}
              >
                {perm}
              </button>
            )
          })}
        </div>

        {rolesQuery.isLoading && <p className="mt-4 text-sm text-gray-500">Cargando roles...</p>}
        {rolesQuery.isError && <p className="mt-4 text-sm text-red-700">No se pudieron cargar roles.</p>}

        {!!rolesQuery.data?.length && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Permisos</th>
                  <th className="text-left px-4 py-3 font-medium">Usuarios asignados</th>
                  <th className="text-right px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rolesQuery.data.map((role) => (
                  <tr key={role.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-900 font-medium">{role.nombre}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {role.permisos.map((perm) => (
                          <span key={`${role.id}-${perm}`} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{perm}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{role.usuariosAsignados}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => {
                            setEditingRoleId(role.id)
                            setRoleName(role.nombre)
                            setRolePermissions(role.permisos)
                          }}
                          className="text-xs px-2 py-1 rounded-md bg-sky-100 text-sky-700 hover:bg-sky-200"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteRoleMutation.mutate(role.id)}
                          disabled={deleteRoleMutation.isPending}
                          className="text-xs px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Buscar por nombre, email o afiliado"
            className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {isLoading && <div className="p-4 text-sm text-gray-500">Cargando usuarios...</div>}
        {isError && <div className="p-4 text-sm text-red-700">{(error as Error).message}</div>}

        {!!data?.data?.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Afiliado</th>
                  <th className="text-left px-4 py-3 font-medium">Rol</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((u) => {
                  const currentRoleId = u.nurolid != null ? String(u.nurolid) : ''
                  const selectedRoleId = roleDraftByUser[u.nuusuid] ?? currentRoleId
                  const roleLabel = u.nurolper?.nurolnombre ?? 'Acceso Total'

                  return (
                    <tr key={u.nuusuid} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-900">{u.nuusuapell}</td>
                      <td className="px-4 py-3 text-gray-600">{u.nuusumail}</td>
                      <td className="px-4 py-3 text-gray-600">{u.nuusunroaf}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <span className="inline-flex text-xs px-2 py-1 rounded-full bg-sky-100 text-sky-700">{roleLabel}</span>
                          <div className="flex gap-2">
                            <select
                              value={selectedRoleId}
                              onChange={(e) => {
                                setRoleDraftByUser((prev) => ({
                                  ...prev,
                                  [u.nuusuid]: e.target.value,
                                }))
                              }}
                              className="px-2 py-1 border border-gray-300 rounded-md text-xs"
                            >
                              <option value="">Sin rol (acceso total)</option>
                              {(rolesQuery.data ?? []).map((role) => (
                                <option key={role.id} value={String(role.id)}>{role.nombre}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                assignRoleMutation.mutate({
                                  userId: u.nuusuid,
                                  roleId: selectedRoleId ? Number(selectedRoleId) : null,
                                })
                              }}
                              disabled={assignRoleMutation.isPending}
                              className="text-xs px-2 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                              Guardar rol
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${u.nuusuactiv === 'S' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {u.nuusuactiv === 'S' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => mutation.mutate({ id: u.nuusuid, current: u.nuusuactiv })}
                          className="text-xs px-2 py-1 rounded-md bg-brand-600 text-white hover:bg-brand-700"
                        >
                          Toggle
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {(data?.total ?? 0) > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {data?.total ?? 0} usuarios &mdash; mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data?.total ?? 0)} &mdash; página {page + 1} de {Math.ceil((data?.total ?? 0) / PAGE_SIZE)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= (data?.total ?? 0)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
