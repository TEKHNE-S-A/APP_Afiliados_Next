// Minimal API service wrapper with global token support, logging, and mock mode.
import { USE_MOCK, API_BASE_URL } from '../config'
import AsyncStorage from '@react-native-async-storage/async-storage'

let AUTH_TOKEN: string | null = null
let BASE_URL = API_BASE_URL
let onUnauthorizedCallback: (() => void) | null = null

/** Registra un callback que se invoca cuando cualquier request recibe 401.
 *  AuthContext lo usa para forzar el re-login sin que cada pantalla lo maneje. */
export function setOnUnauthorizedCallback(cb: (() => void) | null) {
  onUnauthorizedCallback = cb
}

//const GET_TIMEOUT = 30000 // 30 segundos
//const POST_TIMEOUT = 60000 // 60 segundos
const DELETE_TIMEOUT = 30000 // 30 segundos

// Network error types for offline detection
export class NetworkError extends Error {
  constructor(message: string = 'Sin conexión a internet') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'La solicitud excedió el tiempo límite') {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Detecta si un error es de red (offline).
 * Cubre mensajes de React Native, Android y iOS.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>
    if (e.name === 'NetworkError') return true
    const msg = typeof e.message === 'string' ? e.message.toLowerCase() : ''
    if (msg) {
      // React Native / browser fetch
      if (msg.includes('network request failed')) return true
      if (msg.includes('failed to fetch')) return true
      if (msg.includes('fetch failed')) return true
      if (msg.includes('sin conexión')) return true
      // Android (OkHttp / java.net.*)
      if (msg.includes('failed to connect')) return true
      if (msg.includes('unable to resolve host')) return true
      if (msg.includes('network is unreachable')) return true
      if (msg.includes('connection refused')) return true
      if (msg.includes('connection reset')) return true
      if (msg.includes('socket exception')) return true
      if (msg.includes('no route to host')) return true
      if (msg.includes('software caused connection abort')) return true
      // iOS / NSURLError
      if (msg.includes('internet connection appears to be offline')) return true
      if (msg.includes('hostname could not be found')) return true
      if (msg.includes('the network connection was lost')) return true
    }
    const code = typeof e.code === 'string' ? e.code.toUpperCase() : ''
    if (['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH', 'ENETDOWN', 'ECONNABORTED'].includes(code)) return true
  }
  return false
}

export function setAuthToken(token: string | null) {
  AUTH_TOKEN = token
}

export function setBaseUrl(url: string) {
  BASE_URL = url
}

function debugLog(...args: unknown[]) {
  // En Expo/RN, console.warn/error suele mostrarse como toast/overlay.
  // Para no confundir al usuario, dejamos logs solo como console.log en DEV.
  if (__DEV__) console.log(...args)
}

async function throwApiErrorFrom(status: number, text: string) {
  let code: string | undefined
  let message: string | undefined

  try {
    const parsed = text ? (JSON.parse(text) as any) : null
    code = parsed?.error || parsed?.code
    message = parsed?.message || parsed?.msg
  } catch {
    // Si no es JSON válido, intentar usar el texto directamente
    message = text
  }

  // Cualquier 401 invalida el token persistido para evitar loops de reintento.
  if (status === 401) {
    try {
      await AsyncStorage.removeItem('auth_token')
      await AsyncStorage.removeItem('refresh_token')
      AUTH_TOKEN = null
    } catch {
      // ignore
    }
    // Notificar al AuthContext para que redirija al login
    onUnauthorizedCallback?.()
    if (code === 'TOKEN_EXPIRED' || text.includes('TOKEN_EXPIRED')) {
      throw new Error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
    }
    if (message) {
      throw new Error(message)
    }
    if (code) {
      throw new Error(`Error de autenticación: ${code}`)
    }
    throw new Error('Usuario o contraseña incorrectos')
  }

  // Para otros errores, incluir el mensaje del backend si existe
  if (message) {
    throw new Error(`${message}`)
  }

  throw new Error(`Error en el servidor (${status})`)
}

function buildHeaders(extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { ...extra }
  if (AUTH_TOKEN) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
  return headers
}

