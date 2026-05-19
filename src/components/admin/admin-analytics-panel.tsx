'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { BarChart2, RefreshCw } from 'lucide-react'

interface ByItem { event?: string; module?: string; screen?: string; count: number }
interface DailyItem { date: string; count: number }
interface LastEvent {
  created_at: string
  event_name: string
  module?: string
  screen?: string
  method?: string
  path?: string
  status_code?: number
  actor?: string
}
interface AnalyticsData {
  range: { days: number }
  totals: { events: number }
  byEvent: ByItem[]
  byModule: ByItem[]
  topScreens: ByItem[]
  daily: DailyItem[]
  lastEvents: LastEvent[]
}

const DAYS_OPTIONS = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
]

export function AdminAnalyticsPanel() {
  const [days, setDays] = useState(7)

  const {
    data: response,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.adminAnalytics(days),
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics?days=${days}`)
      const json = await res.json()
      if (!json.ok) throw new Error(json.message ?? 'Error al obtener analítica')
      return json.data as AnalyticsData
    },
  })

  const data = response

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {DAYS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDays(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              days === opt.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500">Cargando analítica…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {(error as Error).message}
        </div>
      )}

      {data && (
        <>
          {/* Totales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{data.totals.events}</div>
              <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Eventos</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{data.byModule.length}</div>
              <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Módulos</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{data.byEvent.length}</div>
              <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Tipos de evento</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{data.range.days}</div>
              <div className="text-xs text-gray-500 uppercase font-semibold mt-1">Días</div>
            </div>
          </div>

          {/* Por módulo y por evento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-500" /> Por módulo
              </h3>
              <div className="space-y-2">
                {data.byModule.slice(0, 10).map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-40 truncate">{m.module ?? '—'}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{
                          width: `${Math.round((m.count / (data.byModule[0]?.count || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">{m.count}</span>
                  </div>
                ))}
                {data.byModule.length === 0 && (
                  <p className="text-sm text-gray-400">Sin datos en el período</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-violet-500" /> Por evento
              </h3>
              <div className="space-y-2">
                {data.byEvent.slice(0, 10).map((e, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-40 truncate">{e.event ?? '—'}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-violet-500 h-2 rounded-full"
                        style={{
                          width: `${Math.round((e.count / (data.byEvent[0]?.count || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">{e.count}</span>
                  </div>
                ))}
                {data.byEvent.length === 0 && (
                  <p className="text-sm text-gray-400">Sin datos en el período</p>
                )}
              </div>
            </div>
          </div>

          {/* Actividad diaria */}
          {data.daily.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-x-auto">
              <h3 className="font-semibold text-gray-800 mb-3">Actividad diaria</h3>
              <div className="flex items-end gap-1 min-w-0 h-24">
                {data.daily.map((d, i) => {
                  const max = Math.max(...data.daily.map((x) => x.count), 1)
                  return (
                    <div
                      key={i}
                      title={`${d.date}: ${d.count}`}
                      className="flex-1 bg-indigo-400 rounded-t min-w-[4px]"
                      style={{ height: `${Math.round((d.count / max) * 100)}%` }}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Últimos eventos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-x-auto">
            <h3 className="font-semibold text-gray-800 mb-3">Últimos eventos</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-4">Fecha</th>
                  <th className="pb-2 pr-4">Evento</th>
                  <th className="pb-2 pr-4">Módulo</th>
                  <th className="pb-2 pr-4">Pantalla</th>
                  <th className="pb-2 pr-4">Actor</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.lastEvents.map((ev, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1 pr-4 text-gray-400 whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-1 pr-4 text-gray-700">{ev.event_name}</td>
                    <td className="py-1 pr-4 text-gray-500">{ev.module ?? '—'}</td>
                    <td className="py-1 pr-4 text-gray-500">{ev.screen ?? '—'}</td>
                    <td className="py-1 pr-4 text-gray-500 max-w-[120px] truncate">{ev.actor ?? '—'}</td>
                    <td className="py-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          (ev.status_code ?? 200) < 400
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {ev.status_code ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.lastEvents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Sin eventos en el período seleccionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
