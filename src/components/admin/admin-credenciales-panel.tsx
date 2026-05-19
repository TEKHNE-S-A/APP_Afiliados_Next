'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface FieldConfig {
  hidden?: boolean
  allowEyeToggle?: boolean
  x: number
  y: number
  fontFamily?: string
  fontSize: number
  fontWeight?: string
  fontStyle?: string
  color?: string
  titlePosition?: string
  titleFontSize?: number
}

interface LayoutConfig {
  version?: number
  canvas?: { width: number; height: number }
  fields: Record<string, FieldConfig>
}

interface Plan {
  id: string
  descripcion: string
  imagen_url: string | null
  fecha_img: string | null
}

interface LayoutResponse {
  scope: string
  planId: string | null
  source: string
  config: LayoutConfig
  planes: Plan[]
}

// ── Constantes ────────────────────────────────────────────────────────────────

const FONT_OPTIONS = ['System', 'sans-serif', 'serif', 'monospace']
const FONT_WEIGHTS = ['400', '500', '600', '700', '800', '900', 'normal', 'bold']
const FONT_STYLES = ['normal', 'italic']
const TITLE_POSITIONS = ['izquierda', 'superior', 'inferior', 'derecha', 'invisible']
const TITLE_VERTICAL_GAP = 6

const FIELD_LABELS: Record<string, string> = {
  nombre: 'Nombre completo',
  parentesco: 'Parentesco',
  nroAfiliado: 'Número de afiliado',
  dni: 'DNI',
  cuil: 'CUIL',
  plan: 'Plan',
  fechaNacimiento: 'Fecha nacimiento',
  vigencia: 'Vigencia',
  token: 'Token temporal',
}

const FIELD_TITLES: Record<string, string> = {
  nombre: 'Nombre completo',
  parentesco: 'Parentesco',
  nroAfiliado: 'N° Afiliado',
  dni: 'DNI',
  cuil: 'CUIL',
  plan: 'Plan',
  fechaNacimiento: 'F. Nac',
  vigencia: 'Vigencia',
}

const SAMPLE_VALUES: Record<string, string> = {
  nombre: 'PEREZ, JUAN',
  parentesco: 'Titular',
  nroAfiliado: '************123',
  dni: '***456',
  cuil: '***789',
  plan: 'AMPLIO+',
  fechaNacimiento: '**/**/****',
  vigencia: '31/12/2026',
  token: '478',
}

const DATA_FIELDS = ['nroAfiliado', 'dni', 'cuil', 'plan', 'fechaNacimiento', 'vigencia']

// ── Presets ───────────────────────────────────────────────────────────────────

