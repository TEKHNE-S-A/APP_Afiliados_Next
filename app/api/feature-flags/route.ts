import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { auth } from '@/lib/auth'

const FLAG_DEFAULTS: Record<string, string> = {
  HabilitarCartilla: 'S',
  HabilitarInfoUtil: 'S',
  HabilitarAutorizSinOrden: 'S',
  HabilitarAutorizConOden: 'S',
  HabilitarHistorialAtencion: 'S',
  HabilitarNotificaciones: 'N',
  HabilitarNotificacionesCola: 'N',
  HabilitarModoOffline: 'S',
  HabilitarModoBetaUI: 'N',
  HabilitarTemaOscuro: 'S',
  HabilitarTramites: 'N',
  HabilitarColaOffline: 'N',
  HabilitarDiagnosticoAdmin: 'S',
}

/**
 * GET /api/feature-flags — Flags de funcionalidades desde nusispar (grupo FUNCIONES_APP)
 * Mobile: response.flags
 * Formato: { flags: [{ nombre, habilitado, valor, descripcion?, modulo?, impacto? }] }
 */
export async function GET(req: Request) {
  // Auth opcional: permitir acceso público (mobile sin sesión puede necesitarlo)
  // Si la sesión está presente, se usa para logging futuro; no bloquea el acceso.
  const bearer = await requireMobileAuth(req)
  const hasAuth = !bearer.error
  if (!hasAuth) {
    const session = await auth()
    if (!session) {
      // Feature flags son públicos para que la app funcione sin login
      // (boot de la app antes del login)
    }
  }

  try {
    const rows = await prisma.nusispar.findMany({
      where: { nusisgrupa: 'FUNCIONES_APP' },
      select: { nusistippa: true, nusisvalpa: true },
    })

    // Índice de valores en BD
    const dbValues: Record<string, string> = {}
    for (const r of rows) {
      dbValues[r.nusistippa.trim()] = r.nusisvalpa.trim()
    }

    const flags = Object.entries(FLAG_DEFAULTS).map(([nombre, defVal]) => {
      const valor = dbValues[nombre] ?? defVal
      return {
        nombre,
        habilitado: valor === 'S',
        valor,
      }
    })

    // También incluir flags adicionales que estén en BD pero no en el dict de defaults
    for (const [tippa, valpa] of Object.entries(dbValues)) {
      if (!(tippa in FLAG_DEFAULTS)) {
        flags.push({ nombre: tippa, habilitado: valpa === 'S', valor: valpa })
      }
    }

    return NextResponse.json({ flags })
  } catch (error) {
    console.error('[GET /api/feature-flags]', error)
    return NextResponse.json({ flags: [] }, { status: 500 })
  }
}
