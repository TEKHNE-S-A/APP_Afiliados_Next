/**
 * HomeFondoGlass — Tarjeta glass para el fondo del Home
 *
 * Fiel al diseño Figma: TEKHNE node-id (rect 411×264, rx=30, fill=white fill-opacity=0.3)
 *
 * Specs Figma:
 *   - Ancho: 100% (411px en diseño = ancho de pantalla)
 *   - Alto: 264px
 *   - Border-radius: 30px (token ds.radius.hero)
 *   - Fondo: white con 30% de opacidad (glassmorphism)
 *   - Efecto: blur del contenido detrás + overlay blanco semitransparente
 *   - Brillo superior: línea blanca sutil en el borde top (efecto glass clásico)
 *
 * Tokens DSO utilizados:
 *   ds.radius.hero — border-radius 30
 *
 * Uso:
 *   <HomeFondoGlass>
 *     <MiContenido />
 *   </HomeFondoGlass>
 *
 *   // Sin children (solo decorativo):
 *   <HomeFondoGlass style={{ position: 'absolute', top: 0 }} />
 */

import React from 'react'
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { ds } from '../theme/ds'

// ─── Constantes ───────────────────────────────────────────────────────────────

const CARD_HEIGHT    = 264

type GlassPreset = 'soft' | 'intense'

const GLASS_PRESETS: Record<GlassPreset, {
  blurIntensity: number
  overlay: string
  shine: string
  stroke: string
  refraction: [string, string, string]
}> = {
  soft: {
    blurIntensity: 14,
    overlay: 'rgba(255, 255, 255, 0.15)',
    shine: 'rgba(255, 255, 255, 0.42)',
    stroke: 'rgba(255,255,255,0.16)',
    refraction: [
      'rgba(255,255,255,0.22)',
      'rgba(255,255,255,0.08)',
      'rgba(255,255,255,0.00)',
    ],
  },
  intense: {
    blurIntensity: 24,
    overlay: 'rgba(255, 255, 255, 0.22)',
    shine: 'rgba(255, 255, 255, 0.52)',
    stroke: 'rgba(255,255,255,0.22)',
    refraction: [
      'rgba(255,255,255,0.28)',
      'rgba(255,255,255,0.10)',
      'rgba(255,255,255,0.00)',
    ],
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface HomeFondoGlassProps {
  /** Contenido a renderizar dentro de la tarjeta (opcional) */
  children?: React.ReactNode
  /** Estilos adicionales sobre el wrapper */
  style?: StyleProp<ViewStyle>
  /** Preset visual del glass. Default: 'intense' */
  preset?: GlassPreset
  /** Intensidad del blur (0-100). Si se define, pisa el preset */
  blurIntensity?: number
  /** Tinte del blur. Default: 'light' */
  blurTint?: 'light' | 'dark' | 'default' | 'extraLight' | 'systemMaterial'
  /**
   * Si true, la altura se adapta al contenido (ignora CARD_HEIGHT fija).
   * Útil cuando el glass actúa como fondo de una sección variable.
   */
  autoHeight?: boolean
  /** Fondo decorativo adicional (se renderiza detrás del contenido) */
  backgroundLayer?: React.ReactNode
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function HomeFondoGlass({
  children,
  style,
  preset = 'intense',
  blurIntensity,
  blurTint = 'light',
  autoHeight = false,
  backgroundLayer,
}: HomeFondoGlassProps) {
  const activePreset = GLASS_PRESETS[preset]
  const resolvedBlurIntensity = blurIntensity ?? activePreset.blurIntensity

  return (
    <View style={[styles.wrapper, autoHeight && styles.wrapperAuto, style]}>
      {/* Capa blur — efecto frosted glass */}
      <BlurView
        intensity={resolvedBlurIntensity}
        tint={blurTint}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />

      {/* Overlay blanco 30% — fiel al fill-opacity="0.3" del Figma */}
      <View style={[styles.overlay, { backgroundColor: activePreset.overlay }]} />

      {/* Refracción simulada: velo diagonal con gradiente suave */}
      <LinearGradient
        colors={activePreset.refraction}
        start={{ x: 0.12, y: 0.0 }}
        end={{ x: 1.0, y: 1.0 }}
        style={styles.refractionLayer}
      />

      {/* Borde interno sutil para dar profundidad */}
      <View style={[styles.innerStroke, { borderColor: activePreset.stroke }]} />

      {/* Fondo decorativo SVG adicional */}
      {backgroundLayer}

      {/* Línea de brillo superior — efecto glass clásico */}
      <View style={[styles.shineLine, { backgroundColor: activePreset.shine }]} />

      {/* Contenido */}
      {children && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    height: CARD_HEIGHT,
    borderRadius: 30,   // 30px — token 'hero' Figma (ds.radius.hero)
    overflow: 'hidden',             // recorta blur y capas al radio
  },

  // Variante de altura automática (adapta al contenido)
  wrapperAuto: {
    height: undefined,
  },

  // Overlay blanco semitransparente — Figma: fill="white" fill-opacity="0.3"
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  // Velo diagonal para simular refracción y dispersión leve
  refractionLayer: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ rotate: '-45deg' }, { scale: 1.25 }],
  },

  // Trazo interior suave para reforzar el relieve del material
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 30,
  },

  // Brillo superior (glass highlight) — línea de 1px en el borde top
  shineLine: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderRadius: 1,
  },

  // Contenedor del contenido de los children
  content: {
    flex: 1,
    padding: 16,
  },
})
