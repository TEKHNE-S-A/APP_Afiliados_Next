/**
 * Paleta de colores para el cliente OSEP.
 *
 * TODO: Reemplazar los valores con los colores oficiales de la marca OSEP
 *       una vez que el área de diseño entregue el brand kit.
 *
 * Paleta actual: PLACEHOLDER — verde/teal institucional genérico.
 */

import type { ThemeColors } from './colors'

// ---------------------------------------------------------------------------
// OSEP Light (modo claro)
// ---------------------------------------------------------------------------
export const OsepLightColors: ThemeColors = {
  // Fondos
  background: '#F4F9F6',
  surface: '#FFFFFF',
  surfaceVariant: '#EAF4EE',
  surfaceHighlight: '#E0F2E9',

  // Texto
  textPrimary: '#1B2E26',
  textSecondary: '#4A7060',
  textMuted: '#8AABA0',
  textOnPrimary: '#FFFFFF',
  textOnPrimaryMuted: '#C8E6DA',

  // Marca / Acento — TODO: reemplazar con hex oficial OSEP
  primary: '#1B7A50',      // verde OSEP (placeholder)
  primaryDark: '#145C3C',
  accent: '#0D9B6A',
  accentDark: '#0A7A54',

  // Estado
  success: '#22C55E',
  error: '#EF4444',
  errorDark: '#DC2626',
  warning: '#F59E0B',
  warningDark: '#D97706',
  info: '#3B82F6',

  // Bordes
  border: '#C8E0D6',
  borderLight: '#E0F0E8',
  borderError: '#FCA5A5',

  // Sombras y overlays
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Especiales
  gold: '#F59E0B',
  offline: '#F97316',

  // Navegación
  tabActive: '#1B7A50',
  tabInactive: '#8AABA0',
  tabBadge: '#EF4444',
  tabBarBackground: '#FFFFFF',
  tabActiveCircle: '#1B7A50',
  headerBackground: '#145C3C',

  // Iconos de menú
  menuOrange: '#FF5722',
  menuIndigo: '#3F51B5',
  menuGreen: '#1B7A50',
  menuTeal: '#009688',
  menuBlue: '#2196F3',
  menuAmber: '#FF9800',
  menuPurple: '#9C27B0',
  menuRed: '#FF3B30',

  // Cards / componentes
  card: '#FFFFFF',
  cardBorder: '#C8E0D6',
  inputBackground: '#FFFFFF',
  inputBorder: '#B0D4C4',
  inputText: '#1B2E26',
  inputPlaceholder: '#8AABA0',
  disabledBackground: '#EAF4EE',
  disabledText: '#8AABA0',
  separator: '#D4EAE0',

  // Botones
  buttonPrimary: '#1B7A50',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#FFFFFF',
  buttonSecondaryText: '#1B7A50',
  buttonSecondaryBorder: '#1B7A50',
  buttonDanger: '#EF4444',
  buttonDangerText: '#FFFFFF',

  // Modal
  modalBackground: '#F4F9F6',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',

  // StatusBar
  statusBarStyle: 'light',
}

// ---------------------------------------------------------------------------
// OSEP Dark (modo oscuro)
// ---------------------------------------------------------------------------
export const OsepDarkColors: ThemeColors = {
  // Fondos
  background: '#0D1F17',
  surface: '#162B1E',
  surfaceVariant: '#1F3D2C',
  surfaceHighlight: '#1A3425',

  // Texto
  textPrimary: '#E8F5EE',
  textSecondary: '#90C4A8',
  textMuted: '#5A8A72',
  textOnPrimary: '#FFFFFF',
  textOnPrimaryMuted: '#A8D4BC',

  // Marca / Acento
  primary: '#2ECC7A',
  primaryDark: '#25A862',
  accent: '#3DE08A',
  accentDark: '#2ECC7A',

  // Estado
  success: '#4ADE80',
  error: '#F87171',
  errorDark: '#EF4444',
  warning: '#FBBF24',
  warningDark: '#F59E0B',
  info: '#60A5FA',

  // Bordes
  border: '#2D5540',
  borderLight: '#3A6B50',
  borderError: '#F87171',

  // Sombras y overlays
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Especiales
  gold: '#FBBF24',
  offline: '#FB923C',

  // Navegación
  tabActive: '#2ECC7A',
  tabInactive: '#5A8A72',
  tabBadge: '#F87171',
  tabBarBackground: '#0A1811',
  tabActiveCircle: '#2ECC7A',
  headerBackground: '#0D1F17',

  // Iconos de menú
  menuOrange: '#FF7043',
  menuIndigo: '#7986CB',
  menuGreen: '#2ECC7A',
  menuTeal: '#26A69A',
  menuBlue: '#42A5F5',
  menuAmber: '#FFB300',
  menuPurple: '#CE93D8',
  menuRed: '#EF5350',

  // Cards / componentes
  card: '#1F3D2C',
  cardBorder: '#2D5540',
  inputBackground: '#162B1E',
  inputBorder: '#2D5540',
  inputText: '#E8F5EE',
  inputPlaceholder: '#5A8A72',
  disabledBackground: '#1F3D2C',
  disabledText: '#5A8A72',
  separator: '#2D5540',

  // Botones
  buttonPrimary: '#2ECC7A',
  buttonPrimaryText: '#0D1F17',
  buttonSecondary: '#162B1E',
  buttonSecondaryText: '#2ECC7A',
  buttonSecondaryBorder: '#2ECC7A',
  buttonDanger: '#EF4444',
  buttonDangerText: '#FFFFFF',

  // Modal
  modalBackground: '#0D1F17',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',

  // StatusBar
  statusBarStyle: 'light',
}
