import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_KEY = 'info_util_cache_v1'
const CACHE_TIMESTAMP_KEY = 'info_util_last_sync'

export type InfoUtilItem = {
  id: string
  tipo: string
  titulo: string
  telefono?: string
  direccion?: string
  geo?: string
  link?: string
  imagenUrl?: string
  categoria?: string
  orden?: number
}

type CachedData = {
  items: InfoUtilItem[]
  lastSync: string
}

/**
 * Servicio para gestionar cache offline de Info útil
 * Implementa patrón cache-first para soporte offline robusto
 */
export const InfoUtilService = {
  /**
   * Guarda items en cache local
   */
  async saveToCache(items: InfoUtilItem[]): Promise<void> {
    try {
      const now = new Date().toISOString()
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(items))
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, now)
      console.log(`💾 Info útil guardada en cache: ${items.length} items`)
    } catch (error) {
      console.error('❌ Error guardando info útil en cache:', error)
    }
  },

  /**
   * Recupera items desde cache local
   */
  async getFromCache(): Promise<CachedData | null> {
    try {
      const itemsJson = await AsyncStorage.getItem(CACHE_KEY)
      const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY)
      
      if (!itemsJson) return null
      
      const items = JSON.parse(itemsJson) as InfoUtilItem[]
      console.log(`📂 Info útil recuperada de cache: ${items.length} items`)
      
      return {
        items,
        lastSync: timestamp || new Date().toISOString(),
      }
    } catch (error) {
      console.error('❌ Error recuperando info útil de cache:', error)
      return null
    }
  },

  /**
   * Limpia cache de info útil
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY)
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY)
      console.log('🗑️  Cache de info útil limpiada')
    } catch (error) {
      console.error('❌ Error limpiando cache de info útil:', error)
    }
  },

  /**
   * Obtiene timestamp de última sincronización
   */
  async getLastSyncTimestamp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY)
    } catch (error) {
      console.error('❌ Error obteniendo timestamp de sync:', error)
      return null
    }
  },
}
