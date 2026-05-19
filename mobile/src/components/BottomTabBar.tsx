/**
 * BottomTabBar — Barra Abajo
 *
 * Implementación fiel al diseño Figma: TEKHNE node-id 12177-802
 * 5 tabs: Inicio · Buscar · Credencial (centro) · Avisos · Más
 *
 * Tokens DSO utilizados:
 *   colors.tabBarBackground  — fondo de la barra
 *   colors.tabActiveCircle   — círculo del tab activo
 *   colors.tabActive         — color de icono/texto activo
 *   colors.tabInactive       — color de icono/texto inactivo
 *   colors.tabBadge          — fondo del badge
 *   colors.border            — borde superior
 *   ds.shadow.lg             — sombra de la barra
 *   ds.radius.full           — radius del círculo activo
 *   ds.text.tabLabel         — estilo de texto de etiquetas
 *   componentSize.tabBarFigma — 78px de altura base
 */

import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import IconHome from './ui/IconHome'
import IconBuscar from './ui/IconBuscar'
import IconAvisos from './ui/IconAvisos'
import IconMas from './ui/IconMas'
import IconCredencial from './ui/IconCredencial'
import CenterTabButton from './CenterTabButton'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../theme'
import { ds } from '../theme/ds'
import { componentSize } from '../theme/tokens'

// ─── Configuración de cada tab ─────────────────────────────────────────────

const TAB_HEIGHT = componentSize.tabBarFigma // 78px

/** Tamaño del círculo activo para tabs normales */
const CIRCLE_SIZE = 44

/** Tamaño del círculo activo para el tab central (Credencial) */
const CENTER_CIRCLE_SIZE = 52

interface TabConfig {
  icon: string
  iconFocused: string
  label: string
  /** true → tab central con tratamiento especial (elevación + círculo más grande) */
  center?: boolean
}

const TAB_CONFIG: Record<string, TabConfig> = {
  Home:           { icon: 'home-outline',          iconFocused: 'home',          label: 'Inicio' },
  Buscar:         { icon: 'search-outline',         iconFocused: 'search',        label: 'Buscar' },
  CredencialTab:  { icon: 'card-outline',           iconFocused: 'card',          label: 'Credencial', center: true },
  Notifications:  { icon: 'notifications-outline',  iconFocused: 'notifications', label: 'Avisos' },
  Profile:        { icon: 'menu-outline',           iconFocused: 'menu',          label: 'Más' },
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 10,
        },
        ds.shadow.lg,
      ]}
    >
      {/* ── Fondo glass confinado a un View hijo con overflow:hidden ── */}
      <View style={[StyleSheet.absoluteFill, styles.blurContainer]}>
        <BlurView
          intensity={28}
          tint="systemMaterial"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        {/* Overlay líquido — base semitransparente */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(15,30,80,0.18)' },
          ]}
        />
        
        {/* Refracción diagonal — efecto liquid glass */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.24)',
            'rgba(255,255,255,0.08)',
            'rgba(255,255,255,0.00)',
          ]}
          start={{ x: 0.0, y: 0.0 }}
          end={{ x: 1.0, y: 1.0 }}
          style={styles.liquidRefraction}
        />
      </View>
      
      {/* Línea de brillo superior — efecto glass premium */}
      <View style={styles.glassTopLine} />

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]
        const isFocused = state.index === index
        const config = TAB_CONFIG[route.name]
        if (!config) return null

        const isCenter = config.center === true
        const circleSize = isCenter ? CENTER_CIRCLE_SIZE : CIRCLE_SIZE
        const iconSize = isCenter ? 26 : 22

        const iconColor = isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.55)'
        const labelColor = isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.55)'

        // Badge — sólo para tabs que declaren tabBarBadge
        const badge = options.tabBarBadge
        const badgeNum = badge !== undefined && badge !== null ? Number(badge) : 0

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true } as never)
          }
        }

        // Tab central CredencialTab → botón grande elevado
        if (isCenter) {
          return (
            <CenterTabButton
              key={route.key}
              onPress={onPress}
              isFocused={isFocused}
              label={config.label}
            />
          )
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? config.label}
            onPress={onPress}
            activeOpacity={0.75}
            style={[styles.tab, isCenter && styles.centerTab, isFocused && styles.tabActive]}
          >
            {/* ── Ícono ─────────────────────────────────────────────── */}
            <View style={styles.iconWrap}>
              {route.name === 'Home' ? (
                <IconHome size={iconSize} color={iconColor} strokeWidth={2} />
              ) : route.name === 'Buscar' ? (
                <IconBuscar size={iconSize} color={iconColor} strokeWidth={2} />
              ) : route.name === 'Notifications' ? (
                <IconAvisos size={iconSize} color={iconColor} strokeWidth={2} />
              ) : route.name === 'Profile' ? (
                <IconMas size={iconSize} color={iconColor} strokeWidth={2} />
              ) : route.name === 'CredencialTab' ? (
                <IconCredencial size={iconSize} color={iconColor} strokeWidth={2} />
              ) : (
                <Ionicons
                  name={isFocused ? config.iconFocused : config.icon}
                  size={iconSize}
                  color={iconColor}
                />
              )}

              {/* Badge de notificación */}
              {badgeNum > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.tabBadge }]}>
                  <Text style={styles.badgeText}>
                    {badgeNum > 99 ? '99+' : badgeNum}
                  </Text>
                </View>
              )}
            </View>

            {/* Etiqueta */}
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: labelColor,
                  fontWeight: isFocused ? '600' : '400',
                },
              ]}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    height: TAB_HEIGHT,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,   // (78 - 62) / 2 = 8 → botón 62px
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.20)',
    overflow: 'visible',
    ...Platform.select({
      android: { elevation: 12 },
    }),
  },
  /** Contenedor del blur — overflow:hidden + mismo borderRadius para clip redondeado */
  blurContainer: {
    overflow: 'hidden',
    borderRadius: 36,
  },
  /** Refracción diagonal — efecto liquid glass con gradiente */
  liquidRefraction: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ rotate: '45deg' }, { scale: 1.25 }],
  },
  /** Línea de brillo en el borde superior — efecto glass */
  glassTopLine: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 1,
    borderRadius: 36,
  },
  tab: {
    flex: 1,
    height: 62,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 3,
    borderRadius: 28,
    backgroundColor: 'transparent',
  },
  /** Tab activo: fondo pill rgba(255,255,255,0.10) — Figma */
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  /** El tab central sin elevación — Figma no muestra diferencia de altura */
  centerTab: {},
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 13,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
})


