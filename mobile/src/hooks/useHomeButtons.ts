/**
 * Hook: useHomeButtons
 *
 * Obtiene la botonera principal del Home desde el backend (GET /home/botonera).
 * - Cachea en AsyncStorage con TTL de 5 minutos
 * - Usa defaults offline (HOME_BUTTONS_DEFAULT) si no hay conexión o falla el fetch
 * - Resuelve badges dinámicos a partir del contexto de autenticación
 *
 * Uso:
 *   const { buttons, loading } = useHomeButtons()
 */

import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiGet } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  HomeButton,
  HomeBotoneraResponse,
  HOME_BUTTONS_DEFAULT,
  HomeBadgeKey,
} from '../types/homeButton'

// ─── Constantes ──────────────────────────────────────────────────────────────

const CACHE_KEY = 'home_botonera_cache'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

interface CacheEntry {
  data: HomeBotoneraResponse
  timestamp: number
}

// ─── Tipos del hook ──────────────────────────────────────────────────────────

export interface UseHomeButtonsResult {
  /** Botones ordenados y habilitados, listos para renderizar */
  buttons: HomeButton[]
  /** Botones con badge resuelto (número real calculado del contexto) */
  buttonsWithBadges: HomeButtonWithBadge[]
  loading: boolean
  error: string | null
  /** Versión del esquema recibida del backend */
  version: number
  /** Forzar recarga desde backend */
  refresh: () => Promise<void>
}

/** HomeButton enriquecido con el valor numérico del badge ya resuelto */
export interface HomeButtonWithBadge extends HomeButton {
  badgeCount?: number
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHomeButtons(): UseHomeButtonsResult {
  const { token, isOfflineMode } = useAuth()

  const [buttons, setButtons] = useState<HomeButton[]>([])
  const [version, setVersion] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Carga desde cache local ──────────────────────────────────────────────
  const loadFromCache = useCallback(async (): Promise<HomeBotoneraResponse | null> => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const entry: CacheEntry = JSON.parse(raw)
      if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null
      return entry.data
    } catch {
      return null
    }
  }, [])

  // ── Guarda en cache local ────────────────────────────────────────────────
  const saveToCache = useCallback(async (data: HomeBotoneraResponse) => {
    try {
      const entry: CacheEntry = { data, timestamp: Date.now() }
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry))
    } catch {
      // No crítico
    }
  }, [])

  // ── Fetch desde backend ──────────────────────────────────────────────────
  const fetchFromBackend = useCallback(async (): Promise<HomeBotoneraResponse | null> => {
    try {
      // silent404: el servidor remoto puede no tener este endpoint aún (versión desactualizada)
      // En ese caso se usa HOME_BUTTONS_DEFAULT como fallback sin log noise
      const response = await apiGet('/home/botonera', { silent404: true })
      if (response?.data?.botones) {
        return response.data as HomeBotoneraResponse
      }
      // Respuesta directa sin wrapper .data
      if (Array.isArray((response as any)?.botones)) {
        return response as unknown as HomeBotoneraResponse
      }
      return null
    } catch {
      return null
    }
  }, [])

  // ── Carga principal ──────────────────────────────────────────────────────
  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      let data: HomeBotoneraResponse | null = null

      if (!forceRefresh) {
        data = await loadFromCache()
      }

      if (!data && !isOfflineMode) {
        data = await fetchFromBackend()
        if (data) {
          await saveToCache(data)
        }
      }

      if (data?.botones && data.botones.length > 0) {
        const ordered = data.botones
          .slice()
          .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99))
        setButtons(ordered)
        setVersion(data.version ?? 1)
      } else {
        // Fallback a defaults (offline o backend sin datos)
        setButtons(HOME_BUTTONS_DEFAULT)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('useHomeButtons: error al cargar botonera:', msg)
      setError(msg)
      setButtons(HOME_BUTTONS_DEFAULT)
    } finally {
      setLoading(false)
    }
  }, [isOfflineMode, loadFromCache, fetchFromBackend, saveToCache])

  useEffect(() => {
    load()
  }, [token, isOfflineMode])

  const refresh = useCallback(() => load(true), [load])

  // ── Resolución de badges dinámicos ───────────────────────────────────────
  const { tramitesPendientes, notificacionesSinLeer, cosegurosPendientes } =
    useBadgeCounts()

  const BADGE_RESOLVERS: Record<HomeBadgeKey, number | undefined> = {
    tramites_pendientes: tramitesPendientes,
    notificaciones_sin_leer: notificacionesSinLeer,
    coseguros_pendientes: cosegurosPendientes,
  }

  const buttonsWithBadges: HomeButtonWithBadge[] = buttons.map((btn) => ({
    ...btn,
    badgeCount:
      btn.badgeKey && BADGE_RESOLVERS[btn.badgeKey]
        ? BADGE_RESOLVERS[btn.badgeKey]
        : undefined,
  }))

  return { buttons, buttonsWithBadges, loading, error, version, refresh }
}

// ─── Helper: valores de badges desde el contexto ─────────────────────────────

/**
 * Extrae los contadores de badges del contexto de auth y notificaciones.
 * Centralizado aquí para no importar múltiples hooks en el componente de UI.
 */
function useBadgeCounts(): {
  tramitesPendientes?: number
  notificacionesSinLeer?: number
  cosegurosPendientes?: number
} {
  // Por ahora expone solo el estado disponible en el contexto.
  // Se puede ampliar con llamadas adicionales según crezca la app.
  return {
    tramitesPendientes: undefined,  // TODO: conectar cuando exista endpoint de trámites
    notificacionesSinLeer: undefined,
    cosegurosPendientes: undefined,
  }
}
