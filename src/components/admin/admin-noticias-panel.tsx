'use client'

import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

type NoticiaAdmin = {
  id: string
  titulo: string
  contenido: string | null
  tipo: 'texto' | 'imagen' | 'mixta'
  activa: boolean
  orden: number
  imagen_url: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  created_at: string
}

type NoticiasResponse = {
  data: NoticiaAdmin[]
  total: number
  take: number
  skip: number
}

const PAGE_SIZE = 20

async function fetchNoticias(page: number): Promise<NoticiasResponse> {
  const params = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(page * PAGE_SIZE) })
  const res = await fetch(`/api/admin/noticias?${params}`)
  if (!res.ok) throw new Error('No se pudieron cargar noticias')
  const json = await res.json()
  return json.data
}

async function updateNoticia(payload: { id: string; titulo: string; contenido: string; activa: boolean; orden: number; file: File | null; eliminar_imagen: boolean; fecha_inicio: string; fecha_fin: string }) {
  if (payload.file || payload.eliminar_imagen) {
    const form = new FormData()
    form.set('titulo', payload.titulo)
    form.set('contenido', payload.contenido)
    form.set('activa', String(payload.activa))
    form.set('orden', String(payload.orden))
    if (payload.fecha_inicio) form.set('fecha_inicio', payload.fecha_inicio)
    if (payload.fecha_fin)    form.set('fecha_fin',    payload.fecha_fin)
    if (payload.file) form.set('imagen', payload.file)
    if (payload.eliminar_imagen) form.set('eliminar_imagen', 'true')
    const res = await fetch(`/api/admin/noticias/${payload.id}`, { method: 'PUT', body: form })
    if (!res.ok) throw new Error('No se pudo actualizar la noticia')
    return
  }
  const res = await fetch(`/api/admin/noticias/${payload.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      titulo: payload.titulo,
      contenido: payload.contenido || null,
      activa: payload.activa,
      orden: payload.orden,
      fecha_inicio: payload.fecha_inicio || null,
      fecha_fin: payload.fecha_fin || null,
    }),
  })
  if (!res.ok) throw new Error('No se pudo actualizar la noticia')
}

async function deleteNoticia(id: string) {
  const res = await fetch(`/api/admin/noticias/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('No se pudo eliminar la noticia')
}

async function toggleNoticia(id: string) {
  const res = await fetch(`/api/admin/noticias/${id}/toggle`, { method: 'PATCH' })
  if (!res.ok) throw new Error('No se pudo cambiar el estado')
}

async function createNoticiaTexto(payload: { titulo: string; contenido: string; fecha_inicio: string; fecha_fin: string }) {
  const res = await fetch('/api/admin/noticias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      titulo: payload.titulo,
      contenido: payload.contenido,
      tipo: 'texto',
      activa: true,
      orden: 0,
      fecha_inicio: payload.fecha_inicio || null,
      fecha_fin: payload.fecha_fin || null,
    }),
  })
  if (!res.ok) throw new Error('No se pudo crear noticia de texto')
}

