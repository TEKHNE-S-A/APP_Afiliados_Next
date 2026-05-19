'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  total: number
  noLeidas: number
  leidas: number
  usuariosConNotificaciones: number
}

interface Segmento {
  tipo: 'todos' | 'titular' | 'familiar'
  sexo: string
  plan: string
  edadMin: string
  edadMax: string
  plataforma: string
}

interface HistorialFilters {
  q: string
  tipo: string
  leida: string
  fechaDesde: string
  fechaHasta: string
}

interface Notificacion {
  id: string
  nuusuid: string
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean | null
  fecha_creacion: string | null
  usuario_email: string | null
  usuario_nombre: string | null
}

interface HistorialData {
  data: Notificacion[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasPrev: boolean
    hasNext: boolean
  }
  stats: {
    total: number
    noLeidas: number
    leidas: number
    usuariosDistintos: number
  }
}

interface SendResult {
  stats: {
    usuarios: number
    in_app_creadas: number
    push_enviados: number
    omitidos_pref: number
    errores: number
  }
  segmento: string
}

interface SessionEntry {
  titulo: string
  categoria: string
  segmento: string
  stats: SendResult['stats']
  fecha: Date
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function fetchStats(): Promise<Stats> {
  const res = await fetch('/api/admin/notifications/stats')
  if (!res.ok) throw new Error('No se pudieron cargar métricas')
  return (await res.json()).data
}

async function fetchHistorial(filters: HistorialFilters, page: number): Promise<HistorialData> {
  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (filters.q) params.set('q', filters.q)
  if (filters.tipo) params.set('tipo', filters.tipo)
  if (filters.leida !== '') params.set('leida', filters.leida)
  if (filters.fechaDesde) params.set('fecha_desde', filters.fechaDesde)
  if (filters.fechaHasta) params.set('fecha_hasta', filters.fechaHasta)
  const res = await fetch(`/api/admin/notifications/list?${params}`)
  if (!res.ok) throw new Error('Error cargando historial')
  return (await res.json()).data
}

async function previewBroadcast(
  seg: Segmento,
): Promise<{ total: number; dispositivosPlat: number | null }> {
  const params = new URLSearchParams()
  if (seg.tipo !== 'todos') params.set('tipo', seg.tipo)
  if (seg.sexo) params.set('sexo', seg.sexo)
  if (seg.plan) params.set('plan', seg.plan)
  if (seg.edadMin) params.set('edadMin', seg.edadMin)
  if (seg.edadMax) params.set('edadMax', seg.edadMax)
  if (seg.plataforma) params.set('plataforma', seg.plataforma)
  const res = await fetch(`/api/admin/notifications/broadcast/preview?${params}`)
  if (!res.ok) throw new Error('Error calculando destinatarios')
  return (await res.json()).data
}

async function sendBroadcast(payload: {
  titulo: string
  mensaje: string
  categoria: string
  filtros: Segmento
}): Promise<SendResult> {
  const res = await fetch('/api/admin/notifications/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || 'Error al enviar broadcast')
  return json.data
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_SEG: Segmento = {
  tipo: 'todos',
  sexo: '',
  plan: '',
  edadMin: '',
  edadMax: '',
  plataforma: '',
}
const EMPTY_FILTERS: HistorialFilters = {
  q: '',
  tipo: '',
  leida: '',
  fechaDesde: '',
  fechaHasta: '',
}

const TIPO_BADGE: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  noticias: 'bg-blue-100 text-blue-700',
  sistema: 'bg-amber-100 text-amber-700',
  broadcast: 'bg-violet-100 text-violet-700',
  general: 'bg-gray-100 text-gray-600',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminNotificacionesPanel() {
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'broadcast' | 'historial'>('broadcast')

  // Broadcast state
  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [categoria, setCategoria] = useState<'noticias' | 'sistema'>('noticias')
  const [segmento, setSegmento] = useState<Segmento>(EMPTY_SEG)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewResult, setPreviewResult] = useState<{
    total: number
    dispositivosPlat: number | null
  } | null>(null)
  const [previewDirty, setPreviewDirty] = useState(false)
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  const [broadcastError, setBroadcastError] = useState('')
  const [sessionHistory, setSessionHistory] = useState<SessionEntry[]>([])

  // Historial state
  const [histFilters, setHistFilters] = useState<HistorialFilters>(EMPTY_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<HistorialFilters>(EMPTY_FILTERS)
  const [histPage, setHistPage] = useState(1)
  const [histEnabled, setHistEnabled] = useState(false)

  // Queries
  const statsQuery = useQuery({
    queryKey: queryKeys.adminNotificaciones.stats(),
    queryFn: fetchStats,
  })

  const historialQuery = useQuery({
    queryKey: queryKeys.adminNotificaciones.historial({
      ...histFilters,
      page: histPage,
    }),
    queryFn: () => fetchHistorial(histFilters, histPage),
    enabled: histEnabled,
  })

  const broadcastMutation = useMutation({
    mutationFn: sendBroadcast,
    onSuccess: (result) => {
      setSendResult(result)
      setBroadcastError('')
      setSessionHistory((prev) => [
        {
          titulo,
          categoria,
          segmento: result.segmento,
          stats: result.stats,
          fecha: new Date(),
        },
        ...prev,
      ])
      setTitulo('')
      setMensaje('')
      setPreviewResult(null)
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotificaciones.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones.all() })
    },
    onError: (err: Error) => setBroadcastError(err.message),
  })

  // Helpers
  const switchTab = (tab: 'broadcast' | 'historial') => {
    setActiveTab(tab)
    if (tab === 'historial' && !histEnabled) {
      setHistEnabled(true)
    }
  }

  const handlePreview = async () => {
    setPreviewLoading(true)
    setPreviewDirty(false)
    try {
      setPreviewResult(await previewBroadcast(segmento))
    } catch {
      setPreviewResult(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const updateSeg = (key: keyof Segmento, val: string) => {
    setSegmento((prev) => ({ ...prev, [key]: val }))
    setPreviewDirty(true)
  }

  const handleBuscar = () => {
    setHistFilters({ ...pendingFilters })
    setHistPage(1)
    setHistEnabled(true)
  }

  const stats = statsQuery.data
  const hist = historialQuery.data
  const tituloLen = titulo.length
  const mensajeLen = mensaje.length

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(
          [
            { id: 'broadcast', label: '📤 Broadcast' },
            { id: 'historial', label: '🔍 Historial de notificaciones' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'text-violet-700 border-violet-600 bg-violet-50'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── BROADCAST ──────────────────────────────────────────────────────── */}
      {activeTab === 'broadcast' && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Métricas */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">Métricas</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                { label: 'Total', val: stats?.total, cls: 'text-gray-900' },
                { label: 'No leídas', val: stats?.noLeidas, cls: 'text-red-600' },
                { label: 'Leídas', val: stats?.leidas, cls: 'text-green-600' },
                { label: 'Usuarios', val: stats?.usuariosConNotificaciones, cls: 'text-blue-600' },
              ].map((m) => (
                <div key={m.label} className="flex justify-between">
                  <dt className="text-gray-500">{m.label}</dt>
                  <dd className={`font-medium ${m.cls}`}>{m.val ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Formulario */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-900">✉️ Nuevo mensaje</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                setSendResult(null)
                broadcastMutation.mutate({ titulo, mensaje, categoria, filtros: segmento })
              }}
            >
              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Título <span className="font-normal text-gray-400">(máx. 80 caracteres)</span>
                </label>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={80}
                  required
                  placeholder="Ej: Nuevos horarios de atención"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <div
                  className={`text-right text-xs mt-0.5 ${
                    tituloLen >= 80
                      ? 'text-red-500'
                      : tituloLen > 72
                        ? 'text-amber-500'
                        : 'text-gray-400'
                  }`}
                >
                  {tituloLen} / 80
                </div>
              </div>

              {/* Mensaje */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Mensaje <span className="font-normal text-gray-400">(máx. 1000 caracteres)</span>
                </label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  maxLength={1000}
                  required
                  placeholder="Escribí el cuerpo del mensaje..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-28 resize-y"
                />
                <div
                  className={`text-right text-xs mt-0.5 ${
                    mensajeLen >= 1000
                      ? 'text-red-500'
                      : mensajeLen > 900
                        ? 'text-amber-500'
                        : 'text-gray-400'
                  }`}
                >
                  {mensajeLen} / 1000
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as 'noticias' | 'sistema')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="noticias">📢 Novedades — comunicados, cambios operativos</option>
                  <option value="sistema">🔔 Sistema — alertas de seguridad, mantenimiento</option>
                </select>
              </div>

              {/* Segmentación */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Segmentación de destinatarios
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Tipo de afiliado
                      </label>
                      <select
                        value={segmento.tipo}
                        onChange={(e) => updateSeg('tipo', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="todos">Todos</option>
                        <option value="titular">Solo titulares</option>
                        <option value="familiar">Solo familiares</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Sexo
                      </label>
                      <select
                        value={segmento.sexo}
                        onChange={(e) => updateSeg('sexo', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="">Todos</option>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Plan
                      </label>
                      <input
                        value={segmento.plan}
                        onChange={(e) => updateSeg('plan', e.target.value)}
                        placeholder="Ej: PAMI, 001..."
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Edad mínima
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={130}
                        value={segmento.edadMin}
                        onChange={(e) => updateSeg('edadMin', e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Edad máxima
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={130}
                        value={segmento.edadMax}
                        onChange={(e) => updateSeg('edadMax', e.target.value)}
                        placeholder="Sin límite"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Dispositivo
                      </label>
                      <select
                        value={segmento.plataforma}
                        onChange={(e) => updateSeg('plataforma', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                      >
                        <option value="">Todos</option>
                        <option value="ios">Apple (iOS)</option>
                        <option value="android">Android</option>
                      </select>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Filtra el push; in-app llega a todos
                      </p>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handlePreview}
                      disabled={previewLoading}
                      className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 bg-white hover:bg-gray-100 disabled:opacity-50"
                    >
                      {previewLoading ? '⏳ Calculando...' : '👁 Ver destinatarios'}
                    </button>
                    {previewResult != null && !previewDirty && (
                      <span
                        className={`text-sm font-semibold px-3 py-1 rounded-lg border ${
                          previewResult.total > 0
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {previewResult.total > 0
                          ? `✅ ${previewResult.total} usuario${previewResult.total !== 1 ? 's' : ''} recibirán in-app`
                          : '⚠️ Ningún usuario coincide con los filtros'}
                        {segmento.plataforma && previewResult.dispositivosPlat != null && (
                          <>
                            {' · '}
                            {previewResult.dispositivosPlat > 0
                              ? `📱 ${previewResult.dispositivosPlat} disp. ${segmento.plataforma === 'ios' ? 'iOS' : 'Android'} recibirán push`
                              : `⚠️ Sin dispositivos ${segmento.plataforma === 'ios' ? 'iOS' : 'Android'} registrados`}
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Error */}
              {broadcastError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  ❌ {broadcastError}
                </div>
              )}

              {/* Resultado del envío */}
              {sendResult && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 space-y-3">
                  <p className="text-sm font-semibold text-green-700">
                    ✅ Mensaje enviado a {sendResult.stats.usuarios} afiliados
                    {sendResult.segmento && sendResult.segmento !== 'todos'
                      ? ` (segmento: ${sendResult.segmento})`
                      : ''}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {[
                      { label: 'Usuarios', val: sendResult.stats.usuarios, cls: 'text-gray-900' },
                      {
                        label: 'In-app',
                        val: sendResult.stats.in_app_creadas,
                        cls: 'text-green-700',
                      },
                      { label: 'Push', val: sendResult.stats.push_enviados, cls: 'text-green-700' },
                      {
                        label: 'Omitidos',
                        val: sendResult.stats.omitidos_pref,
                        cls: sendResult.stats.omitidos_pref > 0 ? 'text-amber-600' : 'text-gray-900',
                      },
                      {
                        label: 'Errores',
                        val: sendResult.stats.errores,
                        cls: sendResult.stats.errores > 0 ? 'text-red-600' : 'text-gray-900',
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-lg border border-gray-200 bg-white p-2.5 text-center"
                      >
                        <div className={`text-xl font-bold ${s.cls}`}>{s.val}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-wide">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={broadcastMutation.isPending}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50"
              >
                {broadcastMutation.isPending ? '⏳ Enviando...' : '📤 Enviar notificación'}
              </button>
            </form>
          </section>

          {/* Historial de sesión */}
          {sessionHistory.length > 0 && (
            <section className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="font-semibold text-gray-900 mb-4">🕓 Enviados en esta sesión</h2>
              <div className="divide-y divide-gray-100">
                {sessionHistory.map((entry, i) => (
                  <div key={i} className="py-3 first:pt-0 last:pb-0">
                    <div className="text-xs text-gray-400">
                      {entry.fecha.toLocaleString('es-AR')}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          entry.categoria === 'noticias'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {entry.categoria}
                      </span>
                      {entry.segmento !== 'todos' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                          🎯 {entry.segmento}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-gray-900">{entry.titulo}</span>
                    </div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                        ✅ {entry.stats.in_app_creadas} in-app
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                        📱 {entry.stats.push_enviados} push
                      </span>
                      {entry.stats.omitidos_pref > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                          ⚠️ {entry.stats.omitidos_pref} omitidos
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── HISTORIAL ──────────────────────────────────────────────────────── */}
      {activeTab === 'historial' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">🔍 Historial de notificaciones</h2>
            <p className="text-sm text-gray-500 mt-1">
              Consultá y filtrá todas las notificaciones del sistema por afiliado, fecha, tipo y
              estado.
            </p>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: 'Total',
                val: hist?.stats.total ?? stats?.total,
                cls: 'text-gray-900',
              },
              {
                label: 'No leídas',
                val: hist?.stats.noLeidas ?? stats?.noLeidas,
                cls: 'text-red-600',
              },
              {
                label: 'Leídas',
                val: hist?.stats.leidas ?? stats?.leidas,
                cls: 'text-green-600',
              },
              {
                label: 'Usuarios',
                val: hist?.stats.usuariosDistintos ?? stats?.usuariosConNotificaciones,
                cls: 'text-blue-600',
              },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-gray-200 p-3 text-center">
                <div className={`text-2xl font-bold ${s.cls}`}>{s.val ?? '—'}</div>
                <div className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="col-span-2 lg:col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Buscar afiliado
                </label>
                <input
                  value={pendingFilters.q}
                  onChange={(e) => setPendingFilters((f) => ({ ...f, q: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                  placeholder="Email, nombre, nro afiliado..."
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Tipo
                </label>
                <select
                  value={pendingFilters.tipo}
                  onChange={(e) => setPendingFilters((f) => ({ ...f, tipo: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Todos</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                  <option value="general">General</option>
                  <option value="noticias">Novedades</option>
                  <option value="sistema">Sistema</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Estado
                </label>
                <select
                  value={pendingFilters.leida}
                  onChange={(e) => setPendingFilters((f) => ({ ...f, leida: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Todos</option>
                  <option value="false">No leídas</option>
                  <option value="true">Leídas</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={pendingFilters.fechaDesde}
                  onChange={(e) => setPendingFilters((f) => ({ ...f, fechaDesde: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={pendingFilters.fechaHasta}
                  onChange={(e) => setPendingFilters((f) => ({ ...f, fechaHasta: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleBuscar}
                className="px-4 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700"
              >
                Buscar
              </button>
              <button
                onClick={() => {
                  setPendingFilters(EMPTY_FILTERS)
                  setHistFilters(EMPTY_FILTERS)
                  setHistPage(1)
                }}
                className="px-4 py-1.5 border border-gray-300 bg-white text-gray-600 rounded-lg text-sm hover:bg-gray-50"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {['Estado', 'Afiliado', 'Tipo', 'Título', 'Mensaje', 'Fecha'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-xs font-bold text-gray-600 border-b-2 border-gray-200 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historialQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      ⏳ Cargando…
                    </td>
                  </tr>
                ) : historialQuery.isError ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-red-500">
                      ❌ Error cargando notificaciones
                    </td>
                  </tr>
                ) : !histEnabled ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      Ingresá filtros y presioná Buscar.
                    </td>
                  </tr>
                ) : !hist?.data.length ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">
                      <div className="text-4xl mb-2">🔔</div>
                      No se encontraron notificaciones con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  hist.data.map((n) => (
                    <tr key={n.id} className="border-b border-gray-100 hover:bg-violet-50/30">
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            n.leida ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          title={n.leida ? 'Leída' : 'No leída'}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-medium text-gray-900">
                          {n.usuario_email ?? n.nuusuid}
                        </div>
                        {n.usuario_nombre && (
                          <div className="text-[11px] text-gray-400">{n.usuario_nombre}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            TIPO_BADGE[n.tipo.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {n.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-900 max-w-[160px] truncate">
                        {n.titulo}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 max-w-[220px] truncate">
                        {n.mensaje}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {n.fecha_creacion
                          ? new Date(n.fecha_creacion).toLocaleString('es-AR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {hist && hist.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-gray-500">
                Mostrando {(hist.pagination.page - 1) * hist.pagination.limit + 1}–
                {Math.min(
                  hist.pagination.page * hist.pagination.limit,
                  hist.pagination.total,
                )}{' '}
                de {hist.pagination.total} notificaciones
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setHistPage((p) => p - 1)}
                  disabled={!hist.pagination.hasPrev}
                  className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setHistPage((p) => p + 1)}
                  disabled={!hist.pagination.hasNext}
                  className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
