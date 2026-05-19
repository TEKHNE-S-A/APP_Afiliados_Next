/**
 * OsepSplashScreen — Splash/Launch screen animada para OSEP.
 *
 * Diseño: gradiente 180° #274FBA → #454D87, logo centrado con animación fade+scale.
 * Se muestra en App.tsx mientras carga la sesión (reemplaza AnimatedLaunchScreen).
 */
import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const { width, height } = Dimensions.get('window')

// Puntos del gradiente según el diseño Figma:
// linear-gradient(180deg, #274FBA 21.56%, #454D87 74.22%)
// Expo LinearGradient usa locations [0, 1], mapeamos los stops:
//   stop 1 en 21.56% → location 0.2156
//   stop 2 en 74.22% → location 0.7422
const GRADIENT_COLORS: readonly [string, string] = ['#274FBA', '#454D87']
const GRADIENT_LOCATIONS: [number, number] = [0.2156, 0.7422]

export default function OsepSplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.88)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      locations={GRADIENT_LOCATIONS}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Animated.Image
        source={require('../../../assets/branding/osep-logo.png')}
        style={[
          styles.logo,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
        resizeMode="contain"
      />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 100,
  },
})
