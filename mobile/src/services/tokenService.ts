import CryptoJS from 'crypto-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import config from '../config'

type ConfigType = {
  TimeoutTokenCredencial?: number
}

type CredLike = Record<string, unknown>

type MutableCred = CredLike & {
  tokenTemporal?: string
  tokenTemporalGeneradoEn?: string
  tokenTemporalVenceEn?: string
  crcreafili?: string
  AfiliadoId?: string
  crcrefecvi?: string
}

const STORAGE_KEY = 'TimeoutTokenCredencial'

type AttachTokensOptions = {
  skipIfVigenciaVencida?: boolean
}

export async function getTimeoutMinutes(): Promise<number> {
  try {
    // Leer de cache local (guardado desde el login)
    const v = await AsyncStorage.getItem(STORAGE_KEY)
    if (v) {
      const n = parseInt(v, 10)
      if (!isNaN(n) && n > 0) {
        console.log(`⏱️  TimeoutTokenCredencial desde cache: ${n} minutos`)
        return Math.max(1, n)
      }
    }
  } catch {
    // ignore
  }

  // Fallback al config (añadir en mobile/src/config.ts si quieres cambiar)
  // Si no existe, default 10
  const cfg = config as ConfigType
  const cfgVal = cfg?.TimeoutTokenCredencial ?? null
  const n = cfgVal ? parseInt(String(cfgVal), 10) : NaN
  const timeout = (!n || isNaN(n) || n <= 0) ? 10 : Math.max(1, n)
  console.log(`⏱️  TimeoutTokenCredencial fallback: ${timeout} minutos`)
  return timeout
}

export function generateTokenSync(afiliadoId: string, timeoutMinutes: number, now = new Date()): string {
  const bucketMs = timeoutMinutes * 60 * 1000
  const epoch = now.getTime()
  const bucket = Math.floor(epoch / bucketMs)
  const payload = `${afiliadoId}:${bucket}`
  const hashHex = CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex)
  // Tomar primeros 8 hex -> 4 bytes -> entero
  const first8 = hashHex.slice(0, 8)
  const intVal = parseInt(first8, 16)
  const tokenNum = intVal % 1000
  return String(tokenNum).padStart(3, '0')
}

export function verifyTokenSync(afiliadoId: string, timeoutMinutes: number, tokenToCheck: string, now = new Date(), toleranceBuckets = 1): boolean {
  for (let delta = -toleranceBuckets; delta <= toleranceBuckets; delta++) {
    const testTime = new Date(now.getTime() + delta * timeoutMinutes * 60 * 1000)
    if (generateTokenSync(afiliadoId, timeoutMinutes, testTime) === tokenToCheck) return true
  }
  return false
}

export async function attachTokensToCredenciales(
  credenciales: CredLike[],
  afiliadoIdFallback: string | null = null,
  options: AttachTokensOptions = {}
) {
  // Si se requiere, no generar token en credenciales vencidas (uso típico: modo offline)
  const shouldSkipIfVigenciaVencida = Boolean(options?.skipIfVigenciaVencida)

  const isVigenciaVencida = (crcrefecvi: unknown): boolean => {
    if (!crcrefecvi) return true
    const s = String(crcrefecvi).slice(0, 10)
    // Comparación segura para formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const todayStr = new Date().toISOString().slice(0, 10)
      return s < todayStr
    }
    const d = new Date(String(crcrefecvi))
    if (isNaN(d.getTime())) return true
    return d.getTime() < Date.now()
  }

  const timeout = await getTimeoutMinutes()
  const now = new Date()
  for (const c of credenciales || []) {
    const mc = c as MutableCred

    if (shouldSkipIfVigenciaVencida && isVigenciaVencida(mc.crcrefecvi)) {
      mc.tokenTemporal = undefined
      mc.tokenTemporalGeneradoEn = undefined
      mc.tokenTemporalVenceEn = undefined
      continue
    }

    const afiliadoForTokenRaw = (mc.crcreafili as string | undefined) || (mc.AfiliadoId as string | undefined) || afiliadoIdFallback
    if (!afiliadoForTokenRaw) {
      console.warn(
        '[tokenService] No afiliadoId found for credencial, skipping token generation. Keys:',
        Object.keys(mc)
      )
      mc.tokenTemporal = undefined
      mc.tokenTemporalGeneradoEn = undefined
      mc.tokenTemporalVenceEn = undefined
      continue
    }
    const afiliadoForToken = String(afiliadoForTokenRaw)
    mc.tokenTemporal = generateTokenSync(afiliadoForToken, timeout, now)
    mc.tokenTemporalGeneradoEn = now.toISOString()
    mc.tokenTemporalVenceEn = new Date(now.getTime() + timeout * 60 * 1000).toISOString()
  }
  return credenciales
}

export async function setTimeoutMinutes(value: number) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(Math.max(1, Math.floor(value))))
  } catch {
    // ignore
  }
}

export default {
  getTimeoutMinutes,
  generateTokenSync,
  verifyTokenSync,
  attachTokensToCredenciales,
  setTimeoutMinutes,
}
