import { ok, fail } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'

function getDefaultConfig() {
  return {
    version: 1,
    canvas: { width: 360, height: 280 },
    fields: {
      nombre:          { x: 16,  y: 96,  fontFamily: 'System', fontSize: 20, fontWeight: '700', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: false, titlePosition: 'invisible', titleFontSize: 10 },
      parentesco:      { x: 16,  y: 126, fontFamily: 'System', fontSize: 13, fontWeight: '600', fontStyle: 'normal', color: '#E5E7EB', hidden: false, allowEyeToggle: false, titlePosition: 'invisible', titleFontSize: 10 },
      nroAfiliado:     { x: 16,  y: 162, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true,  titlePosition: 'izquierda', titleFontSize: 10 },
      dni:             { x: 16,  y: 186, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true,  titlePosition: 'izquierda', titleFontSize: 10 },
      cuil:            { x: 16,  y: 210, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true,  titlePosition: 'izquierda', titleFontSize: 10 },
      plan:            { x: 196, y: 162, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: false, titlePosition: 'izquierda', titleFontSize: 10 },
      fechaNacimiento: { x: 196, y: 186, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true,  titlePosition: 'izquierda', titleFontSize: 10 },
      vigencia:        { x: 196, y: 210, fontFamily: 'System', fontSize: 12, fontWeight: '700', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: false, titlePosition: 'izquierda', titleFontSize: 10 },
      token:           { x: 286, y: 234, fontFamily: 'System', fontSize: 28, fontWeight: '700', fontStyle: 'normal', color: '#F59E0B', hidden: false, allowEyeToggle: false, titlePosition: 'invisible', titleFontSize: 10 },
    },
  }
}

export async function GET(req: Request) {
  const authz = await requireAdmin(req)
  if (authz.error) return authz.error

  const url = new URL(req.url)
  const scope = (url.searchParams.get('scope') ?? 'GENERAL').toUpperCase()
  const planId = url.searchParams.get('planId') ?? ''

  try {
    // Obtener planes
    const planesRows = await prisma.nuplan.findMany({
      select: {
        nuplaid: true,
        nupladescr: true,
        nuplim_gxi: true,
        nuplimfech: true,
      },
      orderBy: { nuplaid: 'asc' },
    })
    const planes = planesRows.map((p) => ({
      id: p.nuplaid.trim(),
      descripcion: (p.nupladescr ?? '').trim(),
      imagen_url: p.nuplim_gxi ?? null,
      fecha_img: p.nuplimfech ? p.nuplimfech.toISOString() : null,
    }))

    // Obtener layout general
    const generalRow = await prisma.app_credencial_layout.findFirst({
      where: { scope_type: 'GENERAL' },
    })
    const generalConfig = (generalRow?.config_json as object | null) ?? getDefaultConfig()

    // Para scope PLAN: buscar override del plan
    let config = generalConfig
    let source = 'GENERAL'

    if (scope === 'PLAN' && planId) {
      const planRow = await prisma.app_credencial_layout.findFirst({
        where: { scope_type: 'PLAN', plan_id: planId },
      })
      if (planRow?.config_json) {
        const planCfg = planRow.config_json as { fields?: Record<string, object> } & object
        const genCfg = generalConfig as { fields?: Record<string, object> } & object
        config = {
          ...genCfg,
          ...planCfg,
          fields: { ...(genCfg.fields ?? {}), ...(planCfg.fields ?? {}) },
        }
        source = 'PLAN'
      }
    }

    return ok({
      scope,
      planId: scope === 'PLAN' ? planId : null,
      source,
      config,
      generalConfig,
      planes,
    })
  } catch {
    return fail(500, 'DB_ERROR', 'Error obteniendo layout de credencial')
  }
}
