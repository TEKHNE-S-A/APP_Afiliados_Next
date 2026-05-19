/**
 * IconBuscar — Ícono DSO: lupa / buscar
 *
 * Figma: SVG 24×24
 * Elementos:
 *  - Círculo de la lupa
 *  - Mango diagonal
 */

import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface Props {
  size?: number
  color?: string
  strokeWidth?: number
}

export default function IconBuscar({
  size = 24,
  color = '#FFFFFF',
  strokeWidth = 2,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* ── Círculo ── */}
      <Path
        d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* ── Mango ── */}
      <Path
        d="M20.9999 21L16.6499 16.65"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
