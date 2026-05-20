/**
 * siaClient.ts — Cliente SOAP SIA para Next.js.
 *
 * Replica la lógica de callSoapExecuteSIA / parseSoapResult del backend Express
 * (prototipo/backend/server-soap.js) usando la tabla nusispar vía Prisma.
 *
 * Grupo de parámetros en nusispar: WSSIATK
 * Claves: Host, Port, Secure, BaseUrl, Servicio, User, Password
 */
import { createClientAsync, type Client as SoapClient } from 'soap'
import https from 'https'
import { prisma } from '@/lib/prisma'

// ─── Caché de parámetros ──────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

const paramCache = new Map<string, string>()
let paramCacheAt = 0

async function reloadParams() {
  try {
    const rows = await prisma.nusispar.findMany({ select: { nusisgrupa: true, nusistippa: true, nusisvalpa: true } })
    paramCache.clear()
    for (const r of rows) {
      paramCache.set(`${r.nusisgrupa.trim()}.${r.nusistippa.trim()}`, r.nusisvalpa)
    }
    paramCacheAt = Date.now()
  } catch (err) {
    console.error('[siaClient] Error recargando parámetros:', err)
  }
}

export async function getParam(grupo: string, tipo: string, fallback: string | null = null): Promise<string | null> {
  if (Date.now() - paramCacheAt > CACHE_TTL_MS) {
    await reloadParams()
  }
  const key = `${grupo}.${tipo}`
  const val = paramCache.get(key) ?? paramCache.get(`${grupo.toUpperCase()}.${tipo}`) ?? paramCache.get(`${grupo.toUpperCase()}.${tipo.toUpperCase()}`)
  if (val !== undefined) return val
  // Fallback directo a BD si no está en caché
  try {
    const row = await prisma.nusispar.findFirst({
      where: { nusisgrupa: { equals: grupo, mode: 'insensitive' }, nusistippa: { equals: tipo, mode: 'insensitive' } },
      select: { nusisvalpa: true },
    })
    if (row) return row.nusisvalpa
  } catch { /* ignorar */ }
  return fallback
}

export async function getParamNumber(grupo: string, tipo: string, fallback = 0): Promise<number> {
  const val = await getParam(grupo, tipo, String(fallback))
  const n = parseInt(val ?? '')
  return isNaN(n) ? fallback : n
}

// ─── Constructor de URL SOAP ──────────────────────────────────────────────────

async function buildSoapUrl(includeWsdl = false): Promise<string> {
  const host = await getParam('WSSIATK', 'Host', null)
  const port = await getParam('WSSIATK', 'Port', null)
  const secure = await getParam('WSSIATK', 'Secure', null)
  const baseUrl = await getParam('WSSIATK', 'BaseUrl', null)
  const servicio = await getParam('WSSIATK', 'Servicio', null)

  if (!host || !port || !secure || !baseUrl || !servicio) {
    throw new Error('Configuración incompleta en nusispar (WSSIATK): faltan Host, Port, Secure, BaseUrl o Servicio')
  }

  const protocol = secure === '1' ? 'https' : 'http'
  const url = `${protocol}://${host}:${port}${baseUrl}${servicio}`
  return includeWsdl ? `${url}?WSDL` : url
}

// ─── Singleton de cliente SOAP ────────────────────────────────────────────────

let soapClient: SoapClient | null = null

async function getClient(): Promise<SoapClient> {
  if (soapClient) return soapClient

  const wsdlUrl = await buildSoapUrl(true)
  const soapUser = await getParam('WSSIATK', 'User', null)
  const soapPass = await getParam('WSSIATK', 'Password', null)

  if (!soapUser || !soapPass) {
    throw new Error('Credenciales SOAP SIA no configuradas en nusispar (WSSIATK.User / WSSIATK.Password)')
  }

  const agent = new https.Agent({ keepAlive: true, rejectUnauthorized: false, maxSockets: 20 })

  // NODE_TLS_REJECT_UNAUTHORIZED=0 replica el comportamiento del Express
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const client = await createClientAsync(wsdlUrl, {
    wsdl_options: { timeout: 45000, strictSSL: false, rejectUnauthorized: false, forever: true, agent, minVersion: 'TLSv1' },
    wsdl_headers: { USUARIO: soapUser, PASSWORD: soapPass },
  })
  client.addHttpHeader('USUARIO', soapUser)
  client.addHttpHeader('PASSWORD', soapPass)

  const endpoint = await buildSoapUrl(false)
  client.setEndpoint(endpoint)

  soapClient = client
  return client
}

