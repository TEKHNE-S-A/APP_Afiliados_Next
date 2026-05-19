/**
 * NotificationsContext - Singleton para notificaciones
 * Evita múltiples instancias del hook con sus propios intervals y cargas.
 * Todos los consumidores (HomeTabs, HomeScreen, NotificationsScreen) comparten
 * el mismo estado y un único polling interval.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import {
  getNotifications,
  getUnreadCount,
  type Notification,
  type NotificationFilters,
} from '../services/notificationService'

interface NotificationsContextValue {
  notifications: Notification[]
  loading: boolean
  refreshing: boolean
  error: string | null
  unreadCount: number
  fetchNotifications: (isRefreshing?: boolean, filters?: NotificationFilters) => Promise<void>
  fetchUnreadCount: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, token, requiresRelogin, isOfflineMode, loading: authLoading } = useAuth()

  // Sesión online válida: usuario autenticado, token real (no offline), sin recarga requerida
  const hasOnlineSession =
    !!user && !!token && !token.startsWith('offline_') && !authLoading && !requiresRelogin && !isOfflineMode

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const unreadFailureCountRef = useRef(0)
  const unreadNextAllowedAtRef = useRef(0)
  const unreadInFlightRef = useRef(false)

  // ── Fetch notificaciones ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(
    async (isRefreshing = false, filters?: NotificationFilters) => {
      if (!hasOnlineSession) {
        setNotifications([])
        setUnreadCount(0)
        return
      }
      try {
        if (isRefreshing) setRefreshing(true)
        else setLoading(true)
        setError(null)

        const response = await getNotifications(filters)
        setNotifications(response.notifications)
      } catch (err: any) {
        console.error('Error al cargar notificaciones:', err)
        if (err.message?.includes('401')) {
          setNotifications([])
          setUnreadCount(0)
        } else {
          setError(err.message || 'Error al cargar notificaciones')
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [hasOnlineSession]
  )

  // ── Fetch unread count ────────────────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!hasOnlineSession) {
      setUnreadCount(0)
      unreadFailureCountRef.current = 0
      unreadNextAllowedAtRef.current = 0
      unreadInFlightRef.current = false
      return
    }

    const now = Date.now()
    if (unreadInFlightRef.current) return
    if (now < unreadNextAllowedAtRef.current) return

    unreadInFlightRef.current = true
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
      unreadFailureCountRef.current = 0
      unreadNextAllowedAtRef.current = 0
    } catch (err: any) {
      if (err?.message?.includes('401')) {
        setUnreadCount(0)
        unreadFailureCountRef.current = 0
        unreadNextAllowedAtRef.current = 0
      } else {
        unreadFailureCountRef.current += 1
        const backoffMs = Math.min(120_000, 5_000 * Math.pow(2, unreadFailureCountRef.current - 1))
        unreadNextAllowedAtRef.current = Date.now() + backoffMs
        console.warn(`⚠️ unread-count falló. Reintento en ${Math.round(backoffMs / 1000)}s`)
      }
    } finally {
      unreadInFlightRef.current = false
    }
  }, [hasOnlineSession])

  // ── Carga inicial (una sola vez al obtener sesión válida) ─────────────────
  useEffect(() => {
    if (hasOnlineSession) {
      const timer = setTimeout(() => {
        console.log('🔔 Cargando notificaciones iniciales...')
        fetchNotifications()
        fetchUnreadCount()
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [hasOnlineSession, fetchNotifications, fetchUnreadCount])

  // ── Polling único cada 30 segundos ───────────────────────────────────────
  useEffect(() => {
    if (!hasOnlineSession) return

    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 30_000)

    return () => clearInterval(interval)
  }, [hasOnlineSession, fetchUnreadCount])

  return (
    <NotificationsContext.Provider
      value={{ notifications, loading, refreshing, error, unreadCount, fetchNotifications, fetchUnreadCount }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

/**
 * Hook de consumo — usa el contexto singleton.
 * Mantiene la misma API que el hook anterior; los componentes no necesitan cambios.
 */
export function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotificationsContext debe usarse dentro de <NotificationsProvider>')
  }
  return ctx
}
