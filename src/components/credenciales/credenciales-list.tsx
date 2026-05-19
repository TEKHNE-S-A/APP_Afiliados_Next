'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { Credencial } from '@/types'

interface CredencialesResponse {
  data: Credencial[]
  total: number
  take: number
  skip: number
}

async function fetchCredenciales(): Promise<CredencialesResponse> {
  const res = await fetch('/api/credenciales?take=50&skip=0')
  if (!res.ok) throw new Error('No se pudieron cargar las credenciales')
  const json = await res.json()
  return json.data
}

export function CredencialesList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.credenciales.list(),
    queryFn: fetchCredenciales,
  })

  if (isLoading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Cargando credenciales...</div>
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(error as Error).message}
      </div>
    )
  }

  if (!data?.data?.length) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No hay credenciales disponibles.</div>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.data.map((credencial) => (
        <article key={credencial.crcreid} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">N° Credencial</p>
              <h3 className="text-sm font-semibold text-gray-900 mt-1">{credencial.crcreid}</h3>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Vigente</span>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <p className="text-gray-900 font-medium">{credencial.crcreapeno}</p>
            <p className="text-gray-500">Afiliado: {credencial.crcreafili}</p>
            <p className="text-gray-500">Documento: {credencial.crcredocum}</p>
            <p className="text-gray-500">Plan: {credencial.crcrepladesc ?? '-'}</p>
            <p className="text-gray-500">Parentesco: {credencial.crcreparen ?? '-'}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
