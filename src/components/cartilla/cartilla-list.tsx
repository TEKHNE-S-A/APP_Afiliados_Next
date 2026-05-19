'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { Entidad, Rubro, Especialidad } from '@/types'

const PAGE_SIZE = 20

interface CartillaApiResponse {
  data: Entidad[]
  total: number
  take: number
  skip: number
}

async function fetchCartilla(filters: {
  q: string
  rubroid: string
  especialidad: string
  skip: number
}): Promise<CartillaApiResponse> {
  const params = new URLSearchParams({
    take: String(PAGE_SIZE),
    skip: String(filters.skip),
    q: filters.q,
  })
  if (filters.rubroid) params.set('rubro', filters.rubroid)
  if (filters.especialidad) params.set('especialidad', filters.especialidad)
  const res = await fetch(`/api/cartilla?${params}`)
  if (!res.ok) throw new Error('No se pudo cargar la cartilla')
  const json = await res.json()
  return json.data as CartillaApiResponse
}

async function fetchRubros(): Promise<Rubro[]> {
  const res = await fetch('/api/cartilla/rubros')
  if (!res.ok) return []
  const json = await res.json()
  return json.data as Rubro[]
}

async function fetchEspecialidades(rubroid: string): Promise<Especialidad[]> {
  const params = rubroid ? `?rubroid=${rubroid}` : ''
  const res = await fetch(`/api/cartilla/especialidades${params}`)
  if (!res.ok) return []
  const json = await res.json()
  return json.data as Especialidad[]
}

export function CartillaList() {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [rubroid, setRubroid] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [page, setPage] = useState(0)

  const skip = page * PAGE_SIZE

  const filters = useMemo(
    () => ({ q: search, rubroid, especialidad, skip }),
    [search, rubroid, especialidad, skip],
  )

  const query = useQuery({
    queryKey: queryKeys.cartilla.entidades(filters),
    queryFn: () => fetchCartilla(filters),
  })

  const rubrosQuery = useQuery({
    queryKey: queryKeys.cartilla.rubros(),
    queryFn: fetchRubros,
  })

  const especialidadesQuery = useQuery({
    queryKey: queryKeys.cartilla.especialidades(rubroid),
    queryFn: () => fetchEspecialidades(rubroid),
  })

  const totalPages = query.data ? Math.ceil(query.data.total / PAGE_SIZE) : 0

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (input.trim().length === 1) return
      setSearch(input.trim())
      setPage(0)
    },
    [input],
  )

  const handleRubroChange = (val: string) => {
    setRubroid(val)
    setEspecialidad('')
    setPage(0)
  }

  const handleEspecialidadChange = (val: string) => {
    setEspecialidad(val)
    setPage(0)
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Buscar por prestador, email o matrícula"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Buscar
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={rubroid}
              onChange={(e) => handleRubroChange(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
            >
              <option value="">Todos los rubros</option>
              {rubrosQuery.data?.map((r) => (
                <option key={r.carubid} value={r.carubid}>
                  {r.carubdescr.trim()}
                </option>
              ))}
            </select>
            <select
              value={especialidad}
              onChange={(e) => handleEspecialidadChange(e.target.value)}
              disabled={!rubroid}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">Todas las especialidades</option>
              {especialidadesQuery.data?.map((esp) => (
                <option key={esp.caespid} value={esp.caespid}>
                  {esp.caespdescr.trim()}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Estado */}
      {query.isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Cargando cartilla...
        </div>
      ) : null}
      {query.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {(query.error as Error).message}
        </div>
      ) : null}

      {/* Resultados */}
      {query.data?.data?.length ? (
        <div className="grid gap-3">
          {query.data.data.map((entidad) => (
            <article key={entidad.caentid} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{entidad.caentapeno}</h3>
                  <p className="mt-1 text-sm text-gray-500">Matrícula: {entidad.caentmatri ?? '-'}</p>
                  <p className="text-sm text-gray-500">Email: {entidad.caentmail || '-'}</p>
                  {entidad.caendire?.[0] && (
                    <p className="text-sm text-gray-500">
                      {entidad.caendire[0].caendirecc}
                      {entidad.caendire[0].nulocali
                        ? ` — ${entidad.caendire[0].nulocali.nulocdescr}`
                        : ''}
                    </p>
                  )}
                </div>
                <Link
                  href={`/cartilla/${entidad.caentid}`}
                  className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700"
                >
                  Ver detalle
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!query.isLoading && !query.isError && !query.data?.data?.length ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          No se encontraron prestadores.
        </div>
      ) : null}

      {/* Paginación */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-600">
            Pág. {page + 1} de {totalPages}
          </span>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      ) : null}
    </div>
  )
}