// Mock responses for development (when USE_MOCK = true)
function mockLogin(body: Record<string, unknown>) {
  console.log('[api-mock] login called with', body)
  return {
    token: 'mock-token-' + Date.now(),
    access_token: 'mock-token-' + Date.now(),
    user: {
      id: '123',
      username: body.username || 'Usuario',
      name: 'Juan Pérez',
      nombre: 'Juan Pérez',
      email: 'juan.perez@test.local',
      documento: '28878765',
    },
    credenciales: [
      {
        crcreid: '111111111111111111111111111111',
        crcrefecvi: '2025-12-31',
        crcrelin: '',
        crcrenroaf: '000-000000-0',
        crcreapeno: 'PEREZ, JUAN',
        crcreafili: '111111111111111111111111111111',
        crcrecuil: 20288787655,
        crcreplaid: 'PLAN BASICO',
        crcredocum: '28878765',
        crcresexo: 'M',
        crcrefecha: '1985-05-15',
        crcrehash: 'mock-hash-1',
        crcreifech: '2025-01-01T10:00:00',
        crcrepropi: 'S', // TITULAR
        crcreparen: 'Titular'
      },
      {
        crcreid: '222222222222222222222222222222',
        crcrefecvi: '2025-12-31',
        crcrelin: '',
        crcrenroaf: '000-000000-1',
        crcreapeno: 'GOMEZ, MARIA',
        crcreafili: '222222222222222222222222222222',
        crcrecuil: 27123456789,
        crcreplaid: 'PLAN BASICO',
        crcredocum: '12345678',
        crcresexo: 'F',
        crcrefecha: '1987-03-20',
        crcrehash: 'mock-hash-2',
        crcreifech: '2025-01-01T10:00:00',
        crcrepropi: 'N', // MIEMBRO
        crcreparen: 'Cónyuge'
      },
      {
        crcreid: '333333333333333333333333333333',
        crcrefecvi: '2025-12-31',
        crcrelin: '',
        crcrenroaf: '000-000000-2',
        crcreapeno: 'PEREZ, LUCAS',
        crcreafili: '333333333333333333333333333333',
        crcrecuil: 20456789012,
        crcreplaid: 'PLAN BASICO',
        crcredocum: '45678901',
        crcresexo: 'M',
        crcrefecha: '2010-08-10',
        crcrehash: 'mock-hash-3',
        crcreifech: '2025-01-01T10:00:00',
        crcrepropi: 'N', // MIEMBRO
        crcreparen: 'Hijo/a'
      }
    ],
    sync: {
      total: 3,
      inserted: 3,
      updated: 0,
      unchanged: 0
    }
  }
}

function mockGetMe() {
  console.log('[api-mock] /auth/me called')
  return {
    id: '123',
    username: 'usuario',
    name: 'Juan Pérez',
    nombre: 'Juan Pérez',
    email: 'juan.perez@test.local',
    documento: '28878765',
  }
}

export async function apiGet(path: string, opts?: { timeoutMs?: number; silent404?: boolean }) {
  // Use mock if enabled
  if (USE_MOCK) {
    if (path === '/auth/me') return mockGetMe()
    console.log('[api-mock] GET', path, '(not mocked, returning empty)')
    return {}
  }

  const url = `${BASE_URL}${path}`
  try {
    console.log('[api] GET', url)
    const timeoutMs = opts?.timeoutMs ?? 30000 // Aumentado a 30 segundos
    const controller = new AbortController()
    const to = setTimeout(() => controller.abort(), timeoutMs)
    let res: Response
    try {
      res = await fetch(url, { method: 'GET', headers: buildHeaders(), signal: controller.signal })
    } catch (fetchError: unknown) {
      clearTimeout(to)
      // Convertir cualquier error de red conocido a NetworkError
      if (isNetworkError(fetchError)) {
        debugLog('[api] sin conexión detectada (GET)')
        throw new NetworkError('Sin conexión a internet')
      }
      throw fetchError
    } finally {
      clearTimeout(to)
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      // Suprimir completamente cuando el 404 es esperado (endpoint aún no desplegado en servidor remoto)
      if (opts?.silent404 && res.status === 404) {
        const err = new Error('Not Found')
        ;(err as any)._silent = true
        throw err
      }
      debugLog('[api] non-ok response', res.status, text)
      await throwApiErrorFrom(res.status, text)
    }
    return await res.json()
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'name' in e && (e as Record<string, unknown>).name === 'AbortError') {
      throw new TimeoutError()
    }
    if (e instanceof NetworkError || e instanceof TimeoutError) {
      throw e
    }
    // Suprimir log cuando el error fue marcado como silencioso (_silent)
    const isSilent = typeof e === 'object' && e !== null && (e as any)._silent === true
    if (!isSilent) {
      const emsg = (typeof e === 'object' && e !== null && 'message' in e) ? String((e as Record<string, unknown>)['message']) : String(e)
      debugLog('[api] fetch error', emsg)
    }
    throw e
  }
}

