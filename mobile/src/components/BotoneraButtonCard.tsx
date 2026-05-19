/**
 * BotoneraButtonCard — DSO tile para la botonera principal
 *
 * Figma: rect 120×100, rx=15, fill=#004B8D fill-opacity=0.15
 * Layout: ícono centrado (zona superior) + label blanco (zona inferior)
 */

import React from 'react'
import { TouchableOpacity, Text, View, StyleSheet, ViewStyle } from 'react-native'
import { ds } from '../theme/ds'

// ─── Constantes Figma ────────────────────────────────────────────────────────

const CARD_BG      = 'rgba(0, 75, 141, 0.35)'   // #004B8D @ 35%
const CARD_RADIUS  = 15                           // Figma rx=15
const ASPECT_RATIO = 120 / 100                    // Figma 120×100

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface BotoneraButtonCardProps {
  /** Ícono que aparece en la zona superior centrada */
  icon: React.ReactNode
  /** Etiqueta del botón (máx. 2 líneas) */
  label: string
  /** Acción al presionar */
  onPress?: () => void
  /** Número en badge (esquina superior derecha). Oculto si 0 o undefined */
  badge?: number
  /** Estado deshabilitado */
  disabled?: boolean
  /** Estilos adicionales para el wrapper raíz */
  style?: ViewStyle
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function BotoneraButtonCard({
  icon,
  label,
  onPress,
  badge,
  disabled = false,
  style,
}: BotoneraButtonCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.cardDisabled, style]}
      onPress={onPress}
      activeOpacity={0.72}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {/* ── Zona ícono ── */}
      <View style={styles.iconArea}>
        {icon}
      </View>

      {/* ── Label ── */}
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>

      {/* ── Badge ── */}
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    // Geometría Figma: 120×100 px → conservar aspect ratio en el grid
    aspectRatio: ASPECT_RATIO,
    borderRadius: CARD_RADIUS,
    backgroundColor: CARD_BG,
    // Distribuye ícono y label en columna
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingTop: 14,
    paddingBottom: 10,
    // Sombra sutil
    ...ds.shadow.sm,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  iconArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
    letterSpacing: 0.2,
    marginTop: 6,
  },
  badge: {
    position: 'absolute',
    top: 7,
    right: 7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
})
