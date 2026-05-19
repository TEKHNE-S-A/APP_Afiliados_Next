/**
 * Paletas de colores: Light y Dark
 * 
 * Todos los colores de la app se definen aquí.
 * Para agregar un color, añadirlo a ThemeColors y a ambas paletas.
 */

export interface ThemeColors {
  // Fondos
  background: string
  surface: string
  surfaceVariant: string
  surfaceHighlight: string

  // Texto
  textPrimary: string
  textSecondary: string
  textMuted: string
  textOnPrimary: string
  textOnPrimaryMuted: string

  // Marca / Acento
  primary: string
  primaryDark: string
  accent: string
  accentDark: string

  // Estado
  success: string
  error: string
  errorDark: string
  warning: string
  warningDark: string
  info: string

  // Bordes
  border: string
  borderLight: string
  borderError: string

  // Sombras y overlays
  shadow: string
  overlay: string

  // Especiales
  gold: string
  offline: string

  // Navegación
  tabActive: string
  tabInactive: string
  tabBadge: string
  tabBarBackground: string
  /** Color del círculo del tab activo (Figma: Barra Abajo) */
  tabActiveCircle: string
  headerBackground: string

  // Iconos de menú (se mantienen iguales en ambos temas)
  menuOrange: string
  menuIndigo: string
  menuGreen: string
  menuTeal: string
  menuBlue: string
  menuAmber: string
  menuPurple: string
  menuRed: string

  // Cards / componentes
  card: string
  cardBorder: string
  inputBackground: string
  inputBorder: string
  inputText: string
  inputPlaceholder: string
  disabledBackground: string
  disabledText: string
  separator: string
  
  // Botones
  buttonPrimary: string
  buttonPrimaryText: string
  buttonSecondary: string
  buttonSecondaryText: string
  buttonSecondaryBorder: string
  buttonDanger: string
  buttonDangerText: string

  // Modal
  modalBackground: string
  modalOverlay: string

  // StatusBar
  statusBarStyle: 'light' | 'dark'
}

export const LightColors: ThemeColors = {
  // Fondos
  background: '#1F43A2',   // Figma node 12229-2357: background del Home
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  surfaceHighlight: '#EFF6FF',

  // Texto
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  textOnPrimaryMuted: '#DBEAFE',

  // Marca / Acento
  primary: '#2196F3',
  primaryDark: '#1976D2',
  accent: '#667EEA',
  accentDark: '#4C51BF',

  // Estado
  success: '#10B981',
  error: '#EF4444',
  errorDark: '#DC2626',
  warning: '#F59E0B',
  warningDark: '#D97706',
  info: '#3B82F6',

  // Bordes
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderError: '#FCA5A5',

  // Sombras
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Especiales
  gold: '#F59E0B',
  offline: '#F97316',

  // Navegación
  tabActive: '#007AFF',
  tabInactive: '#9CA3AF',
  tabBadge: '#EF4444',
  tabBarBackground: '#FFFFFF',
  tabActiveCircle: '#007AFF',
  headerBackground: '#1F43A2',

  // Iconos de menú
  menuOrange: '#FF5722',
  menuIndigo: '#3F51B5',
  menuGreen: '#4CAF50',
  menuTeal: '#009688',
  menuBlue: '#2196F3',
  menuAmber: '#FF9800',
  menuPurple: '#9C27B0',
  menuRed: '#FF3B30',

  // Cards
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  inputBackground: '#FFFFFF',
  inputBorder: '#DDDDDD',
  inputText: '#333333',
  inputPlaceholder: '#999999',
  disabledBackground: '#F3F4F6',
  disabledText: '#9CA3AF',
  separator: '#E0E0E0',

  // Botones
  buttonPrimary: '#2196F3',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#FFFFFF',
  buttonSecondaryText: '#667EEA',
  buttonSecondaryBorder: '#667EEA',
  buttonDanger: '#FF3B30',
  buttonDangerText: '#FFFFFF',

  // Modal
  modalBackground: '#F5F5F5',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',

  // StatusBar
  statusBarStyle: 'light',
}

export const DarkColors: ThemeColors = {
  // Fondos
  background: '#111827',
  surface: '#1F2937',
  surfaceVariant: '#374151',
  surfaceHighlight: '#1E3A5F',

  // Texto
  textPrimary: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  textOnPrimaryMuted: '#BFDBFE',

  // Marca / Acento
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  accent: '#818CF8',
  accentDark: '#667EEA',

  // Estado
  success: '#34D399',
  error: '#F87171',
  errorDark: '#EF4444',
  warning: '#FBBF24',
  warningDark: '#F59E0B',
  info: '#60A5FA',

  // Bordes
  border: '#374151',
  borderLight: '#4B5563',
  borderError: '#F87171',

  // Sombras
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Especiales
  gold: '#FBBF24',
  offline: '#FB923C',

  // Navegación
  tabActive: '#60A5FA',
  tabInactive: '#6B7280',
  tabBadge: '#F87171',
  tabBarBackground: '#0F172A',
  tabActiveCircle: '#3B82F6',
  headerBackground: '#1F2937',

  // Iconos de menú (más brillantes en dark)
  menuOrange: '#FF7043',
  menuIndigo: '#7986CB',
  menuGreen: '#66BB6A',
  menuTeal: '#26A69A',
  menuBlue: '#42A5F5',
  menuAmber: '#FFA726',
  menuPurple: '#AB47BC',
  menuRed: '#FF6B6B',

  // Cards
  card: '#1F2937',
  cardBorder: '#374151',
  inputBackground: '#374151',
  inputBorder: '#4B5563',
  inputText: '#F9FAFB',
  inputPlaceholder: '#6B7280',
  disabledBackground: '#374151',
  disabledText: '#6B7280',
  separator: '#374151',

  // Botones
  buttonPrimary: '#3B82F6',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#1F2937',
  buttonSecondaryText: '#818CF8',
  buttonSecondaryBorder: '#818CF8',
  buttonDanger: '#EF4444',
  buttonDangerText: '#FFFFFF',

  // Modal
  modalBackground: '#1F2937',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',

  // StatusBar
  statusBarStyle: 'dark',
}
