import type { Metadata } from 'next'
import CredencialesScreen from '@/components/credenciales/CredencialesScreen'

export const metadata: Metadata = { title: 'Credenciales' }

export default function CredencialesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Credenciales</h1>
        <p className="text-sm text-gray-500 mt-1">Credenciales del titular y grupo familiar</p>
      </div>
      <CredencialesScreen />
    </div>
  )
}
