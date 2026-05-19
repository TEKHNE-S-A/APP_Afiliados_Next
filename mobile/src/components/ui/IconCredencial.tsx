/**
 * IconCredencial — Ícono DSO: tarjeta / credencial
 *
 * Figma: SVG 32×32
 */

import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface Props {
  size?: number
  color?: string
  strokeWidth?: number
}

export default function IconCredencial({
  size = 32,
  color = '#FFFFFF',
  strokeWidth = 2,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* ── Cuerpo de la tarjeta ── */}
      <Path
        d="M27.9999 5.33337H3.99992C2.52716 5.33337 1.33325 6.52728 1.33325 8.00004V24C1.33325 25.4728 2.52716 26.6667 3.99992 26.6667H27.9999C29.4727 26.6667 30.6666 25.4728 30.6666 24V8.00004C30.6666 6.52728 29.4727 5.33337 27.9999 5.33337Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* ── Franja horizontal ── */}
      <Path
        d="M1.33325 13.3334H30.6666"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
