/**
 * IconHistorial — Ícono DSO: historial con reloj/flecha de tiempo
 *
 * SVG base provisto por diseño: 30×30.
 */

import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface Props {
  /** Tamaño cuadrado del ícono (ancho = alto). Default: 28 */
  size?: number
  /** Color de trazo (stroke). Default: '#FFFFFF' */
  color?: string
  strokeWidth?: number
}

export default function IconHistorial({
  size = 28,
  color = '#FFFFFF',
  strokeWidth = 2,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <Path
        d="M13.8262 9.32422V15.568L17.9887 19.7305"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M1.89429 8.24584H8.03011H1.89429ZM1.89429 8.24584V2.10999"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M1 14.875C1 22.5371 7.21292 28.75 14.875 28.75C22.5371 28.75 28.75 22.5371 28.75 14.875C28.75 7.21292 22.5371 1 14.875 1C9.61792 1 5.03916 3.92919 2.68041 8.24585"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
