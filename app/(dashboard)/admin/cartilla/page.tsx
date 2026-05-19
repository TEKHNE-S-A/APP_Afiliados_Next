import type { Metadata } from 'next'
import { AdminCartillaTable } from '@/components/admin/admin-cartilla-table'

export const metadata: Metadata = { title: 'Admin Cartilla' }

export default function AdminCartillaPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cartilla</h1>
        <p className="text-sm text-gray-500 mt-1">Entidades y prestadores disponibles para afiliados</p>
      </div>
      <AdminCartillaTable />
    </div>
  )
}
