'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { Search, RefreshCw } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string | number
  created_at: string
  entity?: string
  entity_id?: string
  action: string
  actor?: string
  summary?: string
  ip?: string
}

interface AuditResponse {
  logs?: AuditLog[]
  data?: AuditLog[]
  total?: number
  page?: number
}

interface AfiliadoResult {
  user: {
    nuusuid: string
    afiliadoId: string
    email: string
    nombre: string
    dnCuil: string
    plan: string | null
    sexo: string | null
    activo: boolean
    desactivado: boolean
    fechaBaja: string | null
    motivoBaja: string | null
    esAdmin: boolean
    rolNombre: string | null
  }
  stats: {
    activeSessions: number
    credenciales: number
    totalNotificaciones: number
  }
  devices: {
    id: string
    platform: string
    registradoEl: string
    ultimaActividad: string
  }[]
  timeline: {
    source: 'notif' | 'device'
    title: string
    summary: string
    when: string
    leida?: boolean | null
    tipo?: string
  }[]
}

const PAGE_SIZE = 20

// ── Componente ────────────────────────────────────────────────────────────────

export function AdminSoportePanel() {
  const [tab, setTab] = useState<'afiliado' | 'bitacora'>('afiliado')

  // ── Tab Afiliado ─────────────────────────────────────────────────────────
  const [draftQ, setDraftQ] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [searchLimit, setSearchLimit] = useState(30)

  const afiliadoQuery = useQuery({
    queryKey: queryKeys.adminSoporteAfiliado(searchQ, searchLimit),
    queryFn: async () => {
      const params = new URLSearchParams({ q: searchQ, limit: String(searchLimit) })
      const res = await fetch(`/api/admin/soporte/afiliado?${params}`)
      const json = await res.json()
      if (!json.ok) throw new Error(json.message ?? 'No encontrado')
      return json.data as AfiliadoResult
    },
    enabled: !!searchQ,
    retry: false,
  })

  function handleAfiliadoSearch() {
    if (!draftQ.trim()) return
    setSearchQ(draftQ.trim())
  }

  // ── Tab Bitácora ─────────────────────────────────────────────────────────
  const [page, setPage] = useState(0)
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [actor, setActor] = useState('')
  const [draftActor, setDraftActor] = useState('')

  const {
    data: auditResponse,
    isLoading: auditLoading,
    error: auditError,
    refetch: auditRefetch,
    isFetching: auditFetching,
  } = useQuery({
    queryKey: queryKeys.adminSoporte(page, entity, action, actor),
    queryFn: async () => {
      const params = new URLSearchParams({
        take: String(PAGE_SIZE),
        skip: String(page * PAGE_SIZE),
      })
      if (entity) params.set('entity', entity)
      if (action) params.set('action', action)
      if (actor) params.set('actor', actor)
      const res = await fetch(`/api/admin/soporte?${params}`)
      const json = await res.json()
      if (!json.ok) throw new Error(json.message ?? 'Error al obtener bitácora')
      return json.data as AuditResponse
    },
  })

  const logs: AuditLog[] = auditResponse?.logs ?? auditResponse?.data ?? []
  const total = auditResponse?.total ?? 0

  function handleBitacoraSearch() {
    setActor(draftActor)
    setPage(0)
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['afiliado', 'bitacora'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'afiliado' ? '🔍 Búsqueda de afiliado' : '📋 Bitácora admin'}
          </button>
        ))}
      </div>

      {/* ── TAB: Afiliado ─────────────────────────────────────────────────── */}
      {tab === 'afiliado' && (
        <div className="space-y-5">
          {/* Buscador */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Búsqueda de afiliado</h2>
            <p className="text-sm text-gray-500 mb-4">
              Buscá por email, DNI, CUIL, nro. de afiliado o ID interno.
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <input
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAfiliadoSearch()}
                placeholder="Ej: usuario@mail.com o 20288787655"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Eventos (límite)</label>
                <select
                  value={searchLimit}
                  onChange={(e) => setSearchLimit(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <button
                onClick={handleAfiliadoSearch}
                disabled={!draftQ.trim() || afiliadoQuery.isFetching}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                <Search className="w-4 h-4" />
                {afiliadoQuery.isFetching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          {afiliadoQuery.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
              {(afiliadoQuery.error as Error).message}
            </div>
          )}

          {afiliadoQuery.data && (() => {
            const { user, stats, devices, timeline } = afiliadoQuery.data
            return (
              <>
                {/* Stats cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Estado', value: user.desactivado ? 'Baja' : (user.activo ? 'Activo' : 'Inactivo'), color: user.desactivado ? 'text-red-600' : 'text-green-600' },
                    { label: 'Dispositivos activos', value: stats.activeSessions, color: 'text-gray-900' },
                    { label: 'Credenciales', value: stats.credenciales, color: 'text-gray-900' },
                    { label: 'Notificaciones', value: stats.totalNotificaciones, color: 'text-gray-900' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">{label}</p>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  {/* Ficha de usuario */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h2 className="font-semibold text-gray-900 mb-3">👤 Estado actual</h2>
                    <dl className="space-y-2 text-sm">
                      {[
                        ['Nombre', user.nombre],
                        ['Email', user.email],
                        ['DNI / CUIL', user.dnCuil],
                        ['Afiliado ID', user.afiliadoId],
                        ['Nuusuid', user.nuusuid],
                        ['Plan', user.plan ?? '—'],
                        ['Sexo', user.sexo ?? '—'],
                        ['Es admin', user.esAdmin ? `Sí (${user.rolNombre ?? 'sin rol'})` : 'No'],
                        ...(user.desactivado
                          ? [
                              ['Fecha baja', user.fechaBaja ? fmt(user.fechaBaja) : '—'],
                              ['Motivo baja', user.motivoBaja ?? '—'],
                            ]
                          : []),
                      ].map(([label, val]) => (
                        <div key={label} className="flex gap-2">
                          <dt className="w-28 text-gray-400 shrink-0">{label}</dt>
                          <dd className="text-gray-800 font-medium break-all">{val}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {/* Dispositivos */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h2 className="font-semibold text-gray-900 mb-3">
                      💻 Dispositivos registrados{' '}
                      <span className="text-xs text-gray-400 font-normal">({devices.length})</span>
                    </h2>
                    {devices.length === 0 ? (
                      <p className="text-sm text-gray-400">Sin dispositivos registrados.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-500">
                            <th className="text-left pb-2">Plataforma</th>
                            <th className="text-left pb-2">Registrado</th>
                            <th className="text-left pb-2">Última actividad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {devices.map((d) => (
                            <tr key={d.id} className="border-b border-gray-50">
                              <td className="py-1.5 font-medium text-gray-800">{d.platform}</td>
                              <td className="py-1.5 text-gray-500">{fmt(d.registradoEl)}</td>
                              <td className="py-1.5 text-gray-500">{fmt(d.ultimaActividad)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Línea de tiempo */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="font-semibold text-gray-900 mb-4">
                    🕐 Línea de tiempo{' '}
                    <span className="text-xs text-gray-400 font-normal">({timeline.length} eventos)</span>
                  </h2>
                  {timeline.length === 0 ? (
                    <p className="text-sm text-gray-400">Sin eventos registrados.</p>
                  ) : (
                    <ol className="space-y-3">
                      {timeline.map((item, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="mt-1 w-2.5 h-2.5 rounded-full shrink-0 bg-indigo-400" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800">{item.title}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{item.summary}</p>
                            {item.source === 'notif' && item.leida !== undefined && (
                              <span className={`text-xs ${item.leida ? 'text-gray-400' : 'text-indigo-600 font-semibold'}`}>
                                {item.leida ? 'Leída' : 'No leída'}
                              </span>
                            )}
                          </div>
                          <time className="text-xs text-gray-400 whitespace-nowrap shrink-0">{fmt(item.when)}</time>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ── TAB: Bitácora ─────────────────────────────────────────────────── */}
      {tab === 'bitacora' && (
        <div className="space-y-5">
          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Entidad</label>
                <select
                  value={entity}
                  onChange={(e) => { setEntity(e.target.value); setPage(0) }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Todas</option>
                  <option value="parametro">Parámetro</option>
                  <option value="usuario">Usuario</option>
                  <option value="noticia">Noticia</option>
                  <option value="info-util">Info útil</option>
                  <option value="cartilla">Cartilla</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Acción</label>
                <select
                  value={action}
                  onChange={(e) => { setAction(e.target.value); setPage(0) }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Todas</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                  <option value="SEND">SEND</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Actor</label>
                <input
                  value={draftActor}
                  onChange={(e) => setDraftActor(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBitacoraSearch()}
                  placeholder="email o ID"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
                />
              </div>
              <button
                onClick={handleBitacoraSearch}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                <Search className="w-4 h-4" /> Buscar
              </button>
              <button
                onClick={() => auditRefetch()}
                disabled={auditFetching}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-60 ml-auto"
              >
                <RefreshCw className={`w-4 h-4 ${auditFetching ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>

          {auditLoading && (
            <div className="text-center py-12 text-gray-500">Cargando bitácora…</div>
          )}

          {auditError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              {(auditError as Error).message}
            </div>
          )}

          {!auditLoading && !auditError && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {total > 0 ? `${total} registros` : `${logs.length} registros`}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Entidad</th>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Acción</th>
                    <th className="px-4 py-2">Actor</th>
                    <th className="px-4 py-2">Resumen</th>
                    <th className="px-4 py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                        {fmt(log.created_at)}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{log.entity ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-500 font-mono text-xs max-w-[120px] truncate">
                        {log.entity_id ?? '—'}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            log.action === 'DELETE'
                              ? 'bg-red-100 text-red-700'
                              : log.action === 'CREATE'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500 max-w-[140px] truncate">
                        {log.actor ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-gray-600 max-w-[200px] truncate">
                        {log.summary ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{log.ip ?? '—'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        Sin registros con los filtros actuales
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Paginación */}
              {logs.length === PAGE_SIZE && (
                <div className="px-5 py-3 border-t border-gray-100 flex gap-2 justify-end">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
