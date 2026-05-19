/**
 * Design System Tokens
 *
 * Escala primitiva de valores de diseño.
 * Estos valores NO dependen del tema (claro/oscuro); son agnósticos de color.
 * Los colores viven en colors.ts / osepColors.ts.
 */

// ---------------------------------------------------------------------------
// SPACING — Escala 4pt
// ---------------------------------------------------------------------------
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const

export type SpacingKey = keyof typeof spacing

// Aliases semánticos
export const space = {
  /** 4px — separación mínima entre elementos inline */
  xs: spacing[1],
  /** 8px — gap entre ícono y label */
  sm: spacing[2],
  /** 12px — padding pequeño de card/chip */
  md: spacing[3],
  /** 16px — padding estándar de pantalla */
  lg: spacing[4],
  /** 24px — separación entre secciones */
  xl: spacing[6],
  /** 32px — margen de sección grande */
  '2xl': spacing[8],
  /** 48px — espaciado hero / header */
  '3xl': spacing[12],
} as const

// ---------------------------------------------------------------------------
// BORDER RADIUS
// ---------------------------------------------------------------------------
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  hero: 30,    // Figma: HomeHeroCard / HomeFondoGlass (rx=30)
  tabBar: 39,   // Figma: barra pill principal (rx=39)
  tabPill: 31,  // Figma: pill activo individual (rx=30.5)
  '3xl': 32,
  full: 9999,
} as const

export type RadiusKey = keyof typeof radius

// ---------------------------------------------------------------------------
// TYPOGRAPHY
// ---------------------------------------------------------------------------

/** Familias de fuentes Inter (cargadas con expo-font / @expo-google-fonts/inter) */
export const fontFamily = {
  sans:    'Inter_400Regular',
  medium:  'Inter_500Medium',
  semibold:'Inter_600SemiBold',
  bold:    'Inter_700Bold',
  mono:    'Courier New',
} as const

/** Tamaños de fuente — escala modular ~1.25 */
export const fontSize = {
  '2xs': 10,
  xs: 11,
  sm: 12,
  md: 14,
  base: 15,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
  '6xl': 40,
} as const

export type FontSizeKey = keyof typeof fontSize

/** Pesos de fuente */
export const fontWeight = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
}

export type FontWeightKey = keyof typeof fontWeight

/** Altura de línea (multiplicador sobre fontSize) */
export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.65,
  loose: 2,
} as const

/** Espaciado entre letras (em) */
export const letterSpacing = {
  tighter: -0.5,
  tight: -0.25,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const

/** Estilos de texto compostos — combina size + fontFamily Inter + lineHeight */
export const textStyle = {
  // Encabezados
  h1: { fontSize: fontSize['4xl'], fontFamily: 'Inter_700Bold',     lineHeight: 36 },
  h2: { fontSize: fontSize['3xl'], fontFamily: 'Inter_700Bold',     lineHeight: 32 },
  h3: { fontSize: fontSize['2xl'], fontFamily: 'Inter_600SemiBold', lineHeight: 28 },
  h4: { fontSize: fontSize.xl,     fontFamily: 'Inter_600SemiBold', lineHeight: 24 },
  h5: { fontSize: fontSize.lg,     fontFamily: 'Inter_600SemiBold', lineHeight: 22 },
  h6: { fontSize: fontSize.base,   fontFamily: 'Inter_600SemiBold', lineHeight: 20 },

  // Cuerpo
  bodyLg: { fontSize: fontSize.lg,   fontFamily: 'Inter_400Regular', lineHeight: 26 },
  body:   { fontSize: fontSize.base, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  bodySm: { fontSize: fontSize.md,   fontFamily: 'Inter_400Regular', lineHeight: 20 },

  // UI pequeña
  caption:  { fontSize: fontSize.sm,     fontFamily: 'Inter_400Regular', lineHeight: 16 },
  captionMd:{ fontSize: fontSize.md,     fontFamily: 'Inter_500Medium',  lineHeight: 18 },
  label:    { fontSize: fontSize.xs,     fontFamily: 'Inter_600SemiBold', lineHeight: 14, letterSpacing: letterSpacing.wide },
  overline: { fontSize: fontSize['2xs'], fontFamily: 'Inter_700Bold',     lineHeight: 12, letterSpacing: letterSpacing.widest },

  // Interactivos
  button:   { fontSize: fontSize.base, fontFamily: 'Inter_600SemiBold', lineHeight: 20 },
  buttonSm: { fontSize: fontSize.md,   fontFamily: 'Inter_600SemiBold', lineHeight: 18 },
  link:     { fontSize: fontSize.base, fontFamily: 'Inter_500Medium',   lineHeight: 22 },

  // Especiales
  badge:    { fontSize: fontSize.xs,  fontFamily: 'Inter_700Bold',    lineHeight: 14 },
  tabLabel: { fontSize: fontSize.sm,  fontFamily: 'Inter_500Medium',  lineHeight: 14 },
  code:     { fontSize: fontSize.md,  fontFamily: 'Inter_400Regular', lineHeight: 20 },
} as const

export type TextStyleKey = keyof typeof textStyle

// ---------------------------------------------------------------------------
// SHADOWS — para iOS (shadow*) y Android (elevation)
// ---------------------------------------------------------------------------
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 32,
    elevation: 16,
  },
} as const

