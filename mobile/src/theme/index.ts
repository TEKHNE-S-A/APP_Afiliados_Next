export { LightColors, DarkColors } from './colors'
export type { ThemeColors } from './colors'
export { ThemeProvider, useTheme } from './ThemeContext'

// Design System Object (tokens agnósticos de color)
export { ds, textStyleWith } from './ds'
export type {
  SpacingKey,
  RadiusKey,
  FontSizeKey,
  FontWeightKey,
  TextStyleKey,
  ShadowKey,
  ZIndexKey,
  IconSizeKey,
} from './ds'

// Tokens primitivos (acceso individual si se necesita)
export {
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
} from './tokens'
