'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { Notificacion } from '@/types'

interface NotificacionesResponse {
  data: Notificacion[]
  total: number
  take: number
  skip: number
}

async function fetchNotificaciones(): Promise<NotificacionesResponse> {
  const res = await fetch('/api/notificaciones?take=30&skip=0')
  if (!res.ok) throw new Error('No se pudieron cargar las notificaciones')
  const json = await res.json()
  return json.data
}

async function markAsRead(id: string) {
  const res = await fetch(`/api/notificaciones?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leida: true }),
  })
  if (!res.ok) throw new Error('No se pudo marcar como leída')
}

export function NotificacionesList() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.notificaciones.list(1),
    queryFn: fetchNotificaciones,
  })

  const mutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.me() })
    },
  })

  if (isLoading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Cargando notificaciones...</div>
  }

  if (isError) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{(error as Error).message}</div>
  }

  if (!data?.data?.length) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No hay notificaciones.</div>
  }

  return (
    <div className="space-y-3">
      {data.data.map((n) => (
        <article key={n.id} className={`rounded-xl border p-5 ${n.leida ? 'border-gray-200 bg-white' : 'border-brand-200 bg-brand-50'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{n.titulo}</h3>
              <p className="text-sm text-gray-600 mt-1">{n.mensaje}</p>
            </div>
            {!n.leida && (
              <button
                onClick={() => mutation.mutate(n.id)}
                className="text-xs px-2 py-1 rounded-md bg-brand-600 text-white hover:bg-brand-700"
              >
                Marcar leída
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
