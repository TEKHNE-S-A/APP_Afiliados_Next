import type { Metadata } from 'next'
import { AdminPlanesPanel } from '@/components/admin/admin-planes-panel'

export const metadata: Metadata = { title: 'Admin Planes' }

export default function AdminPlanesPage() {
  return <AdminPlanesPanel />
}
