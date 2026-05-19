import type { Metadata } from 'next'
import { AdminCredencialesPanel } from '@/components/admin/admin-credenciales-panel'

export const metadata: Metadata = { title: 'Admin Credenciales' }

export default function AdminCredencialesPage() {
  return <AdminCredencialesPanel />
}
