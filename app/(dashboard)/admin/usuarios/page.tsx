import type { Metadata } from 'next'
import { AdminUsuariosTable } from '@/components/admin/admin-usuarios-table'

export const metadata: Metadata = { title: 'Admin Usuarios' }

export default function AdminUsuariosPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">Listado y administración de usuarios del sistema</p>
      </div>
      <AdminUsuariosTable />
    </div>
  )
}
