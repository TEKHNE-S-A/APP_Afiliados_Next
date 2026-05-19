import Link from 'next/link'

interface AdminLegacyPlaceholderProps {
  title: string
  description: string
  legacyRoute: string
}

export function AdminLegacyPlaceholder({ title, description, legacyRoute }: AdminLegacyPlaceholderProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-700">
          Esta pantalla ya tiene ruta web migrada en Next para mantener paridad de navegación con el backend legacy.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Ruta legacy de referencia: <span className="font-mono">{legacyRoute}</span>
        </p>
        <div className="mt-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Volver a Parámetros
          </Link>
        </div>
      </div>
    </div>
  )
}
