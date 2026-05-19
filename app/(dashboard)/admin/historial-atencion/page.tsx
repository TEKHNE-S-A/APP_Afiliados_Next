import type { Metadata } from 'next'
import { AdminHistorialPanel } from '@/components/admin/admin-historial-panel'

export const metadata: Metadata = { title: 'Admin Historial de Atención' }

export default function AdminHistorialAtencionPage() {
  return <AdminHistorialPanel />
}
