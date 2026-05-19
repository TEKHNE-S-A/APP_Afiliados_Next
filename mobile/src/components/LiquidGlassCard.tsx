/**
 * LiquidGlassCard — Tarjeta con efecto liquid glass usando react-native-skia
 *
 * Renderiza un efecto de vidrio líquido con:
 *   - Canvas Skia para dibujo de alto rendimiento
 *   - Ondas animadas suaves (sin animación por ahora, base static)
 *   - Refracción y distorsión visual
 *   - Overlay glassmorphism
 */

import React, { useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { Canvas, Path, Skia, Fill, BlurFilter, Rect } from '@shopify/react-native-skia'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LiquidGlassCardProps {
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
  height?: number
  width?: number
  blurIntensity?: number
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function LiquidGlassCard({
  children,
  style,
  height = 264,
  width = '100%',
  blurIntensity = 20,
}: LiquidGlassCardProps) {
  const animationProgress = useRef(0)

  // Generar ondas básicas (sin Reanimated, valores estáticos para testing)
  const generateWavePath = (w: number, h: number, time: number) => {
    const path = Skia.Path.Make()
    const amplitude = 8
    const frequency = 0.015
    const phaseShift = time * 0.02

    // Línea superior ondulante
    path.moveTo(0, h * 0.25)
    for (let x = 0; x <= w; x += 5) {
      const y = h * 0.25 + Math.sin((x + phaseShift) * frequency) * amplitude
      path.lineTo(x, y)
    }

    // Bajar hacia esquina inferior derecha
    path.lineTo(w, h * 0.4)

    // Segunda onda
    for (let x = w; x >= 0; x -= 5) {
      const y = h * 0.4 + Math.sin((x + phaseShift * 1.3) * frequency) * amplitude * 0.7
      path.lineTo(x, y)
    }

    path.close()
    return path
  }

  return (
    <View style={[styles.wrapper, style]}>
      {/* Fondo blur base */}
      <BlurView
        intensity={blurIntensity}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />

      {/* Canvas Skia con ondas de liquid glass */}
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Rectángulo base con fill y blur */}
        <Rect x={0} y={0} width={width as any} height={height}>
          <Fill color="rgba(255,255,255,0.15)" />
          <BlurFilter blur={3} />
        </Rect>

        {/* Onda ondulante líquida (decorativa, sin animación aún) */}
        <Path path={generateWavePath(400, height, Date.now())} strokeWidth={0}>
          <Fill color="rgba(255,255,255,0.22)" />
          <BlurFilter blur={2} />
        </Path>
      </Canvas>

      {/* Refracción diagonal (igual al HomeFondoGlass) */}
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.28)',
          'rgba(255,255,255,0.10)',
          'rgba(255,255,255,0.00)',
        ]}
        start={{ x: 0.12, y: 0.0 }}
        end={{ x: 1.0, y: 1.0 }}
        style={styles.refractionLayer}
      />

      {/* Brillo superior */}
      <View style={styles.shineLine} />

      {/* Trazo interno */}
      <View style={styles.innerStroke} />

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
    borderRadius: 30,
    overflow: 'hidden',
  },

  refractionLayer: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ rotate: '-45deg' }, { scale: 1.25 }],
  },

  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 30,
  },

  shineLine: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
    borderRadius: 1,
  },

  content: {
    flex: 1,
    padding: 16,
  },
})