async function createNoticiaImagen(payload: { titulo: string; contenido: string; file: File; fecha_inicio: string; fecha_fin: string }) {
  const form = new FormData()
  form.set('titulo', payload.titulo)
  form.set('contenido', payload.contenido)
  form.set('imagen', payload.file)
  if (payload.fecha_inicio) form.set('fecha_inicio', payload.fecha_inicio)
  if (payload.fecha_fin)    form.set('fecha_fin',    payload.fecha_fin)

  const res = await fetch('/api/admin/noticias', {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('No se pudo crear noticia con imagen')
}

export function AdminNoticiasPanel() {
  const [page, setPage] = useState(0)
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [newFechaInicio, setNewFechaInicio] = useState('')
  const [newFechaFin, setNewFechaFin] = useState('')

  // Estado de edición
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editContenido, setEditContenido] = useState('')
  const [editActiva, setEditActiva] = useState(true)
  const [editOrden, setEditOrden] = useState(0)
  const [editFile, setEditFile] = useState<File | null>(null)
  const [editEliminarImagen, setEditEliminarImagen] = useState(false)
  const [editFechaInicio, setEditFechaInicio] = useState('')
  const [editFechaFin, setEditFechaFin] = useState('')

  const queryClient = useQueryClient()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.adminNoticias.all() })
    queryClient.invalidateQueries({ queryKey: queryKeys.noticias.all() })
  }

  const createTextoMutation = useMutation({ mutationFn: createNoticiaTexto, onSuccess: () => { setTitulo(''); setContenido(''); setNewFechaInicio(''); setNewFechaFin(''); invalidate() } })
  const createImagenMutation = useMutation({ mutationFn: createNoticiaImagen, onSuccess: () => { setTitulo(''); setContenido(''); setFile(null); setNewFechaInicio(''); setNewFechaFin(''); invalidate() } })
  const updateMutation = useMutation({ mutationFn: updateNoticia, onSuccess: () => { setEditingId(null); invalidate() } })
  const deleteMutation = useMutation({ mutationFn: deleteNoticia, onSuccess: invalidate })
  const toggleMutation = useMutation({ mutationFn: toggleNoticia, onSuccess: invalidate })

  const query = useQuery({
    queryKey: queryKeys.adminNoticias.list(page + 1),
    queryFn: () => fetchNoticias(page),
  })

  function startEdit(n: NoticiaAdmin) {
    setEditingId(n.id)
    setEditTitulo(n.titulo)
    setEditContenido(n.contenido ?? '')
    setEditActiva(n.activa)
    setEditOrden(n.orden)
    setEditFile(null)
    setEditEliminarImagen(false)
    setEditFechaInicio(n.fecha_inicio ? n.fecha_inicio.slice(0, 16) : '')
    setEditFechaFin(n.fecha_fin ? n.fecha_fin.slice(0, 16) : '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Nueva noticia</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder="Contenido"
          className="mt-3 w-full min-h-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha inicio (opcional)</label>
            <input
              type="datetime-local"
              value={newFechaInicio}
              onChange={(e) => setNewFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha fin (opcional)</label>
            <input
              type="datetime-local"
              value={newFechaFin}
              onChange={(e) => setNewFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => createTextoMutation.mutate({ titulo, contenido, fecha_inicio: newFechaInicio, fecha_fin: newFechaFin })}
            disabled={createTextoMutation.isPending || !titulo || !contenido}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {createTextoMutation.isPending ? 'Guardando...' : 'Crear texto'}
          </button>
          <button
            onClick={() => file && createImagenMutation.mutate({ titulo, contenido, file, fecha_inicio: newFechaInicio, fecha_fin: newFechaFin })}
            disabled={createImagenMutation.isPending || !titulo || !file}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black disabled:opacity-60"
          >
            {createImagenMutation.isPending ? 'Subiendo...' : 'Crear con imagen'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Listado de noticias</h2>

        {query.isLoading && <p className="mt-4 text-sm text-gray-500">Cargando noticias...</p>}
        {query.isError && <p className="mt-4 text-sm text-red-700">No se pudieron cargar noticias.</p>}

        {!!query.data?.data?.length && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Título</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 font-medium">Vigencia</th>
                  <th className="text-left px-4 py-3 font-medium">Vista</th>
                  <th className="text-left px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((n) => (
                  <React.Fragment key={n.id}>
                    <tr className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-900">{n.titulo}</td>
                      <td className="px-4 py-3 text-gray-700 uppercase">{n.tipo}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleMutation.mutate(n.id)}
                          disabled={toggleMutation.isPending}
                          className={`text-xs px-2 py-1 rounded-full cursor-pointer border-0 ${n.activa ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {n.activa ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {(n.fecha_inicio || n.fecha_fin)
                          ? <>{n.fecha_inicio ? new Date(n.fecha_inicio).toLocaleDateString('es-AR') : '∞'} → {n.fecha_fin ? new Date(n.fecha_fin).toLocaleDateString('es-AR') : '∞'}</>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {n.imagen_url ? (
                          <a href={n.imagen_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-700">
                            Ver imagen
                          </a>
                        ) : (
                          <span className="line-clamp-1">{n.contenido ?? '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(n)}
                            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar "${n.titulo}"?`)) deleteMutation.mutate(n.id)
                            }}
                            disabled={deleteMutation.isPending}
                            className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingId === n.id && (
                      <tr className="border-t border-blue-100 bg-blue-50">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="space-y-3">
                            <div className="grid gap-3 md:grid-cols-2">
                              <input
                                value={editTitulo}
                                onChange={(e) => setEditTitulo(e.target.value)}
                                placeholder="Título"
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                              />
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editActiva}
                                    onChange={(e) => setEditActiva(e.target.checked)}
                                    className="w-4 h-4"
                                  />
                                  Activa
                                </label>
                                <input
                                  type="number"
                                  value={editOrden}
                                  onChange={(e) => setEditOrden(Number(e.target.value))}
                                  placeholder="Orden"
                                  min={0}
                                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                />
                              </div>
                            </div>
                            <textarea
                              value={editContenido}
                              onChange={(e) => setEditContenido(e.target.value)}
                              placeholder="Contenido"
                              className="w-full min-h-20 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            />
                            <div className="flex flex-wrap items-center gap-3">
                              {n.imagen_url && !editEliminarImagen && (
                                <button
                                  type="button"
                                  onClick={() => setEditEliminarImagen(true)}
                                  className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                                >
                                  Quitar imagen
                                </button>
                              )}
                              {editEliminarImagen && (
                                <span className="text-xs text-red-600">Se quitará la imagen al guardar</span>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => { setEditFile(e.target.files?.[0] ?? null); setEditEliminarImagen(false) }}
                                className="text-sm"
                              />
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Fecha inicio</label>
                                <input
                                  type="datetime-local"
                                  value={editFechaInicio}
                                  onChange={(e) => setEditFechaInicio(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Fecha fin</label>
                                <input
                                  type="datetime-local"
                                  value={editFechaFin}
                                  onChange={(e) => setEditFechaFin(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateMutation.mutate({ id: n.id, titulo: editTitulo, contenido: editContenido, activa: editActiva, orden: editOrden, file: editFile, eliminar_imagen: editEliminarImagen, fecha_inicio: editFechaInicio, fecha_fin: editFechaFin })}
                                disabled={updateMutation.isPending || !editTitulo}
                                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
                              >
                                {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
                              >
                                Cancelar
                              </button>
                            </div>
                            {updateMutation.isError && (
                              <p className="text-sm text-red-700">Error al guardar. Intente nuevamente.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(query.data?.total ?? 0) > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {query.data?.total ?? 0} noticias &mdash; página {page + 1} de {Math.ceil((query.data?.total ?? 0) / PAGE_SIZE)}
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
                disabled={(page + 1) * PAGE_SIZE >= (query.data?.total ?? 0)}
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
