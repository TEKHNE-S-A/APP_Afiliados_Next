/**
 * BottomTabButton — Botón individual de la barra de navegación inferior
 *
 * Migrado desde SVG Figma (viewBox 0 0 396 62).
 * Cubre los 4 tabs no-centrales: Inicio · Avisos · Info útil · Más
 *
 * Elementos Figma:
 *   - Pill activo: rect(0.5, 0.5, 75.75×61, rx=30.5)
 *     fill #2A529C/0.4 + stroke gradient white→#97A9D6→white
 *   - Icono centrado en y≈20 del SVG
 *   - Etiqueta centrada en y≈46 del SVG
 *
 * Uso:
 *   <BottomTabButton tabType="inicio" isActive onPress={() => {}} />
 *   <BottomTabButton tabType="avisos" badge={3} onPress={() => {}} />
 */

import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import Svg, {
  Rect,
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg'
import { ds } from '../theme/ds'

// ─── Escala (misma referencia 412px que BottomTabBarFigma) ─────────────────

const { width: SW } = Dimensions.get('window')
const sc = (v: number) => (v * SW) / 412

// ─── Dimensiones (unidades Figma 396×62) ───────────────────────────────────

export const BTN_HEIGHT  = sc(62)     // altura total del botón
const PILL_W    = sc(75.75)           // ancho del pill activo
const PILL_H    = sc(62)              // alto del SVG del pill (incluye offset 0.5)
const PILL_RX   = sc(30.5)            // radio del pill
const ICON_CY   = sc(20)             // centro-y del icono en el área del botón
const LABEL_TOP = sc(40)             // top de la etiqueta
const ICON_SZ   = sc(22)             // tamaño icono normal
// etiqueta: usa token DSO (ds.text.tabLabel → fontSize 12, weight '500')

// ─── Pill activo (SVG local, coordenadas del Figma 396×62) ─────────────────
// Gradiente: x1=13,y1=0 → x2=74.5,y2=64  (en espacio de la píldora)
// Stops: white@12% → #97A9D6@52.9% → white@77.4%

const ActivePill = React.memo(() => (
  <Svg
    width={PILL_W}
    height={PILL_H}
    viewBox="0 0 76.75 62"
    pointerEvents="none"
  >
    <Defs>
      <SvgLinearGradient
        id="btab_pillBorder"
        x1="13" y1="0" x2="74.5" y2="64"
        gradientUnits="userSpaceOnUse"
      >
        <Stop offset="0.120" stopColor="#FFFFFF" />
        <Stop offset="0.529" stopColor="#97A9D6" />
        <Stop offset="0.774" stopColor="#FFFFFF" />
      </SvgLinearGradient>
    </Defs>

    {/* Relleno semitransparente azul */}
    <Rect
      x={0.5} y={0.5}
      width={75.75} height={61} rx={30.5}
      fill="#2A529C" fillOpacity={0.4}
    />
    {/* Contorno con gradiente */}
    <Rect
      x={0.5} y={0.5}
      width={75.75} height={61} rx={30.5}
      stroke="url(#btab_pillBorder)" fill="none"
    />
  </Svg>
))

// ─── Iconos SVG ─────────────────────────────────────────────────────────────
// Paths extraídos del SVG Figma 396×62.
// ViewBox = bounding box del icono + 2px de margen.

/** Inicio — casa con puerta (viewBox normalizado, sw≈2px físicos) */
export const IcoInicio = ({ color }: { color: string }) => (
  <Svg width={ICON_SZ} height={ICON_SZ} viewBox="0 0 22 24" fill="none">
    <Path
      d="M2 9L11 2L20 9V20C20 20.5304 19.789 21.039 19.414 21.414C19.039 21.789 18.530 22 18 22H4C3.470 22 2.961 21.789 2.586 21.414C2.211 21.039 2 20.530 2 20V9Z"
      stroke={color} strokeWidth={2.18} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M8 22V12H14V22"
      stroke={color} strokeWidth={2.18} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
)

/** Avisos — globo de chat (viewBox normalizado, sw=2px físicos) */
export const IcoAvisos = ({ color }: { color: string }) => (
  <Svg width={ICON_SZ} height={ICON_SZ} viewBox="0 0 22 22" fill="none">
    <Path
      d="M20 14C20 14.5304 19.789 15.039 19.414 15.414C19.039 15.789 18.530 16 18 16H6L2 20V4C2 3.4696 2.211 2.961 2.586 2.586C2.961 2.211 3.470 2 4 2H18C18.530 2 19.039 2.211 19.414 2.586C19.789 2.961 20 3.4696 20 4V14Z"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
)

/** Info útil — círculo de información (sw≈2px físicos; vb 24×24 en elem 22×22 → scale=22/24) */
export const IcoInfoUtil = ({ color }: { color: string }) => (
  <Svg width={ICON_SZ} height={ICON_SZ} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.523 22 12 22C6.477 22 2 17.5228 2 12C2 6.4772 6.477 2 12 2C17.523 2 22 6.4772 22 12Z"
      stroke={color} strokeWidth={2.18} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
)

/** Más — 3 líneas horizontales (viewBox normalizado, sw=2px físicos) */
export const IcoMas = ({ color }: { color: string }) => (
  <Svg width={ICON_SZ} height={ICON_SZ} viewBox="0 0 22 16" fill="none">
    <Path d="M2 2H20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2 8H20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2 14H20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

// ─── Tipos y defaults ───────────────────────────────────────────────────────

export type TabType = 'inicio' | 'avisos' | 'infoUtil' | 'mas'

const LABELS: Record<TabType, string> = {
  inicio:   'Inicio',
  avisos:   'Avisos',
  infoUtil: 'Info útil',
  mas:      'Más',
}

export interface BottomTabButtonProps {
  /** Tipo de tab — determina icono y etiqueta por defecto */
  tabType: TabType
  /** Estado activo — muestra el pill de fondo */
  isActive?: boolean
  /** Sobreescribe la etiqueta por defecto */
  label?: string
  /** Número de badge (0 = oculto) */
  badge?: number
  onPress?: () => void
  accessibilityLabel?: string
}

// ─── Componente ─────────────────────────────────────────────────────────────

export default function BottomTabButton({
  tabType,
  isActive = false,
  label,
  badge = 0,
  onPress,
  accessibilityLabel,
}: BottomTabButtonProps) {
  const displayLabel = label ?? LABELS[tabType]
  const iconColor    = isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)'
  const labelColor   = isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)'

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={isActive ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel ?? displayLabel}
      style={styles.btn}
    >
      {/* ── Pill activo — centrado horizontalmente ── */}
      {isActive && (
        <View style={styles.pillWrap} pointerEvents="none">
          <ActivePill />
        </View>
      )}

      {/* ── Icono ── */}
      <View style={[styles.iconWrap, { top: ICON_CY - ICON_SZ / 2 }]}>
        {tabType === 'inicio'   && <IcoInicio   color={iconColor} />}
        {tabType === 'avisos'   && <IcoAvisos   color={iconColor} />}
        {tabType === 'infoUtil' && <IcoInfoUtil  color={iconColor} />}
        {tabType === 'mas'      && <IcoMas       color={iconColor} />}

        {/* Badge de notificación */}
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>

      {/* ── Etiqueta ── */}
      <Text
        numberOfLines={1}
        style={[styles.label, { top: LABEL_TOP, color: labelColor }]}
      >
        {displayLabel}
      </Text>
    </TouchableOpacity>
  )
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const BADGE_SIZE = Math.max(14, sc(14))

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    height: BTN_HEIGHT,
    alignItems: 'center',
    position: 'relative',
  },
  pillWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    position: 'absolute',
    alignSelf: 'center',
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    ...ds.text.tabLabel,
    letterSpacing: 0.1,
    textAlign: 'center',
    width: Math.floor(SW / 5) - 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Math.max(8, sc(8)),
    fontWeight: '700',
    lineHeight: BADGE_SIZE,
  },
})
