import React, { useEffect } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg'
import IconAutorizaciones from './ui/IconAutorizaciones'
import IconFarmacia from './ui/IconFarmacia'
import IconDelegaciones from './ui/IconDelegaciones'
import IconPlus from './ui/IconPlus'
import IconHistorial from './ui/IconHistorial'
import type { NavigationProp } from '@react-navigation/native'
import { useTheme } from '../theme'
import { ds } from '../theme/ds'
import { useHomeButtons, HomeButtonWithBadge } from '../hooks/useHomeButtons'

// ─── Constantes de diseño (fieles al Figma Botonera principal 408×325) ───────

const COLUMNS = 3
const COL_GAP = 8   // column-gap: 8px
const ROW_GAP = 16  // row-gap: 16px

/** Parte un array en chunks de `size` elementos */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

// ─── Mapa de íconos SVG custom por ID de botón ─────────────────────────────────

/** Tamaño del ícono SVG: ajustado al iconWrap de 44px */
const SVG_ICON_SIZE = 26
const CARD_ICON_SIZE = 26

const SVG_ICON_MAP: Record<string, (color: string) => React.ReactNode> = {
  autorizaciones:  (color) => <IconAutorizaciones size={SVG_ICON_SIZE} color={color} />,
  farmacias:       (color) => <IconFarmacia size={SVG_ICON_SIZE} color={color} />,
  delegaciones:    (color) => <IconDelegaciones size={SVG_ICON_SIZE} color={color} />,
  mas_acciones:    (color) => <IconPlus size={SVG_ICON_SIZE} color={color} />,
  tramites:        (color) => <IconAutorizaciones size={SVG_ICON_SIZE} color={color} />,
  historial_medico:(color) => <IconHistorial size={SVG_ICON_SIZE} color={color} />,
}

function renderBotoneraIcon(id: string, ionName: string, color: string, size: number) {
  const svgFactory = SVG_ICON_MAP[id]
  if (svgFactory) return svgFactory(color)
  return <Ionicons name={ionName as any} size={size} color={color} />
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BotoneraProps {
  /** Ancho total disponible. Si no se pasa usa el 100% vía flex. */
  totalWidth?: number
  /**
   * Incrementar este valor forza un re-fetch desde el backend (bypassa cache).
   * Conectar al pull-to-refresh del HomeScreen para reflejar cambios de parámetros
   * en tiempo real sin esperar el TTL de 5 minutos del cache local.
   */
  refreshTrigger?: number
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BotoneraSection({ totalWidth, refreshTrigger }: BotoneraProps) {
  const { colors } = useTheme()
  const { buttonsWithBadges, loading, refresh } = useHomeButtons()
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>()

  // Cuando el padre incrementa refreshTrigger (ej. pull-to-refresh), forzar
  // recarga desde backend ignorando el cache de AsyncStorage.
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refresh()
    }
  }, [refreshTrigger])

  const habilitados = buttonsWithBadges.filter((b) => b.habilitado)

  const handlePress = (btn: HomeButtonWithBadge) => {
    if (btn.id === 'autorizaciones') {
      navigation.navigate('Profile' as any, { screen: 'SolicitudAutorizacion' } as any)
      return
    }

    if (!btn.route) return
    navigation.navigate(btn.route as any, btn.routeParams as any)
  }

  return (
    <View style={styles.wrapper}>
      {loading && habilitados.length === 0 ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <View
          style={[
            styles.grid,
            totalWidth ? { width: totalWidth - ds.space.md * 2 } : undefined,
          ]}
        >
          {chunk(habilitados, COLUMNS).map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[styles.row, rowIndex > 0 && styles.rowGap]}
            >
              {row.map((btn) => (
                <BotoneraItem
                  key={btn.id}
                  btn={btn}
                  onPress={() => handlePress(btn)}
                  colors={colors}
                />
              ))}
              {/* Rellena celdas vacías para mantener el grid uniforme */}
              {Array.from({ length: COLUMNS - row.length }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.cardPlaceholder} />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Item individual ──────────────────────────────────────────────────────────

interface ItemProps {
  btn: HomeButtonWithBadge
  onPress: () => void
  colors: ReturnType<typeof useTheme>['colors']
}

const CARD_ICON_COLOR = '#FFFFFF'

function BotoneraItem({ btn, onPress, colors }: ItemProps) {
  const gradIdFill = `botonera_fill_${btn.id}`
  const gradIdStroke = `botonera_stroke_${btn.id}`

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.78}
    >
      {/* Fondo del tile fiel a Figma: radial fill + stroke degradado */}
      <View style={styles.cardBgWrap} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 128 108" preserveAspectRatio="none">
          <Defs>
            <RadialGradient
              id={gradIdFill}
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(72 47.5) rotate(139.787) scale(72.0226 86.4271)"
            >
              <Stop offset="0" stopColor="#5576B8" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#004B8D" />
            </RadialGradient>
            <LinearGradient
              id={gradIdStroke}
              x1="4"
              y1="-16.5"
              x2="117.5"
              y2="106.5"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0.467885" stopColor="#FFFFFF" />
              <Stop offset="0.556495" stopColor="#3773A8" />
              <Stop offset="0.67037" stopColor="#FFFFFF" />
            </LinearGradient>
          </Defs>

          <Rect
            x="4"
            y="2"
            width="120"
            height="100"
            rx="15"
            fill={`url(#${gradIdFill})`}
            fillOpacity="0.25"
          />
          <Rect
            x="4.5"
            y="2.5"
            width="119"
            height="99"
            rx="14.5"
            fill="none"
            stroke={`url(#${gradIdStroke})`}
            strokeOpacity="0.6"
          />
        </Svg>
      </View>

      {/* Ícono */}
      <View style={styles.iconWrap}>
        {renderBotoneraIcon(btn.id, btn.icon, CARD_ICON_COLOR, CARD_ICON_SIZE)}
      </View>

      {/* Label */}
      <Text
        style={[styles.label, { color: CARD_ICON_COLOR }]}
        numberOfLines={2}
      >
        {btn.label}
      </Text>

      {/* Badge (número sobre esquina superior derecha) */}
      {btn.badgeCount != null && btn.badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {btn.badgeCount > 99 ? '99+' : btn.badgeCount}
          </Text>
        </View>
      )}

      {/* Indicador "Extra" — solo el botón esAccionExtra lleva un "+" en el label */}
    </TouchableOpacity>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: ds.space.md,
    paddingBottom: ds.space.sm,
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: ds.space.lg,
  },
  grid: {
    // grid-template-columns: repeat(3, fit-content(100%)) → columnas apiladas en filas de 3
  },
  row: {
    flexDirection: 'row',
    columnGap: COL_GAP,   // column-gap: 8px
  },
  rowGap: {
    marginTop: ROW_GAP,   // row-gap: 16px
  },
  card: {
    // fit-content(100%) en cada columna: flex:1 distribuye el ancho equitativamente entre las 3 celdas
    flex: 1,
    aspectRatio: 128 / 108,
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingTop: 11,
    paddingBottom: 11,
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardBgWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  cardPlaceholder: {
    flex: 1,
  },
  iconWrap: {
    width: 42,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
    letterSpacing: 0.15,
    paddingHorizontal: 2,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
})
