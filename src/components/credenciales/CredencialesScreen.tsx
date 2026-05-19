'use client'

import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import type { Credencial } from '@/types'
import CredencialCard from './CredencialCard'
import CredencialesCarousel from './CredencialesCarousel'

type CredencialesResponse = {
  data: Credencial[]
  total: number
  take: number
  skip: number
}

async function fetchCredenciales(): Promise<CredencialesResponse> {
  const res = await fetch('/api/credenciales?take=50&skip=0', { cache: 'no-store' })
  if (!res.ok) throw new Error('No se pudieron cargar las credenciales')
  const json = await res.json()
  return json.data
}

function isCredencialVigente(value?: string | Date | null) {
  if (!value) return false
  const s = String(value).slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s >= today
  const d = new Date(value)
  return !Number.isNaN(d.getTime()) && d.getTime() >= Date.now()
}

function buildQrPayload(credencial: Credencial) {
  return JSON.stringify({
    afiliadoId: credencial.crcreid,
    cuil: credencial.crcrecuil || credencial.crcrenroaf,
    token: credencial.tokenTemporal,
    vence: credencial.tokenTemporalVenceEn,
  })
}

export default function CredencialesScreen() {
  const queryClient = useQueryClient()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCredencial, setSelectedCredencial] = useState<Credencial | null>(null)
  const modalCardRef = useRef<HTMLDivElement>(null)

  const query = useQuery({
    queryKey: queryKeys.credenciales.list(),
    queryFn: fetchCredenciales,
  })

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.credenciales.all() })
    },
  })

  const sharingMutation = useMutation({
    mutationFn: async (credencial: Credencial) => {
      const shareText = `Credencial de ${credencial.crcreapeno}\nAfiliado: ${credencial.crcrenroaf}`
      if (navigator.share) {
        await navigator.share({
          title: `Credencial de ${credencial.crcreapeno}`,
          text: shareText,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
      }
    },
  })

  const credencialesOrdenadas = useMemo(() => {
    const items = [...(query.data?.data ?? [])]
    return items.sort((a, b) => {
      if (a.crcrepropi === 'S') return -1
      if (b.crcrepropi === 'S') return 1
      return 0
    })
  }, [query.data])

  const currentCredencial = credencialesOrdenadas[currentIndex] ?? credencialesOrdenadas[0]

  const handleOpenModal = (credencial: Credencial) => {
    setSelectedCredencial(credencial)
    setModalVisible(true)
  }

  const handleDownloadPdf = (credencial: Credencial) => {
    const url = `/api/credencial/constancia.pdf?afiliadoId=${encodeURIComponent(String(credencial.crcreid || ''))}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (query.isLoading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Cargando credenciales...</div>
  }

  if (query.isError) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{(query.error as Error).message}</div>
  }

  if (!credencialesOrdenadas.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
        <div className="text-5xl">📋</div>
        <h3 className="mt-4 text-xl font-bold text-gray-900">No hay credenciales</h3>
        <p className="mt-2 text-sm text-gray-500">Deslizá hacia abajo para sincronizar</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-brand-700 px-5 py-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Credenciales del Grupo</h2>
            <p className="text-sm text-white/80 mt-1">
              {credencialesOrdenadas.length} {credencialesOrdenadas.length === 1 ? 'miembro' : 'miembros'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => refreshMutation.mutate()}
              className="h-10 w-10 rounded-full bg-white/15 text-white"
              aria-label="Actualizar"
            >
              ⟳
            </button>
            <button
              type="button"
              onClick={() => currentCredencial && sharingMutation.mutate(currentCredencial)}
              className="h-10 w-10 rounded-full bg-white/15 text-white"
              aria-label="Compartir"
            >
              ↗
            </button>
          </div>
        </div>
      </div>

      <p className="px-1 text-center text-sm text-gray-500">
        Deslizá entre credenciales, compartí la activa o descargá su constancia.
      </p>

      <div className="rounded-2xl bg-white p-3 shadow-sm border border-gray-100">
        <CredencialesCarousel
          credenciales={credencialesOrdenadas}
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
          renderItem={(credencial) => (
            <button
              key={credencial.crcreid}
              type="button"
              onClick={() => handleOpenModal(credencial)}
              className="w-full text-left"
            >
              <CredencialCard
                credencial={credencial}
                isTitular={credencial.crcrepropi === 'S'}
                showToken={false}
              />
            </button>
          )}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span>⚡</span>
          <span>Acciones rapidas</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => currentCredencial && sharingMutation.mutate(currentCredencial)}
            className="rounded-xl border border-brand-600 bg-brand-600 px-4 py-3 text-sm font-semibold text-white"
          >
            {sharingMutation.isPending ? 'Compartiendo...' : 'Compartir'}
          </button>
          <button
            type="button"
            onClick={() => refreshMutation.mutate()}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800"
          >
            {refreshMutation.isPending ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => currentCredencial && handleDownloadPdf(currentCredencial)}
          className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800"
        >
          Descargar constancia PDF
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-center text-sm font-semibold text-gray-500">Ultima sincronizacion</h3>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold text-brand-600">0</div>
            <div className="text-xs text-gray-400">Nuevas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-600">0</div>
            <div className="text-xs text-gray-400">Actualizadas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-600">{query.data?.total ?? 0}</div>
            <div className="text-xs text-gray-400">Sin cambios</div>
          </div>
        </div>
      </div>

      {modalVisible && selectedCredencial ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-gray-100 pb-6">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-100 px-5 py-4">
              <h3 className="text-xl font-bold text-gray-900">Credencial Digital</h3>
              <button type="button" onClick={() => setModalVisible(false)} className="text-2xl text-gray-500">✕</button>
            </div>

            <div ref={modalCardRef} className="px-4">
              <CredencialCard
                credencial={selectedCredencial}
                isTitular={selectedCredencial.crcrepropi === 'S'}
                showToken
              />

              {isCredencialVigente(selectedCredencial.crcrefecvi) ? (
                <div className="mx-auto mt-5 max-w-md rounded-2xl bg-white p-5 text-center shadow">
                  <h4 className="text-lg font-bold text-gray-900">Codigo QR de Credencial</h4>
                  <div className="mt-4 rounded-xl border-2 border-gray-200 bg-white p-4">
                    <pre className="mx-auto overflow-auto text-left text-[10px] leading-4 text-gray-800">{buildQrPayload(selectedCredencial)}</pre>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-800">{selectedCredencial.crcreapeno}</p>
                  <p className="text-sm text-gray-500">N° Afiliado: {selectedCredencial.crcrenroaf}</p>
                </div>
              ) : null}
            </div>

            <div className="mx-4 mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span>⚡</span>
                <span>Acciones</span>
              </div>
              <div className="space-y-2">
                <button type="button" onClick={() => refreshMutation.mutate()} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  {refreshMutation.isPending ? 'Actualizando credencial...' : 'Actualizar credencial'}
                </button>
                <button
                  type="button"
                  onClick={() => sharingMutation.mutate(selectedCredencial)}
                  className="w-full rounded-xl border border-brand-600 bg-brand-600 px-4 py-3 text-left text-sm font-semibold text-white"
                >
                  {sharingMutation.isPending ? 'Compartiendo...' : 'Compartir credencial'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedCredencial)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-800"
                >
                  Descargar constancia PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
