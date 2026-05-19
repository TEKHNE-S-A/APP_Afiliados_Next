import type { Metadata } from 'next'
import { AdminNotificacionesPanel } from '@/components/admin/admin-notificaciones-panel'

export const metadata: Metadata = { title: 'Admin Notificaciones' }

export default function AdminNotificacionesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Broadcasts, métricas y estado de entregas</p>
      </div>
      <AdminNotificacionesPanel />
    </div>
  )
}
