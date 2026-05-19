import type { Metadata } from 'next'
import { AdminSoportePanel } from '@/components/admin/admin-soporte-panel'

export const metadata: Metadata = { title: 'Soporte | Admin' }

export default function AdminSoportePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Bitácora de soporte</h1>
        <p className="text-sm text-gray-500">Historial de auditoría y acciones administrativas</p>
      </div>
      <AdminSoportePanel />
    </div>
  )
}
