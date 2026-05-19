'use client'

import type { ReactNode } from 'react'
import { useSelectedLayoutSegment } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

export function DashboardShell({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment()
  const isAdminSection = segment === 'admin'

  if (isAdminSection) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
    </div>
  )
}
