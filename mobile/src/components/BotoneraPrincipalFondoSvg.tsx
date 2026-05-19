import React from 'react'
import { StyleProp, ViewStyle } from 'react-native'
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg'

interface BotoneraPrincipalFondoSvgProps {
  style?: StyleProp<ViewStyle>
}

/**
 * Fondo de botonera principal adaptado desde Figma.
 * Versión compatible RN: sin foreignObject/backdrop-filter/pattern image.
 */
export default function BotoneraPrincipalFondoSvg({ style }: BotoneraPrincipalFondoSvgProps) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 411 590" preserveAspectRatio="none" style={style as any}>
      <Defs>
        <LinearGradient id="bgStroke" x1="0" y1="0" x2="411" y2="590" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="0.5" stopColor="#C8D8E6" stopOpacity="0.65" />
          <Stop offset="1" stopColor="#80A5C6" stopOpacity="0.9" />
        </LinearGradient>
        <LinearGradient id="tileStroke" x1="16" y1="24" x2="392" y2="240" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#A6C0E0" stopOpacity="0.6" />
        </LinearGradient>

        {/* Gradientes importados desde SVG de Figma (parte 3) */}
        <LinearGradient id="paint0_linear_12807_4325" x1="55.5" y1="-21.5" x2="397.5" y2="590" gradientUnits="userSpaceOnUse">
          <Stop offset="0.47" stopColor="#FFFFFF" />
          <Stop offset="0.5625" stopColor="#004B8D" />
          <Stop offset="0.67" stopColor="#FFFFFF" />
        </LinearGradient>

        <RadialGradient
          id="paint1_radial_12807_4325"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(212 69.5) rotate(139.787) scale(72.0226 86.4271)"
        >
          <Stop stopColor="#5576B8" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#004B8D" />
        </RadialGradient>

        <LinearGradient id="paint2_linear_12807_4325" x1="144" y1="5.5" x2="257.5" y2="128.5" gradientUnits="userSpaceOnUse">
          <Stop offset="0.467885" stopColor="#FFFFFF" />
          <Stop offset="0.556495" stopColor="#3773A8" />
          <Stop offset="0.67037" stopColor="#FFFFFF" />
        </LinearGradient>

        <RadialGradient
          id="paint3_radial_12807_4325"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(340 69.5) rotate(139.787) scale(72.0226 86.4271)"
        >
          <Stop stopColor="#5576B8" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#004B8D" />
        </RadialGradient>

        <LinearGradient id="paint4_linear_12807_4325" x1="272" y1="5.5" x2="385.5" y2="128.5" gradientUnits="userSpaceOnUse">
          <Stop offset="0.467885" stopColor="#FFFFFF" />
          <Stop offset="0.556495" stopColor="#3773A8" />
          <Stop offset="0.67037" stopColor="#FFFFFF" />
        </LinearGradient>

        <RadialGradient
          id="paint5_radial_12807_4325"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(212 185.5) rotate(139.787) scale(72.0226 86.4271)"
        >
          <Stop stopColor="#5576B8" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#004B8D" />
        </RadialGradient>

        <LinearGradient id="paint6_linear_12807_4325" x1="144" y1="121.5" x2="257.5" y2="244.5" gradientUnits="userSpaceOnUse">
          <Stop offset="0.467885" stopColor="#FFFFFF" />
          <Stop offset="0.556495" stopColor="#3773A8" />
          <Stop offset="0.67037" stopColor="#FFFFFF" />
        </LinearGradient>

        {/* Gradientes importados desde SVG de Figma (parte 4) */}
        <LinearGradient id="paint8_linear_12807_4325" x1="16" y1="5.5" x2="129.5" y2="128.5" gradientUnits="userSpaceOnUse">
          <Stop offset="0.467885" stopColor="#FFFFFF" />
          <Stop offset="0.556495" stopColor="#3773A8" />
          <Stop offset="0.67037" stopColor="#FFFFFF" />
        </LinearGradient>

        <RadialGradient
          id="paint9_radial_12807_4325"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(84 185.5) rotate(139.787) scale(72.0226 86.4271)"
        >
          <Stop stopColor="#5576B8" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#004B8D" />
        </RadialGradient>

        <LinearGradient id="paint10_linear_12807_4325" x1="16" y1="121.5" x2="129.5" y2="244.5" gradientUnits="userSpaceOnUse">
          <Stop offset="0.467885" stopColor="#FFFFFF" />
          <Stop offset="0.556495" stopColor="#3773A8" />
          <Stop offset="0.67037" stopColor="#FFFFFF" />
        </LinearGradient>

        <RadialGradient
          id="paint11_radial_12807_4325"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(340 185.5) rotate(139.787) scale(72.0226 86.4271)"
        >
          <Stop stopColor="#5576B8" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#004B8D" />
        </RadialGradient>

        <LinearGradient id="paint12_linear_12807_4325" x1="272" y1="121.5" x2="385.5" y2="244.5" gradientUnits="userSpaceOnUse">
          <Stop offset="0.467885" stopColor="#FFFFFF" />
          <Stop offset="0.556495" stopColor="#3773A8" />
          <Stop offset="0.67037" stopColor="#FFFFFF" />
        </LinearGradient>
      </Defs>

      {/* Contenedor principal glass */}
      <Rect x="0.5" y="0.5" width="410" height="589" rx="29.5" fill="white" fillOpacity="0.3" />
      <Rect x="0.5" y="0.5" width="410" height="589" rx="29.5" fill="none" stroke="url(#bgStroke)" strokeOpacity="0.85" />

      {/* 6 tarjetas superiores (layout Figma) */}
      <Rect x="16" y="24" width="120" height="100" rx="15" fill="#2A529C" fillOpacity="0.25" />
      <Rect x="144" y="24" width="120" height="100" rx="15" fill="#2A529C" fillOpacity="0.25" />
      <Rect x="272" y="24" width="120" height="100" rx="15" fill="#2A529C" fillOpacity="0.25" />

      <Rect x="16" y="140" width="120" height="100" rx="15" fill="#2A529C" fillOpacity="0.25" />
      <Rect x="144" y="140" width="120" height="100" rx="15" fill="#2A529C" fillOpacity="0.25" />
      <Rect x="272" y="140" width="120" height="100" rx="15" fill="#2A529C" fillOpacity="0.25" />

      <Rect x="16.5" y="24.5" width="119" height="99" rx="14.5" fill="none" stroke="url(#tileStroke)" strokeOpacity="0.6" />
      <Rect x="144.5" y="24.5" width="119" height="99" rx="14.5" fill="none" stroke="url(#tileStroke)" strokeOpacity="0.6" />
      <Rect x="272.5" y="24.5" width="119" height="99" rx="14.5" fill="none" stroke="url(#tileStroke)" strokeOpacity="0.6" />

      <Rect x="16.5" y="140.5" width="119" height="99" rx="14.5" fill="none" stroke="url(#tileStroke)" strokeOpacity="0.6" />
      <Rect x="144.5" y="140.5" width="119" height="99" rx="14.5" fill="none" stroke="url(#tileStroke)" strokeOpacity="0.6" />
      <Rect x="272.5" y="140.5" width="119" height="99" rx="14.5" fill="none" stroke="url(#tileStroke)" strokeOpacity="0.6" />

      {/* Tarjetas inferiores grandes */}
      <Rect x="16" y="297" width="373" height="100" rx="15" fill="#FFFFFF" />
      <Rect x="16" y="455" width="379" height="100" rx="16" fill="#2F52AC" />
    </Svg>
  )
}
