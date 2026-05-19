/**
 * IconAutorizaciones — Ícono DSO: clipboard médico con línea ECG
 *
 * Figma: SVG 26×33
 * Elementos:
 *  - Cuerpo del clipboard (rect rx=1)
 *  - Sujetador superior del clipboard (rect rx=1)
 *  - 3 líneas de texto del clipboard
 *  - Pulso ECG / heartbeat (waveform cardíaco)
 */

import React from 'react'
import Svg, { Rect, Path } from 'react-native-svg'

interface Props {
  /** Tamaño proporcional: ancho = size * (26/33). Default: 28 */
  size?: number
  /** Color de trazo (stroke). Default: '#FFFFFF' */
  color?: string
  strokeWidth?: number
}

export default function IconAutorizaciones({
  size = 28,
  color = '#FFFFFF',
  strokeWidth = 2,
}: Props) {
  const height = size
  const width  = size * (26 / 33)

  return (
    <Svg width={width} height={height} viewBox="0 0 26 33" fill="none">
      {/* ── Cuerpo clipboard ── */}
      <Rect
        x="1"
        y="2.45593"
        width="23.7206"
        height="29.5441"
        rx="1"
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* ── Línea de texto 1 ── */}
      <Path
        d="M5.58105 14.1948L20.1447 14.3161"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Línea de texto 2 ── */}
      <Path
        d="M5.58105 10.1912L20.1447 10.3125"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Línea de texto 3 ── */}
      <Path
        d="M5.58105 18.1985L20.1447 18.3198"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Sujetador superior ── */}
      <Rect
        x="5.85278"
        y="1"
        width="13.7721"
        height="3.09559"
        rx="1"
        stroke={color}
        strokeWidth={strokeWidth}
      />

      {/* ── Pulso ECG / heartbeat ── */}
      <Path
        d="M5.58105 23.9527H8.83413C9.30044 23.9527 9.72778 23.6925 9.94185 23.2783C10.4503 22.2944 11.8933 22.4122 12.2355 23.4655L12.6139 24.6307C12.9683 25.7218 14.5288 25.6718 14.8126 24.5602L14.9928 23.8545C15.1666 23.1738 16.062 23.0162 16.4578 23.5965C16.6098 23.8194 16.8622 23.9527 17.132 23.9527H20.1399"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
