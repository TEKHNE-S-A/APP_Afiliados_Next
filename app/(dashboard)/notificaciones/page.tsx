import type { Metadata } from 'next'
import { NotificacionesList } from '@/components/notificaciones/notificaciones-list'

export const metadata: Metadata = { title: 'Notificaciones' }

export default function NotificacionesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Tus alertas y mensajes recientes</p>
      </div>
      <NotificacionesList />
    </div>
  )
}
