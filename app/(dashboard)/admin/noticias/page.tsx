import type { Metadata } from 'next'
import { AdminNoticiasPanel } from '@/components/admin/admin-noticias-panel'

export const metadata: Metadata = { title: 'Admin Noticias' }

export default function AdminNoticiasPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Noticias</h1>
        <p className="text-sm text-gray-500 mt-1">Administracion de noticias y novedades institucionales</p>
      </div>
      <AdminNoticiasPanel />
    </div>
  )
}
