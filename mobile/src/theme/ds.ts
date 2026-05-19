/**
 * Design System Object — `ds`
 *
 * Punto de entrada único para todos los tokens de diseño.
 * Agrupa los primitivos de tokens.ts en un objeto tipado con forma de objeto estilo Tailwind/Figma.
 *
 * Uso en componentes:
 *   import { ds } from '../theme/ds'
 *   ds.spacing.lg       → 24
 *   ds.text.h2          → { fontSize: 24, fontWeight: '700', lineHeight: 32 }
 *   ds.shadow.md        → { shadowColor, ... elevation: 4 }
 *   ds.radius.xl        → 20
 *
 * Para colores dinámicos (claro/oscuro) usar useTheme():
 *   const { colors } = useTheme()
 */

import {
  spacing,
  space,
  radius,
  fontSize,
  fontWeight,
  fontFamily,
  lineHeight,
  letterSpacing,
  textStyle,
  shadows,
  zIndex,
  opacity,
  duration,
  easing,
  breakpoint,
  iconSize,
  componentSize,
  figmaTabBarColors,
} from './tokens'

import type {
  SpacingKey,
  RadiusKey,
  FontSizeKey,
  FontWeightKey,
  TextStyleKey,
  ShadowKey,
  ZIndexKey,
  IconSizeKey,
} from './tokens'

// ---------------------------------------------------------------------------
// Objeto principal
// ---------------------------------------------------------------------------
export const ds = {
  /** Escala numérica 4pt: ds.spacing[4] → 16 */
  spacing,

  /** Aliases semánticos: ds.space.lg → 24 */
  space,

  /** Border radius: ds.radius.md → 12 */
  radius,

  /** Tipografía */
  font: {
    family: fontFamily,
    size: fontSize,
    weight: fontWeight,
    lineHeight,
    letterSpacing,
  },

  /** Estilos de texto listos para usar: ds.text.h2 */
  text: textStyle,

  /** Sombras (iOS + Android): ds.shadow.lg */
  shadow: shadows,

  /** Z-index: ds.zIndex.modal → 400 */
  zIndex,

  /** Opacidades: ds.opacity[50] → 0.5 */
  opacity,

  /** Duraciones de animación (ms): ds.duration.normal → 200 */
  duration,

  /** Easings: ds.easing.easeOut */
  easing,

  /** Breakpoints (ancho en px): ds.breakpoint.lg → 768 */
  breakpoint,

  /** Tamaños de ícono: ds.iconSize.md → 20 */
  iconSize,

  /** Tamaños de componentes: ds.size.button → 44 */
  size: componentSize,

  /**
   * Colores estáticos de la barra inferior Figma (no varían con el tema).
   *
   * ds.figmaTabBar.pillFill      → '#2A529C'
   * ds.figmaTabBar.fabStroke     → '#91A9C8'
   * ds.figmaTabBar.iconActive    → '#FFFFFF'
   * ds.figmaTabBar.iconInactive  → 'rgba(255,255,255,0.55)'
   */
  figmaTabBar: figmaTabBarColors,
} as const

// ---------------------------------------------------------------------------
// Re-exports de tipos para consumo externo
// ---------------------------------------------------------------------------
export type {
  SpacingKey,
  RadiusKey,
  FontSizeKey,
  FontWeightKey,
  TextStyleKey,
  ShadowKey,
  ZIndexKey,
  IconSizeKey,
}

// ---------------------------------------------------------------------------
// Helper: crea un estilo inline de texto combinando color dinámico
// ---------------------------------------------------------------------------
/**
 * Devuelve un objeto de estilo de texto listo para StyleSheet.
 *
 * @example
 * const style = textStyleWith('h3', colors.textPrimary)
 * // → { fontSize: 24, fontWeight: '600', lineHeight: 28, color: '#1F2937' }
 */
export function textStyleWith(variant: TextStyleKey, color: string) {
  return {
    ...textStyle[variant],
    color,
  }
}

export default ds
