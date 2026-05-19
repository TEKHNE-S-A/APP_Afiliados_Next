/**
 * IconFarmacia — Ícono DSO: píldoras / farmacia
 *
 * Figma: SVG 29×35
 * Elementos:
 *  - Cápsula rotada (rect con transform rotate -28.6°)
 *  - Detalle superior de la cápsula (path)
 *  - Línea separadora de la cápsula (path diagonal)
 *  - Círculo (segunda cápsula / píldora redonda)
 *  - Línea diagonal del círculo (mitad de la píldora)
 */

import React from 'react'
import Svg, { Rect, Path, Circle } from 'react-native-svg'

interface Props {
  /** Tamaño proporcional: ancho = size * (29/35). Default: 28 */
  size?: number
  /** Color de trazo (stroke). Default: '#FFFFFF' */
  color?: string
  strokeWidth?: number
}

export default function IconFarmacia({
  size = 28,
  color = '#FFFFFF',
  strokeWidth = 2,
}: Props) {
  const width  = size * (29 / 35)
  const height = size

  return (
    <Svg width={width} height={height} viewBox="0 0 29 35" fill="none">
      {/* ── Cápsula rotada ── */}
      <Rect
        x="3.55563"
        y="6.51653"
        width="10.7796"
        height="30.4438"
        rx="5.38981"
        transform="rotate(-28.5977 3.55563 6.51653)"
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* ── Detalle/curva superior de la cápsula ── */}
      <Path
        d="M10.0046 6.26688C10.4078 6.04699 11.6098 5.80511 12.3134 6.5967C13.0171 7.38829 13.7427 8.57566 14.0725 9.01544"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Línea separadora diagonal de la cápsula ── */}
      <Path
        d="M20.6691 15.8319L12.9731 20.0097"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Círculo (segunda píldora/cápsula redonda) ── */}
      <Circle
        cx="7.58605"
        cy="24.7826"
        r="6.58605"
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* ── Línea diagonal de la píldora redonda ── */}
      <Path
        d="M4.61719 19.7898L10.8839 30.6741"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
