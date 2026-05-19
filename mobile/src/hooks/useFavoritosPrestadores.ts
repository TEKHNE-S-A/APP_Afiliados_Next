import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiPost, apiGet, apiDelete, isNetworkError } from '../services/api'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface Favorito {
  nufavid: number
  nuusuid: string
  caentid: string
  tipo: 'favorito' | 'reciente'
  nufeccrea: string
  nufecult?: string
  nombre?: string
  direccion?: string
}

export interface UseFavoritosState {
  favoritos: Favorito[]
  recientes: Favorito[]
  loading: boolean
  error: string | null
  isFavorito: (caentid: string) => boolean
  toggleFavorito: (caentid: string) => Promise<boolean>
  addReciente: (caentid: string) => Promise<void>
  getFavoritosPrincipal: () => Favorito[]
  getRecientesPrincipal: () => Favorito[]
  refresh: () => Promise<void>
  limpiarRecientes: () => Promise<void>
  isOffline: boolean
}

const CACHE_KEYS = {
  FAVORITOS: 'favoritos_cache',
  RECIENTES: 'recientes_cache',
  LAST_SYNC: 'favoritos_last_sync'
}

/**
 * Hook para gestionar favoritos y recientes de prestadores
 * 
 * Funcionalidades:
 * - Guardar/remover favoritos
 * - Registrar accesos recientes
 * - Cache local en AsyncStorage
 * - Sincronización automática
 * - Fallback offline
 */
