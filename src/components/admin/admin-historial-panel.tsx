'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Desconocimiento {
  id: number
  nuusuid: string | null
  afiliado_id: string | null
  atencion_id: string | null
  nro_delegacion: string | null
  nro_autorizacion: string | null
  prestador_nombre: string | null
  motivo: string | null
  descripcion: string | null
  estado: 'pendiente' | 'en_revision' | 'resuelto' | 'cerrado'
  created_at: string
  updated_at: string
  usuario_email: string | null
  usuario_nombre: string | null
}

interface Calificacion {
  id: number
  nuusuid: string | null
  afiliado_id: string | null
  atencion_id: string | null
  entidad_id: string | null
  entidad_nombre: string | null
  puntuacion: number
  comentario: string | null
  created_at: string
  usuario_email: string | null
  usuario_nombre: string | null
}

interface CalifResumen {
  total: number
  promedio: number | null
  estrellas_1: number
  estrellas_2: number
  estrellas_3: number
  estrellas_4: number
  estrellas_5: number
}

interface Pagination {
  page: number
  limit: number
  total: number
}

type Tab = 'desc' | 'calif'

const LIMIT = 20

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}
const ESTADO_CLASS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  en_revision: 'bg-blue-100 text-blue-700',
  resuelto: 'bg-green-100 text-green-700',
  cerrado: 'bg-gray-100 text-gray-600',
}
const MOTIVO_LABEL: Record<string, string> = {
  no_reconozco: 'No reconozco',
  incorrecto: 'Dato incorrecto',
  duplicado: 'Duplicado',
  otro: 'Otro',
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchDesconocimientos(
  page: number,
  estado: string,
  q: string,
): Promise<{ data: { items: Desconocimiento[]; pagination: Pagination } }> {
  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
  if (estado) params.set('estado', estado)
  if (q) params.set('q', q)
  const res = await fetch(`/api/admin/historial-atencion/desconocimientos?${params}`)
  if (!res.ok) throw new Error('Error cargando desconocimientos')
  return res.json()
}

async function fetchCalificaciones(
  page: number,
  puntuacion: string,
  q: string,
): Promise<{ data: { items: Calificacion[]; pagination: Pagination } }> {
  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
  if (puntuacion) params.set('puntuacion', puntuacion)
  if (q) params.set('q', q)
  const res = await fetch(`/api/admin/historial-atencion/calificaciones?${params}`)
  if (!res.ok) throw new Error('Error cargando calificaciones')
  return res.json()
}

async function fetchResumen(): Promise<{ data: { resumen: CalifResumen } }> {
  const res = await fetch('/api/admin/historial-atencion/calificaciones/resumen')
  if (!res.ok) throw new Error('Error cargando resumen')
  return res.json()
}

async function patchEstado(id: number, estado: string): Promise<void> {
  const res = await fetch(`/api/admin/historial-atencion/desconocimientos/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error((json as { message?: string }).message || 'Error actualizando estado')
  }
}

// ── Helpers visuales ──────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${ESTADO_CLASS[estado] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span>
      <span className="text-yellow-400">{'★'.repeat(n)}</span>
      <span className="text-gray-200">{'★'.repeat(5 - n)}</span>
    </span>
  )
}

function fmtDate(dt: string) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Componente principal ──────────────────────────────────────────────────────

export function AdminHistorialPanel() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('desc')

  // ── Desconocimientos state
  const [descPage, setDescPage] = useState(1)
  const [descEstado, setDescEstado] = useState('')
  const [descQ, setDescQ] = useState('')
  const [descQInput, setDescQInput] = useState('')
  const [descDebounce, setDescDebounce] = useState<ReturnType<typeof setTimeout> | null>(null)

  // ── Calificaciones state
  const [califPage, setCalifPage] = useState(1)
  const [califPuntuacion, setCalifPuntuacion] = useState('')
  const [califQ, setCalifQ] = useState('')
  const [califQInput, setCalifQInput] = useState('')
  const [califDebounce, setCalifDebounce] = useState<ReturnType<typeof setTimeout> | null>(null)

  // ── Modal estado
  const [modalItem, setModalItem] = useState<Desconocimiento | null>(null)
  const [modalEstado, setModalEstado] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // ── Queries ─────────────────────────────────────────────────────────────────

  const descQuery = useQuery({
    queryKey: queryKeys.adminHistorialDesconocimientos(descPage, descEstado, descQ),
    queryFn: () => fetchDesconocimientos(descPage, descEstado, descQ),
  })

  const califQuery = useQuery({
    queryKey: queryKeys.adminHistorialCalificaciones(califPage, califPuntuacion, califQ),
    queryFn: () => fetchCalificaciones(califPage, califPuntuacion, califQ),
  })

  const resumenQuery = useQuery({
    queryKey: queryKeys.adminHistorialResumen(),
    queryFn: fetchResumen,
  })

  // ── Mutation cambio de estado ────────────────────────────────────────────────

  const estadoMut = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => patchEstado(id, estado),
    onSuccess: () => {
      setModalItem(null)
      showToast('Estado actualizado ✓', 'success')
      qc.invalidateQueries({ queryKey: ['admin', 'historial', 'desconocimientos'] })
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  })

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  function handleDescQChange(v: string) {
    setDescQInput(v)
    if (descDebounce) clearTimeout(descDebounce)
    setDescDebounce(setTimeout(() => { setDescQ(v); setDescPage(1) }, 400))
  }

  function handleCalifQChange(v: string) {
    setCalifQInput(v)
    if (califDebounce) clearTimeout(califDebounce)
    setCalifDebounce(setTimeout(() => { setCalifQ(v); setCalifPage(1) }, 400))
  }

  // ── Stats cards ───────────────────────────────────────────────────────────────

  const descTotal = descQuery.data?.data?.pagination?.total ?? 0
  const descItems = descQuery.data?.data?.items ?? []
  const descPend = descItems.filter((x) => x.estado === 'pendiente').length
  const descRev = descItems.filter((x) => x.estado === 'en_revision').length
  const resumen = resumenQuery.data?.data?.resumen

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { num: descTotal, lbl: 'Desconocimientos', cls: 'text-indigo-600' },
          { num: descPend, lbl: 'Pendientes', cls: 'text-yellow-600' },
          { num: descRev, lbl: 'En revisión', cls: 'text-blue-600' },
          { num: resumen?.total ?? 0, lbl: 'Calificaciones', cls: 'text-indigo-600' },
          {
            num: resumen?.promedio != null ? Number(resumen.promedio).toFixed(1) : '—',
            lbl: 'Promedio ★',
            cls: 'text-yellow-500',
          },
        ].map(({ num, lbl, cls }) => (
          <div key={lbl} className="bg-white rounded-xl shadow-sm px-5 py-3 min-w-[110px] text-center">
            <div className={`text-2xl font-bold ${cls}`}>{num}</div>
            <div className="text-xs text-gray-500 mt-0.5">{lbl}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {([['desc', '🚨 Desconocimientos'], ['calif', '⭐ Calificaciones']] as const).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-6 py-2.5 rounded-t-lg text-sm font-semibold transition-colors ${
                tab === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {/* ── Tab Desconocimientos ── */}
      {tab === 'desc' && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="bg-white rounded-xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={descQInput}
              onChange={(e) => handleDescQChange(e.target.value)}
              placeholder="🔍 Buscar afiliado, prestador…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[200px] focus:outline-none focus:border-indigo-400"
            />
            <select
              value={descEstado}
              onChange={(e) => { setDescEstado(e.target.value); setDescPage(1) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_revision">En revisión</option>
              <option value="resuelto">Resuelto</option>
              <option value="cerrado">Cerrado</option>
            </select>
            <span className="flex-1" />
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'historial', 'desconocimientos'] })}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-2 rounded-lg"
            >
              🔄 Actualizar
            </button>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 border-b-2 border-gray-100">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Afiliado</th>
                  <th className="px-4 py-3">Prestador</th>
                  <th className="px-4 py-3">Autorización</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {descQuery.isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Cargando…
                    </td>
                  </tr>
                ) : descItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  descItems.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-indigo-50/30">
                      <td className="px-4 py-3 text-xs text-gray-400">#{d.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{d.usuario_email ?? d.nuusuid ?? '—'}</div>
                        {d.usuario_nombre && (
                          <div className="text-xs text-gray-400">{d.usuario_nombre}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{d.prestador_nombre ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs">{d.nro_autorizacion ?? '—'}</div>
                        {d.nro_delegacion && (
                          <div className="text-xs text-gray-400">{d.nro_delegacion}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {MOTIVO_LABEL[d.motivo ?? ''] ?? d.motivo ?? '—'}
                        </span>
                        {d.descripcion && (
                          <div className="text-xs text-gray-500 mt-1 italic max-w-[200px] truncate" title={d.descripcion}>
                            {d.descripcion}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <EstadoBadge estado={d.estado} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmtDate(d.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setModalItem(d); setModalEstado('') }}
                          className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium px-3 py-1.5 rounded-lg"
                        >
                          ✏️ Estado
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Paginación */}
            {descTotal > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500 flex-1">
                  Mostrando {(descPage - 1) * LIMIT + 1}–{Math.min(descPage * LIMIT, descTotal)} de {descTotal}
                </span>
                <button
                  disabled={descPage <= 1}
                  onClick={() => setDescPage((p) => p - 1)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-40 px-3 py-1.5 rounded-lg font-medium"
                >
                  ‹ Anterior
                </button>
                <button
                  disabled={descPage * LIMIT >= descTotal}
                  onClick={() => setDescPage((p) => p + 1)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-40 px-3 py-1.5 rounded-lg font-medium"
                >
                  Siguiente ›
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Calificaciones ── */}
      {tab === 'calif' && (
        <div className="space-y-3">
          {/* Distribución estrellas */}
          {resumen && resumen.total > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-8 mb-4">
                <div>
                  <div className="text-4xl font-extrabold text-yellow-500">
                    {resumen.promedio != null ? Number(resumen.promedio).toFixed(1) : '—'}
                  </div>
                  <div className="text-xs text-gray-400">sobre 5 estrellas</div>
                </div>
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const count = resumen[`estrellas_${n}` as keyof CalifResumen] as number ?? 0
                    const max = Math.max(
                      resumen.estrellas_1,
                      resumen.estrellas_2,
                      resumen.estrellas_3,
                      resumen.estrellas_4,
                      resumen.estrellas_5,
                      1,
                    )
                    const pct = Math.round((count / max) * 100)
                    return (
                      <div key={n} className="flex items-center gap-2">
                        <span className="text-yellow-400 text-xs w-14">{'★'.repeat(n)}</span>
                        <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                          <div
                            className="bg-yellow-400 h-full rounded transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="bg-white rounded-xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={califQInput}
              onChange={(e) => handleCalifQChange(e.target.value)}
              placeholder="🔍 Buscar afiliado, entidad…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[200px] focus:outline-none focus:border-indigo-400"
            />
            <select
              value={califPuntuacion}
              onChange={(e) => { setCalifPuntuacion(e.target.value); setCalifPage(1) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            >
              <option value="">Todas las estrellas</option>
              <option value="5">★★★★★ (5)</option>
              <option value="4">★★★★☆ (4)</option>
              <option value="3">★★★☆☆ (3)</option>
              <option value="2">★★☆☆☆ (2)</option>
              <option value="1">★☆☆☆☆ (1)</option>
            </select>
            <span className="flex-1" />
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'historial', 'calificaciones'] })}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-2 rounded-lg"
            >
              🔄 Actualizar
            </button>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 border-b-2 border-gray-100">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Afiliado</th>
                  <th className="px-4 py-3">Entidad / Prestador</th>
                  <th className="px-4 py-3">Autorización</th>
                  <th className="px-4 py-3 text-center">Puntuación</th>
                  <th className="px-4 py-3">Comentario</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {califQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Cargando…
                    </td>
                  </tr>
                ) : (califQuery.data?.data?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  (califQuery.data?.data?.items ?? []).map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-indigo-50/30">
                      <td className="px-4 py-3 text-xs text-gray-400">#{c.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{c.usuario_email ?? c.nuusuid ?? '—'}</div>
                        {c.usuario_nombre && (
                          <div className="text-xs text-gray-400">{c.usuario_nombre}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{c.entidad_nombre ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.atencion_id ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <Stars n={c.puntuacion} />
                      </td>
                      <td className="px-4 py-3">
                        {c.comentario ? (
                          <span
                            className="text-xs text-gray-600 max-w-[220px] block truncate"
                            title={c.comentario}
                          >
                            {c.comentario}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">Sin comentario</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmtDate(c.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Paginación */}
            {(califQuery.data?.data?.pagination?.total ?? 0) > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500 flex-1">
                  Mostrando {(califPage - 1) * LIMIT + 1}–
                  {Math.min(califPage * LIMIT, califQuery.data!.data.pagination.total)} de{' '}
                  {califQuery.data!.data.pagination.total}
                </span>
                <button
                  disabled={califPage <= 1}
                  onClick={() => setCalifPage((p) => p - 1)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-40 px-3 py-1.5 rounded-lg font-medium"
                >
                  ‹ Anterior
                </button>
                <button
                  disabled={califPage * LIMIT >= (califQuery.data?.data?.pagination?.total ?? 0)}
                  onClick={() => setCalifPage((p) => p + 1)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-40 px-3 py-1.5 rounded-lg font-medium"
                >
                  Siguiente ›
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal cambio de estado ── */}
      {modalItem && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setModalItem(null) }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-7 w-[90%] max-w-md">
            <h3 className="text-base font-semibold text-gray-800 mb-4">
              Cambiar estado del desconocimiento
            </h3>
            <div className="text-sm text-gray-600 space-y-1 mb-5">
              <div><strong>Afiliado:</strong> {modalItem.usuario_email ?? modalItem.nuusuid ?? '—'}</div>
              <div><strong>Prestador:</strong> {modalItem.prestador_nombre ?? '—'}</div>
              <div>
                <strong>Motivo:</strong>{' '}
                {MOTIVO_LABEL[modalItem.motivo ?? ''] ?? modalItem.motivo ?? '—'}
              </div>
              {modalItem.descripcion && (
                <div><strong>Descripción:</strong> {modalItem.descripcion}</div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado actual</label>
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500">
                <EstadoBadge estado={modalItem.estado} />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nuevo estado <span className="text-red-500">*</span>
              </label>
              <select
                value={modalEstado}
                onChange={(e) => setModalEstado(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              >
                <option value="">— Seleccioná —</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_revision">En revisión</option>
                <option value="resuelto">Resuelto</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalItem(null)}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                disabled={!modalEstado || estadoMut.isPending}
                onClick={() => estadoMut.mutate({ id: modalItem.id, estado: modalEstado })}
                className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
              >
                {estadoMut.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-500'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
