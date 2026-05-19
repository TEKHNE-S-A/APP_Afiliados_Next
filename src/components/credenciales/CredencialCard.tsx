'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Credencial } from '@/types'

type FieldLayout = {
  x?: number
  y?: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: string
  fontStyle?: string
  color?: string
  hidden?: boolean
  allowEyeToggle?: boolean
  titlePosition?: string
  titleFontSize?: number
}

const defaultFieldLayout: Record<string, FieldLayout> = {
  nombre: { x: 16, y: 96, fontFamily: 'system-ui', fontSize: 20, fontWeight: '700', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: false, titlePosition: 'invisible', titleFontSize: 10 },
  parentesco: { x: 16, y: 126, fontFamily: 'system-ui', fontSize: 13, fontWeight: '600', fontStyle: 'normal', color: '#E5E7EB', hidden: false, allowEyeToggle: false, titlePosition: 'invisible', titleFontSize: 10 },
  nroAfiliado: { x: 16, y: 162, fontFamily: 'system-ui', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true, titlePosition: 'izquierda', titleFontSize: 10 },
  dni: { x: 16, y: 186, fontFamily: 'system-ui', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true, titlePosition: 'izquierda', titleFontSize: 10 },
  cuil: { x: 16, y: 210, fontFamily: 'system-ui', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true, titlePosition: 'izquierda', titleFontSize: 10 },
  plan: { x: 196, y: 162, fontFamily: 'system-ui', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: false, titlePosition: 'izquierda', titleFontSize: 10 },
  fechaNacimiento: { x: 196, y: 186, fontFamily: 'system-ui', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true, titlePosition: 'izquierda', titleFontSize: 10 },
  vigencia: { x: 196, y: 210, fontFamily: 'system-ui', fontSize: 12, fontWeight: '700', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: false, titlePosition: 'izquierda', titleFontSize: 10 },
  token: { x: 286, y: 234, fontFamily: 'system-ui', fontSize: 28, fontWeight: '700', fontStyle: 'normal', color: '#F59E0B', hidden: false, allowEyeToggle: false, titlePosition: 'invisible', titleFontSize: 10 },
}

function formatFecha(value?: string | Date | null) {
  if (!value) return 'N/A'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  return d.toLocaleDateString('es-AR')
}

function normalizeCredencialImageUrl(rawUrl: string | null | undefined): string {
  const value = String(rawUrl || '').trim()
  if (!value) return '/assets/credencial-fondo-2.png'
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) return value
  return `/uploads/${value}`
}

function isVigente(crcrefecvi?: string | Date | null) {
  if (!crcrefecvi) return false
  const s = String(crcrefecvi).slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s >= today
  const d = new Date(crcrefecvi)
  return !Number.isNaN(d.getTime()) && d.getTime() >= Date.now()
}

