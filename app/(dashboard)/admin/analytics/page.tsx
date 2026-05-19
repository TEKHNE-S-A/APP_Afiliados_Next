import type { Metadata } from 'next'
import { AdminAnalyticsPanel } from '@/components/admin/admin-analytics-panel'

export const metadata: Metadata = { title: 'Analítica | Admin' }

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analítica funcional</h1>
        <p className="text-sm text-gray-500">Métricas de uso del panel y eventos por módulo</p>
      </div>
      <AdminAnalyticsPanel />
    </div>
  )
}
