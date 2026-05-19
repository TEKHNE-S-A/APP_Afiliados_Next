import type { Metadata } from 'next'
import { CartillaList } from '@/components/cartilla/cartilla-list'

export const metadata: Metadata = { title: 'Cartilla' }

export default function CartillaPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cartilla</h1>
        <p className="text-sm text-gray-500 mt-1">Prestadores, especialidades y ubicaciones</p>
      </div>
      <CartillaList />
    </div>
  )
}
