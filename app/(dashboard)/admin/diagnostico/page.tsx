import type { Metadata } from 'next'
import { AdminDiagnosticoPanel } from '@/components/admin/admin-diagnostico-panel'

export const metadata: Metadata = { title: 'Diagnóstico | Admin' }

export default function AdminDiagnosticoPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Diagnóstico de conectividad</h1>
        <p className="text-sm text-gray-500">Estado de servicios SOAP y endpoints internos</p>
      </div>
      <AdminDiagnosticoPanel />
    </div>
  )
}
