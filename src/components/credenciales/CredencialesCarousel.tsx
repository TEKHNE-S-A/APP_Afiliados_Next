'use client'

import { useEffect, useRef } from 'react'
import type { Credencial } from '@/types'

type Props = {
  credenciales: Credencial[]
  currentIndex: number
  onIndexChange: (index: number) => void
  renderItem: (credencial: Credencial, index: number) => React.ReactNode
}

export default function CredencialesCarousel({
  credenciales,
  currentIndex,
  onIndexChange,
  renderItem,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onScroll = () => {
      const width = el.clientWidth
      if (!width) return
      const index = Math.round(el.scrollLeft / width)
      if (index !== currentIndex && index >= 0 && index < credenciales.length) {
        onIndexChange(index)
      }
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [credenciales.length, currentIndex, onIndexChange])

  if (!credenciales.length) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">No hay credenciales disponibles</div>
  }

  return (
    <div>
      <div ref={ref} className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide">
        {credenciales.map((credencial, index) => (
          <div key={credencial.crcreid} className="w-full shrink-0 snap-center px-2">
            {renderItem(credencial, index)}
          </div>
        ))}
      </div>

      <div className="mt-4 mb-2 flex justify-center gap-2">
        {credenciales.map((_, index) => (
          <span
            key={index}
            className={`h-2 rounded-full ${index === currentIndex ? 'w-6 bg-brand-600' : 'w-2 bg-gray-300'}`}
          />
        ))}
      </div>

      <div className="mb-4 text-center text-sm font-semibold text-gray-500">
        {currentIndex + 1} / {credenciales.length}
      </div>
    </div>
  )
}
