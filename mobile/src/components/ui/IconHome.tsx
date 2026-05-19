/**
 * IconHome — Ícono DSO: casa / inicio
 *
 * Figma: SVG 24×24
 * Elementos:
 *  - Forma principal de la casa (path con techo y paredes)
 *  - Puerta central (path rectangular inferior)
 */

import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface Props {
  /** Tamaño del ícono (width = height). Default: 24 */
  size?: number
  /** Color de trazo (stroke). Default: '#FFFFFF' */
  color?: string
  strokeWidth?: number
}

export default function IconHome({
  size = 24,
  color = '#FFFFFF',
  strokeWidth = 2,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* ── Forma principal: techo + paredes ── */}
      <Path
        d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* ── Puerta ── */}
      <Path
        d="M9 22V12H15V22"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
