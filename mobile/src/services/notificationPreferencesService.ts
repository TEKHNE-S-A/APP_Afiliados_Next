/**
 * Servicio de Preferencias de Notificación — Tarea 17
 *
 * Endpoints integrados:
 * - GET  /api/me/notification-preferences  → obtener todas las preferencias
 * - PUT  /api/me/notification-preferences  → actualizar una o más preferencias
 */

import { apiGet, apiPut } from './api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResult = any;

// ============================================================================
// TIPOS
// ============================================================================

export type NotifCategoria =
  | 'credencial'
  | 'autorizaciones'
  | 'noticias'
  | 'sistema';

export interface NotifPref {
  categoria: NotifCategoria;
  push: boolean;
  in_app: boolean;
  updated_at: string | null;
}

export interface NotifPrefsResponse {
  preferences: NotifPref[];
  timestamp: string;
}

export interface UpdateNotifPrefItem {
  categoria: NotifCategoria;
  push?: boolean;
  in_app?: boolean;
}

/** Metadatos de etiqueta para mostrar en pantalla */
export interface CategoriaInfo {
  categoria: NotifCategoria;
  label: string;
  description: string;
  icon: string;
}

export const CATEGORIAS_INFO: CategoriaInfo[] = [
  {
    categoria: 'credencial',
    label: 'Credencial',
    description: 'Vencimientos y actualizaciones de tu credencial digital',
    icon: 'card-outline',
  },
  {
    categoria: 'autorizaciones',
    label: 'Autorizaciones',
    description: 'Novedades sobre tus solicitudes de autorización',
    icon: 'checkmark-circle-outline',
  },
  {
    categoria: 'noticias',
    label: 'Novedades',
    description: 'Comunicados y novedades institucionales',
    icon: 'megaphone-outline',
  },
  {
    categoria: 'sistema',
    label: 'Seguridad',
    description: 'Alertas de acceso y cambios en tu cuenta',
    icon: 'shield-checkmark-outline',
  },
];

// ============================================================================
// FUNCIONES DEL SERVICIO
// ============================================================================

/**
 * Obtener todas las preferencias de notificación del usuario autenticado.
 */
export async function getNotificationPreferences(): Promise<NotifPref[]> {
  const data = await apiGet('/api/me/notification-preferences') as ApiResult;
  return (data as NotifPrefsResponse).preferences;
}

/**
 * Actualizar una o varias preferencias de notificación.
 *
 * @param preferences  Lista de { categoria, push?, in_app? } a actualizar.
 * @returns            Lista completa de preferencias actualizada.
 */
export async function updateNotificationPreferences(
  preferences: UpdateNotifPrefItem[]
): Promise<NotifPref[]> {
  const data = await apiPut('/api/me/notification-preferences', {
    preferences: preferences as unknown as Record<string, unknown>[],
  }) as ApiResult;
  return (data as NotifPrefsResponse).preferences;
}
