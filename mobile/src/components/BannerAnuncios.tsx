import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageSourcePropType,
  Platform,
  ViewStyle,
} from 'react-native'
import { ds } from '../theme/ds'
import { componentSize } from '../theme/tokens'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface BannerAnunciosProps {
  /** Texto principal del anuncio */
  titulo: string
  /** Texto secundario / subtítulo opcional */
  subtitulo?: string | null
  /** Label del CTA (default: "Ver más") */
  ctaLabel?: string
  /** Callback al presionar el banner */
  onPress?: () => void
  /** Imagen local (require) — se usa si no hay imageUri */
  imageSource?: ImageSourcePropType
  /** URL de imagen remota proveniente del backend */
  imageUri?: string | null
  /** Número en el badge de notificación (omitir para ocultar el badge) */
  badgeCount?: number
  /** Estilos adicionales para el contenedor */
  style?: ViewStyle
}

// ---------------------------------------------------------------------------
// DiagonalStripes — patrón de rayas diagonales como overlay
// ---------------------------------------------------------------------------
function DiagonalStripes() {
  const STRIPE_WIDTH = 10
  const GAP = 14
  const COUNT = 20

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: COUNT }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stripe,
            { left: i * (STRIPE_WIDTH + GAP) - 40 },
          ]}
        />
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// BannerAnuncios
// ---------------------------------------------------------------------------
export function BannerAnuncios({
  titulo,
  subtitulo,
  ctaLabel = 'Ver más',
  onPress,
  imageSource,
  imageUri,
  badgeCount,
  style,
}: BannerAnunciosProps) {
  // Resolver la fuente de imagen: URI remota tiene prioridad sobre asset local
  const resolvedImage = imageUri
    ? { uri: imageUri }
    : imageSource ?? null

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.shadowContainer, style]}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${ctaLabel}`}
    >
      <View style={styles.clipContainer}>
        {/* Fondo con rayas diagonales */}
        <DiagonalStripes />

        {/* Contenido horizontal */}
        <View style={styles.content}>
          {/* Burbuja blanca con texto */}
          <View style={styles.bubble}>
            <Text style={styles.titulo} numberOfLines={3}>
              {titulo}
            </Text>
            {subtitulo ? (
              <Text style={styles.subtitulo} numberOfLines={1}>
                {subtitulo}
              </Text>
            ) : null}
            <Text style={styles.cta}>{ctaLabel}</Text>
          </View>

          {/* Imagen decorativa derecha */}
          {resolvedImage ? (
            <Image
              source={resolvedImage}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder} />
          )}
        </View>

        {/* Badge de notificación */}
        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : String(badgeCount)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const BG_COLOR = '#454B60'
const STRIPE_COLOR = 'rgba(255, 255, 255, 0.08)'
const BADGE_COLOR = '#3D5AFE'

const styles = StyleSheet.create({
  shadowContainer: {
    alignSelf: 'stretch',
    height: componentSize.bannerAnuncios,
    borderRadius: ds.radius.lg,
    // Shadow Figma: dy=4, stdDeviation=2, opacity=0.25
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  clipContainer: {
    flex: 1,
    backgroundColor: BG_COLOR,
    borderRadius: ds.radius.lg,
    overflow: 'hidden',
  },

  // ── Rayas diagonales ────────────────────────────────────────────────────
  stripe: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 10,
    backgroundColor: STRIPE_COLOR,
    transform: [{ rotate: '20deg' }],
  },

  // ── Contenido ────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',      // Figma: burbuja e imagen spanning full height
    gap: 0,
  },

  // ── Burbuja texto ─────────────────────────────────────────────────────
  bubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    // Forma Figma: esquinas izq r=15, derecha semicírculo r=50 (= bannerAnuncios 100 / 2)
    borderTopLeftRadius: ds.radius.lg,
    borderBottomLeftRadius: ds.radius.lg,
    borderTopRightRadius: 50,
    borderBottomRightRadius: 50,
    overflow: 'hidden',
    paddingHorizontal: ds.space.md,  // 12px
    paddingVertical: ds.space.sm,    // 8px
    justifyContent: 'center',        // centrar texto verticalmente
    gap: ds.space.xs,                // 4px
    zIndex: 1,                       // queda por encima de la imagen en el overlap
  },

  titulo: {
    ...ds.text.bodySm,
    fontWeight: ds.font.weight.semibold,
    color: '#1F2937',
  },

  subtitulo: {
    ...ds.text.caption,
    color: '#6B7280',
  },

  cta: {
    ...ds.text.captionMd,        // fontSize 14, fontWeight '500', lineHeight 18
    color: '#3D5AFE',
  },

  // ── Imagen ────────────────────────────────────────────────────────────
  image: {
    width: 128,                        // Figma: panel imagen ≈ 128px (377-249)
    height: componentSize.bannerAnuncios, // 100px full height
    marginLeft: -50,                   // Figma overlap: imagen empieza detrás del semicírculo
    zIndex: 0,
    // Solo esquinas derechas — igual que outer container
    borderTopRightRadius: ds.radius.lg,
    borderBottomRightRadius: ds.radius.lg,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },

  imagePlaceholder: {
    width: 128,
    height: componentSize.bannerAnuncios,
    marginLeft: -50,
    zIndex: 0,
  },

  // ── Badge ─────────────────────────────────────────────────────────────
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    borderRadius: ds.radius.full,
    backgroundColor: BADGE_COLOR,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    ...ds.text.badge,            // fontSize 11, fontWeight '700', lineHeight 14
    color: '#FFFFFF',
  },
})
