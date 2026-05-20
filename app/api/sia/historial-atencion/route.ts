import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'
import { NextResponse } from 'next/server'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { executeSIA, parseSoapResult, getParamNumber } from '@/lib/siaClient'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  // ── Autenticación ──────────────────────────────────────────────────────────
  let nuusuid: string | null = null

  const bearer = await requireMobileAuth(req)
  if (!bearer.error) {
    nuusuid = bearer.payload.sub
  } else {
    const session = await auth()
    if (!session) return fail(401, 'UNAUTHORIZED', 'Sesion requerida')
    nuusuid = session.user.id
  }

  if (!nuusuid) return fail(401, 'UNAUTHORIZED', 'Sesion invalida')

  // ── Parámetros de query ────────────────────────────────────────────────────
  const url = new URL(req.url)
  const DesdeFecha = url.searchParams.get('DesdeFecha') ?? url.searchParams.get('fechaDesde')
  const HastaFecha = url.searchParams.get('HastaFecha') ?? url.searchParams.get('fechaHasta')
  const Pagina = parseInt(url.searchParams.get('Pagina') ?? url.searchParams.get('page') ?? '1') || 1
  const RegistrosXPagina = parseInt(url.searchParams.get('RegistrosXPagina') ?? url.searchParams.get('limit') ?? '10') || 10
  const AfiliadoIdQuery = url.searchParams.get('AfiliadoId')
  const Prestador = url.searchParams.get('Prestador') ?? ''
  const SearchText = url.searchParams.get('SearchText') ?? ''

  // ── Obtener AfiliadoId ─────────────────────────────────────────────────────
  let afiliadoId = AfiliadoIdQuery?.trim() ?? null
  if (!afiliadoId) {
    const user = await prisma.nuusuari.findUnique({
      where: { nuusuid },
      select: { nuusuafili: true },
    })
    if (!user?.nuusuafili) return fail(400, 'NO_AFILIADO_ID', 'Usuario sin AfiliadoId asociado')
    afiliadoId = user.nuusuafili.trim()
  }

  // ── Calcular rango de fechas ───────────────────────────────────────────────
  const hastaFecha = HastaFecha ?? new Date().toISOString().split('T')[0]
  let desdeFecha = DesdeFecha
  if (!desdeFecha) {
    const diasHistorial = await getParamNumber('FUNCIONES_APP', 'HistorialVigencia', 180)
    const hasta = new Date(hastaFecha)
    hasta.setDate(hasta.getDate() - diasHistorial)
    desdeFecha = hasta.toISOString().split('T')[0]
  }

  // ── Llamada SOAP ───────────────────────────────────────────────────────────
  try {
    const result = await executeSIA('HISTORIAL_ATENCION_APP', {
      AfiliadoId: afiliadoId,
      DesdeFecha: desdeFecha,
      HastaFecha: hastaFecha,
      Pagina,
      RegistrosXPagina,
    })
    const parsed = parseSoapResult(result)

    if (!parsed.ok) {
      return fail(400, 'SIA_ERROR', parsed.errorDsc ?? 'Error en servicio SIA', { mensajes: parsed.mensajes })
    }

    const payload = parsed.payload
    let resultadoArray: unknown[] = []

    if (typeof payload.Resultado === 'string') {
      try { resultadoArray = JSON.parse(payload.Resultado as string) ?? [] } catch { resultadoArray = [] }
    } else if (Array.isArray(payload.Resultado)) {
      resultadoArray = payload.Resultado as unknown[]
    }

    // ── Enriquecimiento con NombrePractica (filtro SearchText) ────────────────
    if (SearchText && resultadoArray.length > 0) {
      resultadoArray = await Promise.all(
        resultadoArray.map(async (item) => {
          const i = item as Record<string, unknown>
          const atencionId = String(i?.AtencionId ?? '')
          const numeroDelegacion = parseInt(atencionId.substring(0, 5), 10)
          const numeroAutorizacion = parseInt(atencionId.substring(5), 10)
          if (!isFinite(numeroDelegacion) || !isFinite(numeroAutorizacion) || numeroDelegacion === 0 || numeroAutorizacion === 0) return i
          try {
            const det = await executeSIA('AUDETALLE_CONSUMO_APP', { NumeroDelegacion: numeroDelegacion, NumeroAutorizacion: numeroAutorizacion })
            const dp = parseSoapResult(det)
            if (!dp.ok) return i
            let detalleItems: Array<Record<string, unknown>> = []
            const pl = dp.payload
            if (typeof pl.Resultado === 'string') { try { detalleItems = JSON.parse(pl.Resultado as string) ?? [] } catch { detalleItems = [] } }
            else if (Array.isArray(pl.Resultado)) detalleItems = pl.Resultado as Array<Record<string, unknown>>
            const first = detalleItems[0]
            const nombrePractica = String(first?.NombrePractica ?? first?.Prestacion ?? first?.Descripcion ?? first?.Detalle ?? '').trim()
            return nombrePractica ? { ...i, _nombrePractica: nombrePractica } : i
          } catch { return i }
        })
      )
    }

    // ── Filtros ────────────────────────────────────────────────────────────────
    if ((Prestador || SearchText) && resultadoArray.length > 0) {
      const normP = Prestador.toLowerCase()
      const normS = SearchText.toLowerCase()
      resultadoArray = resultadoArray.filter((item) => {
        const d = item as Record<string, unknown>
        if (normP) {
          const prestadorRaw = [d.EntidadNombre, d.Prestador, d.PrestadorNombre, d.Entidad].filter(Boolean).join(' ').toLowerCase()
          if (!prestadorRaw.includes(normP)) return false
        }
        if (normS) {
          const all = Object.values(d).filter((v) => v != null).join(' ').toLowerCase()
          if (!all.includes(normS)) return false
        }
        return true
      })
    }

    const totalRegistros = parseInt(String(payload.TotalRegistros ?? payload.Total ?? payload.CantRegistros ?? '')) || resultadoArray.length
    const data = { ...payload }
    if (typeof payload.Resultado === 'string') data.Resultado = JSON.stringify(resultadoArray)
    else if (Array.isArray(payload.Resultado)) data.Resultado = resultadoArray

    return NextResponse.json({
      success: true,
      data,
      pagination: { page: Pagina, limit: RegistrosXPagina, total: totalRegistros, totalPages: RegistrosXPagina > 0 ? Math.ceil(totalRegistros / RegistrosXPagina) : 1 },
      filtrosAplicados: { prestador: Prestador, textoGeneral: SearchText },
    })
  } catch (error) {
    console.error('[SIA historial-atencion]', error)
    return fail(500, 'INTERNAL_ERROR', 'Error inesperado en historial de atencion')
  }
}
