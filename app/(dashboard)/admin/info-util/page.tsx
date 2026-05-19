import type { Metadata } from 'next'
import { AdminInfoUtilPanel } from '@/components/admin/admin-info-util-panel'

export const metadata: Metadata = { title: 'Admin Info Util' }

export default function AdminInfoUtilPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Info util</h1>
        <p className="text-sm text-gray-500 mt-1">Administracion del contenido util para afiliados</p>
      </div>
      <AdminInfoUtilPanel />
    </div>
  )
}
