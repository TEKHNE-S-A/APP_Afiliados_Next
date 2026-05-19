import type { Metadata } from 'next'
import { SolicitudesList } from '@/components/solicitudes/solicitudes-list'

export const metadata: Metadata = { title: 'Solicitudes' }

export default function SolicitudesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis Solicitudes</h1>
        <p className="text-sm text-gray-500 mt-1">Autorizaciones y solicitudes médicas</p>
      </div>
      <SolicitudesList />
    </div>
  )
}