export async function apiPost(path: string, body: Record<string, unknown>, opts?: { timeoutMs?: number }) {
  // Use mock if enabled
  if (USE_MOCK) {
    if (path === '/auth/login') return mockLogin(body)
    console.log('[api-mock] POST', path, '(not mocked, returning empty)')
    return {}
  }

  const url = `${BASE_URL}${path}`
  try {
    console.log('[api] POST', url)
    // Login puede tardar más por sincronización SOAP de credenciales
    const defaultTimeout = path.includes('/auth/login') ? 120000 : 60000 // 2 min para login, 1 min para otros
    const timeoutMs = opts?.timeoutMs ?? defaultTimeout
    const controller = new AbortController()
    const to = setTimeout(() => controller.abort(), timeoutMs)
    let res: Response
    try {
      res = await fetch(url, { method: 'POST', body: JSON.stringify(body), headers: buildHeaders(), signal: controller.signal })
    } catch (fetchError: unknown) {
      clearTimeout(to)
      // Convertir cualquier error de red conocido a NetworkError
      if (isNetworkError(fetchError)) {
        debugLog('[api] sin conexión detectada (POST)')
        throw new NetworkError('Sin conexión a internet')
      }
      throw fetchError
    } finally {
      clearTimeout(to)
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      debugLog('[api] non-ok response', res.status, text)
      await throwApiErrorFrom(res.status, text)
    }
    return await res.json()
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'name' in e && (e as Record<string, unknown>).name === 'AbortError') {
      throw new TimeoutError()
    }
    if (e instanceof NetworkError || e instanceof TimeoutError) {
      throw e
    }
    const emsg = (typeof e === 'object' && e !== null && 'message' in e) ? String((e as Record<string, unknown>)['message']) : String(e)
    debugLog('[api] fetch error', emsg)
    throw e
  }
}


// ===========================================
// Prestaciones y Par�metros (Autorizaciones)
// ===========================================

/**
 * Obtener par�metro que habilita autorizaciones sin prescripci�n
 * GET /parametros/funciones-app/habilitar-autoriz-sin-orden
 */
export async function getParametroAutorizSinOrden(): Promise<{ habilitado: boolean; valor: string }> {
  return apiGet('/parametros/funciones-app/habilitar-autoriz-sin-orden')
}

/**
 * Obtener máximo configurable de fotos para autorizaciones con prescripción
 * GET /parametros/funciones-app/max-fotos-autorizacion
 */
export async function getParametroMaxFotosAutorizacion(): Promise<{ maxFotos: number; valor: string; minFotos: number; maxPermitido: number }> {
  return apiGet('/parametros/funciones-app/max-fotos-autorizacion')
}

/**
 * Obtener listado de prestaciones disponibles
 * POST /sia/prestaciones (sin par�metros)
 */
export async function getPrestaciones(): Promise<{ success: boolean; prestaciones: Array<{ AULPresID: number; AULPresDescripcion: string }>; total: number }> {
  return apiPost('/sia/prestaciones', {})
}

export async function apiPut(path: string, body?: Record<string, unknown>, opts?: { timeoutMs?: number }) {
  const url = `${BASE_URL}${path}`
  try {
    console.log('[api] PUT', url)
    const timeoutMs = opts?.timeoutMs ?? 30000 // 30 segundos
    const controller = new AbortController()
    const to = setTimeout(() => controller.abort(), timeoutMs)
    let res: Response
    try {
      res = await fetch(url, { 
        method: 'PUT', 
        body: body ? JSON.stringify(body) : undefined, 
        headers: buildHeaders(), 
        signal: controller.signal 
      })
    } catch (fetchError: unknown) {
      clearTimeout(to)
      // Detectar errores de red y convertir a NetworkError
      if (typeof fetchError === 'object' && fetchError !== null) {
        const fe = fetchError as Record<string, unknown>
        const fmsg = fe.message as string | undefined
        const fcode = fe.code as string | undefined
        if (fmsg?.includes('Network request failed') || fmsg?.includes('Failed to fetch') || fcode === 'ECONNREFUSED' || fcode === 'ENOTFOUND') {
          debugLog('[api] sin conexión detectada')
          throw new NetworkError('Sin conexión a internet')
        }
      }
      throw fetchError
    } finally {
      clearTimeout(to)
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      debugLog('[api] non-ok response', res.status, text)
      await throwApiErrorFrom(res.status, text)
    }
    return await res.json()
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'name' in e && (e as Record<string, unknown>).name === 'AbortError') {
      throw new TimeoutError()
    }
    if (e instanceof NetworkError || e instanceof TimeoutError) {
      throw e
    }
    const emsg = (typeof e === 'object' && e !== null && 'message' in e) ? String((e as Record<string, unknown>)['message']) : String(e)
    debugLog('[api] fetch error', emsg)
    throw e
  }
}

export async function apiDelete(endpoint: string): Promise<any> {
  const url = `${BASE_URL}${endpoint}`
  
  try {
    const headers = buildHeaders({ 'Content-Type': 'application/json' })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DELETE_TIMEOUT)

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      await throwApiErrorFrom(response.status, text)
    }

    // DELETE puede devolver 204 No Content o un JSON
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }
    
    return { success: true }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new TimeoutError(`Request timeout after ${DELETE_TIMEOUT}ms`)
    }
    if (error.message?.includes('Network request failed')) {
      throw new NetworkError('No se pudo conectar al servidor')
    }
    throw error
  }
}
