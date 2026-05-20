import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fail } from '@/lib/api-response'
import { requireMobileAuth } from '@/lib/require-mobile-auth'
import { executeSIA, parseSoapResult } from '@/lib/siaClient'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  estado: z.enum(['ENV', 'AUD', 'AUT', 'REC', 'PEN', 'CON']).optional(),
  tipo: z.enum(['P', 'S']).optional(),
  fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fechaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().max(200).optional(),
})

const safeTrim = (v: unknown): string => (v == null ? '' : String(v).trim())

const normalizeFecha = (v: unknown): string => {
  const s = safeTrim(v)
  if (!s || s === '0000-00-00' || s.startsWith('0001-01-01')) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

const normalizeCodigo = (v: unknown): string => safeTrim(v).replace(/\.0+$/, '')

const normalizeTipo = (v: unknown): string => {
  const t = safeTrim(v).toUpperCase()
  return t === 'P' || t === 'S' ? t : ''
}

const resolveTipo = (soapTipo: unknown, localTipo: unknown, fotosCount: number): string => {
  if (fotosCount > 0) return 'P'
  return normalizeTipo(localTipo) || normalizeTipo(soapTipo) || 'S'
}

export async function GET(req: Request) {
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

  const url = new URL(req.url)
  const qParsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!qParsed.success) return fail(422, 'VALIDATION_ERROR', 'Parametros invalidos', qParsed.error.flatten())

  const filtros = {
    estado: qParsed.data.estado ?? '',
    tipo: qParsed.data.tipo ?? '',
    fechaDesde: qParsed.data.fechaDesde ?? '',
    fechaHasta: qParsed.data.fechaHasta ?? '',
    search: safeTrim(qParsed.data.search).toLowerCase(),
  }

  try {
    // ── 1. Leer solicitudes de BD local ──────────────────────────────────────
    const localRows = await prisma.$queryRaw<any[]>`
      SELECT a.ausolicid, a.ausoldescr, a.ausolfecal, a.ausolfecor, a.ausoltipo, a.ausolestad,
        a.ausolcantp, a.ausolpsoco, a.ausolautnu, a.autippreid, a.ausoltexto, a.ausolgravc, a.ausolentno,
        a.ausolnroaf, c.crcreapeno AS afiliado_nombre,
        a.xmin::text::bigint AS orden_local,
        0 AS fotos_count
      FROM ausolici a
      LEFT JOIN crcreden c ON a.ausolnroaf = c.crcrenroaf
        AND c.crcreid IN (SELECT crcreid FROM crcredus WHERE nuusuid = ${nuusuid})
      WHERE a.nuusuid = ${nuusuid}
      ORDER BY DATE(a.ausolfecor) DESC, DATE(a.ausolfecal) DESC, a.xmin::text::bigint DESC
    `

    if (localRows.length === 0) {
      return NextResponse.json({ success: true, autorizaciones: [], total: 0, sincronizado: true })
    }

    // ── 2. Precargar descripciones de prestaciones (opcional, best-effort) ───
    const prestMap = new Map<string, string>()
    try {
      const prestRes = await executeSIA('REC_PRESTACIONES_APP', '')
      const prestParsed = parseSoapResult(prestRes)
      if (prestParsed.ok) {
        let items: any[] = []
        const p = prestParsed.payload
        if (typeof p?.Resultado === 'string') { try { items = JSON.parse(p.Resultado) } catch { /* skip */ } }
        else if (Array.isArray(p?.Resultado)) items = p.Resultado
        else if (Array.isArray(p)) items = p
        for (const item of items) {
          const codigo = safeTrim(item?.Id || item?.AULPresID || item?.AUSolPresId)
          const codigoN = normalizeCodigo(codigo)
          const desc = safeTrim(item?.Descripcion || item?.AULPresDescripcion || item?.AUSolPresDescripcion)
          if (desc) {
            if (codigo) prestMap.set(codigo, desc)
            if (codigoN && codigoN !== codigo) prestMap.set(codigoN, desc)
          }
        }
      }
    } catch { /* opcional */ }

    const getPrestDesc = (codigo: string, soapData?: any): string => {
      const desdeSoap = safeTrim(
        soapData?.AUSolPresDescripcion || soapData?.AUSolPresDesc ||
        soapData?.AUSolPresDsc || soapData?.AUSolPrestacionDescripcion
      )
      if (desdeSoap) return desdeSoap
      const c = safeTrim(codigo)
      return prestMap.get(c) || prestMap.get(normalizeCodigo(c)) || ''
    }

    const getGravDesc = (soapData?: any, localDesc = ''): string => {
      const desdeSoap = safeTrim(
        soapData?.AUSolGravDescripcion || soapData?.AUSolGravDesc || soapData?.AUSolGravDsc ||
        soapData?.AUSolGravNombre || soapData?.AUSolCoberturaDescripcion
      )
      return desdeSoap || safeTrim(localDesc)
    }

    const buildFromLocal = (sol: any, ausolicid: string | null, tipo: string): any => ({
      ausolicid,
      descripcion: sol.ausoldescr || '',
      texto: safeTrim(sol.ausoltexto) || safeTrim(sol.ausoldescr),
      fecha_alta: normalizeFecha(sol.ausolfecal) || normalizeFecha(sol.ausolfecor),
      fecha_orden: normalizeFecha(sol.ausolfecor) || normalizeFecha(sol.ausolfecal),
      tipo,
      estado: sol.ausolestad || 'PEN',
      cantidad: Number(sol.ausolcantp) || 1,
      profesional: safeTrim(sol.ausolpsoco),
      autorizacion_numero: safeTrim(sol.ausolautnu),
      numero_delegacion: '',
      tipo_prestacion_id: safeTrim(sol.autippreid),
      prestacion_descripcion: getPrestDesc(safeTrim(sol.autippreid)),
      gravamen_descripcion: getGravDesc(null, sol.ausolentno),
      gravamen_codigo: safeTrim(sol.ausolgravc),
      afiliado_nombre: safeTrim(sol.afiliado_nombre) || 'Sin nombre',
      numero_afiliado: safeTrim(sol.ausolnroaf),
      orden_local: Number(sol.orden_local) || 0,
    })

    // ── 3. Sincronizar cada solicitud con SOAP ───────────────────────────────
    const autorizaciones: any[] = []

    for (const sol of localRows) {
      const ausolicid = safeTrim(sol.ausolicid)
      const fotosCount = Number(sol.fotos_count) || 0
      const tipo = resolveTipo('', sol.ausoltipo, fotosCount)

      if (!ausolicid) {
        autorizaciones.push(buildFromLocal(sol, null, tipo))
        continue
      }

      try {
        const siaRes = await executeSIA('REC_SOLICITUDES_APP', { Mode: 'DSP', AUSolIdExt: ausolicid })
        const siaParsed = parseSoapResult(siaRes)

        if (!siaParsed.ok) {
          autorizaciones.push(buildFromLocal(sol, ausolicid, tipo))
          continue
        }

        let authData: any = siaParsed.payload
        if (authData?.Resultado) {
          try { authData = JSON.parse(authData.Resultado) } catch { authData = siaParsed.payload }
        }

        if (!authData || authData.AUSolId === 0) {
          autorizaciones.push(buildFromLocal(sol, ausolicid, tipo))
          continue
        }

        const estadoSOAP = safeTrim(authData.AUSolAutEstado) || 'PEN'
        const descripcionSOAP = safeTrim(authData.AUSolRefAfiliado || authData.AUSolDescripcion)
        const autorizacionSOAP = authData.AUSolAutNumero
          ? String(authData.AUSolAutNumero)
          : safeTrim(authData.AUAutNumero)
        const numeroDelegacion = safeTrim(
          authData.NumeroDelegacion || authData.AUSolAutDCodigo ||
          authData.AUSolDelegacion || authData.AUSolAutDelegacion
        )

        const descripcionFinal = descripcionSOAP || safeTrim(sol.ausoldescr)
        const autorizacionFinal = autorizacionSOAP || safeTrim(sol.ausolautnu)
        const textoFinal = safeTrim(authData.AUSolTexto || authData.AUSolTextoSolicitud) ||
          safeTrim(sol.ausoltexto) || descripcionFinal
        const tipoFinal = resolveTipo(authData.AUSolTipo, sol.ausoltipo, fotosCount)
        const fechaAltaFinal = normalizeFecha(authData.AUSolFecha || authData.AUSolFecAlta) ||
          normalizeFecha(sol.ausolfecal) || normalizeFecha(sol.ausolfecor)
        const fechaOrdenFinal = normalizeFecha(authData.AUSolFechaOrden || authData.AUSolFecOrden) ||
          fechaAltaFinal || normalizeFecha(sol.ausolfecor)
        const cantidadFinal = authData.AUSolPresCant || Number(sol.ausolcantp) || 1
        const profesionalFinal = safeTrim(authData.AUSolObsPref) || safeTrim(sol.ausolpsoco)
        const prestacionFinal = safeTrim(authData.AUSolPresId) || safeTrim(sol.autippreid)
        const gravamenFinal = safeTrim(authData.AUSolGravCodigo) || safeTrim(sol.ausolgravc)
        const prestDesc = getPrestDesc(prestacionFinal, authData)
        const gravDesc = getGravDesc(authData, sol.ausolentno)

        // Actualizar BD si hubo cambios
        const changed =
          safeTrim(sol.ausolestad) !== estadoSOAP ||
          safeTrim(sol.ausoldescr) !== descripcionFinal ||
          safeTrim(sol.ausolautnu) !== autorizacionFinal ||
          normalizeTipo(sol.ausoltipo) !== tipoFinal ||
          safeTrim(sol.ausolpsoco) !== profesionalFinal ||
          safeTrim(sol.autippreid) !== prestacionFinal ||
          safeTrim(sol.ausolgravc) !== gravamenFinal

        if (changed) {
          const fechaAltaDb = fechaAltaFinal || null
          const fechaOrdenDb = fechaOrdenFinal || null
          const gravDescDb = (gravDesc || safeTrim(sol.ausolentno)).substring(0, 50)
          await prisma.$executeRaw`
            UPDATE ausolici SET
              ausoldescr = ${descripcionFinal},
              ausolfecal = ${fechaAltaDb}::date,
              ausolfecor = ${fechaOrdenDb}::date,
              ausoltipo  = ${tipoFinal},
              ausolestad = ${estadoSOAP},
              ausolcantp = ${cantidadFinal},
              ausolpsoco = ${profesionalFinal},
              ausolautnu = ${autorizacionFinal},
              autippreid = ${prestacionFinal},
              ausolgravc = ${gravamenFinal},
              ausolentno = ${gravDescDb}
            WHERE ausolicid = ${ausolicid} AND nuusuid = ${nuusuid}
          `
        }

        autorizaciones.push({
          ausolicid,
          descripcion: descripcionFinal,
          texto: textoFinal,
          fecha_alta: fechaAltaFinal,
          fecha_orden: fechaOrdenFinal,
          tipo: tipoFinal,
          estado: estadoSOAP,
          cantidad: cantidadFinal,
          profesional: profesionalFinal,
          autorizacion_numero: autorizacionFinal,
          numero_delegacion: numeroDelegacion,
          tipo_prestacion_id: prestacionFinal,
          prestacion_descripcion: prestDesc,
          gravamen_descripcion: gravDesc,
          gravamen_codigo: gravamenFinal,
          afiliado_nombre: safeTrim(sol.afiliado_nombre) || 'Sin nombre',
          numero_afiliado: safeTrim(sol.ausolnroaf),
          orden_local: Number(sol.orden_local) || 0,
        })
      } catch {
        autorizaciones.push(buildFromLocal(sol, ausolicid, tipo))
      }
    }

    // ── 4. Aplicar filtros ───────────────────────────────────────────────────
    const filtered = autorizaciones.filter(item => {
      if (filtros.estado && safeTrim(item.estado).toUpperCase() !== filtros.estado) return false
      if (filtros.tipo && safeTrim(item.tipo).toUpperCase() !== filtros.tipo) return false
      const fechaItem = safeTrim(item.fecha_orden || item.fecha_alta).slice(0, 10)
      if (filtros.fechaDesde && fechaItem && fechaItem < filtros.fechaDesde) return false
      if (filtros.fechaHasta && fechaItem && fechaItem > filtros.fechaHasta) return false
      if (filtros.search) {
        const haystack = [
          item.descripcion, item.texto, item.profesional,
          item.prestacion_descripcion, item.gravamen_descripcion,
          item.afiliado_nombre, item.numero_afiliado, item.autorizacion_numero,
        ].map(v => safeTrim(v).toLowerCase()).join(' ')
        if (!haystack.includes(filtros.search)) return false
      }
      return true
    })

    // ── 5. Ordenar ───────────────────────────────────────────────────────────
    filtered.sort((a, b) => {
      const fa = safeTrim(a.fecha_orden || a.fecha_alta).slice(0, 10)
      const fb = safeTrim(b.fecha_orden || b.fecha_alta).slice(0, 10)
      if (fa !== fb) return fb.localeCompare(fa)
      const oa = Number(a.orden_local || 0)
      const ob = Number(b.orden_local || 0)
      if (oa !== ob) return ob - oa
      return safeTrim(b.ausolicid || '').localeCompare(safeTrim(a.ausolicid || ''))
    })

    return NextResponse.json({
      success: true,
      autorizaciones: filtered,
      total: filtered.length,
      sincronizado: true,
      filtrosAplicados: filtros,
    })
  } catch (error) {
    console.error('[mis-autorizaciones]', error)
    return fail(500, 'INTERNAL_ERROR', 'Error al obtener autorizaciones')
  }
}
