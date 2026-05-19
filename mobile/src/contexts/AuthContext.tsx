import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiPost, apiGet, setAuthToken, isNetworkError } from '../services/api'
import { StorageManager } from '../services/storageManager'
import { attachTokensToCredenciales, setTimeoutMinutes } from '../services/tokenService'
import { API_BASE_URL } from '../config'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { registerPushToken } from '../hooks/usePushNotifications'
import { BooleanFlag, Sexo } from '../types/enums'

type User = {
  username?: string
  email?: string
  cuil?: string
  [k: string]: unknown
}

type Credencial = {
  tokenTemporalVenceEn: any
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
}

type SyncStats = {
  total: number
  inserted: number
  updated: number
  unchanged: number
}

type AuthContextData = {
  user: User | null
  token: string | null
  credenciales: Credencial[]
  syncStats: SyncStats | null
  loading: boolean
  isOfflineMode: boolean
  requiresRelogin: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshCredenciales: () => Promise<void>
  syncCredenciales: () => Promise<unknown>
}

const AuthContext = createContext<AuthContextData | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [credenciales, setCredenciales] = useState<Credencial[]>([])
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [requiresRelogin, setRequiresRelogin] = useState(false)
  const { isConnected } = useNetworkStatus()

  const isOfflineSessionToken = (t: string | null) => !!t && t.startsWith('offline_')

  const didInitialLoadRef = useRef(false)
  const autoSyncInFlightRef = useRef(false)
  const lastAutoSyncAttemptAtRef = useRef<number>(0)
  const syncCredencialesInFlightRef = useRef<Promise<unknown> | null>(null)

  const isCredencialVigente = (crcrefecvi: unknown): boolean => {
    if (!crcrefecvi) return false
    const s = String(crcrefecvi).slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const todayStr = new Date().toISOString().slice(0, 10)
      return s >= todayStr
    }
    const d = new Date(String(crcrefecvi))
    if (isNaN(d.getTime())) return false
    return d.getTime() >= Date.now()
  }

  const hasAnyCredencialVigente = (creds: Array<{ crcrefecvi?: unknown }> | null | undefined) =>
    (creds || []).some((c) => isCredencialVigente(c?.crcrefecvi))

  const hasNonEmptyCredenciales = (value: unknown): value is Credencial[] =>
    Array.isArray(value) && value.length > 0

  const clearAuthTokenKeepCache = async () => {
    await AsyncStorage.removeItem('auth_token')
    await AsyncStorage.removeItem('refresh_token')
    setToken(null)
    setAuthToken(null)
  }

  const isTimeoutLikeError = (e: unknown): boolean => {
    const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as any).message).toLowerCase() : String(e || '').toLowerCase()
    return msg.includes('tiempo límite') || msg.includes('timeout') || msg.includes('excedió el tiempo')
  }

  const canTryOnlineWhileNetInfoOffline = (): boolean => {
    if (!__DEV__) return false
    try {
      const host = new URL(API_BASE_URL).hostname
      return host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2' || host === '10.0.3.2'
    } catch {
      return false
    }
  }

  const loadOnlineProfile = async () => {
    // Si el token es offline_* (generado localmente), NO intentar endpoints online.
    if (isOfflineSessionToken(token)) {
      throw new Error('OFFLINE_TOKEN')
    }

    // 1) Preferir validación GAM si el token es GAM
    try {
      const gamUserInfo = await apiGet('/gam/userinfo')
      if (gamUserInfo && typeof gamUserInfo === 'object') {
        const email = (gamUserInfo as any).Email || (gamUserInfo as any).email
        const name = (gamUserInfo as any).Name || (gamUserInfo as any).name
        const username = email || name || (user?.username ?? '')

        const userObj: User = {
          ...(gamUserInfo as any),
          username,
          email,
        }
        setUser(userObj)
        await StorageManager.saveUser(userObj)
        setRequiresRelogin(false)
        return { ok: true as const }
      }
    } catch (e: unknown) {
      const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as any).message) : ''
      if (!msg.includes('401')) {
        // Si es un error distinto, no bloquear el fallback legacy
        console.log('⚠️  Error en /gam/userinfo (no-401), intentando /auth/me...')
      }
    }

    // 2) Fallback legacy
    const profile = await apiGet('/auth/me')
    setUser(profile)
    await StorageManager.saveUser(profile)
    setRequiresRelogin(false)
    return { ok: true as const }
  }

  useEffect(() => {
    if (didInitialLoadRef.current) return
    didInitialLoadRef.current = true

    const load = async () => {
      try {
        const renewTokenInline = async (): Promise<boolean> => {
          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token')
            if (!refreshToken) return false
            if (!isConnected) return false

            console.log('🔄 Renovando token automáticamente con refresh_token...')
            const res = await apiPost('/auth/refresh-token', { refresh_token: refreshToken })
            if (!res || !res.token) return false

            await AsyncStorage.setItem('auth_token', res.token)
            setToken(res.token)
            setAuthToken(res.token)

            if (res.refresh_token) {
              await AsyncStorage.setItem('refresh_token', res.refresh_token)
            }

            console.log('✅ Token renovado automáticamente')
            return true
          } catch (err) {
            console.log('⚠️  No se pudo renovar token automáticamente')
            return false
          }
        }

        // 1) Verificar flag de cierre de sesión explícito
        const signedOut = await AsyncStorage.getItem('signed_out')

        // 2) Cargar cache en vars locales (el estado se restaura DESPUÉS de verificar token)
        const cachedUser = await StorageManager.getUser()
        const cachedCreds = await StorageManager.getCredenciales()

        // 3) Verificar token en storage
        let t = await AsyncStorage.getItem('auth_token')

        if (!t) {
          // Si no hay token:
          //   a) Signout explícito → mostrar login (cache intacto para validación offline en signIn)
          //   b) Token expirado (no signout) → restaurar sesión offline con cache
          if (signedOut === 'true') {
            console.log('🚪 Sesión cerrada explícitamente. Mostrando login.')
            return // user = null → pantalla de login
          }

          // Intentar renovar con refresh_token si hay conexión
          const renewed = await renewTokenInline()
          if (!renewed) {
            // Sin token y sin renovación: sesión expirada → modo offline con cache
            if (cachedUser) {
              setUser(cachedUser)
              console.log('📂 Usuario cargado desde cache:', cachedUser.username)
              if (cachedCreds.length > 0) {
                await attachTokensToCredenciales(cachedCreds)
                setCredenciales(cachedCreds as Credencial[])
              }
              setIsOfflineMode(true)
            }
            return
          }
          // Si se renovó, re-leer el token del storage para que las comprobaciones
          // posteriores (isOfflineSessionToken, setToken) usen el valor correcto
          t = await AsyncStorage.getItem('auth_token')
        }

        // 4) Restaurar usuario y credenciales desde cache para UI rápida
        if (cachedUser) {
          setUser(cachedUser)
          console.log('📂 Usuario cargado desde cache:', cachedUser.username)
        }

        if (cachedCreds.length > 0) {
          await attachTokensToCredenciales(cachedCreds)
          setCredenciales(cachedCreds as Credencial[])
          console.log(`📂 ${cachedCreds.length} credenciales cargadas desde cache`)
        }

        // 2b) Token offline_*: si hay red y refresh_token, intentar pasar a online sin pedir contraseña
        if (isOfflineSessionToken(t)) {
          const renewed = await renewTokenInline()
          if (!renewed) {
            setToken(t)
            setAuthToken(null)
            if (cachedUser) {
              setIsOfflineMode(true)
            }
            return
          }
        }

        // Si llegamos acá sin renovar, usamos el token real del storage
        if (!isOfflineSessionToken(t)) {
          setToken(t)
          setAuthToken(t)
        }
        setRequiresRelogin(false)

        // 3) Intentar sincronizar con backend SOLO si hay conexión
        if (!isConnected) {
          if (cachedUser) {
            setIsOfflineMode(true)
            console.log('🔒 Sesión persistente offline: sin conexión, usando cache')
          }
          return
        }

        console.log('🔑 Usando token:', t.substring(0, 30) + '...')
        try {
          await loadOnlineProfile()

          try {
            const creds = await apiGet('/credenciales')
            if (creds && Array.isArray(creds.credenciales)) {
              await attachTokensToCredenciales(creds.credenciales)
              setCredenciales(creds.credenciales)
              await StorageManager.saveCredenciales(creds.credenciales)
              console.log(`✅ ${creds.credenciales.length} credenciales sincronizadas al iniciar`)
            }
            setIsOfflineMode(false) // Sincronización exitosa = modo online
            console.log('🌐 Modo online activado')
          } catch (e) {
            console.log('⚠️  No se pudieron sincronizar credenciales, usando cache')
            setIsOfflineMode(isNetworkError(e))
          }
        } catch (err) {
          // REGLA 3 GAM: En CARGA INICIAL, si hay cache, mantener sesión offline
          // El token puede estar expirado pero el cache sigue válido
          console.log('⚠️  Error al sincronizar con backend')

          const errMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : ''

          if (cachedUser) {
            setIsOfflineMode(true)

            if (isNetworkError(err)) {
              console.log('🔒 Sesión persistente offline: sin conexión, usando cache')
            } else if (errMsg.includes('401')) {
              console.log('🔒 Sesión persistente offline: token expirado pero cache disponible')

              setRequiresRelogin(true)

              // Importante: evitar loops de reintento limpiando el token inválido
              await clearAuthTokenKeepCache()
            } else {
              console.log('🔒 Sesión persistente offline: error desconocido, usando cache')
            }
          } else {
            // Sin cache → cerrar sesión
            console.log('❌ No hay datos en cache, cerrando sesión')
            await clearAuthTokenKeepCache()
            setUser(null)
            setCredenciales([])
            setSyncStats(null)
          }
        }
      } catch (e) {
        console.log('Auth load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Detectar cambios de conectividad y sincronizar automáticamente
  useEffect(() => {
    console.log(`🔍 Network Effect - isConnected: ${isConnected}, isOfflineMode: ${isOfflineMode}, hasSession: ${!!token && !!user}, loading: ${loading}`)
    
    if (!token || !user || loading) {
      console.log('⏭️  Skipping network effect: sin sesión o cargando')
      return // No sincronizar si no hay sesión o aún está cargando
    }
    
    // Detectar pérdida de conexión inmediatamente
    if (!isConnected) {
      if (!isOfflineMode) {
        console.log('📡 Sin conexión detectada - activando modo offline')
        setIsOfflineMode(true)
      } else {
        console.log('📡 Sin conexión - ya estaba en modo offline')
      }
      return // No intentar sincronizar sin conexión
    }
    
    // Si hay conexión y está en modo offline, intentar sincronizar (con cooldown y sin concurrencia)
    if (isConnected && isOfflineMode) {
      // Si ya sabemos que el token fue rechazado, no intentar auto-sync.
      if (requiresRelogin) {
        console.log('⏭️  Auto-sync omitido: requiere re-login')
        return
      }

      // Si el token es offline_* (generado local), NO sirve para el backend.
      // Evita pegarle a /credenciales/sync y recibir 401 TOKEN_EXPIRED.
      if (isOfflineSessionToken(token)) {
        console.log('⏭️  Auto-sync omitido: token offline (se requiere login online)')
        return
      }

      const now = Date.now()
      const cooldownMs = 30_000

      if (autoSyncInFlightRef.current) {
        console.log('⏳ Auto-sync ya en curso, skip')
        return
      }

      if (now - lastAutoSyncAttemptAtRef.current < cooldownMs) {
        console.log('⏳ Auto-sync en cooldown, skip')
        return
      }

      lastAutoSyncAttemptAtRef.current = now
      autoSyncInFlightRef.current = true

      console.log('🌐 Conexión restaurada - sincronizando automáticamente...')
      
      // Sincronizar credenciales al volver online
      syncCredenciales()
        .then(() => {
          console.log('✅ Sincronización automática completada')
          setIsOfflineMode(false)
        })
        .catch(async (e) => {
          console.log('⚠️  Error en sincronización automática:', e)
          
          const errMsg = (e && typeof e === 'object' && 'message' in e) ? String(e.message) : ''
          
          if (isNetworkError(e)) {
            // Error de red real → mantener modo offline
            console.log('📡 Error de red - mantener modo offline')
            setIsOfflineMode(true)
          } else if (errMsg.includes('401')) {
            // Token rechazado con conexión: mantener cache, pero invalidar token para evitar loops
            console.log('❌ Token inválido/expirado - se invalida token, cache queda disponible')
            await clearAuthTokenKeepCache()
            setRequiresRelogin(true)
            setIsOfflineMode(true)
          } else {
            // Otro error → mantener modo offline por precaución
            console.log('⚠️  Error desconocido - mantener modo offline')
            setIsOfflineMode(true)
          }
        })
        .finally(() => {
          autoSyncInFlightRef.current = false
        })
    }
  }, [isConnected, token, user, loading, isOfflineMode, requiresRelogin]) // Depende de conectividad, sesión, estado de carga y modo offline

  // Auto-refresh de tokens cuando expiran
  useEffect(() => {
    if (!credenciales || credenciales.length === 0) return

    const checkTokenExpiration = () => {
      const now = new Date().getTime()
      const firstToken = credenciales[0]?.tokenTemporalVenceEn
      
      if (!firstToken) return

      const expiryTime = new Date(firstToken).getTime()
      const timeUntilExpiry = expiryTime - now

      // Si el token está por expirar en menos de 10 segundos, regenerar
      if (timeUntilExpiry <= 10000 && timeUntilExpiry > 0) {
        // Si estamos offline y las credenciales no están vigentes, no regenerar token
        if (isOfflineMode && !hasAnyCredencialVigente(credenciales)) {
          return
        }

        console.log('🔄 Token próximo a expirar, regenerando...')
        
        // Crear copia del array para regenerar tokens
        const credsCopy = [...credenciales]
        
        // Regenerar tokens localmente con el timeout parametrizado
        attachTokensToCredenciales(
          credsCopy,
          null,
          { skipIfVigenciaVencida: isOfflineMode }
        ).then(() => {
          setCredenciales(credsCopy)
          StorageManager.saveCredenciales(credsCopy)
          console.log('✅ Tokens regenerados localmente')
        }).catch(err => {
          console.error('❌ Error regenerando tokens:', err)
        })
      }
    }

    // Verificar cada segundo
    const interval = setInterval(checkTokenExpiration, 1000)

    return () => clearInterval(interval)
  }, [credenciales, isOfflineMode])

  // En modo offline: asegurar que NO haya tokens en credenciales vencidas
  useEffect(() => {
    if (!isOfflineMode) return
    if (!credenciales || credenciales.length === 0) return

    const copy = [...credenciales]
    attachTokensToCredenciales(copy, null, { skipIfVigenciaVencida: true })
      .then(() => {
        setCredenciales(copy)
        StorageManager.saveCredenciales(copy)
      })
      .catch(() => {
        // ignore
      })
  }, [isOfflineMode])

  const signIn = async (username: string, password: string) => {
    setLoading(true)
    try {
      console.log('🔐 ========== INICIO LOGIN ==========')
      console.log('🔐 Usuario:', username)
      console.log('🔐 Intentando login dual (offline/online)...')
      
      // PASO 1: Intentar validación offline primero
      console.log('📂 PASO 1: Verificando cache local...')
      const isValidOffline = await StorageManager.verifyUserCredentials(username, password)
      console.log('📂 Resultado validación offline:', isValidOffline)
      
      if (isValidOffline) {
        console.log('✅ ========== VALIDACIÓN OFFLINE EXITOSA ==========')
        
        // Cargar datos desde cache
        console.log('📂 Cargando datos desde cache...')
        const cachedUser = await StorageManager.getUser()
        const cachedCreds = await StorageManager.getCredenciales()
        const cachedToken = await AsyncStorage.getItem('auth_token')
        
        console.log('📂 Cache user:', cachedUser ? 'Sí' : 'No')
        console.log('📂 Cache creds:', cachedCreds.length)
        console.log('📂 Cache token:', cachedToken ? 'Sí' : 'No')
        
        // Si tenemos user y credenciales, login offline exitoso
        if (cachedUser && cachedCreds.length > 0) {
          const hayVigentes = hasAnyCredencialVigente(cachedCreds as any)

          // Bloquear login offline si TODAS las credenciales están vencidas.
          // Sin conexión no hay forma de renovarlas, no tiene sentido restaurar
          // una sesión con datos caducados.
          if (!isConnected && !hayVigentes) {
            const fechas = (cachedCreds as any[])
              .map((c: any) => c.crcrefecvi as string | undefined)
              .filter(Boolean)
              .sort() as string[]
            const fechaMax = fechas.pop()
            const fechaMsg = fechaMax
              ? ` el ${fechaMax.split('-').reverse().join('/')}`
              : ''
            console.log(`🔴 Login offline bloqueado: credenciales vencidas${fechaMsg}`)
            throw new Error(`Tus credenciales vencieron${fechaMsg}. Conectate a internet para renovarlas.`)
          }

          // Login exitoso → limpiar flag de cierre de sesión explícito
          await AsyncStorage.removeItem('signed_out')

          const syncUsername = (cachedUser.email || cachedUser.username || username || '').toString().trim()
          // Offline: no generar token en credenciales vencidas
          await attachTokensToCredenciales(cachedCreds, null, { skipIfVigenciaVencida: true })

          // Offline + SIN vigentes (pero conectado): background sync renovará
          setRequiresRelogin(!hayVigentes)
          setUser(cachedUser)
          setCredenciales(cachedCreds as Credencial[])
          
          // Usar token existente o generar offline
          if (cachedToken) {
            setToken(cachedToken)
            setAuthToken(isOfflineSessionToken(cachedToken) ? null : cachedToken)
          } else {
            const offlineToken = `offline_${Date.now()}_${Math.random().toString(36)}`
            await AsyncStorage.setItem('auth_token', offlineToken)
            setToken(offlineToken)
            setAuthToken(null)
            console.log('🔑 Token offline generado')
          }

          setIsOfflineMode(true)
          setLoading(false) // Importante: desactivar loading ANTES del return
          console.log(`✅ Sesión restaurada desde cache: ${cachedCreds.length} credenciales`)
          console.log('🟠 Modo OFFLINE activado')
          
          // PASO 2: Intentar sincronizar en background (sin bloquear login)
          setTimeout(async () => {
            try {
              console.log('🔄 ========== SYNC BACKGROUND ==========')
              console.log('🔄 Intentando sincronización online...')
              const res = await apiPost('/auth/login', { username: syncUsername, password })
              
              const t = res?.token || res?.access_token
              if (t) {
                await AsyncStorage.setItem('auth_token', t)
                setToken(t)
                setAuthToken(t)
                setRequiresRelogin(false)
                
                // Guardar refresh_token si viene
                if (res.refresh_token) {
                  await AsyncStorage.setItem('refresh_token', res.refresh_token)
                  console.log('🔄 Refresh token guardado')
                }
                
                // Guardar timeout del token si viene en la respuesta
                if (res.tokenTimeout) {
                  await setTimeoutMinutes(res.tokenTimeout)
                  console.log(`⏱️  TimeoutTokenCredencial actualizado: ${res.tokenTimeout} minutos`)
                }
                
                const userObj = res.user || { username }
                setUser(userObj)
                await StorageManager.saveUser(userObj)
                
                if (hasNonEmptyCredenciales(res.credenciales)) {
                  // Asegurar tokens aunque el backend ya los provea
                  await attachTokensToCredenciales(res.credenciales)
                  setCredenciales(res.credenciales)
                  await StorageManager.saveCredenciales(res.credenciales)
                  console.log(`✅ ${res.credenciales.length} credenciales sincronizadas online`)
                } else {
                  console.warn('⚠️  Sync background sin credenciales; se preserva cache existente')
                }
                
                if (res.sync) {
                  setSyncStats(res.sync)
                }
                
                await StorageManager.setLastSync()
                setIsOfflineMode(false)
                console.log('✅ Sincronización online completada')
                console.log('🟢 Modo ONLINE activado')
              }
            } catch (syncError) {
              if (isNetworkError(syncError)) {
                console.log('📡 Sin conexión, continuando en modo offline')
              } else {
                console.log('⚠️  Error en sincronización online:', syncError)

                const msg = (syncError && typeof syncError === 'object' && 'message' in syncError)
                  ? String((syncError as any).message)
                  : ''

                // Si el backend responde 401, no insistir: pedir re-login.
                if (msg.includes('401')) {
                  setRequiresRelogin(true)
                }
              }
            }
          }, 500) // Delay para no bloquear UI
          
          console.log('🔐 ========== LOGIN OFFLINE COMPLETADO ==========')
          return // Login offline exitoso - salir aquí
        } else {
          console.log('⚠️  Cache incompleto, intentando login online...')
        }
      } else {
        console.log('⚠️  Validación offline falló o no hay cache')
      }
      
      // PASO 3: Si no hay cache válido, intentar login online
      console.log('🌐 ========== PASO 3: LOGIN ONLINE ==========')
      console.log('🌐 Intentando login online (sin cache válido)...')

      const allowDevBypassOfflineGuard = canTryOnlineWhileNetInfoOffline()
      if (!isConnected && !allowDevBypassOfflineGuard) {
        throw new Error('Sin conexión a internet. Ingresá con el último usuario cacheado o conectate para validar credenciales por primera vez.')
      }
      if (!isConnected && allowDevBypassOfflineGuard) {
        console.log('🧪 NetInfo offline en desarrollo local; se permite intento online por compatibilidad de emulador/túnel')
      }

      try {
        const res = await apiPost('/auth/login', { username, password })
        console.log('🔐 Login online exitoso')
        
        // Login exitoso → limpiar flag de cierre de sesión explícito
        await AsyncStorage.removeItem('signed_out')

        const t = res?.token || res?.access_token
        if (!t) {
          console.error('❌ Backend no devolvió token. Response:', res)
          throw new Error('Token no recibido del servidor')
        }
        
        console.log('✅ Token recibido, guardando...')
        await AsyncStorage.setItem('auth_token', t)
        setToken(t)
        setAuthToken(t)
        setRequiresRelogin(false)
        
        // Guardar refresh_token si viene
        if (res.refresh_token) {
          await AsyncStorage.setItem('refresh_token', res.refresh_token)
          console.log('🔄 Refresh token guardado')
        }
        
        // Guardar timeout del token si viene en la respuesta
        if (res.tokenTimeout) {
          await setTimeoutMinutes(res.tokenTimeout)
          console.log(`⏱️  TimeoutTokenCredencial actualizado: ${res.tokenTimeout} minutos`)
        }
        
        const userObj = res.user || { username }
        console.log('👤 Usuario:', userObj)
        setUser(userObj)
        await StorageManager.saveUser(userObj)
        
        const serverCreds = Array.isArray(res.credenciales) ? res.credenciales : null
        let resolvedCreds: Credencial[] = []

        if (serverCreds && serverCreds.length > 0) {
          resolvedCreds = serverCreds as Credencial[]
          console.log(`✅ Login devolvió ${resolvedCreds.length} credenciales`)
        } else {
          if (serverCreds && serverCreds.length === 0 && res.soapMensajes) {
            console.log('⚠️  Backend devolvió 0 credenciales. soapMensajes:', res.soapMensajes)
            if (res.afiliadoIdUsadoSync) {
              console.log('ℹ️  afiliadoIdUsadoSync:', res.afiliadoIdUsadoSync)
            }
            if (res.warning) {
              console.log('ℹ️  warning auth:', res.warning)
            }
          } else if (!serverCreds) {
            console.log('ℹ️  Login sin array de credenciales; intentando recuperación')
          }

          // Si el login vino sin credenciales, intentar recuperar desde BD (solo lectura).
          try {
            console.log('🔄 Login sin credenciales: intentando fallback /credenciales...')
            const fallbackCreds = await apiGet('/credenciales', { timeoutMs: 20000 })
            if (fallbackCreds?.credenciales && Array.isArray(fallbackCreds.credenciales) && fallbackCreds.credenciales.length > 0) {
              resolvedCreds = fallbackCreds.credenciales as Credencial[]
              console.log(`✅ Fallback post-login: ${resolvedCreds.length} credenciales recuperadas`)
            }
          } catch (fallbackError) {
            console.warn('⚠️  No se pudo recuperar credenciales post-login:', fallbackError)
          }

          // Si tampoco se recuperaron, preservar cache previo para no degradar modo offline.
          if (resolvedCreds.length === 0) {
            const cachedCreds = await StorageManager.getCredenciales()
            if (cachedCreds.length > 0) {
              resolvedCreds = cachedCreds as unknown as Credencial[]
              console.log(`🛟 Preservando cache previo: ${resolvedCreds.length} credenciales`)
            }
          }
        }

        if (resolvedCreds.length > 0) {
          await attachTokensToCredenciales(resolvedCreds)
          setCredenciales(resolvedCreds)
          await StorageManager.saveCredenciales(resolvedCreds as unknown as any[])
          console.log(`✅ ${resolvedCreds.length} credenciales guardadas en cache`)
        } else {
          // No limpiar cache/session para no perder datos en degradación temporal.
          console.warn('⚠️  No hay credenciales disponibles (servidor + fallback + cache)')
        }
        
        if (res.sync) {
          setSyncStats(res.sync)
          console.log(`📊 Sync: +${res.sync.inserted} ↻${res.sync.updated} =${res.sync.unchanged}`)
        }
        
        // Guardar contraseña hasheada para futuro login offline
        // Guardar con múltiples claves: email, CUIL, DNI, username ingresado
        console.log('💾 Guardando credenciales para login offline futuro...')
        
        // Siempre guardar con email (clave principal)
        if (userObj.email) {
          await StorageManager.saveUserCredentials(userObj.email, password)
          console.log('✅ Guardado con email:', userObj.email)
        }
        
        // También guardar con username ingresado (puede ser DNI, CUIL)
        if (username !== userObj.email) {
          await StorageManager.saveUserCredentials(username, password)
          console.log('✅ Guardado con username ingresado:', username)
        }
        
        // Si tiene CUIL, guardar también
        if (userObj.cuil && userObj.cuil !== username && userObj.cuil !== userObj.email) {
          await StorageManager.saveUserCredentials(userObj.cuil, password)
          console.log('✅ Guardado con CUIL:', userObj.cuil)
        }
        
        await StorageManager.setLastSync()
        
        // VERIFICACIÓN: Confirmar que se guardó correctamente
        console.log('🔍 ========== VERIFICACIÓN DE GUARDADO ==========')
        const verifyUser = await StorageManager.getUser()
        const verifyCreds = await StorageManager.getCredenciales()
        const verifyToken = await AsyncStorage.getItem('auth_token')
        console.log('🔍 User guardado:', verifyUser ? 'SÍ ✅' : 'NO ❌')
        console.log('🔍 Credenciales guardadas:', verifyCreds ? `${verifyCreds.length} ✅` : 'NO ❌')
        console.log('🔍 Token guardado:', verifyToken ? 'SÍ ✅' : 'NO ❌')
        console.log('🔍 ========================================')
        
        setIsOfflineMode(false)
        console.log('✅ Login online completado exitosamente')
        console.log('🟢 Modo ONLINE activado')
        
        // Registrar push token después de login exitoso - DESHABILITADO en desarrollo
        // try {
        //   const pushToken = (await Notifications.getExpoPushTokenAsync()).data
        //   if (pushToken) {
        //     await registerPushToken(pushToken)
        //     console.log('📱 Push token registrado en backend')
        //   }
        // } catch (pushError) {
        //   console.warn('⚠️  No se pudo registrar push token:', pushError)
        // }
        console.log('⏭️  Push notifications deshabilitadas en desarrollo')
        
        console.log('🔐 ========== LOGIN ONLINE COMPLETADO ==========')
      } catch (networkError: unknown) {
        // Si es error de red y NO teníamos cache válido, mostrar error específico
        if (isNetworkError(networkError)) {
          console.log('📡 ========== ERROR: SIN CONEXIÓN Y SIN CACHE ==========')
          throw new Error('Sin conexión a internet. Necesitas conectarte al menos una vez para iniciar sesión y habilitar el modo offline.')
        }
        // Si es otro tipo de error (credenciales incorrectas, etc), relanzar
        const msg = (networkError && typeof networkError === 'object' && 'message' in (networkError as Record<string, unknown>)) ? String((networkError as Record<string, unknown>)['message']) : String(networkError)
        console.log('❌ Error en login online:', msg)
        throw networkError
      }
    } catch (error: unknown) {
      console.log('❌ ========== ERROR EN SIGNIN ==========')
      const errMsg = (error && typeof error === 'object' && 'message' in (error as Record<string, unknown>)) ? String((error as Record<string, unknown>)['message']) : String(error)
      console.log('❌ Error:', errMsg)
      
      // Limpiar estado en caso de error
      setUser(null)
      setToken(null)
      setCredenciales([])
      setSyncStats(null)
      setAuthToken(null)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      // Eliminar tokens de sesión
      await AsyncStorage.removeItem('auth_token')
      await AsyncStorage.removeItem('refresh_token')

      // Marcar cierre de sesión explícito para que load() no auto-restaure la sesión
      await AsyncStorage.setItem('signed_out', 'true')

      // Limpiar USER y CREDENCIALES del cache para evitar que un usuario diferente
      // en el mismo dispositivo acceda a los datos del usuario anterior.
      // USER_CREDENTIALS (hashes de contraseña) se PRESERVA para permitir login offline
      // futuro al mismo usuario cuando vuelva a iniciar sesión.
      await StorageManager.clearAll()

      // Limpiar el estado en memoria
      setToken(null)
      setAuthToken(null)
      setUser(null)
      setCredenciales([])
      setSyncStats(null)
      setIsOfflineMode(false)
      setRequiresRelogin(false)

      console.log('✅ Logout completado (cache de usuario preservado para offline)')
    } finally {
      setLoading(false)
    }
  }

  const verifyTokenWithGAM = async (): Promise<boolean> => {
    try {
      console.log('🔐 Verificando token con GAM...')
      await apiGet('/gam/userinfo')
      console.log('✅ Token GAM válido')
      return true
    } catch (error) {
      console.error('❌ Error verificando token GAM:', error)
      return false
    }
  }

  const refreshCredenciales = async () => {
    if (!token) {
      console.log('No hay token para refrescar credenciales')
      return
    }
    try {
      console.log('🔄 Refrescando credenciales...')
      const res = await apiGet('/credenciales/refresh')
      console.log('📥 Credenciales refresh response:', JSON.stringify(res, null, 2))
      
        if (hasNonEmptyCredenciales(res.credenciales)) {
          await attachTokensToCredenciales(res.credenciales)
          setCredenciales(res.credenciales)
          await StorageManager.saveCredenciales(res.credenciales)
          console.log(`✅ ${res.credenciales.length} credenciales actualizadas`)
        } else {
          console.warn('⚠️  Refresh sin credenciales; se preserva cache existente')
        }
      
      if (res.sync) {
        setSyncStats(res.sync)
        console.log(`📊 Sync: +${res.sync.inserted} ↻${res.sync.updated} =${res.sync.unchanged}`)
      }
      
      await StorageManager.setLastSync()
      setIsOfflineMode(false)
    } catch (e: unknown) {
      if (isNetworkError(e)) {
        console.log('📡 Sin conexión, usando credenciales en cache')
        setIsOfflineMode(true)
        return
      }
      
      // Solo activar offline si es error de red
      if (isNetworkError(e)) {
        console.log('📡 Sin conexión - activando modo offline')
        setIsOfflineMode(true)
      } else {
        // Error 401 u otro: el token puede estar inválido
        // NO activar modo offline si hay conexión
        console.log('Error al refrescar credenciales:', e)
        const errMsg = (e && typeof e === 'object' && 'message' in e) ? String(e.message) : ''
        if (errMsg.includes('401')) {
          console.log('⚠️  Token inválido - requiere re-login')
          await clearAuthTokenKeepCache()
          setRequiresRelogin(true)
          setIsOfflineMode(true)
        }
      }
    }
  }

  const renewToken = async (): Promise<boolean> => {
    try {
      console.log('🔄 Intentando renovar token automáticamente...')
      
      // Obtener refresh_token guardado
      const refreshToken = await AsyncStorage.getItem('refresh_token')
      
      if (!refreshToken) {
        console.log('⚠️  No hay refresh_token guardado para renovar')
        return false
      }
      
      console.log('🔐 Renovando token con refresh_token...')
      const res = await apiPost('/auth/refresh-token', { refresh_token: refreshToken })
      
      if (!res || !res.token) {
        console.log('⚠️  Backend no devolvió token en renovación')
        return false
      }
      
      // Actualizar tokens
      await AsyncStorage.setItem('auth_token', res.token)
      setToken(res.token)
      setAuthToken(res.token)
      
      // Actualizar refresh_token si viene uno nuevo
      if (res.refresh_token) {
        await AsyncStorage.setItem('refresh_token', res.refresh_token)
        console.log('🔄 Refresh token actualizado')
      }
      
      console.log('✅ Token renovado exitosamente')
      return true
    } catch (err) {
      console.error('❌ Error renovando token:', err)
      return false
    }
  }

  const syncCredenciales = async () => {
    if (!token) {
      console.log('No hay token para sincronizar credenciales')
      throw new Error('No autenticado')
    }

    if (token.startsWith('offline_')) {
      console.log('🔒 Token offline: no se puede sincronizar contra el servidor')
      setIsOfflineMode(true)
      // No marcar requiresRelogin acá: el usuario puede estar offline deliberadamente.
      throw new Error('Sesión offline: iniciá sesión online para sincronizar')
    }

    if (syncCredencialesInFlightRef.current) {
      console.log('⏳ syncCredenciales ya en curso, reutilizando promesa')
      return syncCredencialesInFlightRef.current
    }

    const syncPromise = (async () => {
      try {
      console.log('🔄 Sincronizando credenciales desde SOAP...')
      const res = await apiGet('/credenciales/sync')
      console.log('📥 Sync response:', JSON.stringify(res, null, 2))
      
      if (hasNonEmptyCredenciales(res.credenciales)) {
        await attachTokensToCredenciales(res.credenciales)
        setCredenciales(res.credenciales)
        await StorageManager.saveCredenciales(res.credenciales)
        console.log(`✅ ${res.credenciales.length} credenciales sincronizadas`)
      } else {
        console.warn('⚠️  /credenciales/sync devolvió 0 credenciales; se preserva cache existente')
      }
      
      if (res.sync) {
        setSyncStats(res.sync)
        console.log(`📊 Sync: +${res.sync.inserted} ↻${res.sync.updated} =${res.sync.unchanged}`)
      }
      
      await StorageManager.setLastSync()
      setIsOfflineMode(false)
      
      return res
      } catch (e: unknown) {
        // Si falla el sync SOAP por timeout/no-respuesta, intentar fallback de solo lectura desde BD.
        if (!isNetworkError(e) && !String((e as any)?.message || '').includes('401') && isTimeoutLikeError(e)) {
          try {
            console.warn('⚠️  /credenciales/sync timeout. Intentando fallback /credenciales...')
            const fallback = await apiGet('/credenciales', { timeoutMs: 20000 })
            if (hasNonEmptyCredenciales(fallback?.credenciales)) {
              await attachTokensToCredenciales(fallback.credenciales)
              setCredenciales(fallback.credenciales)
              await StorageManager.saveCredenciales(fallback.credenciales)
              await StorageManager.setLastSync()
              setIsOfflineMode(false)
              console.log(`✅ Fallback /credenciales OK: ${fallback.credenciales.length} credenciales`) 
              return fallback
            }

            console.warn('⚠️  Fallback /credenciales sin datos; se preserva cache existente')
          } catch (fallbackError) {
            console.warn('⚠️  Fallback /credenciales también falló:', fallbackError)
          }
        }

      if (isNetworkError(e)) {
        console.warn('📡 Sin conexión, no se puede sincronizar')
        setIsOfflineMode(true)
        throw e
      }
      
      // Solo activar offline si es error de red
      if (isNetworkError(e)) {
        console.log('📡 Sin conexión - activando modo offline')
        setIsOfflineMode(true)
      } else {
        // Error 401 u otro: el token puede estar inválido
        // NO activar modo offline si hay conexión
        console.error('Error al sincronizar credenciales:', e)
        const errMsg = (e && typeof e === 'object' && 'message' in e) ? String(e.message) : ''
        if (errMsg.includes('401')) {
          console.log('⚠️  Token inválido - requiere re-login')
          await clearAuthTokenKeepCache()
          setRequiresRelogin(true)
          setIsOfflineMode(true)
        }
      }
      throw e
      }
    })()

    syncCredencialesInFlightRef.current = syncPromise
    return syncPromise.finally(() => {
      syncCredencialesInFlightRef.current = null
    })
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      credenciales, 
      syncStats,
      loading, 
      isOfflineMode,
      requiresRelogin,
      signIn, 
      signOut, 
      refreshCredenciales,
      syncCredenciales
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
