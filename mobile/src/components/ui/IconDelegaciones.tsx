/**
 * IconDelegaciones — Ícono DSO: edificio delegación con cruz médica
 *
 * Figma: SVG 35×35
 * Elementos:
 *  - Fachada superior del edificio (path trapezoidal)
 *  - Cuerpo del edificio (rect)
 *  - Plataforma/base inferior (rect rx=2.92)
 *  - Cruz médica vertical (path)
 *  - Cruz médica horizontal (path)
 */

import React from 'react'
import Svg, { Rect, Path } from 'react-native-svg'

interface Props {
  /** Tamaño cuadrado del ícono (ancho = alto). Default: 28 */
  size?: number
  /** Color de trazo (stroke). Default: '#FFFFFF' */
  color?: string
  strokeWidth?: number
}

export default function IconDelegaciones({
  size = 28,
  color = '#FFFFFF',
  strokeWidth = 2,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 35 35" fill="none">
      {/* ── Fachada / entrada superior del edificio ── */}
      <Path
        d="M8.71875 1H26.0039C28.2412 1.00017 30.2056 2.48677 30.8145 4.63965L31.7842 8.06836C32.6866 11.2594 30.2897 14.4285 26.9736 14.4287H7.80566C4.52173 14.4286 2.12933 11.317 2.97363 8.14355L3.88672 4.71387C4.46962 2.52403 6.45265 1 8.71875 1Z"
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* ── Cuerpo del edificio ── */}
      <Rect
        x="5.3"
        y="14.41"
        width="24.05"
        height="13.18"
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* ── Base / plataforma inferior ── */}
      <Rect
        x="1.25"
        y="27.56"
        width="32.65"
        height="5.84"
        rx="2.92"
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* ── Cruz médica — línea vertical ── */}
      <Path
        d="M17.7061 4.29993V10.8763"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* ── Cruz médica — línea horizontal ── */}
      <Path
        d="M20.9937 7.65759L14.5438 7.64507"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  )
}
