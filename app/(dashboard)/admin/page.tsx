import type { Metadata } from 'next'
import { AdminParametrosTable } from '@/components/admin/admin-parametros-table'

export const metadata: Metadata = { title: 'Admin Parámetros' }

export default function AdminPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Administración de Parámetros</h1>
        <p className="text-sm text-gray-500 mt-1">Pantalla inicial del panel admin (equivalente a admin-parametros.html)</p>
      </div>
      <AdminParametrosTable />
    </div>
  )
}
