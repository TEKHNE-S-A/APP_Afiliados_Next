import { prisma } from '@/lib/prisma'
import { fail, ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const [total, conCoordenadas, errores] = await prisma.$transaction([
    prisma.caendire.count(),
    prisma.caendire.count({
      where: {
        caendlat: { not: null },
        caendlng: { not: null },
      },
    }),
    prisma.caendire.count({
      where: { caendgeost: 'E' },
    }),
  ])

  const pendientes = total - conCoordenadas - errores
  const porcentajeGeocodificado =
    total > 0 ? Math.round((conCoordenadas / total) * 100) : 0

  return ok({ total, conCoordenadas, pendientes, errores, porcentajeGeocodificado })
}

export async function POST(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const url = new URL(req.url)
  const action = (url.searchParams.get('action') ?? 'process').trim()

  // Geocodificación requiere servicio externo configurado.
  // Devolver respuesta indicando que no está disponible sin romper la UI.
  if (action === 'retry') {
    return ok({ processed: 0, success: 0, errors: 0, pending: 0, message: 'Servicio de geocodificación no configurado en este entorno.' })
  }

  return ok({ processed: 0, success: 0, errors: 0, pending: 0, message: 'Servicio de geocodificación no configurado en este entorno.' })
}