function diasHastaVencimiento(crcrefecvi?: string | Date | null) {
  if (!crcrefecvi) return null
  const d = new Date(crcrefecvi)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function badgeVigencia(crcrefecvi?: string | Date | null) {
  const vigente = isVigente(crcrefecvi)
  const dias = diasHastaVencimiento(crcrefecvi)

  if (!vigente) return { label: 'VENCIDA', color: '#EF4444' }
  if (dias != null && dias <= 7) return { label: `${dias} DIAS`, color: '#F59E0B' }
  return { label: 'VIGENTE', color: '#10B981' }
}

type Props = {
  credencial: Credencial
  isTitular: boolean
  compact?: boolean
  showToken?: boolean
  showToggleDatos?: boolean
  planImageUrl?: string | null
}

export default function CredencialCard({
  credencial,
  isTitular,
  compact = false,
  showToken = false,
  showToggleDatos = false,
  planImageUrl,
}: Props) {
  const [datosVisibles, setDatosVisibles] = useState(!showToggleDatos)
  const [countdown, setCountdown] = useState('')
  const [tokenExpired, setTokenExpired] = useState(false)

  const layoutFields = {
    ...defaultFieldLayout,
    ...(credencial.credencialLayout?.fields || {}),
  }

  const bgUrl = useMemo(
    () => normalizeCredencialImageUrl(planImageUrl || credencial.crcrelin),
    [planImageUrl, credencial.crcrelin],
  )

  useEffect(() => {
    if (!credencial.tokenTemporalVenceEn) return

    const tick = () => {
      const now = Date.now()
      const expiry = new Date(credencial.tokenTemporalVenceEn as string).getTime()
      const diff = expiry - now
      if (diff <= 0) {
        setCountdown('EXPIRADO')
        setTokenExpired(true)
        return
      }
      setTokenExpired(false)
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setCountdown(`${minutes}:${String(seconds).padStart(2, '0')}`)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [credencial.tokenTemporalVenceEn])

  const vigenteBadge = badgeVigencia(credencial.crcrefecvi)

  const masked = (field: string, raw: string | number | bigint | Date | null | undefined, isDate = false) => {
    const value = raw == null ? '' : String(raw)
    const canHide = layoutFields[field]?.allowEyeToggle
    const shouldMask = showToggleDatos && !datosVisibles && canHide

    if (!shouldMask) {
      return isDate ? formatFecha(value) : value || 'N/A'
    }

    if (isDate) return '**/**/****'
    if (!value) return '***'
    if (value.length <= 3) return '***'
    return `***${value.slice(-3)}`
  }

  return (
    <div
      className={`relative w-full max-w-[380px] overflow-hidden rounded-2xl shadow-lg ${compact ? 'min-h-[220px]' : 'min-h-[280px]'}`}
      style={{
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/20" />

      <div className="relative z-10 p-4 min-h-[280px]">
        <div className="relative flex justify-center mb-2">
          {isTitular ? (
            <span className="rounded-xl bg-[#FFD700] px-3 py-1 text-xs font-bold text-gray-800">★ TITULAR</span>
          ) : null}
          <span
            className="absolute right-0 top-0 rounded-xl px-3 py-1 text-[11px] font-bold text-white"
            style={{ backgroundColor: vigenteBadge.color }}
          >
            {vigenteBadge.label}
          </span>
        </div>

        <div className="absolute left-4 top-24 text-white text-[20px] font-bold [text-shadow:1px_1px_3px_rgba(0,0,0,0.75)]">
          {credencial.crcreapeno}
        </div>
        {credencial.crcreparen ? (
          <div className="absolute left-4 top-[126px] text-[#E5E7EB] text-[13px] font-semibold [text-shadow:1px_1px_3px_rgba(0,0,0,0.75)]">
            {credencial.crcreparen}
          </div>
        ) : null}

        {!compact ? (
          <>
            <div className="absolute left-4 top-[162px] text-white text-xs font-semibold">N° Afiliado: {masked('nroAfiliado', credencial.crcrenroaf)}</div>
            <div className="absolute left-4 top-[186px] text-white text-xs font-semibold">DNI: {masked('dni', credencial.crcredocum)}</div>
            <div className="absolute left-4 top-[210px] text-white text-xs font-semibold">CUIL: {masked('cuil', credencial.crcrecuil)}</div>

            <div className="absolute left-[196px] top-[162px] text-white text-xs font-semibold">Plan: {credencial.crcrepladesc ?? credencial.crcreplaid ?? 'N/A'}</div>
            <div className="absolute left-[196px] top-[186px] text-white text-xs font-semibold">F. Nac: {masked('fechaNacimiento', credencial.crcrefecha, true)}</div>
            <div className="absolute left-[196px] top-[210px] text-white text-xs font-bold">Vigencia: {formatFecha(credencial.crcrefecvi)}</div>
          </>
        ) : null}

        {showToken && credencial.tokenTemporal ? (
          <div className={`absolute bottom-0 right-0 min-w-[85px] rounded-xl px-3 py-2 text-center shadow ${tokenExpired ? 'bg-red-500' : 'bg-amber-500'}`}>
            <div className="text-[10px] font-semibold tracking-wide text-white">TOKEN</div>
            <div className="text-2xl font-bold leading-tight text-white">{credencial.tokenTemporal}</div>
            {countdown ? <div className="text-[11px] font-semibold text-white/90">{countdown}</div> : null}
          </div>
        ) : null}

        {showToggleDatos ? (
          <button
            type="button"
            onClick={() => setDatosVisibles((v) => !v)}
            className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-black/30 text-sm"
            aria-label="Mostrar u ocultar datos"
          >
            {datosVisibles ? '👁️' : '🙈'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
