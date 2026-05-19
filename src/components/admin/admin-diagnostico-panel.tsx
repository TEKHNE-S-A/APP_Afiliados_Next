'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { CheckCircle, XCircle, RefreshCw, Wifi } from 'lucide-react'

interface ServiceCheck {
  service?: string
  name?: string
  endpoint?: string
  ok: boolean
  status?: number
  latencyMs?: number
  error?: string
}

interface Suite {
  ok: boolean
  timestamp: string
  durationMs: number
  totals?: { total: number; ok: number; failed: number }
  checks?: ServiceCheck[]
  services?: ServiceCheck[]
}

interface Health {
  status?: string
  soapConnected?: boolean
  observability?: {
    uptimeSeconds?: number
    requestsTotal?: number
    requestsInFlight?: number
    errors5xx?: number
  }
}

interface DiagData {
  health: Health
  suite: Suite
}

function StatusPill({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
      <CheckCircle className="w-3 h-3" /> OK
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
      <XCircle className="w-3 h-3" /> ERROR
    </span>
  )
}

export function AdminDiagnosticoPanel() {
  const {
    data: response,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.adminDiagnostico(),
    queryFn: async () => {
      const res = await fetch('/api/admin/diagnostico')
      const json = await res.json()
      if (!json.ok) throw new Error(json.message ?? 'Error al obtener diagnóstico')
      return json.data as DiagData
    },
  })

  const data = response

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Conectividad SOAP y endpoints internos del backend
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-500">Ejecutando diagnóstico…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {(error as Error).message}
        </div>
      )}

      {data && (
        <>
          {/* Salud general */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-indigo-500" /> Estado general del backend
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">SOAP</div>
                <StatusPill ok={data.health.soapConnected ?? false} />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Uptime</div>
                <div className="font-bold text-gray-800">
                  {data.health.observability?.uptimeSeconds != null
                    ? `${Math.floor((data.health.observability.uptimeSeconds ?? 0) / 60)} min`
                    : 'N/D'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Requests</div>
                <div className="font-bold text-gray-800">
                  {data.health.observability?.requestsTotal ?? 0}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Errores 5xx</div>
                <div className="font-bold text-gray-800">
                  {data.health.observability?.errors5xx ?? 0}
                </div>
              </div>
            </div>
          </div>

          {/* Suite de conectividad */}
          {data.suite && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">
                  Suite de conectividad ({data.suite.totals?.ok ?? 0}/
                  {data.suite.totals?.total ?? 0} OK · {data.suite.durationMs} ms)
                </h2>
                <StatusPill ok={data.suite.ok} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(data.suite.checks ?? data.suite.services ?? []).map((c, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 ${
                      c.ok
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-800">
                        {c.name ?? c.service}
                      </span>
                      <StatusPill ok={c.ok} />
                    </div>
                    {c.endpoint && (
                      <div className="text-xs text-gray-500 mt-1 font-mono">{c.endpoint}</div>
                    )}
                    {c.latencyMs != null && (
                      <div className="text-xs text-gray-400 mt-0.5">{c.latencyMs} ms</div>
                    )}
                    {c.error && (
                      <div className="text-xs text-red-600 mt-1 break-words">{c.error}</div>
                    )}
                    {c.status != null && (
                      <div className="text-xs text-gray-400 mt-0.5">HTTP {c.status}</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400 mt-3">
                Actualizado: {new Date(data.suite.timestamp).toLocaleString('es-AR')}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