// ─── Execute SIA ─────────────────────────────────────────────────────────────

export type SiaResult = unknown[]

export async function executeSIA(servicio: string, parametros: Record<string, unknown> | string): Promise<SiaResult> {
  const client = await getClient()

  const soapUser = await getParam('WSSIATK', 'User', '')
  const soapPass = await getParam('WSSIATK', 'Password', '')

  // Nunca incluir credenciales en el body
  let cleanParams: Record<string, unknown> | string = parametros
  if (parametros !== '' && typeof parametros === 'object') {
    const cleaned = { ...parametros }
    for (const k of ['USUARIO', 'PASSWORD', 'Usuario', 'Password', 'user', 'pass']) {
      delete cleaned[k]
    }
    cleanParams = cleaned
  }

  const parametrosStr = cleanParams === '' ? '' : JSON.stringify(cleanParams)
  const payload = { Servicio: servicio, Parametros: parametrosStr }
  const options = { headers: { USUARIO: soapUser ?? '', PASSWORD: soapPass ?? '' } }

  try {
    return (await client.ExecuteAsync(payload, options)) as SiaResult
  } catch (e) {
    const msg = String((e as Error)?.message ?? e)
    if (/EPROTO|SSL|tls_get_more/i.test(msg)) {
      // Reintentar con HTTP
      const httpEndpoint = (await buildSoapUrl(false)).replace(/^https:/i, 'http:')
      client.setEndpoint(httpEndpoint)
      try {
        const out = (await client.ExecuteAsync(payload, options)) as SiaResult
        // Restaurar endpoint original
        client.setEndpoint(await buildSoapUrl(false))
        return out
      } catch (e2) {
        client.setEndpoint(await buildSoapUrl(false))
        throw e2
      }
    }
    throw e
  }
}

// ─── WSBENEFTK SOAP client (Beneficiarios / REGISTRACION) ────────────────────

let benefClient: SoapClient | null = null

async function buildBenefUrl(includeWsdl = false): Promise<string> {
  const host = await getParam('WSBENEFTK', 'Host', null)
  const port = await getParam('WSBENEFTK', 'Port', null)
  const secure = await getParam('WSBENEFTK', 'Secure', null)
  const baseUrl = await getParam('WSBENEFTK', 'BaseUrl', null)
  const servicio = await getParam('WSBENEFTK', 'Servicio', null)

  if (!host || !port || !secure || !baseUrl || !servicio) {
    throw new Error('Configuración incompleta en nusispar (WSBENEFTK): faltan Host, Port, Secure, BaseUrl o Servicio')
  }

  const protocol = secure === '1' ? 'https' : 'http'
  const url = `${protocol}://${host}:${port}${baseUrl}${servicio}`
  return includeWsdl ? `${url}?WSDL` : url
}

async function getBenefClient(): Promise<SoapClient> {
  if (benefClient) return benefClient

  const wsdlUrl = await buildBenefUrl(true)
  const soapUser = await getParam('WSBENEFTK', 'User', null)
  const soapPass = await getParam('WSBENEFTK', 'Password', null)

  if (!soapUser || !soapPass) {
    throw new Error('Credenciales SOAP BENEF no configuradas en nusispar (WSBENEFTK.User / WSBENEFTK.Password)')
  }

  const agent = new https.Agent({ keepAlive: true, rejectUnauthorized: false, maxSockets: 20 })
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const client = await createClientAsync(wsdlUrl, {
    wsdl_options: { timeout: 45000, strictSSL: false, rejectUnauthorized: false, forever: true, agent, minVersion: 'TLSv1' },
    wsdl_headers: { USUARIO: soapUser, PASSWORD: soapPass },
  })
  client.addHttpHeader('USUARIO', soapUser)
  client.addHttpHeader('PASSWORD', soapPass)
  client.setEndpoint(await buildBenefUrl(false))

  benefClient = client
  return client
}

