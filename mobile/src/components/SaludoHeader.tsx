/**
 * SaludoHeader — Saludo con ícono y nombre del usuario
 *
 * Fiel al diseño Figma: TEKHNE node-id 12237-3179 "Saludo"
 *
 * Specs Figma:
 *   - Tamaño total: 148 × 30 px
 *   - Layout: inline-flex, align-items center, gap 12px
 *   - Izquierda: círculo 26×26 (#D9E4F3 bg, ícono persona #2B76B9 12px)
 *     con badge de notificaciones (top-right, #EF4444)
 *   - Derecha: "¡Hola, {nombre}!" texto bold
 *
 * Tokens DSO utilizados:
 *   ds.radius.full      — círculo avatar
 *   ds.text.h6          — texto saludo bold
 */

import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ds } from '../theme/ds'

// ─── Constantes Figma ─────────────────────────────────────────────────────────

const AVATAR_SIZE     = 26
const ICON_SIZE       = 13
const BADGE_SIZE      = 16
const AVATAR_BG       = '#D9E4F3'
const AVATAR_ICON_CLR = '#2B76B9'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SaludoHeaderProps {
  /** Nombre del usuario a mostrar (solo primer nombre recomendado) */
  nombre: string
  /** Cantidad de notificaciones no leídas (0 = oculta badge) */
  unreadCount?: number
  /** Color del texto del saludo (default: #fff para headers oscuros) */
  textColor?: string
  /** Callback al presionar el ícono de avatar */
  onAvatarPress?: () => void
  /** Callback al presionar las notificaciones (si es que el badge es interactivo) */
  onNotificationsPress?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extrae solo el primer nombre de una cadena "APELLIDO, Nombre Segundo" o "Nombre Apellido" */
function getPrimerNombre(nombre: string): string {
  if (!nombre) return ''
  // Formato "APELLIDO, Nombre" → tomar la parte después de la coma
  if (nombre.includes(',')) {
    const partes = nombre.split(',')
    const nombreParte = partes[1]?.trim() ?? ''
    return nombreParte.split(' ')[0] ?? ''
  }
  // Formato normal "Nombre Apellido"
  return nombre.split(' ')[0] ?? nombre
}

/** Capitaliza la primera letra */
function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function SaludoHeader({
  nombre,
  unreadCount = 0,
  textColor = '#FFFFFF',
  onAvatarPress,
  onNotificationsPress,
}: SaludoHeaderProps) {
  const primerNombre = capitalize(getPrimerNombre(nombre))
  const badgeLabel = unreadCount > 99 ? '99+' : unreadCount > 9 ? `${unreadCount}` : `${unreadCount}`
  const showBadge = unreadCount > 0

  const avatar = (
    <View style={styles.avatarWrap}>
      {/* Círculo fondo claro */}
      <View style={styles.avatarCircle}>
        <Ionicons name="person" size={ICON_SIZE} color={AVATAR_ICON_CLR} />
      </View>

      {/* Badge notificaciones */}
      {showBadge && (
        <TouchableOpacity
          style={styles.badge}
          onPress={onNotificationsPress}
          activeOpacity={0.8}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : badgeLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onAvatarPress}
      activeOpacity={onAvatarPress ? 0.8 : 1}
    >
      {avatar}
      <Text style={[styles.saludo, { color: textColor }]} numberOfLines={1}>
        ¡Hola, {primerNombre}!
      </Text>
    </TouchableOpacity>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    position: 'relative',
  },

  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: AVATAR_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute',
    top: -5,
    right: -6,
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },

  saludo: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
})
