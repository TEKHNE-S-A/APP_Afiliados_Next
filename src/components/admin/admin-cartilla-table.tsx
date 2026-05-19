'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { Entidad, Rubro, Especialidad } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Localidad {
  nulocid: string
  nulocdescr: string
  nuproid: string
}

interface EntidadesResponse {
  data: Entidad[]
  total: number
  take: number
  skip: number
}

interface GeoStats {
  total: number
  conCoordenadas: number
  pendientes: number
  errores: number
  porcentajeGeocodificado: number
}

const PAGE_SIZE = 20

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchEntidades(filters: {
  q: string
  rubroid: string
  conGeo: string
  includeInactivas: boolean
  skip: number
}): Promise<EntidadesResponse> {
  const params = new URLSearchParams({
    take: String(PAGE_SIZE),
    skip: String(filters.skip),
    q: filters.q,
    conGeo: filters.conGeo,
    includeInactivas: String(filters.includeInactivas),
  })
  if (filters.rubroid) params.set('rubroid', filters.rubroid)
  const res = await fetch(`/api/admin/cartilla/entidades?${params}`)
  if (!res.ok) throw new Error('No se pudo cargar la cartilla')
  const json = await res.json()
  return json.data as EntidadesResponse
}

async function fetchRubros(): Promise<Rubro[]> {
  const res = await fetch('/api/admin/cartilla/rubros')
  if (!res.ok) return []
  return ((await res.json()).data ?? []) as Rubro[]
}

async function fetchEspecialidades(rubroid: string): Promise<Especialidad[]> {
  const url = rubroid
    ? `/api/admin/cartilla/especialidades?rubroid=${rubroid}`
    : '/api/admin/cartilla/especialidades'
  const res = await fetch(url)
  if (!res.ok) return []
  return ((await res.json()).data ?? []) as Especialidad[]
}

async function fetchLocalidades(): Promise<Localidad[]> {
  const res = await fetch('/api/admin/cartilla/localidades')
  if (!res.ok) return []
  return ((await res.json()).data ?? []) as Localidad[]
}

