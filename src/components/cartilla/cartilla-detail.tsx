'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { Entidad } from '@/types'

async function fetchEntidad(id: string) {
  const res = await fetch(`/api/cartilla/${id}`)
  if (!res.ok) throw new Error('No se pudo cargar el detalle')
  const json = await res.json()
  return json.data as Entidad
}

export function CartillaDetail({ id }: { id: string }) {
  const query = useQuery({
    queryKey: queryKeys.cartilla.entidad(id),
    queryFn: () => fetchEntidad(id),
  })

  if (query.isLoading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Cargando detalle...</div>
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(query.error as Error)?.message ?? 'No se encontro la entidad'}
      </div>
    )
  }

  const e = query.data

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{e.caentapeno}</h1>
        <Link href="/cartilla" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
          Volver
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <dl className="grid gap-3 md:grid-cols-2 text-sm">
          <div><dt className="text-gray-400">ID</dt><dd className="text-gray-900 font-medium">{e.caentid}</dd></div>
          <div><dt className="text-gray-400">Matrícula</dt><dd className="text-gray-900 font-medium">{e.caentmatri ?? '-'}</dd></div>
          <div><dt className="text-gray-400">Email</dt><dd className="text-gray-900 font-medium">{e.caentmail || '-'}</dd></div>
          <div><dt className="text-gray-400">Web</dt><dd className="text-gray-900 font-medium">{e.caentweb || '-'}</dd></div>
        </dl>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Direcciones y teléfonos</h2>
        <div className="mt-3 space-y-3">
          {e.caendire?.length ? e.caendire.map((d) => (
            <article key={`${d.caentid}-${d.caendid}`} className="rounded-lg border border-gray-100 p-3">
              <p className="text-sm font-medium text-gray-900">{d.caendirecc}</p>
              <p className="text-sm text-gray-500 mt-1">Localidad: {d.nulocali?.nulocdescr ?? d.nulocid}</p>
              <p className="text-sm text-gray-500">Horario: {d.caendhorat || '-'}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {d.caentele?.map((t) => (
                  <span key={`${t.caenteleid}-${t.caentelefo}`} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                    {t.caentelefo}
                  </span>
                ))}
              </div>
            </article>
          )) : <p className="text-sm text-gray-500">Sin direcciones registradas.</p>}
        </div>
      </div>
    </div>
  )
}
