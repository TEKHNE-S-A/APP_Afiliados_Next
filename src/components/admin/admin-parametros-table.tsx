'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { ParametroAdmin } from '@/types'

interface ParametrosResponse {
  data: ParametroAdmin[]
  total: number
  take: number
  skip: number
  grupos: string[]
}

type ModalMode = 'create' | 'edit' | null

async function fetchParametros(search: string, grupo: string): Promise<ParametrosResponse> {
  const params = new URLSearchParams({ take: '200', skip: '0' })
  if (search.trim()) params.set('q', search.trim())
  if (grupo.trim()) params.set('grupo', grupo.trim())

  const res = await fetch(`/api/admin/parametros?${params}`)
  if (!res.ok) throw new Error('No se pudieron cargar parámetros')

  const json = await res.json()
  return json.data as ParametrosResponse
}

async function createParametro(payload: ParametroAdmin) {
  const res = await fetch('/api/admin/parametros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('No se pudo crear el parámetro')
}

async function updateParametro(grupo: string, tipo: string, nusisvalpa: string) {
  const params = new URLSearchParams({ grupo, tipo })
  const res = await fetch(`/api/admin/parametros?${params}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nusisvalpa }),
  })
  if (!res.ok) throw new Error('No se pudo actualizar el parámetro')
}

async function deleteParametro(grupo: string, tipo: string) {
  const params = new URLSearchParams({ grupo, tipo })
  const res = await fetch(`/api/admin/parametros?${params}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('No se pudo eliminar el parámetro')
}

export function AdminParametrosTable() {
  const [search, setSearch] = useState('')
  const [grupoFilter, setGrupoFilter] = useState('')
  const [lastUpdate, setLastUpdate] = useState<string>('--:--')

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [modalGrupo, setModalGrupo] = useState('')
  const [modalTipo, setModalTipo] = useState('')
  const [modalValor, setModalValor] = useState('')
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Confirm delete state
  const [confirmDelete, setConfirmDelete] = useState<{ grupo: string; tipo: string } | null>(null)

  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.adminParametros.list(search, grupoFilter),
    queryFn: () => fetchParametros(search, grupoFilter),
  })

  useEffect(() => {
    if (data) setLastUpdate(new Date().toLocaleTimeString('es-AR'))
  }, [data])

  const createMutation = useMutation({
    mutationFn: createParametro,
    onSuccess: () => {
      setModalSuccess('✅ Parámetro creado correctamente')
      setModalError('')
      queryClient.invalidateQueries({ queryKey: queryKeys.adminParametros.all() })
      setLastUpdate(new Date().toLocaleTimeString('es-AR'))
      setTimeout(() => closeModal(), 1500)
    },
    onError: (err: Error) => {
      setModalError(err.message)
      setModalSuccess('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ grupo, tipo, valor }: { grupo: string; tipo: string; valor: string }) =>
      updateParametro(grupo, tipo, valor),
    onSuccess: () => {
      setModalSuccess('✅ Parámetro actualizado correctamente')
      setModalError('')
      queryClient.invalidateQueries({ queryKey: queryKeys.adminParametros.all() })
      setLastUpdate(new Date().toLocaleTimeString('es-AR'))
      setTimeout(() => closeModal(), 1500)
    },
    onError: (err: Error) => {
      setModalError(err.message)
      setModalSuccess('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ grupo, tipo }: { grupo: string; tipo: string }) => deleteParametro(grupo, tipo),
    onSuccess: () => {
      setConfirmDelete(null)
      setLastUpdate(new Date().toLocaleTimeString('es-AR'))
      queryClient.invalidateQueries({ queryKey: queryKeys.adminParametros.all() })
    },
  })

  const totalGrupos = useMemo(() => {
    if (!data?.data) return 0
    return new Set(data.data.map((row) => row.nusisgrupa)).size
  }, [data])

  // Focus first input when modal opens
  useEffect(() => {
    if (modalMode) {
      setTimeout(() => firstInputRef.current?.focus(), 50)
    }
  }, [modalMode])

  function openCreateModal() {
    setModalMode('create')
    setModalGrupo('')
    setModalTipo('')
    setModalValor('')
    setModalError('')
    setModalSuccess('')
  }

  function openEditModal(p: ParametroAdmin) {
    setModalMode('edit')
    setModalGrupo(p.nusisgrupa)
    setModalTipo(p.nusistippa)
    setModalValor(p.nusisvalpa ?? '')
    setModalError('')
    setModalSuccess('')
  }

  function closeModal() {
    setModalMode(null)
    setModalGrupo('')
    setModalTipo('')
    setModalValor('')
    setModalError('')
    setModalSuccess('')
  }

  function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault()
    setModalError('')
    setModalSuccess('')
    if (modalMode === 'create') {
      createMutation.mutate({ nusisgrupa: modalGrupo, nusistippa: modalTipo, nusisvalpa: modalValor })
    } else if (modalMode === 'edit') {
      updateMutation.mutate({ grupo: modalGrupo, tipo: modalTipo, valor: modalValor })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total Parámetros</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data?.total ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Grupos Únicos</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{totalGrupos}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Última Actualización</p>
            <p className="mt-1 text-lg font-semibold text-gray-700">{lastUpdate}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">🔍 Buscar</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por grupo, tipo o valor..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">📁 Filtrar por Grupo</label>
              <select
                value={grupoFilter}
                onChange={(e) => setGrupoFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Todos los grupos</option>
                {(data?.grupos ?? []).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="shrink-0">
              <button
                onClick={openCreateModal}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                ➕ Crear Nuevo Parámetro
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          {isLoading && (
            <div className="flex items-center gap-2 p-6 text-sm text-gray-500">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
              Cargando parámetros...
            </div>
          )}
          {isError && <div className="p-4 text-sm text-red-700">{(error as Error).message}</div>}

          {!!data?.data?.length && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[33%]" />
                  <col className="w-[25%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th scope="col" className="text-left px-4 py-3 font-medium">Grupo</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium">Tipo</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium">Valor</th>
                    <th scope="col" className="text-right px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((p) => {
                    const key = `${p.nusisgrupa}|${p.nusistippa}`
                    return (
                      <tr key={key} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="inline-flex max-w-full items-center truncate rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            {p.nusisgrupa}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 truncate">{p.nusistippa}</td>
                        <td className="px-4 py-3 text-gray-700 truncate">
                          {p.nusisvalpa ? p.nusisvalpa : <em className="text-gray-400">vacío</em>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5 whitespace-nowrap">
                            <button
                              onClick={() => openEditModal(p)}
                              className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ grupo: p.nusisgrupa, tipo: p.nusistippa })}
                              className="text-xs px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !data?.data?.length && (
            <div className="p-8 text-center text-sm text-gray-500">No se encontraron parámetros</div>
          )}
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalParamTitle"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 id="modalParamTitle" className="text-base font-semibold text-gray-900">
                {modalMode === 'create' ? '➕ Crear Nuevo Parámetro' : '✏️ Editar Parámetro'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Cerrar"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="px-6 py-5 space-y-4">
              {modalSuccess && (
                <div className="rounded-md border-l-4 border-green-500 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {modalSuccess}
                </div>
              )}
              {modalError && (
                <div className="rounded-md border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Grupo</label>
                <input
                  ref={firstInputRef}
                  value={modalGrupo}
                  onChange={(e) => setModalGrupo(e.target.value)}
                  required
                  readOnly={modalMode === 'edit'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 read-only:bg-gray-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
                <input
                  value={modalTipo}
                  onChange={(e) => setModalTipo(e.target.value)}
                  required
                  readOnly={modalMode === 'edit'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 read-only:bg-gray-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Valor</label>
                <input
                  value={modalValor}
                  onChange={(e) => setModalValor(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {isPending ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmDeleteTitle"
        >
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl p-6 space-y-4">
            <h2 id="confirmDeleteTitle" className="text-base font-semibold text-gray-900">
              Eliminar parámetro
            </h2>
            <p className="text-sm text-gray-600">
              ¿Eliminar el parámetro{' '}
              <strong>{confirmDelete.grupo}.{confirmDelete.tipo}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate({ grupo: confirmDelete.grupo, tipo: confirmDelete.tipo })}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
