/**
 * CredencialReducida — Tarjeta compacta de credencial
 *
 * Fiel al diseño Figma: TEKHNE node-id 12156-3215
 *
 * Specs Figma:
 *   - Tamaño interior: 343 × 75 px
 *   - Padding: 16 px en todos los lados
 *   - Border-radius: 16 px
 *   - Fondo light: linear-gradient(90deg, #E9E9E9 → #E3E3E3)
 *   - Fondo dark: linear-gradient(90deg, #1E2D3D → #1A2635)
 *   - Logo OSEP: 91 × 23 px, alineado arriba-derecha
 *   - Token badge: círculo azul #2B76B9 con texto blanco
 *   - Texto nombre: color #000 al 75% / blanco dark
 *   - Texto número afiliado: color #000 al 50% / blanco 60% dark
 *
 * Tokens DSO utilizados:
 *   ds.radius.lg           — border-radius 16
 *   ds.shadow.md           — sombra de tarjeta
 *   ds.space.md            — padding 16
 *   ds.text.h6             — nombre (semibold 15)
 *   ds.text.bodySm         — nº afiliado (regular 14)
 *   componentSize.credencialReducida — altura 75
 */

import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../theme'
import { ds } from '../theme/ds'
import { componentSize } from '../theme/tokens'
import type { Credencial } from '../types/credencial'

// ─── Constantes ───────────────────────────────────────────────────────────────

const OSEP_BLUE = '#2B76B9'
const CARD_HEIGHT = componentSize.credencialReducida   // 75
const TOKEN_CIRCLE = 36

// Gradientes Figma
const GRADIENT_LIGHT: [string, string] = ['#E9E9E9', '#E3E3E3']
const GRADIENT_DARK:  [string, string] = ['#1E2D3D', '#1A2635']

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CredencialReducidaProps {
  credencial: Credencial
  onPress?: () => void
  /** Mostrar el token temporal en el badge (default: true) */
  showToken?: boolean
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CredencialReducida({
  credencial,
  onPress,
  showToken = true,
}: CredencialReducidaProps) {
  const { isDark } = useTheme()

  // Countdown en tiempo real del token (misma lógica que CredencialCard)
  const [countdown, setCountdown] = useState('')
  const [tokenExpired, setTokenExpired] = useState(false)

  const token = credencial.tokenTemporal
  const venceEn = credencial.tokenTemporalVenceEn

  useEffect(() => {
    if (!showToken || !token || !venceEn) {
      setCountdown('')
      return
    }

    const tick = () => {
      const diff = new Date(venceEn).getTime() - Date.now()
      if (diff <= 0) {
        setTokenExpired(true)
        setCountdown('EXP')
        return
      }
      setTokenExpired(false)
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [token, venceEn, showToken])

  const gradient = isDark ? GRADIENT_DARK : GRADIENT_LIGHT
  const nameColor = isDark ? 'rgba(255,255,255,0.90)' : 'rgba(0,0,0,0.75)'
  const numColor  = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)'
  const badgeBg   = tokenExpired ? '#EF4444' : OSEP_BLUE

  const content = (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradient}
    >
      {/* Columna izquierda: nombre + número afiliado */}
      <View style={styles.left}>
        <Text
          numberOfLines={1}
          style={[styles.nombre, { color: nameColor }]}
        >
          {credencial.crcreapeno}
        </Text>
        <Text style={[styles.nroAfiliado, { color: numColor }]}>
          {credencial.crcrenroaf}
        </Text>
      </View>

      {/* Columna derecha: logo OSEP + badge token */}
      <View style={styles.right}>
        {/* Logo OSEP */}
        <Image
          source={require('../../assets/branding/osep-logo-white.png')}
          style={[styles.logo, { tintColor: isDark ? '#FFFFFF' : OSEP_BLUE }]}
          resizeMode="contain"
        />
      </View>
    </LinearGradient>
  )

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.82}
        style={styles.shadow}
      >
        {content}
      </TouchableOpacity>
    )
  }

  return <View style={styles.shadow}>{content}</View>
}

// ─── Sin credencial ───────────────────────────────────────────────────────────

export function CredencialReducidaEmpty() {
  const { isDark } = useTheme()
  const gradient = isDark ? GRADIENT_DARK : GRADIENT_LIGHT

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.gradient, styles.emptyContainer]}
    >
      <Text style={[styles.emptyText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
        Sin credencial disponible
      </Text>
    </LinearGradient>
  )
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shadow: {
    ...ds.shadow.md,
    borderRadius: ds.radius.lg,
  },
  gradient: {
    height: CARD_HEIGHT,
    borderRadius: ds.radius.lg,
    padding: ds.space.md,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },

  // Columna izquierda
  left: {
    flex: 1,
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  nombre: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  nroAfiliado: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.2,
  },

  // Columna derecha
  right: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  logo: {
    width: 91,
    height: 23,
  },
  tokenBadge: {
    width: TOKEN_CIRCLE,
    height: TOKEN_CIRCLE,
    borderRadius: TOKEN_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra para que el círculo sea bien visible sobre el fondo claro
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  tokenText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
})