function applyPreset(config: LayoutConfig, preset: 'clasico' | 'compacto' | 'minimal'): LayoutConfig {
  const c = JSON.parse(JSON.stringify(config)) as LayoutConfig
  const fields = c.fields

  Object.keys(fields).forEach((key) => {
    const f = fields[key]
    if (!f) return
    if (preset === 'clasico') {
      f.fontStyle = 'normal'
      if (!f.fontWeight) f.fontWeight = '600'
      if (DATA_FIELDS.includes(key)) { f.titlePosition = 'izquierda'; f.titleFontSize = 10 }
      if (key === 'nombre') { f.hidden = false; f.titlePosition = 'invisible'; f.fontSize = 20; f.fontWeight = '700' }
      if (key === 'parentesco') { f.hidden = false; f.titlePosition = 'invisible'; f.fontSize = 13 }
      if (key === 'token') { f.hidden = false; f.titlePosition = 'invisible'; f.fontSize = 28 }
    } else if (preset === 'compacto') {
      f.fontStyle = 'normal'
      if (DATA_FIELDS.includes(key)) { f.titlePosition = 'superior'; f.titleFontSize = 9; f.fontSize = Math.max(10, (f.fontSize || 12) - 1) }
      if (key === 'nombre') { f.hidden = false; f.titlePosition = 'invisible'; f.fontSize = 18; f.fontWeight = '700' }
      if (key === 'parentesco') { f.hidden = false; f.titlePosition = 'invisible'; f.fontSize = 12 }
      if (key === 'token') { f.hidden = false; f.titlePosition = 'invisible'; f.fontSize = 24 }
    } else if (preset === 'minimal') {
      if (DATA_FIELDS.includes(key)) f.titlePosition = 'invisible'
      if (key === 'nombre') { f.hidden = false; f.titlePosition = 'invisible'; f.fontSize = 20; f.fontWeight = '700' }
      if (key === 'parentesco') f.hidden = true
      if (key === 'token') { f.hidden = false; f.titlePosition = 'invisible' }
    }
  })
  return c
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function validColor(v?: string) {
  const s = String(v ?? '')
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : '#ffffff'
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function toPlanImageUrl(plan: Plan | undefined): string | null {
  const url = plan?.imagen_url
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // /uploads/... es proxeado por Next.js rewrite → backend
  if (url.startsWith('/uploads/')) return url
  return null
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchLayout(scope: string, planId: string): Promise<{ data: LayoutResponse }> {
  const params = new URLSearchParams({ scope })
  if (planId) params.set('planId', planId)
  const res = await fetch(`/api/admin/credenciales/layout?${params}`)
  if (!res.ok) throw new Error('Error cargando layout')
  return res.json()
}

// ── Preview card ──────────────────────────────────────────────────────────────

function PreviewCard({ config, scope, planId, source, planes }: {
  config: LayoutConfig
  scope: string
  planId: string
  source: string
  planes: Plan[]
}) {
  const plan = planes.find((p) => p.id === planId)
  const planImg = scope === 'PLAN' ? toPlanImageUrl(plan) : null

  const bg = planImg
    ? `linear-gradient(rgba(15,23,42,0.25),rgba(15,23,42,0.18)), url("${planImg}")`
    : 'linear-gradient(125deg, #0f172a 0%, #1d4ed8 52%, #0369a1 100%)'

  const fields = config.fields ?? {}

  return (
    <div>
      <div
        style={{
          position: 'relative',
          width: 360,
          height: 280,
          borderRadius: 16,
          overflow: 'hidden',
          background: bg,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 10px 24px rgba(0,0,0,.25)',
          margin: '0 auto',
        }}
      >
        {Object.entries(fields).map(([key, cfg]) => {
          if (!cfg || cfg.hidden) return null
          const value = SAMPLE_VALUES[key] ?? key
          const title = FIELD_TITLES[key] ?? ''
          const titlePos = String(cfg.titlePosition ?? 'izquierda').toLowerCase()
          const titleSize = Math.max(8, num(cfg.titleFontSize ?? 10))
          const fontSize = Math.max(8, num(cfg.fontSize))
          const displayText = title && titlePos === 'izquierda' ? `${title}: ${value}` : value

          const baseStyle: React.CSSProperties = {
            position: 'absolute',
            left: num(cfg.x),
            top: num(cfg.y),
            color: validColor(cfg.color),
            fontSize,
            fontFamily: FONT_OPTIONS.includes(String(cfg.fontFamily ?? '')) ? String(cfg.fontFamily) : 'sans-serif',
            fontWeight: String(cfg.fontWeight ?? '600'),
            fontStyle: cfg.fontStyle === 'italic' ? 'italic' : 'normal',
            whiteSpace: 'nowrap',
            textShadow: '1px 1px 3px rgba(0,0,0,.75)',
            pointerEvents: 'none',
            userSelect: 'none',
          }

          const elements = [<span key={key} style={baseStyle}>{displayText}</span>]

          if (title && titlePos !== 'izquierda' && titlePos !== 'invisible') {
            let tX = num(cfg.x)
            let tY = num(cfg.y)
            const valW = Math.max(30, Math.round(value.length * fontSize * 0.55))
            if (titlePos === 'superior') tY = tY - titleSize - TITLE_VERTICAL_GAP
            if (titlePos === 'inferior') tY = tY + fontSize + TITLE_VERTICAL_GAP
            if (titlePos === 'derecha') tX = tX + valW + 8
            elements.push(
              <span key={`${key}_title`} style={{ ...baseStyle, left: tX, top: tY, fontSize: titleSize, fontWeight: '600', fontStyle: 'normal' }}>
                {title}
              </span>
            )
          }

          return elements
        })}
      </div>
      <p className="text-xs text-center text-gray-400 mt-2">
        {scope === 'PLAN'
          ? `Preview plan ${planId || '-'} · Fuente: ${source}${planImg ? ' · con imagen' : ' · sin imagen'}`
          : 'Preview plantilla general'}
      </p>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function AdminCredencialesPanel() {
  const qc = useQueryClient()

  const [scope, setScope] = useState<'GENERAL' | 'PLAN'>('GENERAL')
  const [planId, setPlanId] = useState('')
  const [preset, setPreset] = useState('')
  const [localConfig, setLocalConfig] = useState<LayoutConfig | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const layoutQuery = useQuery({
    queryKey: queryKeys.adminCredencialesLayout(scope, planId),
    queryFn: () => fetchLayout(scope, planId),
    enabled: scope === 'GENERAL' || !!planId,
  })

  const planes: Plan[] = layoutQuery.data?.data?.planes ?? []
  const source: string = layoutQuery.data?.data?.source ?? 'GENERAL'

  // Sync localConfig cuando carga el query
  useEffect(() => {
    const cfg = layoutQuery.data?.data?.config
    if (cfg) setLocalConfig(JSON.parse(JSON.stringify(cfg)))
  }, [layoutQuery.data])

  // Al cargar planes, setear primer plan disponible si no hay uno seleccionado
  useEffect(() => {
    if (scope === 'PLAN' && planes.length > 0 && !planId) {
      setPlanId(planes[0].id)
    }
  }, [scope, planes, planId])

  // ── Mutations ───────────────────────────────────────────────────────────────

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!localConfig) throw new Error('No hay configuración cargada')
      if (scope === 'GENERAL') {
        const res = await fetch('/api/admin/credenciales/layout/general', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: localConfig }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error((j as { message?: string }).message || 'Error guardando')
        }
      } else {
        if (!planId) throw new Error('Seleccioná un plan')
        const res = await fetch(`/api/admin/credenciales/layout/plan/${encodeURIComponent(planId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: localConfig }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error((j as { message?: string }).message || 'Error guardando')
        }
      }
    },
    onSuccess: () => {
      showToast('Plantilla guardada ✓', 'success')
      qc.invalidateQueries({ queryKey: ['admin', 'credenciales', 'layout'] })
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  })

  const resetMut = useMutation({
    mutationFn: async () => {
      if (!planId) throw new Error('Seleccioná un plan')
      const res = await fetch(`/api/admin/credenciales/layout/plan/${encodeURIComponent(planId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { message?: string }).message || 'Error eliminando override')
      }
    },
    onSuccess: () => {
      showToast('Override eliminado. Usa plantilla general.', 'success')
      qc.invalidateQueries({ queryKey: ['admin', 'credenciales', 'layout'] })
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  })

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }, [])

  function updateField(key: string, prop: keyof FieldConfig, value: unknown) {
    setLocalConfig((prev) => {
      if (!prev) return prev
      const copy = JSON.parse(JSON.stringify(prev)) as LayoutConfig
      if (!copy.fields[key]) copy.fields[key] = { x: 0, y: 0, fontSize: 14 }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(copy.fields[key] as any)[prop] = value
      return copy
    })
  }

  function handleApplyPreset() {
    if (!preset) { showToast('Seleccioná un preset primero', 'error'); return }
    if (!localConfig) { showToast('Primero cargá una plantilla', 'error'); return }
    const updated = applyPreset(localConfig, preset as 'clasico' | 'compacto' | 'minimal')
    setLocalConfig(updated)
    showToast(`Preset "${preset}" aplicado`, 'success')
  }

  function handleScopeChange(newScope: 'GENERAL' | 'PLAN') {
    setScope(newScope)
    setLocalConfig(null)
    if (newScope === 'PLAN' && planes.length > 0) setPlanId(planes[0].id)
  }

  const fields = localConfig?.fields ?? {}
  const fieldKeys = Object.keys(fields)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Panel principal */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-end mb-4">
          {/* Scope */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Modo</label>
            <select
              value={scope}
              onChange={(e) => handleScopeChange(e.target.value as 'GENERAL' | 'PLAN')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 min-w-[160px]"
            >
              <option value="GENERAL">General</option>
              <option value="PLAN">Por plan</option>
            </select>
          </div>

          {/* Plan selector */}
          {scope === 'PLAN' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Plan</label>
              <select
                value={planId}
                onChange={(e) => { setPlanId(e.target.value); setLocalConfig(null) }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 min-w-[220px]"
              >
                {planes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} – {p.descripcion}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Preset */}
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Preset rápido</label>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              >
                <option value="">Seleccionar preset…</option>
                <option value="clasico">Clásico</option>
                <option value="compacto">Compacto</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
            <button
              onClick={handleApplyPreset}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-2 rounded-lg"
            >
              Aplicar preset
            </button>
          </div>

          <span className="flex-1" />

          {/* Acciones */}
          <button
            onClick={() => { setLocalConfig(null); qc.invalidateQueries({ queryKey: queryKeys.adminCredencialesLayout(scope, planId) }) }}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-2 rounded-lg"
          >
            Recargar
          </button>
          <button
            disabled={saveMut.isPending || !localConfig}
            onClick={() => saveMut.mutate()}
            className="text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg"
          >
            {saveMut.isPending ? 'Guardando…' : '💾 Guardar plantilla'}
          </button>
          {scope === 'PLAN' && (
            <button
              disabled={resetMut.isPending || !planId}
              onClick={() => {
                if (confirm('Esto eliminará el override del plan y volverá a la plantilla general. ¿Continuar?')) {
                  resetMut.mutate()
                }
              }}
              className="text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg"
            >
              {resetMut.isPending ? '…' : 'Quitar override plan'}
            </button>
          )}
        </div>

        {/* Info */}
        <div className="bg-cyan-50 border border-cyan-200 text-cyan-900 rounded-lg px-4 py-2.5 text-sm mb-4">
          Configurás qué datos se muestran en la credencial, su ubicación (X/Y), tipografía, tamaño, estilo y si cada dato se puede ocultar con el ojito en la app.
          {scope === 'PLAN' && planId && (
            <span className="ml-2 font-medium">· Plan: {planId} · Fuente efectiva: {source}</span>
          )}
        </div>

        {/* Tabla de campos */}
        {layoutQuery.isLoading || !localConfig ? (
          <p className="text-gray-400 py-8 text-center">
            {layoutQuery.isLoading ? 'Cargando configuración…' : 'Esperando datos…'}
          </p>
        ) : fieldKeys.length === 0 ? (
          <p className="text-gray-400 py-8 text-center">No hay campos para editar</p>
        ) : (
          <div className="overflow-auto border border-gray-100 rounded-xl" style={{ maxHeight: '65vh' }}>
            <table className="w-full text-xs border-collapse" style={{ minWidth: 1100 }}>
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="text-left text-gray-500 font-semibold">
                  <th className="px-3 py-2.5 border-b border-gray-100 sticky left-0 bg-gray-50 border-r-2 border-r-gray-200 min-w-[150px]">Campo</th>
                  <th className="px-3 py-2.5 border-b border-gray-100">Visible</th>
                  <th className="px-3 py-2.5 border-b border-gray-100">Ojito</th>
                  <th className="px-3 py-2.5 border-b border-gray-100">X</th>
                  <th className="px-3 py-2.5 border-b border-gray-100">Y</th>
                  <th className="px-3 py-2.5 border-b border-gray-100">Fuente</th>
                  <th className="px-3 py-2.5 border-b border-gray-100">Tamaño</th>
                  <th className="px-3 py-2.5 border-b border-gray-100">Peso</th>
                  <th className="px-3 py-2.5 border-b border-gray-100">Estilo</th>
                  <th className="px-3 py-2.5 border-b border-gray-100">Color</th>
                  <th className="px-3 py-2.5 border-b border-gray-100">Tít. posición</th>
                  <th className="px-3 py-2.5 border-b border-gray-100">Tít. tamaño</th>
                </tr>
              </thead>
              <tbody>
                {fieldKeys.map((key) => {
                  const f = fields[key] ?? { x: 0, y: 0, fontSize: 14 }
                  return (
                    <tr key={key} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-3 py-2 sticky left-0 bg-white border-r-2 border-r-gray-100">
                        <div className="font-semibold text-gray-800">{FIELD_LABELS[key] ?? key}</div>
                        <div className="text-gray-400 font-mono">{key}</div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!f.hidden}
                          onChange={(e) => updateField(key, 'hidden', !e.target.checked)}
                          className="w-4 h-4 rounded accent-indigo-600"
                          aria-label={`Visible ${FIELD_LABELS[key] ?? key}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!f.allowEyeToggle}
                          onChange={(e) => updateField(key, 'allowEyeToggle', e.target.checked)}
                          className="w-4 h-4 rounded accent-indigo-600"
                          aria-label={`Ojito ${FIELD_LABELS[key] ?? key}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={num(f.x)}
                          onChange={(e) => updateField(key, 'x', Number(e.target.value))}
                          className="w-20 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                          aria-label={`X ${key}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={num(f.y)}
                          onChange={(e) => updateField(key, 'y', Number(e.target.value))}
                          className="w-20 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                          aria-label={`Y ${key}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={f.fontFamily ?? 'System'}
                          onChange={(e) => updateField(key, 'fontFamily', e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                          aria-label={`Fuente ${key}`}
                        >
                          {FONT_OPTIONS.map((fo) => <option key={fo} value={fo}>{fo}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={num(f.fontSize)}
                          onChange={(e) => updateField(key, 'fontSize', Number(e.target.value))}
                          className="w-16 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                          aria-label={`Tamaño ${key}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={f.fontWeight ?? '600'}
                          onChange={(e) => updateField(key, 'fontWeight', e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                          aria-label={`Peso ${key}`}
                        >
                          {FONT_WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={f.fontStyle ?? 'normal'}
                          onChange={(e) => updateField(key, 'fontStyle', e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                          aria-label={`Estilo ${key}`}
                        >
                          {FONT_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="color"
                          value={validColor(f.color)}
                          onChange={(e) => updateField(key, 'color', e.target.value)}
                          className="w-10 h-8 rounded border border-gray-200 p-0.5 cursor-pointer"
                          aria-label={`Color ${key}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={f.titlePosition ?? 'izquierda'}
                          onChange={(e) => updateField(key, 'titlePosition', e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                          aria-label={`Posición título ${key}`}
                        >
                          {TITLE_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={num(f.titleFontSize ?? 10)}
                          onChange={(e) => updateField(key, 'titleFontSize', Number(e.target.value))}
                          className="w-16 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                          aria-label={`Tamaño título ${key}`}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Preview */}
        {localConfig && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Vista previa</h3>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
              <PreviewCard
                config={localConfig}
                scope={scope}
                planId={planId}
                source={source}
                planes={planes}
              />
            </div>
          </div>
        )}

        {/* Estado */}
        <p className="text-xs text-gray-400 mt-3">
          {layoutQuery.isLoading
            ? 'Cargando configuración…'
            : scope === 'PLAN'
            ? `Modo por plan: ${planId || '(sin plan)'} · Fuente efectiva: ${source}`
            : 'Modo general'}
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg ${
            toast.type === 'success' ? 'bg-green-700' : 'bg-red-500'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
