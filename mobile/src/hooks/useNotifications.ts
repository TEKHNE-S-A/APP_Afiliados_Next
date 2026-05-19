/**
 * useNotifications Hook - Semana 28
 * Wrapper liviano sobre NotificationsContext (singleton).
 * Mantiene la misma API pública para que los componentes no requieran cambios.
 * El estado, los fetches y el polling se gestionan UNA SOLA VEZ en el provider.
 */

export { useNotificationsContext as useNotifications } from '../contexts/NotificationsContext'
