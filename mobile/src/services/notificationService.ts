/**
 * Servicio de Notificaciones - Semana 28
 * 
 * Endpoints integrados:
 * - GET /notifications (con filtros: tipo, leida, fecha_desde, fecha_hasta, paginación)
 * - GET /notifications/unread-count
 * - PUT /notifications/:id/mark-read
 * - POST /notifications/mark-all-read
 */

import { apiGet, apiPost, apiPut } from './api';

// ============================================================================
// TIPOS
// ============================================================================

export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface Notification {
  id: string;
  tipo: NotificationType;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha_creacion: string; // ISO date
  fecha_leida: string | null; // ISO date
  metadata: Record<string, any> | null;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface MarkReadResponse {
  notification: Notification;
}

export interface MarkAllReadResponse {
  success: boolean;
  count: number;
  message: string;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  orderBy?: 'fecha_creacion' | 'leida' | 'tipo';
  orderDir?: 'asc' | 'desc';
  tipo?: NotificationType;
  leida?: boolean;
  fecha_desde?: string; // ISO date YYYY-MM-DD
  fecha_hasta?: string; // ISO date YYYY-MM-DD
}

function sanitizeNotificationText(value: unknown): string {
  if (typeof value !== 'string') return String(value ?? '')

  let text = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

  const suspiciousEncoding = /Ã.|Â.|â.|�/.test(text)
  if (suspiciousEncoding) {
    try {
      // Hermes soporta TextEncoder/TextDecoder; si falla, se mantiene original.
      const encoder = new TextEncoder()
      const bytes = encoder.encode(text)
      const candidate = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
      const noiseScore = (s: string) => (s.match(/�|Ã|Â|â/g) || []).length
      if (noiseScore(candidate) < noiseScore(text)) {
        text = candidate
      }
    } catch {
      // noop
    }
  }

  return text
    .replace(/autorizaci�n/gi, (m) => m[0] === 'A' ? 'Autorización' : 'autorización')
    .replace(/solicitud de autorizaci�n/gi, (m) => m[0] === 'S' ? 'Solicitud de autorización' : 'solicitud de autorización')
    .replace(/prestaci�n/gi, (m) => m[0] === 'P' ? 'Prestación' : 'prestación')
    .replace(/descripci�n/gi, (m) => m[0] === 'D' ? 'Descripción' : 'descripción')
    .replace(/n�mero/gi, (m) => m[0] === 'N' ? 'Número' : 'número')
    .replace(/d�a/gi, (m) => m[0] === 'D' ? 'Día' : 'día')
    .replace(/atendi�/gi, (m) => m[0] === 'A' ? 'Atendió' : 'atendió')
    .replace(/revisi�n/gi, (m) => m[0] === 'R' ? 'Revisión' : 'revisión')
    .replace(/aprobaci�n/gi, (m) => m[0] === 'A' ? 'Aprobación' : 'aprobación')
}

function sanitizeNotificationRecord(notification: Notification): Notification {
  return {
    ...notification,
    titulo: sanitizeNotificationText(notification.titulo),
    mensaje: sanitizeNotificationText(notification.mensaje),
  }
}

// ============================================================================
// FUNCIONES DEL SERVICIO
// ============================================================================

/**
 * Obtiene lista paginada de notificaciones con filtros opcionales
 */
export async function getNotifications(
  filters: NotificationFilters = {}
): Promise<NotificationsResponse> {
  try {
    const params = new URLSearchParams();
    
    // Paginación
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.orderBy) params.append('orderBy', filters.orderBy);
    if (filters.orderDir) params.append('orderDir', filters.orderDir);
    
    // Filtros Semana 27
    if (filters.tipo) params.append('tipo', filters.tipo);
    if (filters.leida !== undefined) params.append('leida', filters.leida.toString());
    if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/notifications?${queryString}` : '/notifications';
    
    const response = await apiGet(endpoint, { timeoutMs: 15000 }) as NotificationsResponse | Notification[];
    
    // Si el backend devuelve un array directo (backward compatibility)
    if (Array.isArray(response)) {
      if (__DEV__) {
        console.log('ℹ️ notifications: backend devolvió array directo, se normaliza estructura');
      }
      const notifications = response.map((n) => sanitizeNotificationRecord(n as Notification));
      return {
        notifications,
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 20,
          totalCount: notifications.length,
          totalPages: 1,
        },
      };
    }
    
    // Si devuelve la estructura correcta
    const typed = response as NotificationsResponse;
    return {
      ...typed,
      notifications: (typed.notifications || []).map(sanitizeNotificationRecord),
    };
  } catch (error) {
    console.error('❌ Error en getNotifications:', error);
    // Devolver respuesta vacía válida en caso de error
    return {
      notifications: [],
      pagination: {
        page: 1,
        limit: 20,
        totalCount: 0,
        totalPages: 1,
      },
    };
  }
}

/**
 * Obtiene el conteo de notificaciones no leídas
 */
export async function getUnreadCount(): Promise<number> {
  const response = await apiGet('/notifications/unread-count', { timeoutMs: 8000 }) as UnreadCountResponse;
  return response.unreadCount;
}

/**
 * Marca una notificación como leída
 */
export async function markAsRead(notificationId: string): Promise<Notification> {
  const response = await apiPut(`/notifications/${notificationId}/mark-read`) as MarkReadResponse;
  return response.notification;
}

/**
 * Marca TODAS las notificaciones del usuario como leídas
 */
export async function markAllAsRead(): Promise<MarkAllReadResponse> {
  return apiPost('/notifications/mark-all-read', {}) as Promise<MarkAllReadResponse>;
}

// ============================================================================
// HELPERS DE UI
// ============================================================================

/**
 * Obtiene el ícono correspondiente al tipo de notificación
 */
export function getNotificationIcon(tipo: NotificationType): string {
  switch (tipo) {
    case 'info':
      return 'information-circle';
    case 'warning':
      return 'warning';
    case 'success':
      return 'checkmark-circle';
    case 'error':
      return 'close-circle';
    default:
      return 'notifications';
  }
}

/**
 * Obtiene el color correspondiente al tipo de notificación
 */
export function getNotificationColor(tipo: NotificationType): string {
  switch (tipo) {
    case 'info':
      return '#3B82F6'; // blue-500
    case 'warning':
      return '#F59E0B'; // amber-500
    case 'success':
      return '#10B981'; // green-500
    case 'error':
      return '#EF4444'; // red-500
    default:
      return '#6B7280'; // gray-500
  }
}

/**
 * Formatea la fecha de creación de forma relativa (hace X minutos/horas/días)
 */
export function formatRelativeDate(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMinutes < 1) return 'Ahora mismo';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays < 7) return `Hace ${diffDays} días`;
  
  // Fecha absoluta si es muy antigua
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
