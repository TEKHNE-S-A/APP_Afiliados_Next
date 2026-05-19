/**
 * Botonera principal — tipos de datos
 *
 * Los botones del home central se configuran desde backend (nusispar).
 * El frontend los cachea localmente con TTL y usa defaults offline.
 */

/**
 * Definición de un botón de la botonera central del home.
 * Persiste en nusispar como JSON bajo BOTONERA_PRINCIPAL.Botones.
 */
export interface HomeButton {
  /** Identificador único interno (ej: 'autorizaciones', 'farmacias') */
  id: string
  /** Texto que se muestra debajo del ícono */
  label: string
  /** Nombre del ícono de Ionicons (ej: 'document-text-outline') */
  icon: string
  /** Color hex del ícono (ej: '#F59E0B') */
  iconColor: string
  /** Color hex de fondo del círculo del ícono (ej: '#FFF5EB') */
  iconBg: string
  /** Nombre de la ruta de React Navigation a la que navega */
  route: string
  /** Parámetros opcionales para la ruta */
  routeParams?: Record<string, unknown>
  /** Orden de aparición en la grilla (1-based, de izquierda a derecha, arriba a abajo) */
  orden: number
  /**
   * Habilitado base (campo de datos). El backend aplica además el feature flag
   * de `featureFlagKey` antes de devolver la lista, por lo que el mobile
   * solo recibe botones que deben mostrarse.
   */
  habilitado: boolean
  /**
   * Clave del parámetro en FUNCIONES_APP que habilita/deshabilita este botón.
   * El backend lo evalúa en `GET /home/botonera` y excluye el botón si vale 'N'.
   * Si no se define, el botón está siempre visible (ej: "Más acciones").
   */
  featureFlagKey?: string
  /**
   * Si true, este es el botón "+ Más acciones".
   * No tiene featureFlagKey: siempre aparece.
   */
  esAccionExtra?: boolean
  /**
   * Clave del badge dinámico (ej: 'tramites_pendientes').
   * El hook resuelve el número real al combinar con el contexto de auth.
   */
  badgeKey?: HomeBadgeKey
}

/**
 * Claves predefinidas para badges dinámicos en botones del home.
 * Se resuelven en el hook useHomeButtons a partir del contexto.
 */
export type HomeBadgeKey =
  | 'tramites_pendientes'
  | 'notificaciones_sin_leer'
  | 'coseguros_pendientes'

/**
 * Respuesta del endpoint GET /home/botonera
 */
export interface HomeBotoneraResponse {
  botones: HomeButton[]
  /** ISO timestamp de cuándo se generó (para TTL en cliente) */
  generadoEn: string
  /** Versión del esquema, para invalidar cache ante cambios */
  version: number
}

/**
 * Botones por defecto cuando el backend no responde (modo offline).
 * Refleja la configuración base del diseño Figma.
 */
export const HOME_BUTTONS_DEFAULT: HomeButton[] = [
  {
    id: 'autorizaciones',
    label: 'Autorizaciones',
    icon: 'document-text-outline',
    iconColor: '#F59E0B',
    iconBg: '#FFF5EB',
    route: 'SolicitudAutorizacionRoot',
    orden: 1,
    habilitado: true,
    featureFlagKey: 'HabilitarAutorizaciones',
    badgeKey: 'tramites_pendientes',
  },
  {
    id: 'farmacias',
    label: 'Farmacias',
    icon: 'medkit-outline',
    iconColor: '#EF4444',
    iconBg: '#FFF0F0',
    route: 'Farmacias',
    orden: 2,
    habilitado: true,
    featureFlagKey: 'HabilitarFarmacias',
  },
  {
    id: 'tramites',
    label: 'Trámites',
    icon: 'layers-outline',
    iconColor: '#8B5CF6',
    iconBg: '#F5F3FF',
    route: 'Transactions',
    orden: 3,
    habilitado: true,
    featureFlagKey: 'HabilitarTramites',
  },
  {
    id: 'historial_medico',
    label: 'Historial médico',
    icon: 'pulse-outline',
    iconColor: '#059669',
    iconBg: '#ECFDF5',
    route: 'Profile',
    routeParams: { screen: 'HistorialAtencion', params: { from: 'Home' } },
    orden: 4,
    habilitado: true,
    featureFlagKey: 'HabilitarHistorialAtencion',
  },
  {
    id: 'delegaciones',
    label: 'Delegaciones',
    icon: 'business-outline',
    iconColor: '#6366F1',
    iconBg: '#EEF2FF',
    route: 'Delegaciones',
    orden: 5,
    habilitado: true,
    featureFlagKey: 'HabilitarDelegaciones',
  },
  {
    id: 'mas_acciones',
    label: 'Más acciones',
    icon: 'add-circle-outline',
    iconColor: '#64748B',
    iconBg: '#F1F5F9',
    route: 'InfoUtil',
    orden: 6,
    habilitado: true,
    esAccionExtra: true,
  },
]
