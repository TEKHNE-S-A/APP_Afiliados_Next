/**
 * CenterTabButton — Botón grande central de la barra inferior
 *
 * Figma: SVG 71×100 — círculo elevado con fondo #2A529C, borde #91A9C8
 * Se posiciona sobresaliendo por encima de la barra.
 */

import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import IconCredencial from './ui/IconCredencial'

interface Props {
  onPress: () => void
  isFocused: boolean
  label?: string
}

const BUTTON_SIZE = 64
const BORDER_WIDTH = 3

export default function CenterTabButton({ onPress, isFocused, label = 'Credencial' }: Props) {
  const labelColor = isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.55)'

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.wrapper}
    >
      {/* Círculo elevado */}
      <View style={styles.circle}>
        <IconCredencial size={28} color="#FFFFFF" strokeWidth={2} />
      </View>

      {/* Etiqueta debajo */}
      <Text numberOfLines={1} style={[styles.label, { color: labelColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    overflow: 'visible',
    zIndex: 10,
  },

  circle: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#2A529C',
    borderWidth: BORDER_WIDTH,
    borderColor: '#91A9C8',
    alignItems: 'center',
    justifyContent: 'center',
    // Elevación / sombra
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    // Sube el círculo por encima de la barra
    marginBottom: 4,
    marginTop: -(BUTTON_SIZE / 2 + BORDER_WIDTH + 8),
  },

  label: {
    fontSize: 10,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
})
