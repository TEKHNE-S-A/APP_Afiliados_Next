import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Iniciar sesión' }

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center p-4">
      {children}
    </div>
  )
}