export function useFavoritosPrestadores(): UseFavoritosState {
  const { user } = useAuth()
  const [favoritos, setFavoritos] = useState<Favorito[]>([])
  const [recientes, setRecientes] = useState<Favorito[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const cacheRef = useRef({ favoritos: [] as Favorito[], recientes: [] as Favorito[] })
  const userId = typeof user?.nuusuid === 'string'
    ? user.nuusuid
    : typeof user?.id === 'string'
      ? user.id
      : typeof user?.username === 'string'
        ? user.username
        : typeof user?.email === 'string'
          ? user.email
          : null

  /**
   * Cargar favoritos y recientes del servidor
   */
  const fetchFavoritosDesdeServidor = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const [favResult, recResult] = await Promise.all([
        apiGet('/api/me/favoritos?limit=50'),
        apiGet('/api/me/recientes?limit=20')
      ])

      const nuevosFavoritos = favResult?.favoritos || []
      const nuevosRecientes = recResult?.recientes || []

      setFavoritos(nuevosFavoritos)
      setRecientes(nuevosRecientes)

      // Guardar en cache
      await Promise.all([
        AsyncStorage.setItem(
          `${CACHE_KEYS.FAVORITOS}_${userId}`,
          JSON.stringify(nuevosFavoritos)
        ),
        AsyncStorage.setItem(
          `${CACHE_KEYS.RECIENTES}_${userId}`,
          JSON.stringify(nuevosRecientes)
        ),
        AsyncStorage.setItem(
          `${CACHE_KEYS.LAST_SYNC}_${userId}`,
          new Date().toISOString()
        )
      ])

      cacheRef.current = { favoritos: nuevosFavoritos, recientes: nuevosRecientes }
      console.log(`✅ Favoritos sincronizados: ${nuevosFavoritos.length} favoritos, ${nuevosRecientes.length} recientes`)
    } catch (err) {
      console.error('❌ Error sincronizando favoritos:', err)
      if (!isNetworkError(err)) {
        setError('Error al cargar favoritos')
      }
      setIsOffline(true)
    } finally {
      setLoading(false)
    }
  }, [userId])

  /**
   * Cargar favoritos del cache local
   */
  const loadFromCache = useCallback(async () => {
    if (!userId) return

    try {
      const [favString, recString] = await Promise.all([
        AsyncStorage.getItem(`${CACHE_KEYS.FAVORITOS}_${userId}`),
        AsyncStorage.getItem(`${CACHE_KEYS.RECIENTES}_${userId}`)
      ])

      const cachedFavs = favString ? JSON.parse(favString) : []
      const cachedRecs = recString ? JSON.parse(recString) : []

      setFavoritos(cachedFavs)
      setRecientes(cachedRecs)
      cacheRef.current = { favoritos: cachedFavs, recientes: cachedRecs }

      console.log(`📂 Cache cargado: ${cachedFavs.length} favoritos, ${cachedRecs.length} recientes`)
    } catch (err) {
      console.error('Error cargando cache:', err)
    }
  }, [userId])

  /**
   * Agregar a favoritos
   */
  const toggleFavorito = useCallback(
    async (caentid: string): Promise<boolean> => {
      if (!userId) {
        setError('No autenticado')
        return false
      }

      const esActualmenteFavorito = favoritos.some((f) => f.caentid === caentid)

      try {
        setError(null)

        if (esActualmenteFavorito) {
          // Remover
          await apiDelete(`/api/me/favoritos/${caentid}`)
          const nuevosFavoritos = favoritos.filter((f) => f.caentid !== caentid)
          setFavoritos(nuevosFavoritos)
          cacheRef.current.favoritos = nuevosFavoritos
          await AsyncStorage.setItem(
            `${CACHE_KEYS.FAVORITOS}_${userId}`,
            JSON.stringify(nuevosFavoritos)
          )
          console.log(`❌ Removido de favoritos: ${caentid}`)
          return false
        } else {
          // Agregar
          await apiPost('/api/me/favoritos', { caentid })
          const nuevoFavorito: Favorito = {
            nufavid: 0,
            nuusuid: userId,
            caentid,
            tipo: 'favorito',
            nufeccrea: new Date().toISOString()
          }
          const nuevosFavoritos = [...favoritos, nuevoFavorito]
          setFavoritos(nuevosFavoritos)
          cacheRef.current.favoritos = nuevosFavoritos
          await AsyncStorage.setItem(
            `${CACHE_KEYS.FAVORITOS}_${userId}`,
            JSON.stringify(nuevosFavoritos)
          )
          console.log(`⭐ Agregado a favoritos: ${caentid}`)
          return true
        }
      } catch (err) {
        console.error('Error toggling favorito:', err)
        setError('Error al modificar favorito')
        return esActualmenteFavorito
      }
    },
    [userId, favoritos]
  )

  /**
   * Registrar un acceso a un prestador (agregar a recientes)
   */
  const addReciente = useCallback(
    async (caentid: string) => {
      if (!userId) {
        console.log('No autenticado para agregar reciente')
        return
      }

      try {
        // Intenta enviar al servidor, pero no falles si no hay conexión
        apiPost('/api/me/recientes', { caentid }).catch((err) => {
          if (isNetworkError(err)) {
            console.log('📱 Offline: agregando reciente al cache')
          } else {
            console.error('Error agregando reciente:', err)
          }
        })

        // Siempre agregar al cache local
        const nuevoReciente: Favorito = {
          nufavid: 0,
          nuusuid: userId,
          caentid,
          tipo: 'reciente',
          nufeccrea: new Date().toISOString()
        }

        // Actualizar recientes: mover el más reciente al inicio, limitar a 10
        let nuevosRecientes = [
          nuevoReciente,
          ...recientes.filter((r) => r.caentid !== caentid)
        ].slice(0, 10)

        setRecientes(nuevosRecientes)
        cacheRef.current.recientes = nuevosRecientes

        await AsyncStorage.setItem(
          `${CACHE_KEYS.RECIENTES}_${userId}`,
          JSON.stringify(nuevosRecientes)
        )

        console.log(`📍 Reciente registrado: ${caentid}`)
      } catch (err) {
        console.error('Error en addReciente:', err)
      }
    },
    [userId, recientes]
  )

  /**
   * Obtener favoritos principales (para home)
   */
  const getFavoritosPrincipal = useCallback(() => {
    return favoritos.slice(0, 5)
  }, [favoritos])

  /**
   * Obtener recientes principales (para home)
   */
  const getRecientesPrincipal = useCallback(() => {
    return recientes.slice(0, 5)
  }, [recientes])

  /**
   * Verificar si un prestador es favorito
   */
  const isFavorito = useCallback(
    (caentid: string): boolean => {
      return favoritos.some((f) => f.caentid === caentid && f.tipo === 'favorito')
    },
    [favoritos]
  )

  /**
   * Refrescar desde servidor
   */
  const refresh = useCallback(async () => {
    await fetchFavoritosDesdeServidor()
  }, [fetchFavoritosDesdeServidor])

  /**
   * Limpiar toda la lista de recientes
   */
  const limpiarRecientes = useCallback(async () => {
    if (!userId) return

    try {
      await apiDelete('/api/me/recientes')
      setRecientes([])
      cacheRef.current.recientes = []
      await AsyncStorage.setItem(`${CACHE_KEYS.RECIENTES}_${userId}`, JSON.stringify([]))
      console.log('🧹 Recientes limpiados')
    } catch (err) {
      console.error('Error limpiando recientes:', err)
      if (!isNetworkError(err)) {
        setError('Error al limpiar recientes')
      }
    }
  }, [userId])

  /**
   * Inicializer: cargar datos al montar
   */
  useEffect(() => {
    if (!userId) {
      setFavoritos([])
      setRecientes([])
      return
    }

    // Primero cargar cache local
    loadFromCache()

    // Luego intentar sincronizar desde servidor
    fetchFavoritosDesdeServidor()
  }, [userId, loadFromCache, fetchFavoritosDesdeServidor])

  return {
    favoritos,
    recientes,
    loading,
    error,
    isFavorito,
    toggleFavorito,
    addReciente,
    getFavoritosPrincipal,
    getRecientesPrincipal,
    refresh,
    limpiarRecientes,
    isOffline
  }
}
