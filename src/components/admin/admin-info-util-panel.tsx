'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

type InfoUtilItem = {
  id: string
  tipo: string
  titulo: string
  contenido: string
  orden?: number
  activo?: boolean
}

type InfoUtilTipo = string | { noinftipo?: string; count?: number }
type InfoUtilTiposResponse = { tipos: InfoUtilTipo[] }
type InfoUtilListResponse = { items: InfoUtilItem[] }

// Extrae el string del tipo (ya sea string puro u objeto)
function getTipoString(tipo: InfoUtilTipo): string {
  if (typeof tipo === 'string') return tipo
  if (typeof tipo === 'object' && tipo && 'noinftipo' in tipo) {
    return String(tipo.noinftipo ?? '')
  }
  return ''
}

async function fetchInfoUtilList(): Promise<InfoUtilListResponse> {
  const res = await fetch('/api/admin/info-util')
  if (!res.ok) throw new Error('No se pudo cargar info útil')
  const json = await res.json()
  return json.data
}

async function fetchInfoUtilTipos(): Promise<InfoUtilTiposResponse> {
  const res = await fetch('/api/admin/info-util/tipos')
  if (!res.ok) throw new Error('No se pudieron cargar tipos')
  const json = await res.json()
  return json.data
}

async function createInfoUtil(payload: Omit<InfoUtilItem, 'id'>) {
  const res = await fetch('/api/admin/info-util', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('No se pudo crear el item')
}

async function updateInfoUtil(id: string, payload: Partial<Omit<InfoUtilItem, 'id'>>) {
  const res = await fetch(`/api/admin/info-util/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('No se pudo actualizar el item')
}

async function deleteInfoUtil(id: string) {
  const res = await fetch(`/api/admin/info-util/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('No se pudo eliminar el item')
}

type UpdateArgs = { id: string; payload: Partial<Omit<InfoUtilItem, 'id'>> }

const PAGE_SIZE = 20

export function AdminInfoUtilPanel() {
  const [tipo, setTipo] = useState('')
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  // Estado edición inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTipo, setEditTipo] = useState('')
  const [editTitulo, setEditTitulo] = useState('')
  const [editContenido, setEditContenido] = useState('')
  const [editOrden, setEditOrden] = useState(0)
  const [page, setPage] = useState(0)

  const editPanelRef = useRef<HTMLDivElement>(null)

  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.adminInfoUtil.all() })

  function startEdit(item: InfoUtilItem) {
    setEditingId(item.id)
    setEditTipo(item.tipo)
    setEditTitulo(item.titulo)
    setEditContenido(item.contenido ?? '')
    setEditOrden(item.orden ?? 0)
  }

  useEffect(() => {
    if (editingId && editPanelRef.current) {
      editPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [editingId])

  useEffect(() => { setPage(0) }, [filtroTipo])

  const tiposQuery = useQuery({
    queryKey: queryKeys.adminInfoUtil.tipos(),
    queryFn: fetchInfoUtilTipos,
  })

  const listQuery = useQuery({
    queryKey: queryKeys.adminInfoUtil.list(filtroTipo),
    queryFn: fetchInfoUtilList,
  })

  const createMutation = useMutation({
    mutationFn: createInfoUtil,
    onSuccess: () => { setTipo(''); setTitulo(''); setContenido(''); invalidate() },
  })

  const updateMutation = useMutation({
    mutationFn: (args: UpdateArgs) => updateInfoUtil(args.id, args.payload),
    onSuccess: () => { setEditingId(null); invalidate() },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInfoUtil,
    onSuccess: invalidate,
  })

  const toggleActivoMutation = useMutation({
    mutationFn: ({ id, current }: { id: string; current: boolean }) =>
      updateInfoUtil(id, { activo: !current }),
    onSuccess: invalidate,
  })

  const items = useMemo(() => {
    const base = listQuery.data?.items ?? []
    if (!filtroTipo) return base
    return base.filter((i) => i.tipo === filtroTipo)
  }, [listQuery.data?.items, filtroTipo])

  const pagedItems = useMemo(
    () => items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [items, page],
  )

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Nuevo item de Info útil</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Seleccionar tipo</option>
            {(tiposQuery.data?.tipos ?? []).map((t, i) => {
              const tipoStr = getTipoString(t)
              return (
                <option key={`tipo-${tipoStr}-${i}`} value={tipoStr}>{tipoStr}</option>
              )
            })}
          </select>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={() => createMutation.mutate({ tipo, titulo, contenido, orden: 0, activo: true })}
            disabled={createMutation.isPending || !tipo || !titulo || !contenido}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {createMutation.isPending ? 'Creando...' : 'Crear item'}
          </button>
        </div>
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder="Contenido"
          className="mt-3 w-full min-h-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <h2 className="font-semibold text-gray-900">Listado</h2>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todos los tipos</option>
            {(tiposQuery.data?.tipos ?? []).map((t, i) => {
              const tipoStr = getTipoString(t)
              return (
                <option key={`filtro-tipo-${tipoStr}-${i}`} value={tipoStr}>{tipoStr}</option>
              )
            })}
          </select>
        </div>

        {listQuery.isLoading && <p className="mt-4 text-sm text-gray-500">Cargando info útil...</p>}
        {listQuery.isError && <p className="mt-4 text-sm text-red-700">No se pudo cargar info útil.</p>}

        {!listQuery.isLoading && !items.length && (
          <p className="mt-4 text-sm text-gray-500">No hay items cargados para este filtro.</p>
        )}

        {!!items.length && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Título</th>
                  <th className="text-left px-4 py-3 font-medium">Contenido</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => (
                  <tr key={`item-${item.id}`} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-700">{item.tipo}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{item.titulo}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xl">{item.contenido}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${item.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleActivoMutation.mutate({ id: item.id, current: Boolean(item.activo) })}
                          className="text-xs px-2 py-1 rounded-md bg-brand-600 text-white hover:bg-brand-700"
                        >
                          Toggle
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar "${item.titulo}"?`)) deleteMutation.mutate(item.id)
                          }}
                          className="text-xs px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {editingId && (
              <div ref={editPanelRef} className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                <p className="text-sm font-medium text-blue-900">Editando item</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    value={editTipo}
                    onChange={(e) => setEditTipo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Seleccionar tipo</option>
                    {(tiposQuery.data?.tipos ?? []).map((t, i) => {
                      const s = getTipoString(t)
                      return <option key={`et-${s}-${i}`} value={s}>{s}</option>
                    })}
                  </select>
                  <input
                    value={editTitulo}
                    onChange={(e) => setEditTitulo(e.target.value)}
                    placeholder="Título"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  />
                  <input
                    type="number"
                    value={editOrden}
                    onChange={(e) => setEditOrden(Number(e.target.value))}
                    placeholder="Orden"
                    min={0}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <textarea
                  value={editContenido}
                  onChange={(e) => setEditContenido(e.target.value)}
                  placeholder="Contenido / Link / Teléfono"
                  className="w-full min-h-16 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateMutation.mutate({ id: editingId, payload: { tipo: editTipo, titulo: editTitulo, contenido: editContenido, orden: editOrden } })}
                    disabled={updateMutation.isPending || !editTitulo}
                    className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
                  >
                    {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
                {updateMutation.isError && (
                  <p className="text-sm text-red-700">Error al guardar. Intente nuevamente.</p>
                )}
              </div>
            )}
          </div>
        )}

        {items.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {items.length} items &mdash; página {page + 1} de {Math.ceil(items.length / PAGE_SIZE)}
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
                disabled={(page + 1) * PAGE_SIZE >= items.length}
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