export type ShadowKey = keyof typeof shadows

// ---------------------------------------------------------------------------
// Z-INDEX
// ---------------------------------------------------------------------------
export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
} as const

export type ZIndexKey = keyof typeof zIndex

// ---------------------------------------------------------------------------
// OPACITY
// ---------------------------------------------------------------------------
export const opacity = {
  0: 0,
  5: 0.05,
  10: 0.1,
  20: 0.2,
  25: 0.25,
  30: 0.3,
  40: 0.4,
  50: 0.5,
  60: 0.6,
  70: 0.7,
  75: 0.75,
  80: 0.8,
  90: 0.9,
  95: 0.95,
  100: 1,
} as const

// ---------------------------------------------------------------------------
// ANIMATION / DURATION
// ---------------------------------------------------------------------------
export const duration = {
  instant: 0,
  fast: 100,
  normal: 200,
  slow: 300,
  slower: 500,
  crawl: 800,
} as const

export const easing = {
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
} as const

// ---------------------------------------------------------------------------
// BREAKPOINTS (útiles para lógica responsive)
// ---------------------------------------------------------------------------
export const breakpoint = {
  sm: 360,
  md: 414,
  lg: 768,
  xl: 1024,
} as const

// ---------------------------------------------------------------------------
// ICON SIZES
// ---------------------------------------------------------------------------
export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const

export type IconSizeKey = keyof typeof iconSize

// ---------------------------------------------------------------------------
// FIGMA TAB BAR — colores estáticos (no dependen del tema claro/oscuro)
// Fuente: SVG Figma BottomTabBar 412×113 + BottomTabButton 396×62
// ---------------------------------------------------------------------------
export const figmaTabBarColors = {
  /** Relleno sólido del pill activo y del FAB central */
  pillFill:      '#2A529C',
  /** Stroke del FAB central */
  fabStroke:     '#91A9C8',
  /** Parada media del gradiente de contorno del pill activo */
  pillBorderMid: '#97A9D6',
  /** Ícono / etiqueta en tab activo */
  iconActive:    '#FFFFFF',
  /** Ícono / etiqueta en tab inactivo */
  iconInactive:  'rgba(255, 255, 255, 0.55)',
} as const

// ---------------------------------------------------------------------------
// COMPONENT SIZE PRESETS
// ---------------------------------------------------------------------------
/** Alturas estándar de controles táctiles */
export const componentSize = {
  inputSm:   36,
  input:     48,
  inputLg:   56,
  buttonSm:  32,
  button:    44,
  buttonLg:  52,
  tabBar:    56,
  /** Barra Abajo Figma: 78px de contenido (excluyendo safe-area) */
  tabBarFigma: 78,
  /** Altura total del componente incluyendo overflow del FAB (Figma 412×113) */
  tabBarFull: 113,
  /** Diámetro del FAB central elevado (Figma: w=h=68) */
  tabFab: 68,
  /** Ancho del pill activo individual (Figma: 75.75px ≈ 76) */
  tabPillW: 76,
  /** Altura del pill activo individual (Figma: 61px) */
  tabPillH: 61,
  /** Altura del botón de tab individual sin FAB (SVG 396×62) */
  tabButton: 62,
  header:    56,
  chip:      28,
  chipLg:    36,
  avatar:    40,
  avatarLg:  64,
  credencial: 280,  // altura fija de CredencialCard (apaisada)
  /** Credencial Reducida — Figma node 12156-3215 (H: Hug 107px) */
  credencialReducida: 107,
  /** Banner Prestadores — Figma node 12156-3029 (altura total con padding) */
  bannerPrestadores: 100,
  /** Banner Anuncios — Figma node 12143-338 (misma altura base que bannerPrestadores) */
  bannerAnuncios: 100,
} as const
