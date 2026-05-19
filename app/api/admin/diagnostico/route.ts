import { ok } from '@/lib/api-response'
import { requireAdmin } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'

interface ServiceCheck {
  name: string
  endpoint: string
  ok: boolean
  status?: number
  latencyMs: number
  error?: string
}

async function runCheck(
  name: string,
  url: string,
  acceptedStatuses = [200, 301, 302, 307, 308],
): Promise<ServiceCheck> {
  const t0 = Date.now()
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'manual', cache: 'no-store' })
    clearTimeout(timer)
    return {
      name,
      endpoint: url,
      ok: acceptedStatuses.includes(res.status),
      status: res.status,
      latencyMs: Date.now() - t0,
    }
  } catch (err: unknown) {
    return {
      name,
      endpoint: url,
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    }
  }
}

async function checkDB(): Promise<ServiceCheck> {
  const t0 = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { name: 'Base de datos', endpoint: 'postgresql', ok: true, latencyMs: Date.now() - t0 }
  } catch (err: unknown) {
    return {
      name: 'Base de datos',
      endpoint: 'postgresql',
      ok: false,
      error: (err as Error).message,
      latencyMs: Date.now() - t0,
    }
  }
}

/** Lee parámetros de un grupo nusispar y construye la URL del WS.
 *  Replica la lógica de buildSoapUrl / buildSoapUrlSIA del prototipo.
 */
async function buildWsUrl(grupo: string): Promise<string | null> {
  const rows = await prisma.nusispar.findMany({
    where: {
      nusisgrupa: grupo,
      nusistippa: { in: ['Host', 'Port', 'Secure', 'BaseUrl', 'Servicio'] },
    },
    select: { nusistippa: true, nusisvalpa: true },
  })

  const p = Object.fromEntries(rows.map((r) => [r.nusistippa.trim(), r.nusisvalpa.trim()]))
  const { Host, Port, Secure, BaseUrl, Servicio } = p

  if (!Host || !Port || !Secure || !BaseUrl || !Servicio) return null

  const protocol = Secure === '1' ? 'https' : 'http'
  return `${protocol}://${Host}:${Port}${BaseUrl}${Servicio}?WSDL`
}

export async function GET(req: Request) {
  const authResult = await requireAdmin(req)
  if (authResult.error) return authResult.error

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? 'http://localhost:3020'
  const startedAt = Date.now()

  // Leer URLs de WS desde nusispar (en paralelo con el resto)
  const [urlBeneftk, urlSiatk] = await Promise.all([
    buildWsUrl('WSBENEFTK'),
    buildWsUrl('WSSIATK'),
  ])

  const checksToRun: Promise<ServiceCheck>[] = [
    checkDB(),
    runCheck('UI inicio', `${appUrl}/`, [200, 301, 302, 307, 308]),
    runCheck('UI admin', `${appUrl}/admin`, [200, 301, 302, 307, 308]),
    runCheck('API auth session', `${appUrl}/api/auth/session`, [200]),
    // APIs internas protegidas — 307 = middleware activo y ruta existe
    runCheck('API noticias', `${appUrl}/api/admin/noticias`, [200, 401, 403, 307]),
    runCheck('API cartilla', `${appUrl}/api/admin/cartilla`, [200, 401, 403, 307]),
    runCheck('API parámetros', `${appUrl}/api/admin/parametros`, [200, 401, 403, 307]),
  ]

  // WS SOAP desde nusispar (acepta 401/403/405 — responde = está up)
  if (urlBeneftk) {
    checksToRun.push(runCheck('WS BENEFTK', urlBeneftk, [200, 401, 403, 405, 500]))
  }
  if (urlSiatk) {
    checksToRun.push(runCheck('WS SIATK', urlSiatk, [200, 401, 403, 405, 500]))
  }

  const results = await Promise.all(checksToRun)

  const wsChecks = results.filter((c) => c.name === 'WS BENEFTK' || c.name === 'WS SIATK')
  const soapConnected =
    wsChecks.length > 0 && wsChecks.every((c) => c.ok)

  const okCount = results.filter((c) => c.ok).length
  const suiteOk = okCount === results.length

  const health = {
    status: suiteOk ? 'ok' : 'degraded',
    soapConnected,
    observability: {
      uptimeSeconds: Math.floor(process.uptime()),
      requestsTotal: 0,
      requestsInFlight: 0,
      errors5xx: 0,
    },
  }

  const suite = {
    ok: suiteOk,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    totals: { total: results.length, ok: okCount, failed: results.length - okCount },
    checks: results,
  }

  return ok({ health, suite })
}
