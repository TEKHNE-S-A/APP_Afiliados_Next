/**
 * Hook: useFeatureFlags
 * 
 * Acceso a feature flags en la app mobile
 * - Obtiene flags del backend en login
 * - Los cachea localmente con TTL
 * - Proporciona funciones para verificar estado
 * 
 * Uso:
 * const { isEnabled, isModuleEnabled, flags, loading } = useFeatureFlags()
 * 
 * if (isEnabled('HabilitarNotificaciones')) {
 *   // mostrar notificaciones
 * }
 */

import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiGet } from '../services/api'

// Caché local con TTL de 5 minutos
const CACHE_TTL_MS = 5 * 60 * 1000

interface FeatureFlag {
  nombre: string
  habilitado: boolean
  descripcion: string
  modulo: string
  impacto: string
}

interface FeatureFlagsContextData {
  flags: FeatureFlag[]
  loading: boolean
  error: string | null
  isEnabled: (nombreFlag: string) => boolean
  isModuleEnabled: (modulo: string) => boolean
  getAllModules: () => string[]
  getModuleFlags: (modulo: string) => FeatureFlag[]
  refresh: () => Promise<void>
  lastUpdated: Date | null
}

const DEFAULT_STATE: FeatureFlagsContextData = {
  flags: [],
  loading: false,
  error: null,
  isEnabled: () => false,
  isModuleEnabled: () => false,
  getAllModules: () => [],
  getModuleFlags: () => [],
  refresh: async () => {},
  lastUpdated: null,
}

export function useFeatureFlags(): FeatureFlagsContextData {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Cargar flags desde almacenamiento local
  const loadFromCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem('featureFlags')
      if (!cached) return null

      const parsed = JSON.parse(cached)
      const { data, timestamp } = parsed

      // Verificar si cache expiró
      if (Date.now() - timestamp > CACHE_TTL_MS) {
        return null
      }

      console.log('✅ Feature flags cargados del cache local')
      setFlags(data)
      setLastUpdated(new Date(timestamp))
      return data
    } catch (err) {
      console.warn('⚠️  Error al cargar feature flags del cache:', err)
      return null
    }
  }, [])

  // Obtener flags desde backend
  const fetchFromBackend = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiGet('/feature-flags')
      const { flags: remotelags } = response

      setFlags(remotelags || [])
      setLastUpdated(new Date())

      // Guardar en cache
      await AsyncStorage.setItem(
        'featureFlags',
        JSON.stringify({
          data: remotelags || [],
          timestamp: Date.now(),
        })
      )

      console.log(`📦 Feature flags actualizados: ${remotelags?.length || 0} flags`)
      return remotelags || []
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('❌ Error al obtener feature flags:', errorMsg)
      setError(errorMsg)

      // Fallback a caché si existe
      const cached = await loadFromCache()
      if (!cached) {
        // Si no hay caché, usar defaults (todos deshabilitados)
        setFlags([])
      }

      return []
    } finally {
      setLoading(false)
    }
  }, [loadFromCache])

  // Cargar flags al montar el hook
  useEffect(() => {
    const init = async () => {
      // Primero intentar cache local
      const cached = await loadFromCache()
      // Si no hay caché, ir al backend
      if (!cached) {
        await fetchFromBackend()
      }
    }

    init()
  }, [loadFromCache, fetchFromBackend])

  // Verificador de flag individual
  const isEnabled = useCallback((nombreFlag: string): boolean => {
    const flag = flags.find((f) => f.nombre === nombreFlag)
    return flag?.habilitado ?? false
  }, [flags])

  // Verificador de módulo (al menos un flag habilitado)
  const isModuleEnabled = useCallback((modulo: string): boolean => {
    return flags.some((f) => f.modulo === modulo && f.habilitado)
  }, [flags])

  // Obtener lista de módulos únicos
  const getAllModules = useCallback((): string[] => {
    const modulos = new Set(flags.map((f) => f.modulo))
    return Array.from(modulos).sort()
  }, [flags])

  // Obtener flags de un módulo
  const getModuleFlags = useCallback(
    (modulo: string): FeatureFlag[] => {
      return flags.filter((f) => f.modulo === modulo)
    },
    [flags]
  )

  // Refrescar flags manualmente
  const refresh = useCallback(async () => {
    await fetchFromBackend()
  }, [fetchFromBackend])

  return {
    flags,
    loading,
    error,
    isEnabled,
    isModuleEnabled,
    getAllModules,
    getModuleFlags,
    refresh,
    lastUpdated,
  }
}

/**
 * Hook alternativo: useFeatureFlag
 * Para un flag específico (más eficiente si solo usas uno)
 */
export function useFeatureFlag(nombreFlag: string): boolean {
  const { isEnabled } = useFeatureFlags()
  return isEnabled(nombreFlag)
}

/**
 * Hook alternativo: useModuleFeatures
 * Para todos los flags de un módulo
 */
export function useModuleFeatures(modulo: string): FeatureFlag[] {
  const { getModuleFlags } = useFeatureFlags()
  return getModuleFlags(modulo)
}