async function fetchGeoStats(): Promise<GeoStats> {
  const res = await fetch('/api/admin/cartilla/geocoding')
  if (!res.ok) throw new Error('No se pudo cargar estadísticas')
  return (await res.json()).data as GeoStats
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

type Tab = 'entidades' | 'upload' | 'geocoding'

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminCartillaTable() {
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<Tab>('entidades')

  // Filtros
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [rubroid, setRubroid] = useState('')
  const [conGeo, setConGeo] = useState('')
  const [includeInactivas, setIncludeInactivas] = useState(false)
  const [page, setPage] = useState(0)

  // Modal CRUD
  const [showEntityModal, setShowEntityModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [modalRubroid, setModalRubroid] = useState('')
  const [form, setForm] = useState({
    caentapeno: '',
    carubid: '',
    caentmatri: '',
    caespid: '',
    caentweb: '',
    caentobs: '',
    caentprior: 0,
    caentmail: '',
    caentmarca: false,
  })

  // Modal detalle (lectura)
  const [viewEntidad, setViewEntidad] = useState<Entidad | null>(null)

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const skip = page * PAGE_SIZE

  const filters = useMemo(
    () => ({ q, rubroid, conGeo, includeInactivas, skip }),
    [q, rubroid, conGeo, includeInactivas, skip],
  )

  const entidadesQuery = useQuery({
    queryKey: queryKeys.adminCartilla.entidades(filters),
    queryFn: () => fetchEntidades(filters),
  })

  const rubrosQuery = useQuery({
    queryKey: queryKeys.adminCartilla.rubros(),
    queryFn: fetchRubros,
  })

  const localidadesQuery = useQuery({
    queryKey: queryKeys.adminCartilla.localidades(),
    queryFn: fetchLocalidades,
    enabled: showEntityModal,
  })

  const modalEspecialidadesQuery = useQuery({
    queryKey: queryKeys.adminCartilla.especialidades(modalRubroid),
    queryFn: () => fetchEspecialidades(modalRubroid),
    enabled: showEntityModal,
  })

  const geoStatsQuery = useQuery({
    queryKey: queryKeys.adminCartilla.geocoding(),
    queryFn: fetchGeoStats,
    enabled: activeTab === 'geocoding',
  })

  const totalPages = entidadesQuery.data
    ? Math.ceil(entidadesQuery.data.total / PAGE_SIZE)
    : 0

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidateEntidades = useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKeys.adminCartilla.all() })
  }, [qc])

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id: string | null }) => {
      const { id, ...payload } = data
      const url = id
        ? `/api/admin/cartilla/entidades?id=${encodeURIComponent(id)}`
        : '/api/admin/cartilla/entidades'
      const method = id ? 'PATCH' : 'POST'
      if (method === 'PATCH') {
        // Obtener versión actual
        const cur = entidadesQuery.data?.data.find((e) => e.caentid === id)
        const version = cur?.caentupdated
          ? Math.floor(new Date(cur.caentupdated as string).getTime() / 1000)
          : 1
        ;(payload as Record<string, unknown>).version = version
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? 'Error al guardar')
      }
    },
    onSuccess: () => {
      invalidateEntidades()
      setShowEntityModal(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cartilla/entidades?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? 'Error al dar de baja')
      }
    },
    onSuccess: () => {
      invalidateEntidades()
      setDeletingId(null)
    },
  })

  const geoProcessMutation = useMutation({
    mutationFn: async (action: 'process' | 'retry') => {
      const res = await fetch(`/api/admin/cartilla/geocoding?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'process' ? { batchSize: 50 } : { limit: 20 }),
      })
      if (!res.ok) throw new Error('Error al geocodificar')
      return (await res.json()).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminCartilla.geocoding() })
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQ(searchInput.trim())
    setPage(0)
  }

  const handleFilterChange = (field: string, value: string | boolean) => {
    if (field === 'rubroid') { setRubroid(value as string); setPage(0) }
    else if (field === 'conGeo') { setConGeo(value as string); setPage(0) }
    else if (field === 'includeInactivas') { setIncludeInactivas(value as boolean); setPage(0) }
  }

  const openCreate = () => {
    setEditingId(null)
    setModalRubroid('')
    setForm({
      caentapeno: '', carubid: '', caentmatri: '', caespid: '',
      caentweb: '', caentobs: '', caentprior: 0, caentmail: '', caentmarca: false,
    })
    setShowEntityModal(true)
  }

  const openEdit = (e: Entidad) => {
    setEditingId(e.caentid)
    const rubrid = e.carubid?.trim() ?? ''
    setModalRubroid(rubrid)
    setForm({
      caentapeno: e.caentapeno,
      carubid: rubrid,
      caentmatri: e.caentmatri ?? '',
      caespid: e.caespid?.trim() ?? '',
      caentweb: e.caentweb ?? '',
      caentobs: e.caentobs ?? '',
      caentprior: e.caentprior,
      caentmail: e.caentmail ?? '',
      caentmarca: e.caentmarca,
    })
    setShowEntityModal(true)
  }

  const handleSave = (ev: React.FormEvent) => {
    ev.preventDefault()
    saveMutation.mutate({ ...form, id: editingId })
  }

  // ── Upload JSONL ───────────────────────────────────────────────────────────
  const [uploadState, setUploadState] = useState<
    'idle' | 'uploading' | 'done' | 'error'
  >('idle')
  const [uploadResult, setUploadResult] = useState<{
    procesadas: number; insertadas: number; actualizadas: number; errores: number
  } | null>(null)
  const [uploadError, setUploadError] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadState('uploading')
    setUploadResult(null)
    setUploadError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/cartilla/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Error al importar')
      setUploadResult(json.data)
      setUploadState('done')
      invalidateEntidades()
    } catch (err) {
      setUploadError((err as Error).message)
      setUploadState('error')
    }
    // Reset input
    e.target.value = ''
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(['entidades', 'upload', 'geocoding'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t === 'entidades' ? '📋 Entidades' : t === 'upload' ? '📁 Importar' : '🌍 Geocodificación'}
          </button>
        ))}
      </div>

      {/* ── TAB ENTIDADES ── */}
      {activeTab === 'entidades' && (
        <div className="space-y-4">
          {/* Controles */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <form onSubmit={applySearch} className="flex gap-2">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nombre o ID..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Buscar
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
              >
                ➕ Nueva
              </button>
            </form>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rubro</label>
                <select
                  value={rubroid}
                  onChange={(e) => handleFilterChange('rubroid', e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700"
                >
                  <option value="">Todos</option>
                  {rubrosQuery.data?.map((r) => (
                    <option key={r.carubid} value={r.carubid}>
                      {r.carubdescr.trim()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Geocodificación</label>
                <select
                  value={conGeo}
                  onChange={(e) => handleFilterChange('conGeo', e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700"
                >
                  <option value="">Todas</option>
                  <option value="S">Con coordenadas</option>
                  <option value="N">Sin coordenadas</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</label>
                <select
                  value={includeInactivas ? 'all' : 'active'}
                  onChange={(e) => handleFilterChange('includeInactivas', e.target.value === 'all')}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700"
                >
                  <option value="active">Solo activas</option>
                  <option value="all">Activas + bajas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla */}
          {entidadesQuery.isLoading && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
              Cargando entidades...
            </div>
          )}
          {entidadesQuery.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {(entidadesQuery.error as Error).message}
            </div>
          )}
          {entidadesQuery.data && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Nombre</th>
                      <th className="text-left px-4 py-3 font-medium">Estado</th>
                      <th className="text-left px-4 py-3 font-medium">Localidad</th>
                      <th className="text-left px-4 py-3 font-medium">Geo</th>
                      <th className="text-center px-4 py-3 font-medium">Dirs.</th>
                      <th className="text-center px-4 py-3 font-medium">Tels.</th>
                      <th className="text-right px-4 py-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entidadesQuery.data.data.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                          No se encontraron resultados
                        </td>
                      </tr>
                    ) : (
                      entidadesQuery.data.data.map((e) => {
                        const hasGeo = e.caendire?.some(
                          (d) => d.caendlat != null && d.caendlng != null,
                        )
                        const localidad =
                          e.caendire?.[0]?.nulocali?.nulocdescr?.trim() ?? '-'
                        const inactive = !e.caentactivo || e.caentmarca

                        return (
                          <tr
                            key={e.caentid}
                            className={`border-t border-gray-100 ${inactive ? 'bg-red-50 opacity-70' : ''}`}
                          >
                            <td className="px-4 py-3 text-gray-900 font-medium">
                              {e.caentapeno}
                            </td>
                            <td className="px-4 py-3">
                              {inactive ? (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                                  ✗ Baja
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                                  ✓ Activa
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{localidad}</td>
                            <td className="px-4 py-3">
                              {hasGeo ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                                  Pendiente
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">
                              {e.caendire?.length ?? 0}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">
                              {e.caendire?.reduce(
                                (acc, d) => acc + (d.caentele?.length ?? 0),
                                0,
                              ) ?? 0}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setViewEntidad(e)}
                                  title="Ver detalle"
                                  className="rounded-md bg-blue-500 px-2.5 py-1 text-xs font-medium text-white hover:-translate-y-0.5 transition-transform"
                                >
                                  👁️
                                </button>
                                <button
                                  onClick={() => openEdit(e)}
                                  title="Editar"
                                  className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white hover:-translate-y-0.5 transition-transform"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => setDeletingId(e.caentid)}
                                  disabled={inactive}
                                  title={inactive ? 'Ya está dada de baja' : 'Dar de baja'}
                                  className="rounded-md bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:-translate-y-0.5 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-600">
                Pág. {page + 1} de {totalPages} &nbsp;·&nbsp; {entidadesQuery.data?.total ?? 0} entidades
              </span>
              <button
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB UPLOAD ── */}
      {activeTab === 'upload' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
          <h2 className="text-base font-semibold text-gray-900">📁 Importar archivo JSONL</h2>
          <label
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
          >
            <span className="text-4xl">📁</span>
            <span className="text-sm font-medium text-gray-700">
              Arrastrá un archivo JSONL o hacé clic para seleccionar
            </span>
            <span className="text-xs text-gray-400">Formato: JSONL (JSON Lines) con estructura de cartilla</span>
            <input
              type="file"
              accept=".jsonl,.txt"
              className="sr-only"
              onChange={handleFileChange}
              disabled={uploadState === 'uploading'}
            />
          </label>

          {uploadState === 'uploading' && (
            <p className="text-sm text-gray-500 text-center">⏳ Importando...</p>
          )}
          {uploadState === 'done' && uploadResult && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Procesadas', value: uploadResult.procesadas, color: 'bg-indigo-600' },
                { label: 'Insertadas', value: uploadResult.insertadas, color: 'bg-green-600' },
                { label: 'Actualizadas', value: uploadResult.actualizadas, color: 'bg-amber-500' },
                { label: 'Errores', value: uploadResult.errores, color: 'bg-red-600' },
              ].map((s) => (
                <div key={s.label} className={`${s.color} rounded-xl p-4 text-white`}>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-90">{s.label}</p>
                  <p className="text-3xl font-bold mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          )}
          {uploadState === 'error' && (
            <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              ❌ {uploadError}
            </p>
          )}
        </div>
      )}

      {/* ── TAB GEOCODING ── */}
      {activeTab === 'geocoding' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">🌍 Estado de Geocodificación</h2>

          {geoStatsQuery.isLoading && (
            <p className="text-sm text-gray-500">Cargando estadísticas...</p>
          )}
          {geoStatsQuery.isError && (
            <p className="text-sm text-red-600">{(geoStatsQuery.error as Error).message}</p>
          )}
          {geoStatsQuery.data && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: 'Total dirs.', value: geoStatsQuery.data.total, cls: 'text-indigo-600 border-indigo-400' },
                { label: 'Geocodificadas', value: geoStatsQuery.data.conCoordenadas, cls: 'text-green-600 border-green-400' },
                { label: 'Pendientes', value: geoStatsQuery.data.pendientes, cls: 'text-amber-600 border-amber-400' },
                { label: 'Errores', value: geoStatsQuery.data.errores, cls: 'text-red-600 border-red-400' },
                { label: '% Completado', value: `${geoStatsQuery.data.porcentajeGeocodificado}%`, cls: 'text-blue-600 border-blue-400' },
              ].map((s) => (
                <div key={s.label} className={`rounded-lg border-l-4 bg-gray-50 p-4 ${s.cls}`}>
                  <p className={`text-2xl font-bold ${s.cls.split(' ')[0]}`}>{s.value}</p>
                  <p className="mt-1 text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => geoProcessMutation.mutate('process')}
              disabled={geoProcessMutation.isPending}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              🚀 Procesar Batch (50 registros)
            </button>
            <button
              onClick={() => geoProcessMutation.mutate('retry')}
              disabled={geoProcessMutation.isPending}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-60"
            >
              🔄 Reintentar Errores
            </button>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: queryKeys.adminCartilla.geocoding() })}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
            >
              📊 Actualizar
            </button>
          </div>

          {geoProcessMutation.data && (
            <pre className="rounded-lg bg-gray-900 text-gray-200 p-4 text-xs leading-relaxed overflow-auto max-h-56">
              {JSON.stringify(geoProcessMutation.data, null, 2)}
            </pre>
          )}
          {geoProcessMutation.isError && (
            <p className="text-sm text-red-600">{(geoProcessMutation.error as Error).message}</p>
          )}
        </div>
      )}

      {/* ── MODAL VER DETALLE ── */}
      {viewEntidad && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setViewEntidad(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">👁️ Detalles</h2>
              <button
                onClick={() => setViewEntidad(null)}
                className="rounded-full w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-red-500"
              >
                ✕
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'ID', value: viewEntidad.caentid },
                { label: 'Nombre', value: viewEntidad.caentapeno },
                { label: 'Matrícula', value: viewEntidad.caentmatri ?? '-' },
                { label: 'Email', value: viewEntidad.caentmail || '-' },
                { label: 'Web', value: viewEntidad.caentweb || '-' },
                { label: 'Prioridad', value: viewEntidad.caentprior },
                { label: 'Estado', value: viewEntidad.caentactivo ? 'Activa' : 'Baja' },
                { label: 'Obs.', value: viewEntidad.caentobs ?? '-' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-gray-50 border-l-4 border-indigo-400 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    {item.label}
                  </dt>
                  <dd className="text-gray-800 font-medium break-all">{String(item.value)}</dd>
                </div>
              ))}
            </dl>
            {viewEntidad.caendire && viewEntidad.caendire.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Direcciones y teléfonos</h3>
                <div className="space-y-2">
                  {viewEntidad.caendire.map((d) => (
                    <div key={`${d.caentid}-${d.caendid}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                      <p className="font-medium text-gray-900">{d.caendirecc}</p>
                      <p className="text-gray-500 mt-0.5">
                        {d.nulocali?.nulocdescr ?? d.nulocid} · Horario: {d.caendhorat || '-'}
                      </p>
                      {d.caentele && d.caentele.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {d.caentele.map((t) => (
                            <span
                              key={`${t.caenteleid}-${t.caentelefo}`}
                              className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs text-gray-700"
                            >
                              {t.caentelefo}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewEntidad(null)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CREAR / EDITAR ── */}
      {showEntityModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowEntityModal(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? '✏️ Editar Entidad' : '➕ Nueva Entidad'}
              </h2>
              <button
                onClick={() => setShowEntityModal(false)}
                className="rounded-full w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-red-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    maxLength={50}
                    value={form.caentapeno}
                    onChange={(e) => setForm((f) => ({ ...f, caentapeno: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="Nombre o razón social del prestador"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Rubro</label>
                  <select
                    value={form.carubid}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm((f) => ({ ...f, carubid: v, caespid: '' }))
                      setModalRubroid(v)
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {rubrosQuery.data?.map((r) => (
                      <option key={r.carubid} value={r.carubid}>
                        {r.carubdescr.trim()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Especialidad</label>
                  <select
                    value={form.caespid}
                    onChange={(e) => setForm((f) => ({ ...f, caespid: e.target.value }))}
                    disabled={!form.carubid}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                  >
                    <option value="">Sin especialidad</option>
                    {modalEspecialidadesQuery.data?.map((esp) => (
                      <option key={esp.caespid} value={esp.caespid}>
                        {esp.caespdescr.trim()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Matrícula</label>
                  <input
                    maxLength={100}
                    value={form.caentmatri}
                    onChange={(e) => setForm((f) => ({ ...f, caentmatri: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Número de matrícula"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    maxLength={100}
                    value={form.caentmail}
                    onChange={(e) => setForm((f) => ({ ...f, caentmail: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Página Web</label>
                  <input
                    maxLength={1000}
                    value={form.caentweb}
                    onChange={(e) => setForm((f) => ({ ...f, caentweb: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Prioridad</label>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={form.caentprior}
                    onChange={(e) => setForm((f) => ({ ...f, caentprior: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
                  <textarea
                    rows={3}
                    maxLength={5000}
                    value={form.caentobs}
                    onChange={(e) => setForm((f) => ({ ...f, caentobs: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y"
                  />
                </div>
              </div>

              {saveMutation.isError && (
                <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  ❌ {(saveMutation.error as Error).message}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEntityModal(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saveMutation.isPending ? 'Guardando...' : '💾 Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CONFIRMAR BAJA ── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Confirmar baja</h2>
            <p className="text-sm text-gray-600 mb-6">
              ¿Dar de baja la entidad <span className="font-semibold">{deletingId}</span>? Esta acción es reversible.
            </p>
            {deleteMutation.isError && (
              <p className="mb-4 rounded bg-red-50 border border-red-200 p-2 text-sm text-red-700">
                {(deleteMutation.error as Error).message}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingId!)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Procesando...' : 'Dar de baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
