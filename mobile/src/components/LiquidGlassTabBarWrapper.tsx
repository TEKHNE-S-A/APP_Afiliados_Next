/**
 * LiquidGlassTabBarWrapper — Liquid glass overlay para BottomTabBar
 *
 * Implementación con expo-blur + expo-linear-gradient + Animated API.
 * No requiere Skia ni reanimated — compatible con Expo Go.
 *
 * Glass Properties (Figma):
 *   Light: light | Angle: -45° | Opacity: 80% | Refraction: 80
 *   Depth: 20 | Dispersion: 50 | Frost: 4 | Splay: 0
 */

import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Dimensions } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import BottomTabBar from './BottomTabBar'

const SCREEN_WIDTH = Dimensions.get('window').width

// ─── Glass Properties (Figma panel) ──────────────────────────────────────────
const GLASS = {
  opacity: 0.80,       // 80%
  refraction: 0.80,    // escala capas de refracción
  depth: 20,           // profundidad visual
  dispersion: 0.50,    // separación entre capas
  frost: 0.04,         // opacidad suave
}

export default function LiquidGlassTabBarWrapper(props: BottomTabBarProps) {
  const waveAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start()
  }, [waveAnim])

  const wave1TranslateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH * 0.15, SCREEN_WIDTH * 0.15],
  })
  const wave2TranslateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH * 0.10, -SCREEN_WIDTH * 0.10],
  })
  const wave1Opacity = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [GLASS.frost * 5, GLASS.frost * 8, GLASS.frost * 5],
  })
  const wave2Opacity = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [GLASS.opacity * 0.10, GLASS.opacity * 0.16, GLASS.opacity * 0.10],
  })

  return (
    <View style={styles.wrapper}>
      {/* ── Liquid glass overlay ─────────────────────────────────────── */}
      <View style={styles.glassOverlay} pointerEvents="none">
        {/* Blur base — frost */}
        <BlurView intensity={Math.round(GLASS.depth * 1.5)} tint="light" style={StyleSheet.absoluteFill} />

        {/* Onda 1 — azul marino animada */}
        <Animated.View
          style={[
            styles.wave,
            styles.wave1,
            { transform: [{ translateX: wave1TranslateX }], opacity: wave1Opacity },
          ]}
        >
          <LinearGradient
            colors={['rgba(15,30,80,0)', 'rgba(15,30,80,0.7)', 'rgba(15,30,80,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Onda 2 — blanca animada en dirección opuesta (dispersion) */}
        <Animated.View
          style={[
            styles.wave,
            styles.wave2,
            { transform: [{ translateX: wave2TranslateX }], opacity: wave2Opacity },
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Refracción diagonal -45° */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            `rgba(255,255,255,${GLASS.refraction * 0.08})`,
            `rgba(200,220,255,${GLASS.refraction * 0.06})`,
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Overlay frost */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,255,255,${GLASS.frost * 2})` }]} />
      </View>

      {/* BottomTabBar encima del overlay */}
      <BottomTabBar {...props} />
    </View>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    position: 'relative',
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    bottom: 0,
    borderRadius: 36,
    overflow: 'hidden',
    zIndex: 0,
  },
  wave: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.7,
  },
  wave1: {
    left: -SCREEN_WIDTH * 0.1,
  },
  wave2: {
    left: SCREEN_WIDTH * 0.2,
  },
})
