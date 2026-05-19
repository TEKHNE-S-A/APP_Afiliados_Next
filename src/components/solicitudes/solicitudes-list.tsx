'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { Solicitud, EstadoSolicitud } from '@/types'

interface SolicitudesResponse {
  data: Solicitud[]
  total: number
  take: number
  skip: number
}

async function fetchSolicitudes(): Promise<SolicitudesResponse> {
  const res = await fetch('/api/solicitudes?take=30&skip=0')
  if (!res.ok) throw new Error('No se pudieron cargar las solicitudes')
  const json = await res.json()
  return json.data
}

// Dominio SIA real: ENV / AUD / AUT / REC / PEN / CON
const ESTADO_BADGE: Record<EstadoSolicitud, string> = {
  ENV: 'bg-blue-100 text-blue-700',
  AUD: 'bg-indigo-100 text-indigo-700',
  AUT: 'bg-green-100 text-green-700',
  REC: 'bg-red-100 text-red-700',
  PEN: 'bg-yellow-100 text-yellow-700',
  CON: 'bg-gray-100 text-gray-700',
}

function estadoBadge(estado: string) {
  return ESTADO_BADGE[estado as EstadoSolicitud] ?? 'bg-gray-100 text-gray-700'
}

export function SolicitudesList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.solicitudes.list(),
    queryFn: fetchSolicitudes,
  })

  if (isLoading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Cargando solicitudes...</div>
  }

  if (isError) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{(error as Error).message}</div>
  }

  if (!data?.data?.length) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No hay solicitudes registradas.</div>
  }

  return (
    <div className="space-y-3">
      {data.data.map((s) => (
        <article key={s.ausolicid} className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400">ID: {s.ausolicid}</p>
              <h3 className="text-sm font-semibold text-gray-900 mt-1">{s.ausoldescr}</h3>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${estadoBadge(s.ausolestad)}`}>
              {s.ausolestad}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">{s.ausoltexto}</p>
        </article>
      ))}
    </div>
  )
}
