/**
 * BannerPrestadores — Banner de acceso a Cartilla Médica
 *
 * Fiel al diseño Figma: TEKHNE node-id 12156-3029 "Banner_prestadores"
 *
 * Specs Figma (SVG verificado):
 *   - Card: 344×100px, rx=16, bg #2F52AC (sólido, sin gradiente)
 *   - Shadow: dy=4, stdDeviation=2, opacity=0.25
 *   - Logo OSEP blanco: 79×20px, left=16, verticalmente centrado
 *   - Título (blanco, bold 15px): top del bloque de texto derecho
 *   - Subtítulo (blanco 80%, 11px): debajo del título
 *   - "Ver más" (blanco, 12px, subrayado): bottom-right del bloque texto
 *
 * Tokens DSO utilizados:
 *   ds.radius.lg           — border-radius 16
 *   ds.space.md            — padding horizontal 16
 *   componentSize.bannerPrestadores — altura fija 100
 */

import React from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { ds } from '../theme/ds'
import { componentSize } from '../theme/tokens'

// ─── Constantes ───────────────────────────────────────────────────────────────

const BANNER_BG   = '#2F52AC'   // Figma: background color
const TEXT_WHITE  = '#FFFFFF'
const TEXT_MUTED  = 'rgba(255,255,255,0.80)'

// ─── Props ───────────────────────────────────────────────────────────────────

export interface BannerPrestadoresProps {
  /** Título principal (default: "Cartilla Médica") */
  title?: string
  /** Subtítulo (default: "Encuentra prestadores cercanos a tu ubicación") */
  subtitle?: string
  /** Texto del link (default: "Ver más") */
  ctaLabel?: string
  /** Callback al presionar el banner completo */
  onPress?: () => void
  /** Callback al presionar el link "Ver más" (si no se provee, usa onPress) */
  onCtaPress?: () => void
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function BannerPrestadores({
  title    = 'Cartilla Médica',
  subtitle = 'Encontrá tu prestador de salud cerca tuyo',
  ctaLabel = 'Ver más',
  onPress,
  onCtaPress,
}: BannerPrestadoresProps) {
  const handleCta = onCtaPress ?? onPress

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.82 : 1}
      onPress={onPress}
      style={styles.wrapper}
    >
      <View style={styles.row}>
        {/* Logo OSEP blanco — verticalmente centrado */}
        <Image
          source={require('../../assets/branding/osep-logo-white.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Bloque de texto — title top, subtitle medio, "Ver más" bottom-right */}
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
          <TouchableOpacity
            style={styles.ctaWrapper}
            onPress={handleCta}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text style={styles.cta}>{ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: BANNER_BG,
    borderRadius: ds.radius.lg,
    // Altura fija Figma: card height=100px
    height: componentSize.bannerPrestadores,
    paddingHorizontal: ds.space.md,
    overflow: 'hidden',
    alignSelf: 'stretch',
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

  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  // Logo: 79×20px según SVG Figma, verticalmente centrado por alignItems:'center' del row
  logo: {
    width: 79,
    height: 20,
    flexShrink: 0,
  },

  // textBlock: stretch para ocupar altura del row, space-between distribuye title/subtitle/cta
  textBlock: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  title: {
    color: TEXT_WHITE,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  subtitle: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 15,
  },

  // "Ver más" bottom-right — alineado a la derecha del bloque
  ctaWrapper: {
    alignSelf: 'flex-end',
  },
  cta: {
    color: TEXT_WHITE,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
})
