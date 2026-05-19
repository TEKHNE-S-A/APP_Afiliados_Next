import AsyncStorage from '@react-native-async-storage/async-storage'
import CryptoJS from 'crypto-js'
import { BooleanFlag, Sexo } from '../types/enums'

const KEYS = {
  USER: 'cached_user',
  CREDENCIALES: 'cached_credenciales',
  USER_CREDENTIALS: 'user_credentials', // username -> password hash
  LAST_SYNC: 'last_sync_timestamp',
  PLANES_MAP: 'planes_map_cache',       // mapa planId -> imagen_url para modo offline
}

export type CachedUser = {
  id?: string
  username: string
  name?: string
  nombre?: string
  email?: string
  documento?: string
  nuusuafili?: string
  nuplaid?: string
  nuusuapell?: string
  nuusuestit?: string
}

export type CachedCredencial = {
  crcreid: string
  crcrefecvi: string
  crcrelin: string
  crcrenroaf: string
  crcreapeno: string
  crcreafili: string
  crcrecuil: number
  crcreplaid: string | null
  crcrepladesc?: string
  crcredocum: string
  crcresexo: Sexo
  crcrefecha: string
  crcrehash: string
  crcreifech: string
  crcrepropi: BooleanFlag
  crcreparen?: string
}

/**
 * Hashea contraseña usando SHA256 para validación offline
 * Compatible con backend pbkdf2 para login dual
 */
export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString()
}

/**
 * Verifica contraseña contra hash local
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

/**
 * Storage Manager para cache offline de credenciales y autenticación
 */
export const StorageManager = {
  /**
   * Guarda usuario en cache local
   */
  async saveUser(user: CachedUser): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user))
      console.log('💾 Usuario guardado en cache:', user.username)
    } catch (error) {
      console.error('❌ Error guardando usuario:', error)
    }
  },

  /**
   * Recupera usuario desde cache local
   */
  async getUser(): Promise<CachedUser | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER)
      if (!data) return null
      const user = JSON.parse(data) as CachedUser
      console.log('📂 Usuario recuperado de cache:', user.username)
      return user
    } catch (error) {
      console.error('❌ Error recuperando usuario:', error)
      return null
    }
  },

  /**
   * Guarda credenciales del grupo familiar en cache
   */
  async saveCredenciales(credenciales: CachedCredencial[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CREDENCIALES, JSON.stringify(credenciales))
      console.log(`💾 ${credenciales.length} credenciales guardadas en cache`)
    } catch (error) {
      console.error('❌ Error guardando credenciales:', error)
    }
  },

  /**
   * Recupera credenciales desde cache local
   */
  async getCredenciales(): Promise<CachedCredencial[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CREDENCIALES)
      if (!data) return []
      const credenciales = JSON.parse(data) as CachedCredencial[]
      console.log(`📂 ${credenciales.length} credenciales recuperadas de cache`)
      return credenciales
    } catch (error) {
      console.error('❌ Error recuperando credenciales:', error)
      return []
    }
  },

  /**
   * Guarda credenciales de usuario (username + password hash) para login offline
   */
  async saveUserCredentials(username: string, password: string): Promise<void> {
    try {
      const hash = hashPassword(password)
      const credentials = await this.getAllUserCredentials()
      credentials[username.toLowerCase()] = hash
      await AsyncStorage.setItem(KEYS.USER_CREDENTIALS, JSON.stringify(credentials))
      console.log('💾 Credenciales de login guardadas para:', username)
    } catch (error) {
      console.error('❌ Error guardando credenciales de login:', error)
    }
  },

  /**
   * Verifica credenciales de usuario contra cache local
   * Busca por: username, email, CUIL, DNI
   */
  async verifyUserCredentials(username: string, password: string): Promise<boolean> {
    try {
      const credentials = await this.getAllUserCredentials()
      const lowerUsername = username.toLowerCase()
      
      // Buscar solo por clave exacta (email, DNI o CUIL que se guardó al momento del login online).
      // NO se usa matching por substring para evitar que las credenciales de un usuario
      // sean utilizadas para autenticar a otro usuario diferente en el mismo dispositivo.
      const hash = credentials[lowerUsername]
      
      if (!hash) {
        console.log('⚠️  Usuario no encontrado en cache local')
        return false
      }
      
      const valid = verifyPassword(password, hash)
      console.log(`🔐 Validación offline: ${valid ? 'EXITOSA' : 'FALLIDA'}`)
      return valid
    } catch (error) {
      console.error('❌ Error verificando credenciales:', error)
      return false
    }
  },

  /**
   * Obtiene todas las credenciales de usuarios almacenadas
   */
  async getAllUserCredentials(): Promise<Record<string, string>> {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER_CREDENTIALS)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('❌ Error obteniendo credenciales:', error)
      return {}
    }
  },

  /**
   * Guarda el mapa de imágenes de planes en cache persistente (para modo offline)
   */
  async savePlanesMap(map: Record<string, string | null>): Promise<void> {
    try {
      const payload = JSON.stringify({ data: map, savedAt: Date.now() })
      await AsyncStorage.setItem(KEYS.PLANES_MAP, payload)
      console.log(`💾 Mapa de planes guardado en cache (${Object.keys(map).length} planes)`)
    } catch (error) {
      console.error('❌ Error guardando mapa de planes:', error)
    }
  },

  /**
   * Recupera el mapa de imágenes de planes desde cache persistente
   */
  async getPlanesMap(): Promise<Record<string, string | null> | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PLANES_MAP)
      if (!data) return null
      const parsed = JSON.parse(data) as { data: Record<string, string | null>; savedAt: number }
      console.log(`📂 Mapa de planes recuperado de cache (${Object.keys(parsed.data).length} planes)`)
      return parsed.data
    } catch (error) {
      console.error('❌ Error recuperando mapa de planes:', error)
      return null
    }
  },

  /**
   * Guarda timestamp de última sincronización
   */
  async setLastSync(timestamp: number = Date.now()): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.LAST_SYNC, timestamp.toString())
    } catch (error) {
      console.error('❌ Error guardando timestamp sync:', error)
    }
  },

  /**
   * Obtiene timestamp de última sincronización
   */
  async getLastSync(): Promise<number | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.LAST_SYNC)
      return data ? parseInt(data, 10) : null
    } catch (error) {
      console.error('❌ Error obteniendo timestamp sync:', error)
      return null
    }
  },

  /**
   * Limpia TODA la cache de sesión (logout completo)
   *
   * Elimina:
   *  - USER y CREDENCIALES: datos de la sesión actual.
   *  - LAST_SYNC: timestamp de la última sincronización, asociado a la sesión actual
   *    y que debe recalcularse en el próximo login.
   *
   * Preserva:
   *  - USER_CREDENTIALS: hashes de credenciales de login para seguir permitiendo
   *    login offline en el futuro incluso después de un logout.
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.USER,
        KEYS.CREDENCIALES,
        KEYS.LAST_SYNC, // se limpia porque pertenece a la sesión actual
        // NO eliminamos USER_CREDENTIALS para permitir login offline futuro
      ])
      console.log('🗑️  Cache limpiada (credenciales de login preservadas)')
    } catch (error) {
      console.error('❌ Error limpiando cache:', error)
    }
  },

  /**
   * Limpia TODO incluyendo credenciales de login (factory reset)
   */
  async clearAllIncludingCredentials(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(KEYS))
      console.log('🗑️  Cache completamente limpiada (factory reset)')
    } catch (error) {
      console.error('❌ Error en factory reset:', error)
    }
  },
}