// Servicios WSBENEFTK que requieren doble envoltura de Parametros
const SERVICIOS_CON_ENVOLTURA = ['REGISTRACION']

export async function executeBenef(servicio: string, parametros: Record<string, unknown>): Promise<SiaResult> {
  const client = await getBenefClient()
  const soapUser = await getParam('WSBENEFTK', 'User', '')
  const soapPass = await getParam('WSBENEFTK', 'Password', '')

  // REGISTRACION requiere doble envoltura: { Parametros: { ...campos } }
  const parametrosStr = SERVICIOS_CON_ENVOLTURA.includes(servicio)
    ? JSON.stringify({ Parametros: parametros })
    : JSON.stringify(parametros)

  const payload = { Servicio: servicio, Parametros: parametrosStr }
  const options = { headers: { USUARIO: soapUser ?? '', PASSWORD: soapPass ?? '' } }

  try {
    return (await client.ExecuteAsync(payload, options)) as SiaResult
  } catch (e) {
    const msg = String((e as Error)?.message ?? e)
    if (/EPROTO|SSL|tls_get_more/i.test(msg)) {
      const httpEndpoint = (await buildBenefUrl(false)).replace(/^https:/i, 'http:')
      client.setEndpoint(httpEndpoint)
      try {
        const out = (await client.ExecuteAsync(payload, options)) as SiaResult
        client.setEndpoint(await buildBenefUrl(false))
        return out
      } catch (e2) {
        client.setEndpoint(await buildBenefUrl(false))
        throw e2
      }
    }
    throw e
  }
}

// ─── Parse de respuesta SOAP ──────────────────────────────────────────────────

export interface SiaParsed {
  ok: boolean
  payload: Record<string, unknown>
  mensajes: Array<{ Id?: string; Type?: string; Description?: string }>
  mensajesRaw: string | null
  errorDsc: string | null
}

export function parseSoapResult(resultArr: unknown): SiaParsed {
  const out: SiaParsed = { ok: false, payload: {}, mensajes: [], mensajesRaw: null, errorDsc: null }
  try {
    const payload = (Array.isArray(resultArr) ? resultArr[0] : resultArr) as Record<string, unknown> ?? {}
    out.payload = payload

    // Parsear Resultado si es JSON
    let resultadoParsed: Record<string, unknown> | null = null
    if (typeof payload.Resultado === 'string' && (payload.Resultado as string).trim().startsWith('{')) {
      try { resultadoParsed = JSON.parse(payload.Resultado as string) } catch { /* ignorar */ }
    }

    if (resultadoParsed?.ErrorDsc) {
      out.errorDsc = resultadoParsed.ErrorDsc as string
      out.ok = false
    }

    let mensajesStr = ((payload.Mensajes ?? payload.mensajes) as string) || ''

    if (!mensajesStr && typeof payload.Resultado === 'string') {
      const trim = (payload.Resultado as string).trim()
      if (trim.startsWith('[')) {
        try {
          const arr = JSON.parse(trim) as Array<Record<string, unknown>>
          if (Array.isArray(arr) && arr.length > 0 && 'Type' in arr[0] && 'Description' in arr[0]) {
            mensajesStr = trim
          }
        } catch { /* ignorar */ }
      }
    }

    out.mensajesRaw = mensajesStr || null
    if (mensajesStr) {
      const arr = JSON.parse(mensajesStr) as typeof out.mensajes
      if (Array.isArray(arr)) {
        out.mensajes = arr
        const hasError = arr.some((m) => String(m.Type) === '0' || String(m.Type) === '1')
        if (hasError && !out.errorDsc) {
          out.ok = false
          out.errorDsc = arr.map((m) => m.Description).join('; ')
        } else if (!out.errorDsc) {
          out.ok = true
        }
      } else {
        out.ok = false
      }
    } else {
      if (!out.errorDsc) out.ok = true
    }
  } catch { out.ok = false }
  return out
}
