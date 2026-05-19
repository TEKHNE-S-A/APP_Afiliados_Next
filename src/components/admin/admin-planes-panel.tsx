'use client'

import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Plan {
  id: string
  descripcion: string
  imagen_url: string | null
  fecha_img: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDisplayUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // /uploads/... es proxeado por Next.js rewrite → backend
  if (url.startsWith('/uploads/')) return url
  // gxdbfile: u otros formatos legacy no son accesibles
  return null
}

async function fetchPlanes(): Promise<{ data: { planes: Plan[] } }> {
  const res = await fetch('/api/admin/planes')
  if (!res.ok) throw new Error('Error cargando planes')
  return res.json()
}

// ── Componente ────────────────────────────────────────────────────────────────

export function AdminPlanesPanel() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalPlan, setModalPlan] = useState<Plan | null>(null)
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file')
  const [urlInput, setUrlInput] = useState('')
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const planesQuery = useQuery({
    queryKey: queryKeys.adminPlanes(),
    queryFn: fetchPlanes,
  })

  const planes: Plan[] = planesQuery.data?.data?.planes ?? []
  const filtered = search
    ? planes.filter(
        (p) =>
          p.id.toLowerCase().includes(search.toLowerCase()) ||
          p.descripcion.toLowerCase().includes(search.toLowerCase()),
      )
    : planes

  const conImg = planes.filter((p) => toDisplayUrl(p.imagen_url) !== null).length

  // ── Mutaciones ────────────────────────────────────────────────────────────

  const uploadMut = useMutation({
    mutationFn: async ({ planId, file, url }: { planId: string; file?: File; url?: string }) => {
      let res: Response
      if (file) {
        const fd = new FormData()
        fd.append('imagen', file)
        res = await fetch(`/api/admin/planes/${planId}/imagen`, { method: 'PUT', body: fd })
      } else {
        res = await fetch(`/api/admin/planes/${planId}/imagen`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagen_url: url }),
        })
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { message?: string }).message || 'Error guardando imagen')
      }
      return res.json()
    },
    onSuccess: () => {
      closeModal()
      showToast('Imagen guardada ✓', 'success')
      qc.invalidateQueries({ queryKey: queryKeys.adminPlanes() })
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/admin/planes/${planId}/imagen`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { message?: string }).message || 'Error eliminando imagen')
      }
    },
    onSuccess: () => {
      closeModal()
      showToast('Imagen eliminada ✓', 'success')
      qc.invalidateQueries({ queryKey: queryKeys.adminPlanes() })
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  })

  // ── Helpers UI ────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }, [])

  function openModal(plan: Plan) {
    setModalPlan(plan)
    setActiveTab('file')
    setUrlInput('')
    setFilePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function closeModal() {
    setModalPlan(null)
    setFilePreview(null)
    setUrlInput('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { setFilePreview(null); return }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
  }

  function handleSave() {
    if (!modalPlan) return
    if (activeTab === 'file') {
      const file = fileRef.current?.files?.[0]
      if (!file) { showToast('Seleccioná un archivo', 'error'); return }
      uploadMut.mutate({ planId: modalPlan.id, file })
    } else {
      if (!urlInput.trim()) { showToast('Ingresá una URL', 'error'); return }
      uploadMut.mutate({ planId: modalPlan.id, url: urlInput.trim() })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {[
          { value: planes.length, label: 'Total planes' },
          { value: conImg, label: 'Con imagen' },
          { value: planes.length - conImg, label: 'Sin imagen' },
        ].map(({ value, label }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm px-6 py-4 flex-1 min-w-[130px] text-center">
            <div className="text-3xl font-bold text-green-700">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar plan…"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        />
        <button
          onClick={() => qc.invalidateQueries({ queryKey: queryKeys.adminPlanes() })}
          className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Grid */}
      {planesQuery.isLoading ? (
        <p className="text-gray-400 py-8 text-center">Cargando planes…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 py-8 text-center">Sin planes encontrados.</p>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {filtered.map((plan) => {
            const imgSrc = toDisplayUrl(plan.imagen_url)
            return (
              <div
                key={plan.id}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:-translate-y-0.5 transition-transform"
              >
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={plan.descripcion}
                    className="w-full h-36 object-cover bg-gray-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-green-50 to-green-100 flex flex-col items-center justify-center text-green-400">
                    <span className="text-4xl">🖼️</span>
                    <span className="text-xs text-gray-400 mt-1">Sin imagen</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="text-xs text-gray-400 font-mono mb-1">{plan.id}</div>
                  <div className="text-sm font-semibold text-gray-800 truncate mb-3" title={plan.descripcion}>
                    {plan.descripcion || '—'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(plan)}
                      className="flex-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-1.5 rounded-lg"
                    >
                      {imgSrc ? '✏️ Cambiar' : '⬆️ Subir imagen'}
                    </button>
                    {imgSrc && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar imagen del plan ${plan.id}?`)) {
                            deleteMut.mutate(plan.id)
                          }
                        }}
                        disabled={deleteMut.isPending}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal editar imagen */}
      {modalPlan && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-7 w-[90%] max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Imagen del Plan</h2>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-mono">{modalPlan.id}</span> — {modalPlan.descripcion}
            </p>

            {/* Imagen actual */}
            {toDisplayUrl(modalPlan.imagen_url) && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">Imagen actual:</p>
                <img
                  src={toDisplayUrl(modalPlan.imagen_url)!}
                  alt="actual"
                  className="w-full h-40 object-contain border border-gray-100 rounded-lg"
                />
              </div>
            )}

            <hr className="my-4 border-gray-100" />

            {/* Tabs */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-4">
              {(['file', 'url'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab === 'file' ? '📁 Subir archivo' : '🔗 URL externa'}
                </button>
              ))}
            </div>

            {activeTab === 'file' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                  Recomendado: imagen horizontal 16:9 (ej. 1600×900 px). Máx. 5 MB.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {filePreview && (
                  <img
                    src={filePreview}
                    alt="preview"
                    className="w-full h-44 object-contain border border-gray-100 rounded-lg"
                  />
                )}
              </div>
            )}

            {activeTab === 'url' && (
              <div>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={closeModal}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                disabled={uploadMut.isPending}
                onClick={handleSave}
                className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
              >
                {uploadMut.isPending ? 'Guardando…' : '💾 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg ${
            toast.type === 'success' ? 'bg-green-700' : 'bg-red-500'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
