// Cargar variables de entorno desde .env
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const { z } = require('zod')

const { validateBody, validateQuery, validateParams } = require('./zodMiddleware')
const soap = require('soap')
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const http = require('http')
const https = require('https')
let jwt = null
try {
  // eslint-disable-next-line global-require
  jwt = require('jsonwebtoken')
} catch {
  jwt = null
}
const db = require('./db/connection')
const { getPrisma } = require('./db/prismaClient')
const userRepository = require('./repositories/userRepository')
const credencialesRepository = require('./repositories/credencialesRepository')
const parametrosRepository = require('./repositories/parametrosRepository')
const infoUtilRepository = require('./repositories/infoUtilRepository')
const favoritosRepository = require('./repositories/favoritosRepository')
const cartillaRepository = require('./repositories/cartillaRepository')
const geocodingService = require('./services/geocodingService')
const cartillaImportService = require('./services/cartillaImportService')
const gamService = require('./gamService')
const featureFlagsService = require('./featureFlagsService')
let config = {}
try {
  // eslint-disable-next-line global-require
  config = require('./config.json')
} catch {
  console.warn('⚠️  config.json no encontrado — usando sólo variables de entorno para GAM y otros ajustes')
  config = {
    gam: {
      enabled: process.env.GAM_ENABLED !== 'false',
      baseUrl: process.env.GAM_BASE_URL || '',
      clientId: process.env.GAM_CLIENT_ID || '',
      clientSecret: process.env.GAM_CLIENT_SECRET || '',
    }
  }
}
const multer = require('multer')
const DEFAULT_UPLOADS_ROOT = path.join(__dirname, 'uploads')
let resolvedUploadsRoot = null

function ensureWritableDirectory(dir) {
  fs.mkdirSync(dir, { recursive: true })
  fs.accessSync(dir, fs.constants.W_OK)
  return dir
}

function resolveUploadsRoot() {
  if (resolvedUploadsRoot) return resolvedUploadsRoot

  const candidates = [
    process.env.UPLOADS_DIR,
    DEFAULT_UPLOADS_ROOT,
    path.join(os.tmpdir(), 'app_afiliados_uploads')
  ].filter(Boolean)

  let lastError = null
  for (const candidate of candidates) {
    try {
      resolvedUploadsRoot = ensureWritableDirectory(candidate)
      if (resolvedUploadsRoot !== DEFAULT_UPLOADS_ROOT) {
        console.warn(`⚠️  Uploads usando ruta alternativa: ${resolvedUploadsRoot}`)
      }
      return resolvedUploadsRoot
    } catch (err) {
      lastError = err
      console.warn(`⚠️  Uploads no disponible en ${candidate}: ${err.message}`)
    }
  }

  throw lastError || new Error('No se pudo resolver una carpeta escribible para uploads')
}

function getUploadsDir(...segments) {
  return ensureWritableDirectory(path.join(resolveUploadsRoot(), ...segments))
}

function getUploadAbsolutePathFromUrl(urlPath) {
  if (!urlPath || !urlPath.startsWith('/uploads/')) return null

  const relativePath = urlPath.replace(/^\/uploads\//, '')
  const absolutePath = path.resolve(resolveUploadsRoot(), relativePath)
  const uploadsRoot = path.resolve(resolveUploadsRoot())

  if (!absolutePath.startsWith(uploadsRoot)) return null
  return absolutePath
}

const upload = multer({
  dest: getUploadsDir('tmp')
})

function sendLegacyValidationError(res, message, path = '') {
  return res.status(422).json({
    error: 'VALIDATION_ERROR',
    message: 'Solicitud inválida',
    context: 'body',
    issues: [
      {
        path,
        code: 'custom',
        message,
      },
    ],
  })
}

// Storage dedicado para imágenes de noticias
const uploadNoticias = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = getUploadsDir('noticias')
      cb(null, dir)
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      cb(null, `noticia_${Date.now()}${ext}`)
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true)
    else cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'))
  }
})
const yamlMiddleware = require('./yamlMiddleware')

// Storage dedicado para imágenes de planes
const uploadPlanes = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = getUploadsDir('planes')
      cb(null, dir)
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      const planId = (req.params.id || 'plan').replace(/[^a-zA-Z0-9_-]/g, '_')
      cb(null, `plan_${planId}${ext}`)
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true)
    else cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'))
  }
})
const yaml = require('js-yaml')
const PDFDocument = require('pdfkit')

const app = express()
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000
const ADMIN_AUTH_COOKIE_NAME = 'admin_auth_token'
const ADMIN_AUTH_COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000
// WSDL_URL ahora se lee dinámicamente desde nusispar (grupo wsbeneftk)
// SOAP_USER y SOAP_PASSWORD también se leen dinámicamente desde nusispar

const MAX_RECENT_ERRORS = 100
const INFLIGHT_ALERT_THRESHOLD = Number(process.env.OPS_INFLIGHT_ALERT_THRESHOLD || 120)
const INFLIGHT_ALERT_COOLDOWN_MS = Number(process.env.OPS_INFLIGHT_ALERT_COOLDOWN_MS || 60000)
const observabilityState = {
  startedAt: new Date().toISOString(),
  requestsTotal: 0,
  requestsInFlight: 0,
  errors5xx: 0,
  byStatus: {},
  byRoute: {},
  latencyMs: {
    total: 0,
    count: 0,
    max: 0,
  },
  recentErrors: [],
  dependencies: {
    checksTotal: 0,
    failedTotal: 0,
    byDependency: {},
    lastRunAt: null,
  },
}

let lastInFlightAlertAt = 0

function generateRequestId() {
  return `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || req.ip || 'unknown'
}

function getCookieValue(req, name) {
  if (req.cookies && Object.prototype.hasOwnProperty.call(req.cookies, name)) {
    return req.cookies[name]
  }

  const rawCookie = req.headers?.cookie
  if (!rawCookie || !name) return null
  const pairs = String(rawCookie).split(';')
  for (const pair of pairs) {
    const index = pair.indexOf('=')
    if (index <= 0) continue
    const key = pair.slice(0, index).trim()
    if (key !== name) continue
    const value = pair.slice(index + 1).trim()
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  return null
}

function setAdminAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production'
  res.cookie(ADMIN_AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: ADMIN_AUTH_COOKIE_MAX_AGE_MS,
  })
}

function clearAdminAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production'
  res.clearCookie(ADMIN_AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
  })
}

function pushRecentError(entry) {
  observabilityState.recentErrors.unshift(entry)
  if (observabilityState.recentErrors.length > MAX_RECENT_ERRORS) {
    observabilityState.recentErrors.length = MAX_RECENT_ERRORS
  }
}

function getObservabilitySnapshot() {
  const avgLatencyMs = observabilityState.latencyMs.count > 0
    ? Number((observabilityState.latencyMs.total / observabilityState.latencyMs.count).toFixed(2))
    : 0

  return {
    startedAt: observabilityState.startedAt,
    uptimeSeconds: Math.floor(process.uptime()),
    requests: {
      total: observabilityState.requestsTotal,
      inFlight: observabilityState.requestsInFlight,
      errors5xx: observabilityState.errors5xx,
      byStatus: observabilityState.byStatus,
      byRoute: observabilityState.byRoute,
    },
    latencyMs: {
      avg: avgLatencyMs,
      max: Number(observabilityState.latencyMs.max.toFixed(2)),
    },
    dependencies: observabilityState.dependencies,
    recentErrors: observabilityState.recentErrors,
  }
}

function maybeEmitInFlightAlert(req, requestId) {
  const currentInFlight = observabilityState.requestsInFlight
  const now = Date.now()

  if (currentInFlight < INFLIGHT_ALERT_THRESHOLD) return
  if (now - lastInFlightAlertAt < INFLIGHT_ALERT_COOLDOWN_MS) return

  lastInFlightAlertAt = now

  const payload = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    event: 'ops_inflight_alert',
    requestId,
    method: req.method,
    path: req.originalUrl || req.path,
    requestsInFlight: currentInFlight,
    threshold: INFLIGHT_ALERT_THRESHOLD,
    cooldownMs: INFLIGHT_ALERT_COOLDOWN_MS,
  }

  console.warn(JSON.stringify(payload))
  pushRecentError(payload)
}

const FUNCTIONAL_EVENT_RULES = [
  { method: 'POST', path: '/auth/login', event: 'login_success', module: 'auth', screen: 'LoginScreen' },
  { method: 'GET', path: '/credencial', event: 'credencial_view', module: 'credencial', screen: 'HomeScreen' },
  { method: 'GET', path: '/credenciales', event: 'credenciales_view', module: 'credencial', screen: 'CredencialesScreen' },
  { method: 'GET', path: '/mis-autorizaciones', event: 'autorizaciones_view', module: 'autorizaciones', screen: 'MisAutorizacionesScreen' },
  { method: 'POST', path: '/sia/crear-solicitud', event: 'autorizacion_create', module: 'autorizaciones', screen: 'SolicitudAutorizacionScreen' },
  { method: 'GET', path: '/api/cartilla', event: 'cartilla_view', module: 'cartilla', screen: 'CartillaMapScreen' },
  { method: 'GET', path: '/notifications', event: 'notifications_view', module: 'notificaciones', screen: 'NotificationsScreen' },
]

let functionalAnalyticsTableReady = false
let functionalAnalyticsTablePromise = null

async function ensureFunctionalAnalyticsTable() {
  if (functionalAnalyticsTableReady) return
  if (functionalAnalyticsTablePromise) return functionalAnalyticsTablePromise

  functionalAnalyticsTablePromise = (async () => {
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS app_functional_events (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        event_name VARCHAR(80) NOT NULL,
        module VARCHAR(50) NOT NULL,
        screen VARCHAR(80) NOT NULL,
        method VARCHAR(10) NOT NULL,
        path VARCHAR(255) NOT NULL,
        status_code INTEGER NOT NULL,
        nuusuid VARCHAR(100),
        actor VARCHAR(120),
        platform VARCHAR(40),
        app_version VARCHAR(40),
        metadata JSONB
      )
    `)

    await db.pool.query('CREATE INDEX IF NOT EXISTS idx_app_functional_events_created_at ON app_functional_events (created_at DESC)')
    await db.pool.query('CREATE INDEX IF NOT EXISTS idx_app_functional_events_event_name ON app_functional_events (event_name)')
    await db.pool.query('CREATE INDEX IF NOT EXISTS idx_app_functional_events_module ON app_functional_events (module)')

    functionalAnalyticsTableReady = true
  })()

  try {
    await functionalAnalyticsTablePromise
  } finally {
    functionalAnalyticsTablePromise = null
  }
}

function resolveFunctionalEvent(req, statusCode) {
  if ((statusCode || 0) >= 400) return null

  const method = String(req.method || '').toUpperCase()
  const pathName = String(req.path || '').trim()
  return FUNCTIONAL_EVENT_RULES.find((rule) => rule.method === method && rule.path === pathName) || null
}

async function writeFunctionalEvent(req, rule, statusCode) {
  try {
    await ensureFunctionalAnalyticsTable()

    const session = req.session || {}
    const actorFromBody = req.body?.username || req.body?.email || null
    const actor = (session.email || session.username || actorFromBody || '').toString().trim() || null

    await db.pool.query(
      `INSERT INTO app_functional_events (
        event_name, module, screen, method, path, status_code,
        nuusuid, actor, platform, app_version, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
      [
        rule.event,
        rule.module,
        rule.screen,
        req.method,
        req.path,
        Number(statusCode || 0),
        session.nuusuid || null,
        actor,
        String(req.get('x-client-platform') || req.get('x-platform') || '').trim() || null,
        String(req.get('x-app-version') || '').trim() || null,
        JSON.stringify({
          requestId: req.requestId || null,
          ip: getClientIp(req),
          userAgent: req.get('user-agent') || '',
        }),
      ]
    )
  } catch (error) {
    console.warn('⚠️ No se pudo registrar evento funcional:', error.message)
  }
}

let credencialLayoutTableReady = false
let credencialLayoutTablePromise = null

const CREDENCIAL_SAFE_FONT_FAMILIES = new Set(['System', 'sans-serif', 'serif', 'monospace'])
const CREDENCIAL_FONT_FAMILY_ALIASES = {
  'arial': 'sans-serif',
  'helvetica': 'sans-serif',
  'verdana': 'sans-serif',
  'trebuchet ms': 'sans-serif',
  'times new roman': 'serif',
  'georgia': 'serif',
  'courier new': 'monospace',
}

function normalizeCredencialFontFamily(value) {
  const raw = String(value || 'System').trim()
  if (!raw) return 'System'
  if (CREDENCIAL_SAFE_FONT_FAMILIES.has(raw)) return raw
  const mapped = CREDENCIAL_FONT_FAMILY_ALIASES[raw.toLowerCase()]
  return mapped || 'System'
}

function getDefaultCredencialLayoutConfig() {
  return {
    version: 1,
    canvas: {
      width: 360,
      height: 280,
    },
    fields: {
      nombre: { x: 16, y: 96, fontFamily: 'System', fontSize: 20, fontWeight: '700', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: false, titlePosition: 'invisible', titleFontSize: 10 },
      parentesco: { x: 16, y: 126, fontFamily: 'System', fontSize: 13, fontWeight: '600', fontStyle: 'normal', color: '#E5E7EB', hidden: false, allowEyeToggle: false, titlePosition: 'invisible', titleFontSize: 10 },
      nroAfiliado: { x: 16, y: 162, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true, titlePosition: 'izquierda', titleFontSize: 10 },
      dni: { x: 16, y: 186, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true, titlePosition: 'izquierda', titleFontSize: 10 },
      cuil: { x: 16, y: 210, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true, titlePosition: 'izquierda', titleFontSize: 10 },
      plan: { x: 196, y: 162, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: false, titlePosition: 'izquierda', titleFontSize: 10 },
      fechaNacimiento: { x: 196, y: 186, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true, titlePosition: 'izquierda', titleFontSize: 10 },
      vigencia: { x: 196, y: 210, fontFamily: 'System', fontSize: 12, fontWeight: '700', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: false, titlePosition: 'izquierda', titleFontSize: 10 },
      token: { x: 286, y: 234, fontFamily: 'System', fontSize: 28, fontWeight: '700', fontStyle: 'normal', color: '#F59E0B', hidden: false, allowEyeToggle: false, titlePosition: 'invisible', titleFontSize: 10 },
    },
  }
}

function normalizeCredencialLayoutConfig(rawConfig) {
  const base = getDefaultCredencialLayoutConfig()
  const incoming = rawConfig && typeof rawConfig === 'object' ? rawConfig : {}
  const incomingFields = incoming.fields && typeof incoming.fields === 'object' ? incoming.fields : {}
  const fields = {}

  Object.entries(base.fields).forEach(([key, value]) => {
    const current = incomingFields[key] && typeof incomingFields[key] === 'object' ? incomingFields[key] : {}
    const titlePositionRaw = String(current.titlePosition || value.titlePosition || 'invisible').toLowerCase()
    const titlePosition = ['izquierda', 'superior', 'inferior', 'derecha', 'invisible'].includes(titlePositionRaw)
      ? titlePositionRaw
      : String(value.titlePosition || 'invisible')
    fields[key] = {
      x: Number.isFinite(Number(current.x)) ? Number(current.x) : value.x,
      y: Number.isFinite(Number(current.y)) ? Number(current.y) : value.y,
      fontFamily: normalizeCredencialFontFamily(current.fontFamily || value.fontFamily || 'System'),
      fontSize: Number.isFinite(Number(current.fontSize)) ? Number(current.fontSize) : value.fontSize,
      fontWeight: ['400', '500', '600', '700', '800', '900', 'normal', 'bold'].includes(String(current.fontWeight || '')) ? String(current.fontWeight) : value.fontWeight,
      fontStyle: ['normal', 'italic'].includes(String(current.fontStyle || '')) ? String(current.fontStyle) : value.fontStyle,
      color: /^#[0-9a-fA-F]{6}$/.test(String(current.color || '')) ? String(current.color) : value.color,
      hidden: typeof current.hidden === 'boolean' ? current.hidden : value.hidden,
      allowEyeToggle: typeof current.allowEyeToggle === 'boolean' ? current.allowEyeToggle : value.allowEyeToggle,
      titlePosition,
      titleFontSize: Math.max(8, Math.min(40, Number.isFinite(Number(current.titleFontSize)) ? Number(current.titleFontSize) : Number(value.titleFontSize || 10))),
    }
  })

  return {
    version: Number.isFinite(Number(incoming.version)) ? Number(incoming.version) : 1,
    canvas: {
      width: Number.isFinite(Number(incoming?.canvas?.width)) ? Number(incoming.canvas.width) : base.canvas.width,
      height: Number.isFinite(Number(incoming?.canvas?.height)) ? Number(incoming.canvas.height) : base.canvas.height,
    },
    fields,
  }
}

async function ensureCredencialLayoutTable() {
  if (credencialLayoutTableReady) return
  if (credencialLayoutTablePromise) return credencialLayoutTablePromise

  credencialLayoutTablePromise = (async () => {
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS app_credencial_layout (
        id BIGSERIAL PRIMARY KEY,
        scope_type VARCHAR(10) NOT NULL CHECK (scope_type IN ('GENERAL', 'PLAN')),
        plan_id VARCHAR(30),
        config_json JSONB NOT NULL,
        updated_by VARCHAR(120),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (scope_type, plan_id)
      )
    `)
    await db.pool.query('CREATE INDEX IF NOT EXISTS idx_app_cred_layout_scope ON app_credencial_layout (scope_type, plan_id)')
    credencialLayoutTableReady = true
  })()

  try {
    await credencialLayoutTablePromise
  } finally {
    credencialLayoutTablePromise = null
  }
}

async function getCredencialLayoutForPlan(planId) {
  await ensureCredencialLayoutTable()
  const base = getDefaultCredencialLayoutConfig()

  const result = await db.pool.query(
    `SELECT scope_type, plan_id, config_json
       FROM app_credencial_layout
      WHERE (scope_type = 'GENERAL' AND plan_id IS NULL)
         OR (scope_type = 'PLAN' AND TRIM(COALESCE(plan_id, '')) = TRIM($1))`,
    [planId || '']
  )

  const generalRow = result.rows.find((r) => r.scope_type === 'GENERAL')
  const planRow = result.rows.find((r) => r.scope_type === 'PLAN')

  const generalConfig = normalizeCredencialLayoutConfig(generalRow?.config_json || base)
  const effectiveConfig = planRow?.config_json
    ? normalizeCredencialLayoutConfig({ ...generalConfig, ...planRow.config_json, fields: { ...generalConfig.fields, ...(planRow.config_json.fields || {}) } })
    : generalConfig

  return {
    generalConfig,
    effectiveConfig,
    source: planRow ? 'PLAN' : 'GENERAL',
  }
}

async function attachPlanDescriptionsToCredenciales(credenciales) {
  if (!Array.isArray(credenciales) || credenciales.length === 0) return

  const idsFaltantes = []
  const cache = new Map()

  for (const c of credenciales) {
    const planId = c?.crcreplaid ? String(c.crcreplaid).trim() : ''
    const planDesc = c?.crcrepladesc ? String(c.crcrepladesc).trim() : ''

    if (!planId) {
      c.crcrepladesc = ''
      continue
    }

    if (planDesc) {
      cache.set(planId, planDesc)
      c.crcrepladesc = planDesc
      continue
    }

    idsFaltantes.push(planId)
  }

  const idsUnicos = [...new Set(idsFaltantes)].filter((id) => !cache.has(id))

  if (idsUnicos.length > 0) {
    try {
      const result = await db.pool.query(
        `SELECT TRIM(nuplaid) AS id, TRIM(COALESCE(nupladescr, '')) AS descripcion
         FROM nuplan
         WHERE TRIM(nuplaid) = ANY($1::text[])`,
        [idsUnicos]
      )

      for (const row of result.rows) {
        const id = String(row.id || '').trim()
        if (!id) continue
        cache.set(id, String(row.descripcion || '').trim())
      }
    } catch {
      // Si falla la consulta de planes, no romper el login/credenciales.
    }
  }

  for (const c of credenciales) {
    const planId = c?.crcreplaid ? String(c.crcreplaid).trim() : ''
    if (!planId) {
      c.crcrepladesc = ''
      continue
    }
    c.crcrepladesc = cache.get(planId) || ''
  }
}

const rateLimitStore = new Map()
const RATE_LIMIT_CLEANUP_MS = 5 * 60 * 1000

function getRateLimitClientKey(req, customSelector = null) {
  const ip = getClientIp(req)
  if (typeof customSelector === 'function') {
    const custom = customSelector(req)
    if (custom) return `${ip}|${String(custom).trim().toLowerCase()}`
  }
  return ip
}

function setRateLimitHeaders(res, { maxRequests, remaining, resetMs }) {
  res.setHeader('X-RateLimit-Limit', String(maxRequests))
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)))
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetMs / 1000)))
}

function createRateLimitMiddleware({
  scope,
  maxAttemptsParam,
  windowSecParam,
  defaultMaxAttempts,
  defaultWindowSec,
  keySelector = null,
}) {
  return async (req, res, next) => {
    try {
      const enabled = await getParametroBoolean('SEGURIDAD_APP', 'RateLimitEnabled', true)
      if (!enabled) return next()

      const maxRequests = Math.max(1, await getParametroNumero('SEGURIDAD_APP', maxAttemptsParam, defaultMaxAttempts))
      const windowSec = Math.max(10, await getParametroNumero('SEGURIDAD_APP', windowSecParam, defaultWindowSec))
      const windowMs = windowSec * 1000

      const clientKey = getRateLimitClientKey(req, keySelector)
      const key = `${scope}|${clientKey}`
      const now = Date.now()

      let entry = rateLimitStore.get(key)
      if (!entry || now > entry.resetAt) {
        entry = {
          count: 0,
          resetAt: now + windowMs,
        }
      }

      entry.count += 1
      rateLimitStore.set(key, entry)

      const remaining = maxRequests - entry.count
      const resetMs = Math.max(0, entry.resetAt - now)
      setRateLimitHeaders(res, { maxRequests, remaining, resetMs })

      if (entry.count > maxRequests) {
        res.setHeader('Retry-After', String(Math.ceil(resetMs / 1000)))
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          event: 'rate_limit_blocked',
          requestId: req.requestId,
          scope,
          ip: getClientIp(req),
          method: req.method,
          path: req.originalUrl || req.path,
          key: clientKey,
          maxRequests,
          windowSec,
        }))
        return res.status(429).json({
          error: 'TOO_MANY_REQUESTS',
          message: 'Demasiadas solicitudes. Intenta nuevamente en unos segundos.',
          scope,
          retryAfterSeconds: Math.ceil(resetMs / 1000),
        })
      }

      return next()
    } catch (error) {
      console.error('⚠️ Error en middleware rate limit:', error?.message || error)
      return next()
    }
  }
}

const rateLimiters = {
  authLogin: createRateLimitMiddleware({
    scope: 'auth_login',
    maxAttemptsParam: 'RateLimitLoginMaxAttempts',
    windowSecParam: 'RateLimitLoginWindowSec',
    defaultMaxAttempts: 5,
    defaultWindowSec: 300,
    keySelector: (req) => req.body?.username,
  }),
  adminLogin: createRateLimitMiddleware({
    scope: 'admin_login',
    maxAttemptsParam: 'RateLimitAdminLoginMaxAttempts',
    windowSecParam: 'RateLimitAdminLoginWindowSec',
    defaultMaxAttempts: 5,
    defaultWindowSec: 300,
    keySelector: (req) => req.body?.username,
  }),
  register: createRateLimitMiddleware({
    scope: 'register',
    maxAttemptsParam: 'RateLimitRegisterMaxAttempts',
    windowSecParam: 'RateLimitRegisterWindowSec',
    defaultMaxAttempts: 3,
    defaultWindowSec: 600,
    keySelector: (req) => req.body?.email || req.body?.cuil || req.body?.dni || req.body?.nroAfiliado,
  }),
  recovery: createRateLimitMiddleware({
    scope: 'password_recovery',
    maxAttemptsParam: 'RateLimitRecoveryMaxAttempts',
    windowSecParam: 'RateLimitRecoveryWindowSec',
    defaultMaxAttempts: 5,
    defaultWindowSec: 600,
    keySelector: (req) => req.body?.email,
  }),
  gamLogin: createRateLimitMiddleware({
    scope: 'gam_login',
    maxAttemptsParam: 'RateLimitGamLoginMaxAttempts',
    windowSecParam: 'RateLimitGamLoginWindowSec',
    defaultMaxAttempts: 5,
    defaultWindowSec: 300,
    keySelector: (req) => req.body?.username,
  }),
  tokenValidacionDni: createRateLimitMiddleware({
    scope: 'token_validacion_dni',
    maxAttemptsParam: 'RLTokenValidDniMaxAttempts',
    windowSecParam: 'RLTokenValidDniWindowSec',
    defaultMaxAttempts: 10,
    defaultWindowSec: 60,
    keySelector: (req) => req.query?.dni,
  }),
  adminDiagnostics: createRateLimitMiddleware({
    scope: 'admin_diagnostics',
    maxAttemptsParam: 'RateLimitAdminDiagMaxAttempts',
    windowSecParam: 'RateLimitAdminDiagWindowSec',
    defaultMaxAttempts: 30,
    defaultWindowSec: 60,
    keySelector: (req) => req.session?.email || req.session?.username,
  }),
}

setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (!value || now > value.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, RATE_LIMIT_CLEANUP_MS)

setInterval(cleanExpiredRefreshSessions, 10 * 60 * 1000)

function updateDependencyMetrics(checks) {
  observabilityState.dependencies.lastRunAt = new Date().toISOString()
  for (const check of checks || []) {
    const name = check?.dependency || 'unknown'
    const current = observabilityState.dependencies.byDependency[name] || {
      checks: 0,
      failures: 0,
      lastStatus: null,
      lastLatencyMs: null,
      avgLatencyMs: 0,
      maxLatencyMs: 0,
      lastOk: null,
      lastError: null,
      lastCheckedAt: null,
      _latencyTotal: 0,
      _latencyCount: 0,
    }

    current.checks += 1
    observabilityState.dependencies.checksTotal += 1
    current.lastStatus = check.status || null
    current.lastOk = Boolean(check.ok)
    current.lastCheckedAt = new Date().toISOString()

    if (!check.ok) {
      current.failures += 1
      observabilityState.dependencies.failedTotal += 1
      current.lastError = check.error || `status=${check.status}`
    } else {
      current.lastError = null
    }

    if (typeof check.latencyMs === 'number' && Number.isFinite(check.latencyMs)) {
      current.lastLatencyMs = check.latencyMs
      current._latencyTotal += check.latencyMs
      current._latencyCount += 1
      current.avgLatencyMs = Number((current._latencyTotal / current._latencyCount).toFixed(2))
      current.maxLatencyMs = Math.max(current.maxLatencyMs, check.latencyMs)
    }

    observabilityState.dependencies.byDependency[name] = current
  }
}

// Manejadores de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ ERROR NO CAPTURADO:', error)
  console.error('Stack:', error.stack)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ PROMESA RECHAZADA NO MANEJADA:', reason)
  console.error('Promesa:', promise)
})

// Config
const useSoapEnv = String(process.env.USE_SOAP || '').trim().toLowerCase()
const USE_SOAP = useSoapEnv
  ? (useSoapEnv === '1' || useSoapEnv === 'true' || useSoapEnv === 'yes' || useSoapEnv === 'si')
  : true // activar SOAP real por defecto

// Middlewares
app.use(cors())
app.use(yamlMiddleware) // Parsear YAML antes de JSON
app.use(bodyParser.json({ limit: '15mb' })) // Límite ampliado para solicitudes SIA con hasta 5 fotos en base64
app.use(bodyParser.urlencoded({ limit: '15mb', extended: true }))
app.use(cookieParser())

app.use((req, res, next) => {
  const requestId = (req.get('x-request-id') || '').trim() || generateRequestId()
  const startedAtNs = process.hrtime.bigint()
  const routeFallback = `${req.method} ${req.path}`

  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)
  observabilityState.requestsInFlight += 1
  maybeEmitInFlightAlert(req, requestId)

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAtNs) / 1000000
    const durationMs = Number(elapsedMs.toFixed(2))
    const statusKey = String(res.statusCode || 0)
    const routeKey = req.route?.path
      ? `${req.method} ${req.baseUrl || ''}${req.route.path}`
      : routeFallback

    observabilityState.requestsInFlight = Math.max(0, observabilityState.requestsInFlight - 1)
    observabilityState.requestsTotal += 1
    observabilityState.byStatus[statusKey] = (observabilityState.byStatus[statusKey] || 0) + 1
    observabilityState.byRoute[routeKey] = (observabilityState.byRoute[routeKey] || 0) + 1
    observabilityState.latencyMs.total += durationMs
    observabilityState.latencyMs.count += 1
    observabilityState.latencyMs.max = Math.max(observabilityState.latencyMs.max, durationMs)

    if (res.statusCode >= 500) {
      observabilityState.errors5xx += 1
      pushRecentError({
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: res.statusCode,
        durationMs,
      })
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'error' : 'info',
      event: 'http_request',
      requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      route: routeKey,
      statusCode: res.statusCode,
      durationMs,
      ip: getClientIp(req),
      userAgent: req.get('user-agent') || '',
    }))

    const functionalRule = resolveFunctionalEvent(req, res.statusCode)
    if (functionalRule) {
      void writeFunctionalEvent(req, functionalRule, res.statusCode)
    }
  })

  next()
})

// Persistencia simple
const DATA_DIR = path.join(__dirname, 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const registeredUsers = new Map()
const sessions = new Map()
const refreshSessions = new Map()
const AUDIT_REDACTED = '<redacted>'

const LOCAL_ACCESS_TOKEN_EXPIRES_IN = process.env.LOCAL_ACCESS_TOKEN_EXPIRES_IN || '8h'
const LOCAL_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

function buildSessionMetadata(req) {
  const now = new Date().toISOString()
  return {
    sessionId: crypto.randomUUID(),
    deviceId: String(req.get('x-device-id') || req.get('x-client-id') || '').trim() || null,
    platform: String(req.get('x-client-platform') || req.get('x-platform') || '').trim() || null,
    appVersion: String(req.get('x-app-version') || '').trim() || null,
    userAgent: req.get('user-agent') || null,
    ip: getClientIp(req),
    createdAt: now,
    lastActivityAt: now,
    lastRefreshedAt: null,
  }
}

function isUuidString(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
}

function isSensitiveAuditKey(key) {
  const normalized = String(key || '').trim().toUpperCase()
  return normalized.includes('PASSWORD')
    || normalized.includes('SECRET')
    || normalized.includes('TOKEN')
    || normalized.includes('APIKEY')
    || normalized.includes('API_KEY')
    || normalized === 'AUTHORIZATION'
}

function sanitizeAuditValue(value, options = {}) {
  const { forceRedact = false } = options

  if (forceRedact) return AUDIT_REDACTED
  if (value === null || value === undefined) return value
  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value)) return `<buffer:${value.length}>`

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item))
  }

  if (typeof value === 'object') {
    const output = {}
    for (const [key, nestedValue] of Object.entries(value)) {
      output[key] = sanitizeAuditValue(nestedValue, {
        forceRedact: isSensitiveAuditKey(key),
      })
    }
    return output
  }

  if (typeof value === 'string') {
    return value.length > 4000 ? `${value.slice(0, 4000)}...` : value
  }

  return value
}

function buildAuditActor(req) {
  return {
    nuusuid: req.session?.nuusuid || null,
    username: req.session?.username || null,
    email: normalizeEmail(req.session?.email || req.session?.username) || null,
    authType: req.session?.authType || null,
    isAdmin: !!req.session?.isAdmin,
    sessionId: req.session?.sessionId || null,
  }
}

function buildAuditRequestContext(req) {
  return {
    requestId: req.requestId || null,
    method: req.method,
    path: req.originalUrl || req.path,
    ip: getClientIp(req),
    userAgent: req.get('user-agent') || null,
    deviceId: String(req.get('x-device-id') || req.get('x-client-id') || '').trim() || null,
    platform: String(req.get('x-client-platform') || req.get('x-platform') || '').trim() || null,
    appVersion: String(req.get('x-app-version') || '').trim() || null,
  }
}

function isUserDeactivated(user) {
  const fechaBaja = user?.nuusubajaf
  return !!(fechaBaja && new Date(fechaBaja).getFullYear() > 1900)
}

function toUserAuditState(user, options = {}) {
  if (!user) return null
  return {
    nuusuid: user.nuusuid,
    email: user.nuusumail || null,
    nombre: user.nuusuapell || null,
    afiliadoId: user.nuusuafili || null,
    fechaBaja: user.nuusubajaf || null,
    desactivado: isUserDeactivated(user),
    isBackendAdmin: !!options.isBackendAdmin,
  }
}

function toCartillaAuditState(entidad) {
  if (!entidad) return null
  return {
    caentid: entidad.caentid,
    nombre: entidad.caentapeno || null,
    email: entidad.caentmail || null,
    web: entidad.caentweb || null,
    estado: entidad.caentestado || null,
    prioridad: entidad.caentprior ?? null,
    matricula: entidad.caentmatri || null,
    observaciones: entidad.caentobs || null,
    telefono: entidad.caentelefo || null,
    direccion: entidad.caentdireccion || null,
    localidad: entidad.localidad?.nulocdescr || null,
    rubro: entidad.rubro?.carubdescr || null,
    especialidad: entidad.especialidad?.caespdescr || null,
    totalDirecciones: entidad.total_direcciones ?? 0,
    totalTelefonos: entidad.total_telefonos ?? 0,
  }
}

function toInfoUtilAuditState(row) {
  if (!row) return null
  return sanitizeAuditValue({
    id: row.id,
    tipo: row.tipo,
    tipoCodigo: row.tipoCodigo,
    titulo: row.titulo,
    telefono: row.telefono,
    direccion: row.direccion,
    geo: row.geo,
    link: row.link,
    imagenUrl: row.imagenUrl,
  })
}

function redactParametroAuditState(parametro) {
  if (!parametro) return null

  const grupo = parametro.nusisgrupa
  const tipo = parametro.nusistippa
  return {
    nusisgrupa: grupo,
    nusistippa: tipo,
    nusisvalpa: esParametroSensible(grupo, tipo) ? AUDIT_REDACTED : parametro.nusisvalpa,
  }
}

async function findInfoUtilAdminById(id) {
  const prisma = getPrisma()
  const row = await prisma.noinfuti.findUnique({
    where: { noinfutili: id },
    select: {
      noinfutili: true,
      noinftipo: true,
      noinfdescr: true,
      noinftelef: true,
      noinfldire: true,
      noinfgeolo: true,
      noinim_gxi: true,
      noinflink: true,
    },
  })

  if (!row) return null

  return {
    id: row.noinfutili ? String(row.noinfutili).trim() : null,
    tipoCodigo: row.noinftipo ? String(row.noinftipo).trim() : null,
    tipo: row.noinftipo ? String(row.noinftipo).trim().toLowerCase() : null,
    titulo: row.noinfdescr ? String(row.noinfdescr).trim() : null,
    telefono: row.noinftelef ? String(row.noinftelef).trim() : null,
    direccion: row.noinfldire ? String(row.noinfldire).trim() : null,
    geo: row.noinfgeolo ? String(row.noinfgeolo).trim() : null,
    link: row.noinflink ? String(row.noinflink).trim() : null,
    imagenUrl: row.noinim_gxi ? String(row.noinim_gxi).trim() : null,
  }
}

async function writeAdminAuditLog({ req, entity, entityId = null, action, summary, before = null, after = null, meta = null }) {
  try {
    const payload = sanitizeAuditValue({
      summary,
      targetId: entityId || null,
      actor: buildAuditActor(req),
      request: buildAuditRequestContext(req),
      before,
      after,
      meta,
    })

    await db.pool.query(
      `INSERT INTO audit_logs (entity, entity_id, action, payload, performed_by)
       VALUES ($1, $2, $3, $4::jsonb, NULL)`,
      [entity, isUuidString(entityId) ? entityId.trim() : null, action, JSON.stringify(payload)]
    )
  } catch (error) {
    console.error('⚠️ Error registrando auditoría administrativa:', error?.message || error)
  }
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex')
}

function issueRefreshToken(session, metadata = null, options = {}) {
  const refreshToken = generateRefreshToken()
  const now = Date.now()
  const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : LOCAL_REFRESH_TOKEN_TTL_MS
  refreshSessions.set(refreshToken, {
    session: { ...session },
    metadata: metadata ? { ...metadata } : null,
    authType: options.authType || session?.authType || 'LOCAL',
    createdAt: now,
    expiresAt: now + ttlMs,
    sourceRefreshToken: options.sourceRefreshToken || null,
    currentAccessToken: options.currentAccessToken || null,
  })
  return refreshToken
}

function updateRefreshSession(refreshToken, patch = {}) {
  if (!refreshToken || !refreshSessions.has(refreshToken)) return false
  const current = refreshSessions.get(refreshToken)
  refreshSessions.set(refreshToken, {
    ...current,
    ...patch,
    metadata: {
      ...(current?.metadata || {}),
      ...(patch?.metadata || {}),
    },
    session: {
      ...(current?.session || {}),
      ...(patch?.session || {}),
    },
  })
  return true
}

function revokeSessionBySessionId(nuusuid, sessionId, options = {}) {
  const revokeCurrent = options.revokeCurrent === true
  let removedAccessTokens = 0
  let removedRefreshTokens = 0

  for (const [token, session] of sessions.entries()) {
    if (String(session?.nuusuid || '') !== String(nuusuid || '')) continue
    if (String(session?.sessionId || '') !== String(sessionId || '')) continue
    if (!revokeCurrent && options.currentSessionId && sessionId === options.currentSessionId) continue
    sessions.delete(token)
    removedAccessTokens += 1
  }

  for (const [token, entry] of refreshSessions.entries()) {
    if (String(entry?.session?.nuusuid || '') !== String(nuusuid || '')) continue
    if (String(entry?.session?.sessionId || '') !== String(sessionId || '')) continue
    if (!revokeCurrent && options.currentSessionId && sessionId === options.currentSessionId) continue
    refreshSessions.delete(token)
    removedRefreshTokens += 1
  }

  return { removedAccessTokens, removedRefreshTokens }
}

function collectSessionsForUser(nuusuid) {
  const grouped = new Map()

  for (const [refreshToken, entry] of refreshSessions.entries()) {
    if (String(entry?.session?.nuusuid || '') !== String(nuusuid || '')) continue
    const sessionId = entry?.session?.sessionId || refreshToken
    grouped.set(sessionId, {
      sessionId,
      nuusuid: entry?.session?.nuusuid || null,
      username: entry?.session?.username || null,
      authType: entry?.authType || entry?.session?.authType || null,
      refreshToken,
      accessToken: entry?.currentAccessToken || null,
      metadata: { ...(entry?.metadata || {}) },
      createdAt: entry?.metadata?.createdAt || new Date(entry?.createdAt || Date.now()).toISOString(),
      expiresAt: new Date(entry?.expiresAt || Date.now()).toISOString(),
    })
  }

  for (const [accessToken, session] of sessions.entries()) {
    if (String(session?.nuusuid || '') !== String(nuusuid || '')) continue
    const sessionId = session?.sessionId || accessToken
    const existing = grouped.get(sessionId)
    if (existing) {
      existing.accessToken = accessToken
      existing.authType = existing.authType || session?.authType || null
      existing.metadata = {
        ...(existing.metadata || {}),
        ...(session?.sessionMetadata || {}),
      }
      continue
    }

    grouped.set(sessionId, {
      sessionId,
      nuusuid: session?.nuusuid || null,
      username: session?.username || null,
      authType: session?.authType || null,
      refreshToken: session?.refreshToken || null,
      accessToken,
      metadata: { ...(session?.sessionMetadata || {}) },
      createdAt: session?.sessionMetadata?.createdAt || session?.loginAt || null,
      expiresAt: null,
    })
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      sessionId: entry.sessionId,
      username: entry.username,
      authType: entry.authType,
      deviceId: entry.metadata?.deviceId || null,
      platform: entry.metadata?.platform || null,
      appVersion: entry.metadata?.appVersion || null,
      userAgent: entry.metadata?.userAgent || null,
      ip: entry.metadata?.ip || null,
      createdAt: entry.metadata?.createdAt || entry.createdAt || null,
      lastActivityAt: entry.metadata?.lastActivityAt || null,
      lastRefreshedAt: entry.metadata?.lastRefreshedAt || null,
      expiresAt: entry.expiresAt,
      hasRefreshToken: !!entry.refreshToken,
    }))
    .sort((a, b) => String(b.lastActivityAt || b.createdAt || '').localeCompare(String(a.lastActivityAt || a.createdAt || '')))
}

function touchSessionActivity({ token = null, sessionId = null, req }) {
  const now = new Date().toISOString()
  const patch = {
    lastActivityAt: now,
    ip: getClientIp(req),
    userAgent: req.get('user-agent') || null,
  }

  for (const [accessToken, session] of sessions.entries()) {
    if ((token && accessToken === token) || (sessionId && session?.sessionId === sessionId)) {
      sessions.set(accessToken, {
        ...session,
        sessionMetadata: {
          ...(session?.sessionMetadata || {}),
          ...patch,
        },
      })
    }
  }

  for (const [refreshToken, entry] of refreshSessions.entries()) {
    if ((token && entry?.currentAccessToken === token) || (sessionId && entry?.session?.sessionId === sessionId)) {
      updateRefreshSession(refreshToken, {
        metadata: patch,
      })
    }
  }
}

function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return false
  return refreshSessions.delete(refreshToken)
}

function cleanExpiredRefreshSessions() {
  const now = Date.now()
  for (const [token, data] of refreshSessions.entries()) {
    if (!data || now > data.expiresAt) {
      refreshSessions.delete(token)
    }
  }
}

// ===== Auth/Usuarios (Semana 8) =====
const AuthRefreshTokenBodySchema = z.object({
  refresh_token: z.string().min(1).transform((v) => v.trim()),
})

const SessionIdParamsSchema = z.object({
  id: z.string().uuid({ message: 'SessionId debe ser UUID válido' }),
})

const AuthRecoverPasswordBodySchema = z.object({
  email: z.string().email().transform((v) => v.trim()),
})

const AuthVerifyRecoveryCodeBodySchema = z.object({
  email: z.string().email().transform((v) => v.trim()),
  code: z.string().min(6).max(6).transform((v) => v.trim()),
})

const AuthResetPasswordBodySchema = z.object({
  email: z.string().email().transform((v) => v.trim()),
  resetToken: z.string().min(1).transform((v) => v.trim()),
  newPassword: z.string().min(6),
})

const GamRegisterBodySchema = z.object({
  email: z.string().email().transform((v) => v.trim()),
  password: z.string().min(1),
  firstName: z.string().min(1).transform((v) => v.trim()),
  lastName: z.string().min(1).transform((v) => v.trim()),
  telefono: z.string().optional(),
  nroAfiliado: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === null ? '' : String(v).trim())),
  documento: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === null ? '' : String(v).trim())),
  cuil: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === null ? '' : String(v).trim())),
  sexo: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  canMiembrosFamiliar: z.union([z.string(), z.number()]).optional(),
}).passthrough().superRefine((data, ctx) => {
  if (!data.nroAfiliado && !data.documento && !data.cuil) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nroAfiliado'],
      message: 'Debe proveer al menos uno: nroAfiliado, documento, cuil'
    })
  }
})

const GamLoginBodySchema = z.object({
  username: z.string().min(1).transform((v) => v.trim()),
  password: z.string().min(1),
})

const GamChangePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
})

const GamPasswordRecoveryBodySchema = z.object({
  email: z.string().email().transform((v) => v.trim()),
  userName: z.string().optional(),
})

const GamSyncTokenBodySchema = z.object({
  password: z.string().min(1),
})

const GamValidateUserBodySchema = z.record(z.any()).refine((obj) => Object.keys(obj).length > 0, {
  message: 'Se requiere un payload para validar usuario'
})

const RegisterBodySchema = z.object({
  cuil: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === null ? '' : String(v).trim())),
  dni: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === null ? '' : String(v).trim())),
  nroAfiliado: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === null ? '' : String(v).trim())),
  fechaNacimiento: z.string().min(1).transform((v) => v.trim()),
  sexo: z.string().min(1).transform((v) => v.trim().toUpperCase()),
  cantidadIntegrantes: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  email: z.string().email().transform((v) => v.trim()),
  password: z.string().min(8)
}).passthrough().superRefine((data, ctx) => {
  if (!data.cuil && !data.dni && !data.nroAfiliado) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cuil'],
      message: 'Debe proveer al menos uno: cuil, dni, o nroAfiliado'
    })
  }

  if (!normalizeSexo(data.sexo)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sexo'],
      message: 'El campo sexo es obligatorio y debe ser F, M o N.'
    })
  }

  const cantidad = Number(data.cantidadIntegrantes)
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cantidadIntegrantes'],
      message: 'cantidadIntegrantes debe ser un número mayor a 0'
    })
  }
})

const SiaCrearSolicitudBodySchema = z.object({
  afiliadoId: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).refine((v) => v.length > 0, {
    message: 'afiliadoId es requerido'
  }),
  afiliadoNro: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === null ? '' : String(v).trim())),
  AUSolTipo: z.enum(['P', 'S']).optional().default('P'),
  AUSolPresTipo: z.string().optional(),
  cobertura: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).refine((v) => v.length > 0, {
    message: 'cobertura es requerida'
  }),
  coberturaDescripcion: z.string().optional(),
  referencia: z.string().min(1).transform((v) => v.trim()),
  texto: z.string().optional(),
  profesional: z.string().optional(),
  prestacionId: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === null ? '' : String(v).trim())),
  AUSolPresCant: z.union([z.string(), z.number()]).optional(),
  foto1Base64: z.string().optional(),
  foto2Base64: z.string().optional(),
  foto3Base64: z.string().optional(),
  foto4Base64: z.string().optional(),
  foto5Base64: z.string().optional(),
  fotosBase64: z.array(z.string().min(1)).optional()
}).passthrough().superRefine((data, ctx) => {
  if (data.AUSolTipo === 'S' && !data.prestacionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['prestacionId'],
      message: 'prestacionId es requerido para autorizaciones Sin Prescripción'
    })
  }

  const fotosAdjuntas = (Array.isArray(data.fotosBase64)
    ? data.fotosBase64
    : [data.foto1Base64, data.foto2Base64, data.foto3Base64, data.foto4Base64, data.foto5Base64])
    .map((foto) => (typeof foto === 'string' ? foto.trim() : ''))
    .filter(Boolean)

  if (data.AUSolTipo === 'S' && fotosAdjuntas.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fotosBase64'],
      message: 'Las autorizaciones sin prescripción (tipo S) no admiten fotos adjuntas'
    })
  }
})

const UsersPasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
    confirm: z.string().optional(),
  })

// ===== ADMIN USUARIOS (Semana 29) =====

const AdminUsersQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
  q: z.string().optional().transform((v) => (v ? v.trim() : '')),
  estado: z.enum(['activo', 'desactivado', 'todos']).optional().default('todos'),
  tipo: z.enum(['gam', 'local', 'todos']).optional().default('todos'),
  orderBy: z.enum(['email', 'fecha_creacion', 'nuusuid', 'nombre']).optional().default('email'),
  orderDir: z.enum(['asc', 'desc']).optional().default('asc'),
})

const UserIdParamsSchema = z.object({
  id: z.string().min(1, 'ID usuario requerido'),
})

const AdminAuditQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
  entity: z.string().optional().transform((v) => (v ? v.trim() : undefined)),
  action: z.string().optional().transform((v) => (v ? v.trim().toUpperCase() : undefined)),
  actor: z.string().optional().transform((v) => (v ? v.trim().toLowerCase() : undefined)),
  targetId: z.string().optional().transform((v) => (v ? v.trim() : undefined)),
  from: z.string().optional().refine((v) => !v || !Number.isNaN(Date.parse(v)), { message: 'from debe ser fecha ISO válida' }),
  to: z.string().optional().refine((v) => !v || !Number.isNaN(Date.parse(v)), { message: 'to debe ser fecha ISO válida' }),
})

const SupportTimelineQuerySchema = z.object({
  q: z.string().min(1).transform((v) => v.trim()),
  limit: z.string().optional().default('30').transform(Number).pipe(z.number().int().positive().max(100)),
})

const AdminAnalyticsQuerySchema = z.object({
  days: z.string().optional().default('7').transform(Number).pipe(z.number().int().min(1).max(90)),
})

const AdminCartillaEntidadesQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
  q: z.string().optional().transform((v) => (v ? v.trim() : '')),
  rubroId: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())),
  especialidadId: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())),
  localidadId: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())),
  conGeo: z.union([z.string(), z.boolean()]).optional().transform((v) => {
    if (v === undefined || v === null || String(v).trim() === '') return null
    if (typeof v === 'boolean') return v
    return ['true', '1', 's', 'si', 'yes'].includes(String(v).trim().toLowerCase())
  }),
  includeInactivas: z.union([z.string(), z.boolean()]).optional().default('true').transform((v) => {
    if (typeof v === 'boolean') return v
    return ['true', '1', 's', 'si', 'yes'].includes(String(v).trim().toLowerCase())
  }),
})

const CartillaEspecialidadesQuerySchema = z.object({
  rubroId: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim())),
})

const AdminDesconocimientosQuerySchema = z.object({
  estado: z.enum(['pendiente', 'en_revision', 'resuelto', 'cerrado']).optional().transform((v) => (v ? v.toLowerCase() : '')),
  q: z.string().optional().transform((v) => (v ? v.trim().toLowerCase() : '')),
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
})

const AdminCalificacionesQuerySchema = z.object({
  puntuacion: z.union([z.string(), z.number()]).optional().transform((v) => {
    if (v === undefined || v === null || String(v).trim() === '') return null
    return Number(v)
  }).refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 5), {
    message: 'puntuacion debe ser un número entre 1 y 5'
  }),
  q: z.string().optional().transform((v) => (v ? v.trim().toLowerCase() : '')),
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
})

const AdminNoticiaIdParamsSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).refine((v) => v.length > 0, {
    message: 'id requerido'
  }),
})

const AdminNoticiaUpdateBodySchema = z.object({
  titulo: z.string().min(1).optional(),
  contenido: z.string().nullable().optional(),
  tipo: z.enum(['texto', 'imagen', 'mixta']).optional(),
  activa: z.union([z.boolean(), z.string()]).optional(),
  orden: z.union([z.number(), z.string()]).optional(),
  fecha_inicio: z.string().nullable().optional(),
  fecha_fin: z.string().nullable().optional(),
  eliminar_imagen: z.union([z.boolean(), z.string()]).optional(),
}).passthrough()

const AdminNoticiaCreateBodySchema = z.object({
  titulo: z.string().min(1),
  contenido: z.string().nullable().optional(),
  tipo: z.enum(['texto', 'imagen', 'mixta']).optional(),
  activa: z.union([z.boolean(), z.string()]).optional(),
  orden: z.union([z.number(), z.string()]).optional(),
  fecha_inicio: z.string().nullable().optional(),
  fecha_fin: z.string().nullable().optional(),
}).passthrough()

const AdminCredencialLayoutGeneralBodySchema = z.object({
  config: z.record(z.any())
}).passthrough()

const AdminPlanIdParamsSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).refine((v) => v.length > 0, {
    message: 'ID de plan requerido'
  }),
})

const AdminCredencialLayoutPlanBodySchema = z.object({
  config: z.record(z.any())
}).passthrough()

const AdminPlanImagenBodySchema = z.object({
  imagen_url: z.string().trim().optional(),
}).passthrough()

const AdminCartillaEntidadIdParamsSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).refine((v) => v.length > 0, {
    message: 'id requerido'
  }),
})

const AdminCartillaEntidadUpdateBodySchema = z.record(z.any()).refine((obj) => obj && Object.keys(obj).length > 0, {
  message: 'Body requerido para actualizar entidad'
})

const AdminDesconocimientoEstadoParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, { message: 'id inválido' }).transform((v) => Number(v)).pipe(z.number().int().positive())
})

const AdminDesconocimientoEstadoBodySchema = z.object({
  estado: z.enum(['pendiente', 'en_revision', 'resuelto', 'cerrado'])
}).passthrough()

// ===== INFO ÚTIL (Semana 21/22) =====

const InfoUtilBaseSchema = z.object({
  tipo: z.string().min(1).max(20).transform((v) => v.trim()),
  titulo: z.string().min(1).max(200).transform((v) => v.trim()),
  telefono: z.string().max(50).nullable().optional().transform((v) => (v ? v.trim() : '')),
  direccion: z.string().max(1024).nullable().optional().transform((v) => (v ? v.trim() : '')),
  geo: z.string().max(100).nullable().optional().transform((v) => (v ? v.trim() : '')),
  link: z.string().max(1000).nullable().optional().transform((v) => (v ? v.trim() : '')),
  imagenUrl: z.string().max(2048).nullable().optional().transform((v) => (v ? v.trim() : '')),
})

const InfoUtilCreateBodySchema = InfoUtilBaseSchema
  .refine((data) => {
    const tipo = data.tipo.toLowerCase()
    return !(tipo === 'tel' && !data.telefono)
  }, {
    message: 'El tipo "tel" requiere un número de teléfono',
    path: ['telefono']
  })
  .refine((data) => {
    const tipo = data.tipo.toLowerCase()
    return !(tipo === 'link' && !data.link)
  }, {
    message: 'El tipo "link" requiere una URL',
    path: ['link']
  })
  .refine((data) => {
    const tipo = data.tipo.toLowerCase()
    return !(tipo === 'direccion' && !data.direccion && !data.geo)
  }, {
    message: 'El tipo "direccion" requiere dirección o geolocalización',
    path: ['direccion']
  })

const InfoUtilUpdateBodySchema = InfoUtilBaseSchema.partial()

const InfoUtilIdParamsSchema = z.object({
  id: z.string().min(1).max(36).transform((v) => v.trim()),
})

// ===== DISPOSITIVOS (Semana 25) =====

const RegisterDeviceBodySchema = z.object({
  push_token: z.string()
    .min(1)
    .max(500)
    .transform((v) => v.trim())
    .refine(
      (token) => token.startsWith('ExponentPushToken[') && token.endsWith(']'),
      { message: 'Formato de token Expo inválido. Debe ser ExponentPushToken[...]' }
    ),
  plataforma: z.enum(['android', 'ios']),
  device_info: z.record(z.any()).optional().nullable(),
})

const DeviceIdParamsSchema = z.object({
  id: z.string().uuid({ message: 'ID de dispositivo debe ser UUID válido' }),
})

// ===== NOTIFICACIONES (Semana 26 + 27) =====

const NotificationsQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('20').transform(Number).pipe(z.number().int().positive().max(100)),
  orderBy: z.enum(['fecha_creacion', 'leida', 'tipo']).optional().default('fecha_creacion'),
  orderDir: z.enum(['asc', 'desc']).optional().default('desc'),
  // Filtros adicionales Semana 27
  tipo: z.enum(['info', 'warning', 'success', 'error']).optional(),
  leida: z.string().optional().transform(val => {
    if (val === undefined) return undefined
    return val === 'true' || val === '1'
  }),
  fecha_desde: z.string().optional().refine(val => {
    if (!val) return true
    return !isNaN(Date.parse(val))
  }, { message: 'fecha_desde debe ser fecha ISO válida' }),
  fecha_hasta: z.string().optional().refine(val => {
    if (!val) return true
    return !isNaN(Date.parse(val))
  }, { message: 'fecha_hasta debe ser fecha ISO válida' }),
})

const NotificationIdParamsSchema = z.object({
  id: z.string().uuid({ message: 'ID de notificación debe ser UUID válido' }),
})

function sanitizeNotificationText(value) {
  if (value === null || value === undefined) return value
  if (typeof value !== 'string') return value

  let text = value
    // Remover controles invisibles que suelen llegar de integraciones externas.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

  const suspiciousEncoding = /Ã.|Â.|â.|�/.test(text)
  if (suspiciousEncoding) {
    try {
      const candidate = Buffer.from(text, 'latin1').toString('utf8')
      const noiseScore = (s) => (s.match(/�|Ã|Â|â/g) || []).length
      if (noiseScore(candidate) < noiseScore(text)) {
        text = candidate
      }
    } catch (_) {
      // Si falla la conversión, mantener texto original.
    }
  }

  // Correcciones frecuentes observadas en notificaciones.
  text = text
    .replace(/autorizaci�n/gi, (m) => m[0] === 'A' ? 'Autorización' : 'autorización')
    .replace(/solicitud de autorizaci�n/gi, (m) => m[0] === 'S' ? 'Solicitud de autorización' : 'solicitud de autorización')
    .replace(/prestaci�n/gi, (m) => m[0] === 'P' ? 'Prestación' : 'prestación')
    .replace(/descripci�n/gi, (m) => m[0] === 'D' ? 'Descripción' : 'descripción')
    .replace(/n�mero/gi, (m) => m[0] === 'N' ? 'Número' : 'número')
    .replace(/d�a/gi, (m) => m[0] === 'D' ? 'Día' : 'día')
    .replace(/atendi�/gi, (m) => m[0] === 'A' ? 'Atendió' : 'atendió')
    .replace(/revisi�n/gi, (m) => m[0] === 'R' ? 'Revisión' : 'revisión')
    .replace(/aprobaci�n/gi, (m) => m[0] === 'A' ? 'Aprobación' : 'aprobación')

  return text
}

function sanitizeNotificationRow(row) {
  if (!row || typeof row !== 'object') return row
  return {
    ...row,
    titulo: sanitizeNotificationText(row.titulo),
    mensaje: sanitizeNotificationText(row.mensaje),
  }
}

// === Utilidades de password (faltaban y causaban 500) ===
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}
function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false
  const [rawSalt, rawHash] = stored.split(':')
  const salt = String(rawSalt || '').trim()
  const hash = String(rawHash || '').trim()
  if (!salt || !hash) return false
  const check = crypto.pbkdf2Sync(String(password), salt, 1000, 64, 'sha512').toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'))
  } catch {
    return false
  }
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
  } catch (e) {
    console.warn('⚠️  No se pudo asegurar directorio de datos:', e.message)
  }
}

function loadUsers() {
  try {
    ensureDataDir()
    if (!fs.existsSync(USERS_FILE)) return
    const raw = fs.readFileSync(USERS_FILE, 'utf-8')
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      for (const u of arr) {
        if (u && u.key) {
          registeredUsers.set(u.key, { ...u })
        }
      }
    }
  } catch (e) {
    console.warn('⚠️  No se pudieron cargar usuarios persistidos:', e.message)
  }
}

function saveUsersToFile() {
  try {
    ensureDataDir()
    const arr = []
    for (const [key, val] of registeredUsers.entries()) {
      arr.push({ key, ...val })
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(arr, null, 2), 'utf-8')
  } catch (e) {
    console.warn('⚠️  No se pudieron guardar usuarios:', e.message)
  }
}

// Cliente SOAP (se inicializa al arrancar)
let soapClient = null
let soapEndpoint = null
// Guardar último intercambio SOAP para diagnóstico
let lastSoapExchange = { requestXml: null, responseXml: null, timestamp: null }

// Helper: calcular fecha + N días hábiles (lunes a viernes)
function addBusinessDays(date, days) {
  const result = new Date(date)
  let addedDays = 0
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1)
    // 0 = domingo, 6 = sábado
    const dayOfWeek = result.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++
    }
  }
  
  return result
}

// ===== ENDPOINTS DINÁMICOS DE SERVICIOS SOAP =====

/**
 * Construir URL SOAP desde componentes en nusispar
 * @param {boolean} includeWSDL - Si true, agrega ?WSDL al final
 * @returns {Promise<string>} URL completa construida
 */
async function buildSoapUrl(includeWSDL = false) {
  const host = await getParametro('WSBENEFTK', 'Host', null)
  const port = await getParametro('WSBENEFTK', 'Port', null)
  const secure = await getParametro('WSBENEFTK', 'Secure', null)
  const baseUrl = await getParametro('WSBENEFTK', 'BaseUrl', null)
  const servicio = await getParametro('WSBENEFTK', 'Servicio', null)
  
  if (!host || !port || !secure || !baseUrl || !servicio) {
    throw new Error('Configuración incompleta en nusispar (WSBENEFTK): faltan Host, Port, Secure, BaseUrl o Servicio')
  }
  
  const protocol = secure === '1' ? 'https' : 'http'
  const url = `${protocol}://${host}:${port}${baseUrl}${servicio}`
  const finalUrl = includeWSDL ? `${url}?WSDL` : url
  
  console.log(`🔗 URL SOAP construida: ${finalUrl}`)
  console.log(`   Componentes: ${protocol}://${host}:${port} + ${baseUrl} + ${servicio}`)
  
  return finalUrl
}

/**
 * Obtener endpoint de un servicio específico desde nusispar
 * @param {string} servicio - Nombre del servicio (APPDATOSCREDENCIALES, REGISTRACION, etc.)
 * @returns {Promise<string>} URL del endpoint
 */
async function getServiceEndpoint(servicio) {
  // Construir URL desde componentes (todos los servicios usan la misma URL base)
  const endpoint = await buildSoapUrl(false)
  console.log(`🔗 Endpoint ${servicio}: ${endpoint}`)
  return endpoint
}

/**
 * Obtener WSDL URL construida desde componentes
 * @returns {Promise<string>} URL del WSDL
 */
async function getWsdlUrl() {
  const wsdlUrl = await buildSoapUrl(true)
  console.log(`📋 WSDL URL: ${wsdlUrl}`)
  return wsdlUrl
}

/**
 * Obtener usuario SOAP desde parámetros
 * @returns {Promise<string>} Usuario SOAP
 */
async function getSoapUser() {
  const usuario = await getParametro('WSBENEFTK', 'User', null)
  if (!usuario) {
    throw new Error('User no configurado en nusispar (WSBENEFTK.User)')
  }
  return usuario
}

/**
 * Obtener password SOAP desde parámetros
 * @returns {Promise<string>} Password SOAP
 */
async function getSoapPassword() {
  const password = await getParametro('WSBENEFTK', 'Password', null)
  if (!password) {
    throw new Error('Password no configurado en nusispar (WSBENEFTK.Password)')
  }
  return password
}

// ============================================================================
// FUNCIONES PARA ENDPOINT SIA (WSSIATK)
// ============================================================================

/**
 * Construir URL SOAP SIA desde componentes en nusispar
 * @param {boolean} includeWSDL - Si true, agrega ?WSDL al final
 * @returns {Promise<string>} URL completa construida
 */
async function buildSoapUrlSIA(includeWSDL = false) {
  const host = await getParametro('WSSIATK', 'Host', null)
  const port = await getParametro('WSSIATK', 'Port', null)
  const secure = await getParametro('WSSIATK', 'Secure', null)
  const baseUrl = await getParametro('WSSIATK', 'BaseUrl', null)
  const servicio = await getParametro('WSSIATK', 'Servicio', null)
  
  if (!host || !port || !secure || !baseUrl || !servicio) {
    throw new Error('Configuración incompleta en nusispar (WSSIATK): faltan Host, Port, Secure, BaseUrl o Servicio')
  }
  
  const protocol = secure === '1' ? 'https' : 'http'
  const url = `${protocol}://${host}:${port}${baseUrl}${servicio}`
  const finalUrl = includeWSDL ? `${url}?WSDL` : url
  
  console.log(`🔗 URL SOAP SIA construida: ${finalUrl}`)
  console.log(`   Componentes: ${protocol}://${host}:${port} + ${baseUrl} + ${servicio}`)
  
  return finalUrl
}

/**
 * Obtener endpoint SIA de un servicio específico desde nusispar
 * @param {string} servicio - Nombre del servicio SIA
 * @returns {Promise<string>} URL del endpoint
 */
async function getServiceEndpointSIA(servicio) {
  const endpoint = await buildSoapUrlSIA(false)
  console.log(`🔗 Endpoint SIA ${servicio}: ${endpoint}`)
  return endpoint
}

/**
 * Obtener WSDL URL SIA construida desde componentes
 * @returns {Promise<string>} URL del WSDL
 */
async function getWsdlUrlSIA() {
  const wsdlUrl = await buildSoapUrlSIA(true)
  console.log(`📋 WSDL URL SIA: ${wsdlUrl}`)
  return wsdlUrl
}

/**
 * Obtener usuario SOAP SIA desde parámetros
 * @returns {Promise<string>} Usuario SOAP
 */
async function getSoapUserSIA() {
  const usuario = await getParametro('WSSIATK', 'User', null)
  if (!usuario) {
    throw new Error('User no configurado en nusispar (WSSIATK.User)')
  }
  return usuario
}

/**
 * Obtener password SOAP SIA desde parámetros
 * @returns {Promise<string>} Password SOAP
 */
async function getSoapPasswordSIA() {
  const password = await getParametro('WSSIATK', 'Password', null)
  if (!password) {
    throw new Error('Password no configurado en nusispar (WSSIATK.Password)')
  }
  return password
}

// ============================================================================
// FIN FUNCIONES SIA
// ============================================================================

// Helper: obtener días de vigencia desde tabla nusispar
async function getDiasVigenciaCredencial() {
  const dias = await getParametroNumero('GENERALES', 'VigenciaCred', 10)
  console.log(`📅 Días de vigencia desde parámetro: ${dias}`)
  return dias
}

// Helper: obtener fecha de vencimiento (fecha registración + días vigencia desde parámetro)
async function getDefaultVencimiento(fechaRegistracion = null) {
  const diasVigencia = await getDiasVigenciaCredencial()
  // SIEMPRE usar fecha actual para calcular vencimiento de credencial
  // El parámetro fechaRegistracion se ignora porque las credenciales vencen desde HOY
  const fechaBase = new Date()
  const fecha = addBusinessDays(fechaBase, diasVigencia)
  // Formato YYYY-MM-DD para PostgreSQL date
  return fecha.toISOString().split('T')[0]
}

// Helper: construir AfiliadoId desde sus componentes
// AfiliadoId = [9 dígitos titular][12 dígitos organización][9 dígitos familiar]
function buildAfiliadoId(titularNro, organizacionId, familiarNro) {
  const titular = String(titularNro || '').padStart(9, '0')
  const organizacion = String(organizacionId || '1').padStart(12, '0')
  const familiar = String(familiarNro || '').padStart(9, '0')
  return titular + organizacion + familiar
}

// Helper: extraer componentes desde AfiliadoId de 30 chars
function parseAfiliadoId(afiliadoId) {
  if (!afiliadoId || afiliadoId.length !== 30) return null
  return {
    titularNro: afiliadoId.substring(0, 9),
    organizacionId: afiliadoId.substring(9, 21),
    familiarNro: afiliadoId.substring(21, 30)
  }
}

function buildPlanIdFromDescription(planDescRaw) {
  const normalizedDesc = String(planDescRaw || '').trim().toUpperCase()
  if (!normalizedDesc) return null

  const slugBase = normalizedDesc
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  const slug = (slugBase || 'PLAN').slice(0, 16)
  const hash = crypto
    .createHash('sha1')
    .update(normalizedDesc)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase()

  return `AUTO_${slug}_${hash}`.slice(0, 30)
}

function normalizePlanId(planIdRaw, planDescRaw = '') {
  const planId = String(planIdRaw || '').trim()
  if (planId) return planId.slice(0, 30)
  return buildPlanIdFromDescription(planDescRaw)
}

function normalizePlanDescripcion(planId, planDescRaw) {
  const planDesc = String(planDescRaw || '').trim()
  const fallback = `PLAN ${planId}`
  return (planDesc || fallback).slice(0, 40)
}

async function ensurePlanExists(planIdRaw, planDescRaw = '', client = null) {
  const planId = normalizePlanId(planIdRaw, planDescRaw)
  if (!planId) return null

  const executor = client && typeof client.query === 'function' ? client : db
  const exists = await executor.query(
    `SELECT 1 FROM nuplan WHERE TRIM(nuplaid) = TRIM($1) LIMIT 1`,
    [planId]
  )

  if (exists.rows.length > 0) return planId

  const planDesc = normalizePlanDescripcion(planId, planDescRaw)
  await executor.query(
    `INSERT INTO nuplan (nuplaid, nupladescr, nuplim, nuplim_gxi, nuplalad, nuplimfech)
     VALUES ($1, $2, $3, NULL, 'N', NOW())
     ON CONFLICT (nuplaid) DO NOTHING`,
    [planId, planDesc, Buffer.alloc(0)]
  )

  console.log(`✅ Plan creado/asegurado en nuplan: ${planId} (${planDesc})`)
  return planId
}

/**
 * Guardar datos de registro en la tabla nuusuari
 * @param {Object} formData - Datos del formulario de registro
 * @param {Object} soapResponse - Respuesta parseada del servicio SOAP REGISTRACION
 * @returns {Promise<string>} nuusuid del registro insertado
 */
async function saveToNuusuari(formData, soapResponse, gamNuusuid = null) {
  try {
    const { cuil, dni, nroAfiliado, fechaNacimiento, sexo, email, telefono } = formData
    const {
      AfiliadoId,
      AfiliadoNro,
      Apellido,
      Nombre,
      PlanId,
      EsTitular,
      TitularNro,
      OrganizacionId,
      FamiliarNro
    } = soapResponse

    // Construir AfiliadoId si no viene directo
    let afiliadoIdFinal = AfiliadoId
    if (!afiliadoIdFinal && (TitularNro || OrganizacionId || FamiliarNro)) {
      afiliadoIdFinal = buildAfiliadoId(TitularNro, OrganizacionId, FamiliarNro)
    }

    // Si no hay AfiliadoId, usar CUIL/DNI/NroAfiliado como fallback
    if (!afiliadoIdFinal) {
      afiliadoIdFinal = cuil || dni || nroAfiliado || ''
    }

    // Construir apellido y nombre en formato "APELLIDO, NOMBRE"
    const apellidoNombre = Apellido && Nombre 
      ? `${Apellido}, ${Nombre}` 
      : (Apellido || Nombre || '')

    // Número de afiliado
    const numeroAfiliado = AfiliadoNro || nroAfiliado || cuil || dni || ''

    // Valores por defecto según especificación:
    // - nuusutelef: espacios en blanco (caracteres)
    // - nuusuidbil: espacios en blanco (caracteres)
    // - nuusuqrbil: espacios en blanco (text)
    // - nuusuultno: 0 (numérico)
    // - nuusunivel: 0 (numérico)
    // - nuusubajaf: '0001-01-01' (fecha mínima)
    const telefonoFinal = telefono || ''

    const planIdAsegurado = await ensurePlanExists(PlanId, soapResponse?.Plan || soapResponse?.PlanDescripcion || '')
    const sexoNormalizado = normalizeSexo(sexo)
    const esTitularNormalizado = normalizeEsTitular(EsTitular)

    if (!sexoNormalizado) {
      throw new Error('SEXO_REQUERIDO_INVALIDO')
    }

    let nuusuid
    let insertQuery
    let params

    // Si tenemos nuusuid de GAM, insertamos con ese ID (requiere nuusuid sea VARCHAR)
    if (gamNuusuid) {
      console.log('🔑 Usando GAM UserID como nuusuid:', gamNuusuid)
      insertQuery = `
        INSERT INTO nuusuari (
          nuusuid,
          nuusuafili,
          nuplaid,
          nuusufecha,
          nuusunroaf,
          nuususexo,
          nuusuapell,
          nuusuestit,
          nuusutelef,
          nuusumail,
          nuusubajaf,
          nuusunivel
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '0001-01-01'::timestamp, 0
        ) RETURNING nuusuid
      `
      params = [
        gamNuusuid,               // $1: nuusuid (de GAM)
        afiliadoIdFinal,          // $2: nuusuafili
        planIdAsegurado,          // $3: nuplaid
        fechaNacimiento,          // $4: nuusufecha
        numeroAfiliado,           // $5: nuusunroaf (DNI, CUIL o nroAfiliado)
        sexoNormalizado,          // $6: nuususexo
        apellidoNombre,           // $7: nuusuapell
        esTitularNormalizado,     // $8: nuusuestit
        telefonoFinal,            // $9: nuusutelef
        email || ''               // $10: nuusumail
      ]
    } else {
      // Modo legacy: dejar que PostgreSQL genere el ID automáticamente
      console.log('🔢 Generando nuusuid automáticamente (modo legacy)')
      insertQuery = `
        INSERT INTO nuusuari (
          nuusuafili,
          nuplaid,
          nuusufecha,
          nuusunroaf,
          nuususexo,
          nuusuapell,
          nuusuestit,
          nuusutelef,
          nuusumail,
          nuusubajaf,
          nuusunivel
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, '0001-01-01'::timestamp, 0
        ) RETURNING nuusuid
      `
      params = [
        afiliadoIdFinal,          // $1: nuusuafili
        planIdAsegurado,          // $2: nuplaid
        fechaNacimiento,          // $3: nuusufecha
        numeroAfiliado,           // $4: nuusunroaf
        sexoNormalizado,          // $5: nuususexo
        apellidoNombre,           // $6: nuusuapell
        esTitularNormalizado,     // $7: nuusuestit
        telefonoFinal,            // $8: nuusutelef
        email || ''               // $9: nuusumail
      ]
    }

    const result = await db.query(insertQuery, params)
    
    nuusuid = result.rows[0]?.nuusuid
    console.log('✅ Guardado en nuusuari:', { 
      nuusuid, 
      origen: gamNuusuid ? 'GAM' : 'Legacy',
      afiliadoId: afiliadoIdFinal, 
      apellido: Apellido, 
      nombre: Nombre, 
      planId: PlanId, 
      esTitular: EsTitular 
    })
    
    return nuusuid
  } catch (error) {
    console.error('❌ Error al guardar en nuusuari:', error)
    throw error
  }
}

/**
 * Obtener usuario de la base de datos por username (email o número de afiliado)
 * @param {string} username - Email o número de afiliado
 * @returns {Object|null} Datos del usuario o null si no existe
 */
async function getUserByUsername(username) {
  try {
    return await userRepository.findPublicByUsername(username)
  } catch (error) {
    console.error('❌ Error en getUserByUsername:', error)
    return null
  }
}

/**
 * Calcular hash SHA-256 de una credencial para detección de cambios
 * @param {Object} cred - Datos de credencial desde SOAP
 * @returns {string} Hash SHA-256 hexadecimal
 */
function calculateCredencialHash(cred) {
  const dataString = [
    cred.AFILIADOID || cred.AfiliadoId || '',
    cred.FECHAVENCIMIENTO || cred.FechaVencimiento || '',
    cred.NUMERODEAFILIADO || cred.NumeroDeAfiliado || '',
    cred.CUIL || cred.Cuil || '',
    cred.APELLIDO || cred.Apellido || '',
    cred.NOMBRE || cred.Nombre || '',
    cred.DOCUMENTO || cred.Documento || '',
    cred.SEXO || cred.Sexo || '',
    cred.FECHANACIMIENTO || cred.FechaNacimiento || '',
    cred.PLANID || cred.PlanId || '',
    cred.ENLACEIMAGENCREDENCIAL || cred.EnlaceImagenCredencial || ''
  ].join('|')
  
  return crypto.createHash('sha256').update(dataString).digest('hex')
}

/**
 * Parsear respuesta SOAP de CONSULTA_DATOS_CREDENCIAL
 * @param {Object} soapResult - Resultado del servicio SOAP
 * @returns {Array} Array de credenciales
 */
function parseDatosCredencial(soapResult) {
  try {
    console.log('🔍 parseDatosCredencial - Input completo:', JSON.stringify(soapResult, null, 2))
    
    // La respuesta SOAP de APPDATOSCREDENCIALES retorna estructura diferente
    // Primero intentar obtener el resultado raw
    let resultado = soapResult?.[0]?.Resultado || soapResult?.Resultado
    
    console.log('🔍 Resultado extraído:', JSON.stringify(resultado, null, 2))
    
    // Si Resultado es string JSON, parsearlo
    if (typeof resultado === 'string') {
      try {
        resultado = JSON.parse(resultado)
        console.log('✅ Resultado parseado desde string:', JSON.stringify(resultado, null, 2))
      } catch (e) {
        console.error('❌ Error parseando Resultado como JSON:', e.message)
      }
    }
    
    // Resultado debería ser array de credenciales con formato CredencialDatos
    if (!resultado || !Array.isArray(resultado)) {
      console.warn('⚠️  Resultado no es un array:', resultado)
      return []
    }
    
    console.log(`📋 ${resultado.length} credenciales encontradas en respuesta SOAP`)
    return resultado
    
  } catch (error) {
    console.error('❌ Error parseando datos de credencial:', error)
    console.error('Stack:', error.stack)
    return []
  }
}

/**
 * Normalizar campos de credencial desde formato CredencialDatos
 * @param {Object} cred - Credencial desde SOAP con formato { CredencialDatos: [{Nombre, Valor}] }
 * @returns {Object} Credencial normalizada
 */
function normalizeCredencial(cred) {
  console.log('🔧 normalizeCredencial - Input:', JSON.stringify(cred, null, 2))
  
  // Si viene en formato CredencialDatos (array de {Nombre, Valor})
  if (cred.CredencialDatos && Array.isArray(cred.CredencialDatos)) {
    const datos = {}
    cred.CredencialDatos.forEach(item => {
      const nombre = (item.Nombre || '').replace(/\|/g, '').trim().toUpperCase()
      const valor = item.Valor || ''
      
      // Mapear nombres de campos a propiedades
      switch (nombre) {
        case 'NOMBRE Y APELLIDO':
        case 'APELLIDO Y NOMBRE':
          datos.ApellidoNombre = valor
          break
        case 'NUMERO DE AFILIADO':
        case 'NRO DE AFILIADO':
          datos.NumeroDeAfiliado = valor
          break
        case 'PARENTESCO':
          datos.Parentesco = valor
          break
        case 'DOCUMENTO':
        case 'DNI':
          datos.Documento = valor
          break
        case 'FECHA DE NACIMIENTO':
          datos.FechaNacimiento = valor
          break
        case 'CUIL':
          datos.Cuil = valor
          break
        case 'SEXO':
          datos.Sexo = valor
          break
        case 'PLAN':
          datos.PlanDescripcion = valor
          break
        case 'FECHA VIGENCIA':
        case 'VIGENCIA':
          datos.FechaVencimiento = valor
          break
        case 'LINEA':
          datos.EnlaceImagenCredencial = valor
          break
      }
    })
    
    // AfiliadoId y AfiliadoCUIL deben venir en el objeto principal, no en CredencialDatos
    datos.AfiliadoId = cred.AfiliadoId || ''
    
    // PlanId debe venir del objeto principal (código), NO de CredencialDatos (descripción)
    datos.PlanId = cred.PlanId || ''
    
    // Si CUIL está vacío en CredencialDatos, usar AfiliadoCUIL del objeto principal
    if (!datos.Cuil || datos.Cuil === '') {
      datos.Cuil = String(cred.AfiliadoCUIL || cred.afiliadoCUIL || '')
    }
    
    console.log('✅ Credencial normalizada:', JSON.stringify(datos, null, 2))
    return datos
  }
  
  // Fallback: formato antiguo (propiedades directas)
  return {
    AfiliadoId: cred.AFILIADOID || cred.AfiliadoId || '',
    FechaVencimiento: cred.FECHAVENCIMIENTO || cred.FechaVencimiento || '',
    EnlaceImagenCredencial: cred.ENLACEIMAGENCREDENCIAL || cred.EnlaceImagenCredencial || '',
    NumeroDeAfiliado: cred.NUMERODEAFILIADO || cred.NumeroDeAfiliado || '',
    ApellidoNombre: (cred.APELLIDO || cred.Apellido || '') + ', ' + (cred.NOMBRE || cred.Nombre || ''),
    Cuil: cred.CUIL || cred.Cuil || cred.AfiliadoCUIL || cred.afiliadoCUIL || '',
    PlanId: cred.PLANID || cred.PlanId || '',
    PlanDescripcion: cred.PLAN || cred.Plan || cred.PlanDescripcion || '',
    Documento: cred.DOCUMENTO || cred.Documento || '',
    Sexo: cred.SEXO || cred.Sexo || '',
    FechaNacimiento: cred.FECHANACIMIENTO || cred.FechaNacimiento || '',
    Parentesco: cred.PARENTESCO || cred.Parentesco || 'Familiar'
  }
}

function resolveSoapApellidoNombre(credencialesRaw = [], afiliadoIdPreferido = '') {
  if (!Array.isArray(credencialesRaw) || credencialesRaw.length === 0) return null

  const normalized = credencialesRaw
    .map((cred) => normalizeCredencial(cred))
    .filter((cred) => cred && String(cred.ApellidoNombre || '').trim())

  if (normalized.length === 0) return null

  const afiliadoPreferido = String(afiliadoIdPreferido || '').trim()
  const exacto = afiliadoPreferido
    ? normalized.find((cred) => String(cred.AfiliadoId || '').trim() === afiliadoPreferido)
    : null

  const titular = normalized.find((cred) => String(cred.Parentesco || '').trim().toUpperCase() === 'TITULAR')
  const elegido = exacto || titular || normalized[0]
  const nombre = String(elegido?.ApellidoNombre || '').trim()
  return nombre || null
}

function normalizeSexo(sexoRaw, options = {}) {
  const { defaultValue = null } = options
  const sexo = String(sexoRaw || '').trim().toUpperCase()
  if (!sexo) return defaultValue

  if (sexo === 'F' || sexo === 'FEMENINO') return 'F'
  if (sexo === 'M' || sexo === 'MASCULINO') return 'M'
  if (sexo === 'N' || sexo === 'NO_BINARIO' || sexo === 'X') return 'N'

  const first = sexo.slice(0, 1)
  if (['F', 'M', 'N'].includes(first)) return first
  return defaultValue
}

function normalizeEsTitular(esTitularRaw, parentescoRaw = '') {
  if (typeof esTitularRaw === 'boolean') return esTitularRaw ? 'S' : 'N'

  const esTitular = String(esTitularRaw || '').trim().toUpperCase()
  if (esTitular === 'S' || esTitular === 'N') return esTitular
  if (['SI', 'TRUE', 'T', 'Y', 'YES', '1'].includes(esTitular)) return 'S'
  if (['NO', 'FALSE', 'F', '0'].includes(esTitular)) return 'N'

  const parentesco = String(parentescoRaw || '').trim().toUpperCase()
  if (parentesco === 'TITULAR') return 'S'
  if (parentesco) return 'N'

  return 'N'
}

function resolveSoapNuusuariData(credencialesRaw = [], afiliadoIdPreferido = '') {
  if (!Array.isArray(credencialesRaw) || credencialesRaw.length === 0) {
    return {
      apellidoNombre: null,
      sexo: null,
      planId: null,
      planDescripcion: '',
      esTitular: null
    }
  }

  const normalized = credencialesRaw
    .map((cred) => normalizeCredencial(cred))
    .filter((cred) => cred)

  if (normalized.length === 0) {
    return {
      apellidoNombre: null,
      sexo: null,
      planId: null,
      planDescripcion: '',
      esTitular: null
    }
  }

  const afiliadoPreferido = String(afiliadoIdPreferido || '').trim()
  const exacto = afiliadoPreferido
    ? normalized.find((cred) => String(cred.AfiliadoId || '').trim() === afiliadoPreferido)
    : null

  const titular = normalized.find((cred) => String(cred.Parentesco || '').trim().toUpperCase() === 'TITULAR')
  const elegido = exacto || titular || normalized[0]

  return {
    apellidoNombre: String(elegido.ApellidoNombre || '').trim() || null,
    sexo: normalizeSexo(elegido.Sexo),
    planId: normalizePlanId(elegido.PlanId, elegido.PlanDescripcion),
    planDescripcion: String(elegido.PlanDescripcion || '').trim(),
    esTitular: normalizeEsTitular(null, elegido.Parentesco)
  }
}

/**
 * INSERT nueva credencial en la tabla crcreden
 * @param {Object} client - Cliente de transacción PostgreSQL
 * @param {Object} cred - Credencial normalizada
 * @param {string} hash - Hash SHA-256 de verificación
 * @param {string} fechaRegistracion - Fecha de registración del usuario (opcional)
 */
async function insertCredencial(client, cred, hash, fechaRegistracion = null, precomputed = {}) {
  const query = `
    INSERT INTO crcreden (
      crcreid, crcrefecvi, crcrelin, crcrenroaf, crcreapeno,
      crcreafili, crcrecuil, crcreplaid, crcredocum, crcresexo,
      crcrefecha, crcrehash, crcreifech, crcreparen
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13)
  `
  
  const apellidoNombre = cred.ApellidoNombre || ''
  const cuilNumerico = parseInt(cred.Cuil || '0')
  const parentesco = cred.Parentesco || 'Titular'
  const planIdAsegurado = precomputed.planIdAsegurado ?? await ensurePlanExists(cred.PlanId, cred.PlanDescripcion, client)
  
  // SIEMPRE calcular fecha de vencimiento desde fecha registración + días vigencia (parámetro)
  // No confiar en FechaVencimiento de SOAP que viene vacío
  const fechaVencimiento = precomputed.fechaVencimiento ?? await getDefaultVencimiento(fechaRegistracion)
  
  await client.query(query, [
    cred.AfiliadoId,
    fechaVencimiento,
    cred.EnlaceImagenCredencial || '',
    cred.NumeroDeAfiliado,
    apellidoNombre,
    cred.AfiliadoId, // crcreafili = mismo que crcreid
    cuilNumerico,
    planIdAsegurado,
    cred.Documento,
    cred.Sexo,
    cred.FechaNacimiento || null,
    hash,
    parentesco
  ])
}

/**
 * UPDATE credencial existente en la tabla crcreden
 * @param {Object} client - Cliente de transacción PostgreSQL
 * @param {Object} cred - Credencial normalizada
 * @param {string} hash - Hash SHA-256 actualizado
 * @param {string} fechaRegistracion - Fecha de registración del usuario (opcional)
 */
async function updateCredencial(client, cred, hash, fechaRegistracion = null, precomputed = {}) {
  const query = `
    UPDATE crcreden SET
      crcrefecvi = $2, crcrelin = $3, crcrenroaf = $4, crcreapeno = $5,
      crcreafili = $6, crcrecuil = $7, crcreplaid = $8, crcredocum = $9,
      crcresexo = $10, crcrefecha = $11, crcrehash = $12, crcreifech = NOW(),
      crcreparen = $13, version = version + 1
    WHERE crcreid = $1
  `
  
  const apellidoNombre = cred.ApellidoNombre || ''
  const cuilNumerico = parseInt(cred.Cuil || '0')
  const parentesco = cred.Parentesco || 'Titular'
  const planIdAsegurado = precomputed.planIdAsegurado ?? await ensurePlanExists(cred.PlanId, cred.PlanDescripcion, client)
  
  // SIEMPRE calcular fecha de vencimiento desde fecha registración + días vigencia (parámetro)
  // No confiar en FechaVencimiento de SOAP que viene vacío
  const fechaVencimiento = precomputed.fechaVencimiento ?? await getDefaultVencimiento(fechaRegistracion)
  
  await client.query(query, [
    cred.AfiliadoId,
    fechaVencimiento,
    cred.EnlaceImagenCredencial || '',
    cred.NumeroDeAfiliado,
    apellidoNombre,
    cred.AfiliadoId,
    cuilNumerico,
    planIdAsegurado,
    cred.Documento,
    cred.Sexo,
    cred.FechaNacimiento || null,
    hash,
    parentesco
  ])
}

/**
 * Sincronizar credenciales del grupo familiar
 * Consulta SOAP, detecta cambios por hash, actualiza BD
 * @param {string} nuusuid - ID del usuario en nuusuari
 * @param {string} afiliadoId - AfiliadoId del usuario para consultar SOAP
 * @returns {Promise<Object>} Resultado de sincronización con estadísticas
 */
async function syncCredencialesGrupoFamiliar(nuusuid, afiliadoId) {
  const client = await db.getClient()
  try {
    await client.query('BEGIN')
    
    console.log('🔄 Sincronizando credenciales para AfiliadoId:', afiliadoId)

    const inferEmptyCredencialesInfo = (soapMensajes) => {
      const descriptions = (soapMensajes || [])
        .map((m) => (m?.Description ?? m?.description ?? m)?.toString?.() ?? '')
        .filter(Boolean)

      const joined = descriptions.join(' | ').toLowerCase()
      const normalize = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
      const hay = normalize(joined)

      if (
        hay.includes('no hay miembros activos') ||
        hay.includes('sin miembros activos')
      ) {
        return {
          code: 'AFILIADO_SIN_MIEMBROS_ACTIVOS',
          message: 'No se encontraron credenciales: el afiliado no existe o no tiene miembros activos en el padrón del servicio consultado.'
        }
      }

      if (
        hay.includes('no existe') ||
        hay.includes('no se encuentra') ||
        hay.includes('no encontrado') ||
        hay.includes('inexistente')
      ) {
        return {
          code: 'AFILIADO_NO_EXISTE',
          message: 'No se encontraron credenciales: el afiliado no existe en el padrón del servicio consultado.'
        }
      }

      if (
        hay.includes('vacio') ||
        hay.includes('vacío') ||
        hay.includes('invalido') ||
        hay.includes('inválido')
      ) {
        return {
          code: 'PARAMETROS_INVALIDOS',
          message: 'El identificador de afiliado enviado no es válido para el servicio.'
        }
      }

      if (descriptions.length > 0) {
        return {
          code: 'SIN_CREDENCIALES',
          message: `No se encontraron credenciales: el afiliado no existe o no está activo en el padrón del servicio consultado. (${descriptions[0]})`
        }
      }

      return {
        code: 'SIN_CREDENCIALES',
        message: 'No se encontraron credenciales: el afiliado no existe o no está activo en el padrón del servicio consultado.'
      }
    }

    const parseSoapMensajes = (soapResult) => {
      const raw = soapResult?.[0]?.Mensajes
      if (!raw) return []
      if (Array.isArray(raw)) return raw
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw)
          return Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          return [{ Type: 1, Description: String(raw) }]
        }
      }
      return [{ Type: 1, Description: String(raw) }]
    }

    const inferAfiliacionNoVigente = (mensajes, errorDsc = '') => {
      const normalize = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
      const text = normalize([
        errorDsc,
        ...(mensajes || []).map((m) => m?.Description ?? m?.description ?? m)
      ].join(' | '))

      return (
        text.includes('no existe el afiliado') ||
        text.includes('afiliado no existe') ||
        text.includes('afiliado inexistente') ||
        text.includes('no se encuentra') ||
        text.includes('no encontrado') ||
        text.includes('sin miembros activos') ||
        text.includes('no hay miembros activos') ||
        text.includes('no esta activo') ||
        text.includes('inactivo') ||
        text.includes('dado de baja')
      )
    }

    const buildSoapDetails = (parsedValidation = {}) => {
      return parsedValidation.errorDsc ||
        (parsedValidation.mensajes || [])
          .map((m) => m?.Description || m?.description || m)
          .filter(Boolean)
          .join('; ') ||
        ''
    }

    const validacionMiembroCache = new Map()
    const validarMiembroEnBenef = async (cred) => {
      const nroAfiliado = String(cred?.NumeroDeAfiliado || '').trim()
      const afiliadoIdMiembro = String(cred?.AfiliadoId || '').trim()
      const cacheKey = nroAfiliado || afiliadoIdMiembro

      if (!cacheKey) {
        return { vigente: true, skipped: true, details: 'Sin AfiliadoNro/AfiliadoId para validar miembro' }
      }

      if (validacionMiembroCache.has(cacheKey)) {
        return validacionMiembroCache.get(cacheKey)
      }

      const validationPayload = {
        AfiliadoNro: nroAfiliado || afiliadoIdMiembro,
        Documento: '',
        CUIL: ''
      }

      try {
        const soapValidation = await callSoapExecute('VALIDAAFIREG', validationPayload)
        const parsedValidation = parseSoapResult(soapValidation)
        const noVigente = inferAfiliacionNoVigente(parsedValidation.mensajes, parsedValidation.errorDsc)

        if (noVigente) {
          const result = {
            vigente: false,
            skipped: false,
            details: buildSoapDetails(parsedValidation) || 'No vigente en VALIDAAFIREG',
            nroAfiliadoValidado: validationPayload.AfiliadoNro
          }
          validacionMiembroCache.set(cacheKey, result)
          return result
        }

        // Verificación adicional por AfiliadoId del integrante.
        // Si no responde individualmente en APPDATOSCREDENCIALES, se excluye del carrusel.
        if (afiliadoIdMiembro) {
          const checkById = await fetchCredencialesFromSoap(afiliadoIdMiembro)
          if (!Array.isArray(checkById.credenciales) || checkById.credenciales.length === 0) {
            const detailsById =
              (checkById.mensajes || [])
                .map((m) => m?.Description || m?.description || m)
                .filter(Boolean)
                .join('; ') ||
              'El integrante no responde como AfiliadoId vigente en APPDATOSCREDENCIALES'

            const result = {
              vigente: false,
              skipped: false,
              details: detailsById,
              nroAfiliadoValidado: validationPayload.AfiliadoNro,
              afiliadoIdValidado: afiliadoIdMiembro
            }
            validacionMiembroCache.set(cacheKey, result)
            return result
          }
        }

        const result = {
          vigente: true,
          skipped: false,
          details: buildSoapDetails(parsedValidation),
          nroAfiliadoValidado: validationPayload.AfiliadoNro
        }
        validacionMiembroCache.set(cacheKey, result)
        return result
      } catch (e) {
        const result = {
          vigente: false,
          skipped: false,
          details: e?.message || String(e),
          errorCode: 'AFILIACION_VALIDACION_MIEMBRO_NO_DISPONIBLE',
          nroAfiliadoValidado: validationPayload.AfiliadoNro
        }
        validacionMiembroCache.set(cacheKey, result)
        return result
      }
    }

    const fetchCredencialesFromSoap = async (afiliadoIdCandidate) => {
      const soapParams = {
        AfiliadoId: afiliadoIdCandidate,
        CredencialDatos: [
          { Nombre: "|NOMBRE Y APELLIDO|" },
          { Nombre: "|NUMERO DE AFILIADO|" },
          { Nombre: "|PARENTESCO|" },
          { Nombre: "|DOCUMENTO|" },
          { Nombre: "|FECHA DE NACIMIENTO|" },
          { Nombre: "|CUIL|" },
          { Nombre: "|SEXO|" },
          { Nombre: "|PLAN|" },
          { Nombre: "|FECHA VIGENCIA|" },
          { Nombre: "|LINEA|" }
        ]
      }

      console.log('📞 Llamando APPDATOSCREDENCIALES...', { AfiliadoId: afiliadoIdCandidate, campos: soapParams.CredencialDatos.length })
      const soapResult = await callSoapExecutePlain('APPDATOSCREDENCIALES', soapParams)
      const mensajes = parseSoapMensajes(soapResult)
      const credenciales = parseDatosCredencial(soapResult)
      console.log(`📋 Credenciales obtenidas desde SOAP (${afiliadoIdCandidate}): ${credenciales.length}`)
      if (mensajes.length > 0) {
        const first = mensajes[0]
        console.log('📣 SOAP Mensaje:', first?.Description || first)
      }
      return { credenciales, mensajes, afiliadoIdUsado: afiliadoIdCandidate }
    }
    
    // 0. Obtener fecha de registración del usuario (nuusufecha) y estado de baja
    let fechaRegistracion = null
    let usuarioActivo = true
    let nroAfiliadoValidacion = null
    try {
      const userResult = await client.query(
        'SELECT nuusufecha, nuusubajaf, nuusunroaf FROM nuusuari WHERE nuusuid = $1',
        [nuusuid]
      )
      if (userResult.rows.length > 0 && userResult.rows[0].nuusufecha) {
        fechaRegistracion = userResult.rows[0].nuusufecha
        console.log(`📅 Fecha registración usuario: ${fechaRegistracion}`)
      }

      if (userResult.rows.length > 0) {
        // Consistente con /auth/login: se considera desactivado solo si nuusubajaf es una fecha real (> 1900)
        const bajafRaw = userResult.rows[0].nuusubajaf
        const fechaBaja = bajafRaw ? new Date(bajafRaw) : null
        const estaDesactivado = !!(fechaBaja && !isNaN(fechaBaja.getTime()) && fechaBaja.getFullYear() > 1900)
        usuarioActivo = !estaDesactivado
        if (!usuarioActivo) {
          console.warn('⚠️  Usuario desactivado (nuusubajaf con fecha real): no se renovará vigencia de credenciales')
        }

        nroAfiliadoValidacion = (userResult.rows[0].nuusunroaf || '').toString().trim() || null
      }
    } catch (e) {
      console.warn('⚠️  No se pudo obtener fecha de registración:', e.message)
    }

    const afiliadoPartes = parseAfiliadoId(afiliadoId)
    if (!nroAfiliadoValidacion && afiliadoPartes?.titularNro) {
      nroAfiliadoValidacion = String(afiliadoPartes.titularNro).trim()
    }

    if (!nroAfiliadoValidacion) {
      const error = new Error('No se pudo determinar el número de afiliado para validar vigencia')
      error.code = 'PARAMETROS_INVALIDOS'
      error.statusCode = 400
      throw error
    }

    if (USE_SOAP && soapClient) {
      try {
        console.log('🔎 Validación explícita WS_BENEF (VALIDAAFIREG) antes de renovar credenciales...', {
          AfiliadoNro: nroAfiliadoValidacion
        })
        const soapValidation = await callSoapExecute('VALIDAAFIREG', {
          AfiliadoNro: nroAfiliadoValidacion,
          Documento: '',
          CUIL: ''
        })
        const parsedValidation = parseSoapResult(soapValidation)
        const noVigente = inferAfiliacionNoVigente(parsedValidation.mensajes, parsedValidation.errorDsc)

        if (noVigente) {
            const details = buildSoapDetails(parsedValidation) || 'El afiliado no figura como activo en WS_BENEF.'
          const error = new Error('Afiliación no vigente en WS_BENEF')
          error.code = 'AFILIACION_NO_VIGENTE'
          error.statusCode = 403
          error.details = details
          throw error
        }

        console.log('✅ VALIDAAFIREG no reportó baja/inexistencia. Continúa sync de credenciales.')
      } catch (validationError) {
        if (validationError?.code === 'AFILIACION_NO_VIGENTE') {
          throw validationError
        }
        const error = new Error('No se pudo validar afiliación en WS_BENEF antes de renovar credenciales')
        error.code = 'AFILIACION_VALIDACION_NO_DISPONIBLE'
        error.statusCode = 503
        error.details = validationError?.message || String(validationError)
        throw error
      }
    }
    
    // 1. Consultar SOAP (USUARIO/PASSWORD van en HTTP headers, no en body)
    let { credenciales, mensajes: soapMensajes, afiliadoIdUsado } = await fetchCredencialesFromSoap(afiliadoId)
    
    if (credenciales.length === 0) {
      console.warn('⚠️  No se obtuvieron credenciales desde SOAP')

      // Fallback: probar variantes comunes del componente "familiar".
      // Algunos ambientes responden distinto si el AfiliadoId apunta al titular vs. un miembro.
      const comps = parseAfiliadoId(afiliadoId)
      const candidatos = []
      if (comps) {
        // Nota: familiar = 000000000 suele ser interpretado como "vacío" por SOAP.
        candidatos.push(buildAfiliadoId(comps.titularNro, comps.organizacionId, '000000001'))

        // Variante: algunos ambientes usan la organización como 10x (p.ej. delegación 1 -> 10)
        const orgNum = parseInt(String(comps.organizacionId || '').trim(), 10)
        if (Number.isFinite(orgNum) && orgNum > 0) {
          const org10 = String(orgNum * 10)
          candidatos.push(buildAfiliadoId(comps.titularNro, org10, comps.familiarNro))
          candidatos.push(buildAfiliadoId(comps.titularNro, org10, '000000001'))
        }
      }

      const esFamiliarVacio = (afiliadoIdCandidate) => {
        const c = parseAfiliadoId(afiliadoIdCandidate)
        return !!c && String(c.familiarNro) === '000000000'
      }

      // Dedupe + filtrar candidatos inválidos
      const candidatosUnicos = [...new Set(candidatos)].filter((cand) => !!cand && !esFamiliarVacio(cand))

      for (const cand of candidatosUnicos) {
        if (!cand || cand === afiliadoId) continue
        try {
          console.log('🔁 Reintentando APPDATOSCREDENCIALES con AfiliadoId alternativo:', cand)
          const r = await fetchCredencialesFromSoap(cand)
          if (r.credenciales.length > 0) {
            credenciales = r.credenciales
            soapMensajes = r.mensajes
            afiliadoIdUsado = r.afiliadoIdUsado

            // Opcional: autocorregir nuusuafili si encontramos una variante que funciona
            try {
              await client.query('UPDATE nuusuari SET nuusuafili = $1 WHERE nuusuid = $2', [afiliadoIdUsado, nuusuid])
              console.log('🛠️  nuusuafili autocorregido en nuusuari:', afiliadoIdUsado)
            } catch (e) {
              console.warn('⚠️  No se pudo autocorregir nuusuafili:', e.message)
            }
            break
          }

          // mantener el último mensaje útil
          if (r.mensajes?.length) soapMensajes = r.mensajes
        } catch (e) {
          console.warn('⚠️  Falló reintento SOAP con AfiliadoId alternativo:', e.message)
        }
      }

      if (credenciales.length === 0) {
      await client.query('COMMIT')
      const credencialesInfo = inferEmptyCredencialesInfo(soapMensajes)
      return {
        credenciales: [],
        sync: { total: 0, inserted: 0, updated: 0, unchanged: 0 },
        afiliadoIdConsultado: afiliadoId,
        afiliadoIdUsado: afiliadoIdUsado || afiliadoId,
        soapMensajes,
        credencialesInfo
      }
      }
    }

    const credencialesValidas = []
    const integrantesExcluidos = []

    for (const credRaw of credenciales) {
      const cred = normalizeCredencial(credRaw)

      if (!cred?.AfiliadoId) {
        console.warn('⚠️  Credencial sin AfiliadoId, omitiendo en validación de miembro')
        continue
      }

      const validacionMiembro = await validarMiembroEnBenef(cred)
      if (!validacionMiembro.vigente) {
        const nombre = String(cred.ApellidoNombre || '').trim() || cred.AfiliadoId
        console.warn('⛔ Miembro excluido por no vigente en WS_BENEF:', {
          afiliadoId: cred.AfiliadoId,
          numeroAfiliado: cred.NumeroDeAfiliado,
          nombre,
          details: validacionMiembro.details
        })
        integrantesExcluidos.push({
          afiliadoId: cred.AfiliadoId,
          numeroAfiliado: String(cred.NumeroDeAfiliado || '').trim(),
          nombre,
          reason: validacionMiembro.details || 'No vigente en WS_BENEF'
        })
        continue
      }

      credencialesValidas.push({ raw: credRaw, cred })
    }

    if (credencialesValidas.length === 0) {
      await client.query('COMMIT')
      return {
        credenciales: [],
        sync: { total: 0, inserted: 0, updated: 0, unchanged: 0, excludedNotVigente: integrantesExcluidos.length },
        afiliadoIdConsultado: afiliadoId,
        afiliadoIdUsado: afiliadoIdUsado || afiliadoId,
        soapMensajes,
        credencialesInfo: {
          code: 'AFILIADOS_NO_VIGENTES',
          message: 'No se devolvieron credenciales vigentes para los integrantes consultados en WS_BENEF.',
        },
        integrantesExcluidos
      }
    }

    // Completar/actualizar datos de nuusuari desde SOAP
    try {
      const soapUserData = resolveSoapNuusuariData(credencialesValidas.map((c) => c.raw), afiliadoIdUsado || afiliadoId)
      const planIdAsegurado = await ensurePlanExists(soapUserData.planId, soapUserData.planDescripcion, client)

      await client.query(
        `UPDATE nuusuari SET
          nuusuapell = COALESCE($1, nuusuapell),
          nuususexo = COALESCE($2, nuususexo),
          nuplaid = COALESCE($3, nuplaid),
          nuusuestit = COALESCE($4, nuusuestit),
          version = version + 1
         WHERE nuusuid = $5`,
        [
          soapUserData.apellidoNombre,
          soapUserData.sexo,
          planIdAsegurado,
          soapUserData.esTitular,
          nuusuid
        ]
      )

      console.log('👤 Datos nuusuari actualizados desde SOAP:', {
        nuusuid,
        nuusuapell: soapUserData.apellidoNombre,
        nuususexo: soapUserData.sexo,
        nuplaid: planIdAsegurado,
        nuusuestit: soapUserData.esTitular
      })
    } catch (e) {
      console.warn('⚠️  No se pudieron actualizar datos de nuusuari desde SOAP:', e.message)
    }
    
    const syncResults = []

    // 3. Batch SELECT: cargar todas las credenciales existentes en una sola query (evita N+1)
    const allCredIds = credencialesValidas
      .map(({ cred }) => cred.AfiliadoId)
      .filter(Boolean)
    const existingCredsResult = await client.query(
      'SELECT crcreid, crcrehash, crcrefecvi, crcreplaid FROM crcreden WHERE crcreid = ANY($1::varchar[])',
      [allCredIds]
    )
    const existingMap = new Map(existingCredsResult.rows.map((r) => [r.crcreid, r]))
    console.log(`📦 Batch SELECT crcreden: ${existingCredsResult.rows.length}/${allCredIds.length} existentes`)

    // Pre-computar fecha vencimiento (igual para todas las credenciales del sync)
    const fechaVencimientoDefault = await getDefaultVencimiento(fechaRegistracion)

    // Pre-computar planes distintos (evita N queries a nuplan)
    const planCache = new Map()
    for (const { cred } of credencialesValidas) {
      const planKey = `${cred.PlanId ?? ''}|${cred.PlanDescripcion ?? ''}`
      if (!planCache.has(planKey)) {
        planCache.set(planKey, await ensurePlanExists(cred.PlanId, cred.PlanDescripcion, client))
      }
    }

    const now = new Date()
    const todayUtcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const toUtcStartOfDay = (v) => {
      if (!v) return null
      if (v instanceof Date && !isNaN(v.getTime())) {
        return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()))
      }
      const s = String(v)
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m) {
        return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
      }
      const d = new Date(s)
      if (!isNaN(d.getTime())) {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
      }
      return null
    }

    const crcredusRows = [] // para bulk INSERT al final

    // 2. Para cada credencial del grupo familiar
    for (const { cred } of credencialesValidas) {
      const hash = calculateCredencialHash(cred)

      if (!cred.AfiliadoId) {
        console.warn('⚠️  Credencial sin AfiliadoId, omitiendo:', cred)
        continue
      }

      const precomputed = {
        fechaVencimiento: fechaVencimientoDefault,
        planIdAsegurado: planCache.get(`${cred.PlanId ?? ''}|${cred.PlanDescripcion ?? ''}`)
      }

      const existingRow = existingMap.get(cred.AfiliadoId)
      let action = 'UNCHANGED'

      if (!existingRow) {
        // INSERT nueva credencial
        await insertCredencial(client, cred, hash, fechaRegistracion, precomputed)
        action = 'INSERTED'
        console.log(`  ✅ INSERTED: ${cred.Apellido}, ${cred.Nombre}`)
      } else {
        // Verificar si necesita actualizar por cambio de datos, por fecha vencimiento vacía/inválida,
        // o por vigencia vencida (solo si el usuario NO está de baja).
        const fechaVencimientoActual = existingRow.crcrefecvi

        const vencUtcStart = toUtcStartOfDay(fechaVencimientoActual)
        const vigenciaVencida = !!(vencUtcStart && vencUtcStart < todayUtcStart)
        const vencimientoInvalido = !!(vencUtcStart && vencUtcStart < new Date(Date.UTC(2000, 0, 1)))

        const planIdResuelto = normalizePlanId(cred.PlanId, cred.PlanDescripcion)
        const planPendienteBackfill = !!(
          planIdResuelto &&
          (!existingRow.crcreplaid || String(existingRow.crcreplaid).trim() === '')
        )

        const necesitaActualizacion =
          existingRow.crcrehash !== hash ||
          !fechaVencimientoActual ||
          fechaVencimientoActual === '' ||
          vencimientoInvalido ||
          (usuarioActivo && vigenciaVencida) ||
          planPendienteBackfill

        if (necesitaActualizacion) {
          // UPDATE credencial con cambios (recalcula fecha vencimiento)
          await updateCredencial(client, cred, hash, fechaRegistracion, precomputed)
          action = 'UPDATED'
          console.log(`  🔄 UPDATED: ${cred.Apellido}, ${cred.Nombre} (fecha vencimiento: ${fechaVencimientoActual} → recalculada)`)
        } else {
          console.log(`  ⏭️  UNCHANGED: ${cred.Apellido}, ${cred.Nombre}`)
        }
      }

      // 4. Acumular relación usuario-credencial para bulk INSERT
      const esPropia = cred.AfiliadoId === afiliadoId ? 'S' : 'N'
      crcredusRows.push([nuusuid, cred.AfiliadoId, esPropia])

      syncResults.push({
        afiliadoId: cred.AfiliadoId,
        nombre: `${cred.Apellido}, ${cred.Nombre}`,
        action
      })
    }

    // Bulk INSERT crcredus: 1 query en vez de N (evita N+1)
    if (crcredusRows.length > 0) {
      await client.query(
        `INSERT INTO crcredus (nuusuid, crcreid, crcrepropi)
         SELECT * FROM UNNEST($1::varchar[], $2::varchar[], $3::varchar[])
         ON CONFLICT (nuusuid, crcreid) DO NOTHING`,
        [
          crcredusRows.map((r) => r[0]),
          crcredusRows.map((r) => r[1]),
          crcredusRows.map((r) => r[2])
        ]
      )
      console.log(`📦 Bulk INSERT crcredus: ${crcredusRows.length} relaciones`)
    }
    
    if (integrantesExcluidos.length > 0) {
      const excludedIds = [...new Set(integrantesExcluidos.map((m) => String(m.afiliadoId || '').trim()).filter(Boolean))]
      if (excludedIds.length > 0) {
        const deleteResult = await client.query(
          `DELETE FROM crcredus
           WHERE nuusuid = $1
             AND crcreid = ANY($2::varchar[])`,
          [nuusuid, excludedIds]
        )
        console.log(`🧹 Relaciones crcredus eliminadas por no vigencia: ${deleteResult.rowCount}`)
      }
    }

    const idsVigentesSync = [...new Set(credencialesValidas.map((item) => String(item?.cred?.AfiliadoId || '').trim()).filter(Boolean))]
    if (idsVigentesSync.length > 0) {
      const pruneResult = await client.query(
        `DELETE FROM crcredus
         WHERE nuusuid = $1
           AND crcreid <> ALL($2::varchar[])`,
        [nuusuid, idsVigentesSync]
      )
      if (pruneResult.rowCount > 0) {
        console.log(`🧽 Relaciones crcredus obsoletas eliminadas por sync vigente: ${pruneResult.rowCount}`)
      }
    }

    await client.query('COMMIT')
    
    // 5. Obtener credenciales actualizadas para retornar
    const credsQuery = await db.query(`
      SELECT c.*, cu.crcrepropi
      FROM crcreden c
      INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
      WHERE cu.nuusuid = $1
      ORDER BY cu.crcrepropi DESC, c.crcreapeno
    `, [nuusuid])
    
    const stats = {
      total: syncResults.length,
      inserted: syncResults.filter(r => r.action === 'INSERTED').length,
      updated: syncResults.filter(r => r.action === 'UPDATED').length,
      unchanged: syncResults.filter(r => r.action === 'UNCHANGED').length,
      excludedNotVigente: integrantesExcluidos.length
    }
    
    console.log(`✅ Sincronización completa: +${stats.inserted} ↻${stats.updated} =${stats.unchanged}`)
    
    return {
      credenciales: credsQuery.rows,
      sync: stats,
      afiliadoIdConsultado: afiliadoId,
      afiliadoIdUsado: afiliadoIdUsado || afiliadoId,
      soapMensajes,
      integrantesExcluidos
    }
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error sincronizando credenciales (rollback aplicado):', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Migración automática de usuario LEGACY → GAM
 * Detecta usuarios con nuusuid numérico y los migra al GUID de GAM
 * Se ejecuta transparentemente en el primer login exitoso
 * 
 * @param {string} legacyNuusuid - ID numérico legacy del usuario
 * @param {string} email - Email del usuario (para búsqueda)
 * @param {string} gamGUID - GUID obtenido de GAM
 * @param {string} gamAccessToken - Access token de GAM (opcional)
 * @returns {Promise<Object>} Resultado de migración { success, message, tablesUpdated }
 */
async function migrateUserToGAM(legacyNuusuid, email, gamGUID, gamAccessToken = null) {
  console.log('🔄 MIGRACIÓN AUTOMÁTICA LEGACY → GAM')
  console.log(`   Usuario: ${email}`)
  console.log(`   LEGACY nuusuid: ${legacyNuusuid}`)
  console.log(`   GAM GUID: ${gamGUID}`)
  
  const client = await db.getClient()
  const tablesUpdated = []
  
  try {
    await client.query('BEGIN')
    
    // CRÍTICO: Defer FK checks hasta el COMMIT (permite updates circulares)
    await client.query('SET CONSTRAINTS ALL DEFERRED')
    
    // 1. Actualizar/crear nuusuauth (tiene FK a nuusuari)
    const authCheck = await client.query(
      'SELECT nuusupass FROM nuusuauth WHERE nuusuid = $1',
      [legacyNuusuid]
    )
    
    if (authCheck.rows.length > 0) {
      // Existe: actualizar con nuevo GUID
      await client.query(
        'UPDATE nuusuauth SET nuusuid = $1 WHERE nuusuid = $2',
        [gamGUID, legacyNuusuid]
      )
      tablesUpdated.push('nuusuauth (updated)')
      console.log('   ✅ nuusuauth actualizado')
    } else {
      // No existe: crear con contraseña por defecto
      console.log('   ⚠️  nuusuauth no existe, creando con password por defecto...')
      const crypto = require('crypto')
      const defaultPassword = '123456' // Password por defecto para migraciones
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync(defaultPassword, salt, 1000, 64, 'sha512').toString('hex')
      const passwordHash = `${salt}:${hash}`
      
      await client.query(
        `INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
         VALUES ($1, $2, NOW(), NOW())`,
        [gamGUID, passwordHash]
      )
      tablesUpdated.push('nuusuauth (created)')
      console.log('   ✅ nuusuauth creado (password: 123456)')
    }
    
    // 2. Actualizar crcredus si existe (tiene FK a nuusuari)
    const credusCheck = await client.query(
      'SELECT COUNT(*) as cnt FROM crcredus WHERE nuusuid = $1',
      [legacyNuusuid]
    )
    
    if (credusCheck.rows[0].cnt > 0) {
      await client.query(
        'UPDATE crcredus SET nuusuid = $1 WHERE nuusuid = $2',
        [gamGUID, legacyNuusuid]
      )
      tablesUpdated.push(`crcredus (${credusCheck.rows[0].cnt})`)
      console.log(`   ✅ crcredus actualizado (${credusCheck.rows[0].cnt} registros)`)
    }
    
    // 3. Actualizar notifications si existe (tiene FK a nuusuari)
    const notifsCheck = await client.query(
      'SELECT COUNT(*) as cnt FROM notifications WHERE nuusuid = $1',
      [legacyNuusuid]
    )
    
    if (notifsCheck.rows[0].cnt > 0) {
      await client.query(
        'UPDATE notifications SET nuusuid = $1 WHERE nuusuid = $2',
        [gamGUID, legacyNuusuid]
      )
      tablesUpdated.push(`notifications (${notifsCheck.rows[0].cnt})`)
      console.log(`   ✅ notifications actualizado (${notifsCheck.rows[0].cnt} registros)`)
    }
    
    // 4. Actualizar push_tokens si existe (tiene FK a nuusuari)
    const tokensCheck = await client.query(
      'SELECT COUNT(*) as cnt FROM push_tokens WHERE nuusuid = $1',
      [legacyNuusuid]
    )
    
    if (tokensCheck.rows[0].cnt > 0) {
      await client.query(
        'UPDATE push_tokens SET nuusuid = $1 WHERE nuusuid = $2',
        [gamGUID, legacyNuusuid]
      )
      tablesUpdated.push(`push_tokens (${tokensCheck.rows[0].cnt})`)
      console.log(`   ✅ push_tokens actualizado (${tokensCheck.rows[0].cnt} registros)`)
    }
    
    // 5. FINALMENTE actualizar nuusuari (tabla referenciada)
    await client.query(
      `UPDATE nuusuari 
       SET nuusuid = $1, 
           nuusugamtok = $2,
           nuusugamexp = NOW() + INTERVAL '1 hour'
       WHERE nuusuid = $3`,
      [gamGUID, gamAccessToken, legacyNuusuid]
    )
    tablesUpdated.push('nuusuari')
    console.log('   ✅ nuusuari actualizado')
    
    await client.query('COMMIT')
    
    console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE')
    console.log(`   Tablas actualizadas: ${tablesUpdated.join(', ')}`)
    
    return {
      success: true,
      message: `Usuario migrado de LEGACY (${legacyNuusuid}) a GAM (${gamGUID})`,
      oldNuusuid: legacyNuusuid,
      newNuusuid: gamGUID,
      tablesUpdated,
      email
    }
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error en migración automática (rollback aplicado):', error)
    throw new Error(`Migración automática falló: ${error.message}`)
  } finally {
    client.release()
  }
}

// Inicializar cliente SOAP
async function initSoapClient() {
  try {
    // Obtener configuración desde parámetros
    const WSDL_URL = await getWsdlUrl()
    const SOAP_USER = await getSoapUser()
    const SOAP_PASSWORD = await getSoapPassword()
    
    console.log(`🔐 Credenciales SOAP: USUARIO=${SOAP_USER}`)
    
    // Permitir certificados inseguros si el endpoint fuerza TLS antiguo
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    const agent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false,
      maxSockets: 20,
    })

    soapClient = await soap.createClientAsync(WSDL_URL, {
      wsdl_options: {
        timeout: 45000,
        strictSSL: false,
        rejectUnauthorized: false,
        forever: true,
        agent,
        // Forzar compatibilidad con TLS antiguos cuando sea necesario
        minVersion: 'TLSv1'
      },
      // Headers HTTP (no SOAP headers)
      wsdl_headers: {
        'USUARIO': SOAP_USER,
        'PASSWORD': SOAP_PASSWORD
      }
    })
    
    // Logging del XML SOAP para debugging
    soapClient.on('request', (xml, eid) => {
      console.log('📤 SOAP REQUEST XML:')
      console.log(xml)
      console.log('---')
      lastSoapExchange.requestXml = xml
      lastSoapExchange.timestamp = new Date().toISOString()
    })
    soapClient.on('response', (body, response, eid) => {
      console.log('📥 SOAP RESPONSE:')
      console.log(body)
      console.log('---')
      lastSoapExchange.responseXml = body
      lastSoapExchange.timestamp = new Date().toISOString()
    })
    
    // Agregar headers HTTP (no SOAP headers en el envelope)
    soapClient.addHttpHeader('USUARIO', SOAP_USER)
    soapClient.addHttpHeader('PASSWORD', SOAP_PASSWORD)
    console.log('🔐 Headers HTTP añadidos: USUARIO/PASSWORD')
    
    console.log('✅ Cliente SOAP conectado exitosamente')
    console.log('🔐 Headers configurados: USUARIO=' + SOAP_USER)
    console.log('📋 Servicios disponibles:', Object.keys(soapClient.wsdl.definitions.services))
    console.log('📋 Métodos disponibles:', Object.keys(soapClient))

    // Configurar endpoint construido desde componentes de nusispar
    try {
      const baseEndpoint = await buildSoapUrl(false)
      soapClient.setEndpoint(baseEndpoint)
      soapEndpoint = baseEndpoint
      console.log('🔗 Endpoint SOAP configurado desde componentes nusispar:', baseEndpoint)
    } catch (error) {
      console.error('❌ Error configurando endpoint desde nusispar:', error)
      // Fallback: usar endpoint del WSDL
      const services = soapClient.wsdl.definitions.services
      const serviceName = Object.keys(services)[0]
      const ports = services[serviceName].ports
      const portName = Object.keys(ports)[0]
      const address = ports[portName].location
      if (address) {
        soapClient.setEndpoint(address)
        soapEndpoint = address
        console.log('🔗 Endpoint SOAP (desde WSDL):', address)
      }
    }
  } catch (error) {
    console.error('❌ Error al conectar con el servicio SOAP:', error.message)
    console.log('⚠️  Continuando en modo mock...')
  }
}

// Helper: ejecutar Execute con reintento y fallback a HTTP si hay error TLS
async function callSoapExecute(servicio, parametros) {
  if (!soapClient) throw new Error('SOAP client no inicializado')
  
  // Obtener endpoint específico para este servicio
  const serviceEndpoint = await getServiceEndpoint(servicio)
  
  // Obtener credenciales dinámicas
  const SOAP_USER = await getSoapUser()
  const SOAP_PASSWORD = await getSoapPassword()
  
  // Configurar endpoint dinámico
  const currentEndpoint = soapEndpoint
  soapClient.setEndpoint(serviceEndpoint)
  
  // Reaplicar headers HTTP requeridos por Tekhne en cada invocación
  try {
    soapClient.addHttpHeader('USUARIO', SOAP_USER)
    soapClient.addHttpHeader('PASSWORD', SOAP_PASSWORD)
  } catch {}
  
  // Validación: asegurar que parametros no sea undefined/null
  if (!parametros || typeof parametros !== 'object') {
    console.error('⚠️  callSoapExecute recibió parametros inválidos:', parametros)
    throw new Error('Parametros inválidos para SOAP Execute')
  }
  
  // REGISTRACION requiere doble envoltura {Parametros: {...}}
  // Otros servicios como APPDATOSCREDENCIALES usan formato plano
  const serviciosConEnvoltura = ['REGISTRACION']
  let parametrosStr
  
  if (serviciosConEnvoltura.includes(servicio)) {
    const wrapped = { Parametros: parametros }
    parametrosStr = JSON.stringify(wrapped)
    console.log(`[callSoapExecute] ${servicio} → Con envoltura, length=${parametrosStr.length}`)
  } else {
    parametrosStr = JSON.stringify(parametros)
    console.log(`[callSoapExecute] ${servicio} → Sin envoltura, length=${parametrosStr.length}`)
  }
  
  const payload = { Servicio: servicio, Parametros: parametrosStr }
  
  // Headers HTTP en cada request (nombres fijos, valores dinámicos desde nusispar)
  const options = {
    headers: {
      'USUARIO': SOAP_USER,
      'PASSWORD': SOAP_PASSWORD
    }
  }
  
  console.log(`🔐 Headers HTTP enviados: USUARIO=${SOAP_USER}, PASSWORD=${SOAP_PASSWORD.substring(0,3)}***`)
  
  try {
    return await soapClient.ExecuteAsync(payload, options)
  } catch (e) {
    const msg = String(e && (e.message || e))
    console.warn(`⚠️  Error Execute(${servicio}) SOAP: ${msg}`)
    // Reintentar con endpoint HTTP si detectamos errores TLS/EPROTO
    if (/EPROTO|SSL|tls_get_more/i.test(msg)) {
      try {
        const httpEndpoint = serviceEndpoint.replace(/^https:/i, 'http:')
        if (httpEndpoint) {
          console.log('↩️  Reintentando por HTTP endpoint:', httpEndpoint)
          soapClient.setEndpoint(httpEndpoint)
          const out = await soapClient.ExecuteAsync(payload, options)
          // restaurar endpoint anterior
          if (currentEndpoint) soapClient.setEndpoint(currentEndpoint)
          return out
        }
      } catch (e2) {
        console.error('❌ Fallback HTTP también falló:', e2.message || e2)
      }
    }
    throw e
  } finally {
    // Restaurar endpoint anterior si es necesario
    if (currentEndpoint) {
      try {
        soapClient.setEndpoint(currentEndpoint)
      } catch {}
    }
  }
}

// Variante RAW: enviar Parametros como cadena sin JSON.stringify
async function callSoapExecuteRaw(servicio, parametrosString) {
  if (!soapClient) throw new Error('SOAP client no inicializado')
  
  // Obtener credenciales dinámicas
  const SOAP_USER = await getSoapUser()
  const SOAP_PASSWORD = await getSoapPassword()
  
  // Reaplicar headers HTTP requeridos por Tekhne en cada invocación
  try {
    soapClient.addHttpHeader('USUARIO', SOAP_USER)
    soapClient.addHttpHeader('PASSWORD', SOAP_PASSWORD)
  } catch {}
  const payload = { Servicio: servicio, Parametros: String(parametrosString ?? '') }
  
  // Headers HTTP en cada request (nombres fijos, valores dinámicos desde nusispar)
  const options = {
    headers: {
      'USUARIO': SOAP_USER,
      'PASSWORD': SOAP_PASSWORD
    }
  }
  
  console.log(`🔐 Headers HTTP enviados (raw): USUARIO=${SOAP_USER}, PASSWORD=${SOAP_PASSWORD.substring(0,3)}***`)
  
  try {
    return await soapClient.ExecuteAsync(payload, options)
  } catch (e) {
    const msg = String(e && (e.message || e))
    const looksTls = /EPROTO|SSL|tls_/i.test(msg)
    if (looksTls && soapEndpoint && /^https:/i.test(soapEndpoint)) {
      try {
        const httpEndpoint = soapEndpoint.replace(/^https:/i, 'http:')
        console.warn('⚠️  Error TLS en RAW Execute. Reintentando por HTTP:', msg)
        soapClient.setEndpoint(httpEndpoint)
        const out = await soapClient.ExecuteAsync(payload, options)
        soapClient.setEndpoint(soapEndpoint)
        return out
      } catch (e2) {
        try { soapClient.setEndpoint(soapEndpoint) } catch {}
        throw e2
      }
    }
    throw e
  }
}

// Variante PLANA: enviar parametros como JSON plano sin envoltura { Parametros: {...} }
async function callSoapExecutePlain(servicio, parametros) {
  if (!soapClient) throw new Error('SOAP client no inicializado')
  
  // Obtener endpoint específico para este servicio
  const serviceEndpoint = await getServiceEndpoint(servicio)
  
  // Obtener credenciales dinámicas
  const SOAP_USER = await getSoapUser()
  const SOAP_PASSWORD = await getSoapPassword()
  
  // Configurar endpoint dinámico
  const currentEndpoint = soapEndpoint
  soapClient.setEndpoint(serviceEndpoint)
  
  // Reaplicar headers HTTP requeridos por Tekhne en cada invocación
  try {
    soapClient.addHttpHeader('USUARIO', SOAP_USER)
    soapClient.addHttpHeader('PASSWORD', SOAP_PASSWORD)
  } catch {}
  
  // Validación: asegurar que parametros no sea undefined/null
  if (!parametros || typeof parametros !== 'object') {
    console.error('⚠️  callSoapExecutePlain recibió parametros inválidos:', parametros)
    throw new Error('Parametros inválidos para SOAP Execute')
  }
  
  const parametrosStr = JSON.stringify(parametros)
  console.log(`[callSoapExecutePlain] ${servicio} → Parametros length=${parametrosStr.length}`)
  
  const payload = { Servicio: servicio, Parametros: parametrosStr }
  
  // Headers HTTP en cada request (nombres fijos, valores dinámicos desde nusispar)
  const options = {
    headers: {
      'USUARIO': SOAP_USER,
      'PASSWORD': SOAP_PASSWORD
    }
  }
  
  console.log(`🔐 Headers HTTP enviados (plain): USUARIO=${SOAP_USER}, PASSWORD=${SOAP_PASSWORD.substring(0,3)}***`)
  
  try {
    return await soapClient.ExecuteAsync(payload, options)
  } catch (e) {
    const msg = String(e && (e.message || e))
    console.warn(`⚠️  Error Execute(${servicio}) SOAP: ${msg}`)
    // Reintentar con endpoint HTTP si detectamos errores TLS/EPROTO
    if (/EPROTO|SSL|tls_get_more/i.test(msg)) {
      try {
        const httpEndpoint = serviceEndpoint.replace(/^https:/i, 'http:')
        if (httpEndpoint) {
          console.log('↩️  Reintentando por HTTP endpoint:', httpEndpoint)
          soapClient.setEndpoint(httpEndpoint)
          const out = await soapClient.ExecuteAsync(payload, options)
          // restaurar endpoint anterior
          if (currentEndpoint) soapClient.setEndpoint(currentEndpoint)
          return out
        }
      } catch (e2) {
        console.error('❌ Fallback HTTP también falló:', e2.message || e2)
      }
    }
    throw e
  } finally {
    // Restaurar endpoint anterior si es necesario
    if (currentEndpoint) {
      try {
        soapClient.setEndpoint(currentEndpoint)
      } catch {}
    }
  }
}

// ============================================================================
// FUNCIONES PARA LLAMAR SERVICIOS SIA (WSSIATK)
// ============================================================================

// Variable para cliente SOAP SIA (si se necesita cliente separado)
let soapClientSIA = null
let soapEndpointSIA = null

/**
 * Inicializar cliente SOAP para SIA
 */
async function initSoapClientSIA() {
  try {
    const WSDL_URL = await getWsdlUrlSIA()
    const SOAP_USER = await getSoapUserSIA()
    const SOAP_PASSWORD = await getSoapPasswordSIA()
    
    console.log(`🔐 Credenciales SOAP SIA: USUARIO=${SOAP_USER}`)
    
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    const agent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false,
      maxSockets: 20,
    })

    soapClientSIA = await soap.createClientAsync(WSDL_URL, {
      wsdl_options: {
        timeout: 45000,
        strictSSL: false,
        rejectUnauthorized: false,
        forever: true,
        agent,
        minVersion: 'TLSv1'
      },
      wsdl_headers: {
        'USUARIO': SOAP_USER,
        'PASSWORD': SOAP_PASSWORD
      }
    })
    
    soapClientSIA.on('request', (xml, eid) => {
      console.log('📤 SOAP SIA REQUEST XML:')
      console.log(xml)
      console.log('---')
    })
    soapClientSIA.on('response', (body, response, eid) => {
      console.log('📥 SOAP SIA RESPONSE:')
      console.log(body)
      console.log('---')
    })
    
    soapClientSIA.addHttpHeader('USUARIO', SOAP_USER)
    soapClientSIA.addHttpHeader('PASSWORD', SOAP_PASSWORD)
    console.log('🔐 Headers HTTP SIA añadidos: USUARIO/PASSWORD')
    
    console.log('✅ Cliente SOAP SIA conectado exitosamente')
    console.log('📋 Servicios SIA disponibles:', Object.keys(soapClientSIA.wsdl.definitions.services))
    console.log('📋 Métodos SIA disponibles:', Object.keys(soapClientSIA))

    // Configurar endpoint construido desde componentes de nusispar
    try {
      const baseEndpoint = await buildSoapUrlSIA(false)
      soapClientSIA.setEndpoint(baseEndpoint)
      soapEndpointSIA = baseEndpoint
      console.log('🔗 Endpoint SOAP SIA configurado desde componentes nusispar:', baseEndpoint)
    } catch (error) {
      console.error('❌ Error configurando endpoint SIA desde nusispar:', error)
      const services = soapClientSIA.wsdl.definitions.services
      const serviceName = Object.keys(services)[0]
      const ports = services[serviceName].ports
      const portName = Object.keys(ports)[0]
      const address = ports[portName].location
      if (address) {
        soapClientSIA.setEndpoint(address)
        soapEndpointSIA = address
        console.log('🔗 Endpoint SOAP SIA (desde WSDL):', address)
      }
    }
  } catch (error) {
    console.error('❌ Error al conectar con el servicio SOAP SIA:', error.message)
    console.log('⚠️  Cliente SIA no disponible')
  }
}

/**
 * Llamar servicio SIA con Execute
 * @param {string} servicio - Nombre del servicio SIA (REC_SOLICITUDES_APP, etc.)
 * @param {object} parametros - Parámetros del servicio
 * @returns {Promise<object>} Respuesta del servicio
 */
async function callSoapExecuteSIA(servicio, parametros) {
  if (!soapClientSIA) {
    console.log('⚠️  Cliente SIA no inicializado, inicializando...')
    await initSoapClientSIA()
  }
  
  if (!soapClientSIA) throw new Error('SOAP client SIA no disponible')
  
  // Obtener endpoint específico para este servicio
  const serviceEndpoint = await getServiceEndpointSIA(servicio)
  
  // Obtener credenciales dinámicas
  const SOAP_USER = await getSoapUserSIA()
  const SOAP_PASSWORD = await getSoapPasswordSIA()
  
  // Configurar endpoint dinámico
  const currentEndpoint = soapEndpointSIA
  soapClientSIA.setEndpoint(serviceEndpoint)
  
  // Reaplicar headers HTTP
  try {
    soapClientSIA.addHttpHeader('USUARIO', SOAP_USER)
    soapClientSIA.addHttpHeader('PASSWORD', SOAP_PASSWORD)
  } catch {}
  
  // Validación
  // Si parametros es string vacío, es válido (algunos servicios no requieren parámetros)
  if (parametros !== '' && (!parametros || typeof parametros !== 'object')) {
    console.error('⚠️  callSoapExecuteSIA recibió parametros inválidos:', parametros)
    throw new Error('Parametros inválidos para SOAP Execute SIA')
  }

  // Seguridad/consistencia: USUARIO/PASSWORD del SIA vienen de nusispar y van en headers HTTP.
  // Nunca aceptar credenciales en el body (ni por error del cliente).
  if (parametros && parametros !== '' && typeof parametros === 'object') {
    const cleaned = { ...parametros }
    const removedKeys = []
    for (const k of ['USUARIO', 'PASSWORD', 'Usuario', 'Password', 'user', 'pass']) {
      if (Object.prototype.hasOwnProperty.call(cleaned, k)) {
        removedKeys.push(k)
        delete cleaned[k]
      }
    }
    if (removedKeys.length > 0) {
      console.warn(`⚠️  Parametros SIA incluían credenciales en body (${removedKeys.join(', ')}). Se ignoraron.`)
    }
    parametros = cleaned
  }
  
  // SIA espera recibir un STRING JSON dentro del tag <Parametros>, no XML
  // El cliente SOAP debe enviar: <Parametros>{"Mode":"INS",...}</Parametros>
  const parametrosStr = parametros === '' ? '' : JSON.stringify(parametros)
  console.log(`[callSoapExecuteSIA] ${servicio} → Parametros length=${parametrosStr.length}`)
  
  // Log detallado para ENROLAMIENTOS
  if (servicio === 'ENROLAMIENTOS') {
    console.log('🔍 === SERVICIO ENROLAMIENTOS ===')
    console.log('📋 JSON Parámetros:', parametrosStr)
    console.log('📋 Objeto Parámetros:', JSON.stringify(parametros, null, 2))
  }
  
  const payload = { Servicio: servicio, Parametros: parametrosStr }
  
  // Headers HTTP en cada request
  const options = {
    headers: {
      'USUARIO': SOAP_USER,
      'PASSWORD': SOAP_PASSWORD
    }
  }
  
  console.log(`🔐 Headers HTTP SIA enviados: USUARIO=${SOAP_USER}, PASSWORD=${SOAP_PASSWORD.substring(0,3)}***`)
  
  try {
    return await soapClientSIA.ExecuteAsync(payload, options)
  } catch (e) {
    const msg = String(e && (e.message || e))
    console.warn(`⚠️  Error Execute SIA(${servicio}): ${msg}`)
    // Reintentar con endpoint HTTP si detectamos errores TLS/EPROTO
    if (/EPROTO|SSL|tls_get_more/i.test(msg)) {
      try {
        const httpEndpoint = serviceEndpoint.replace(/^https:/i, 'http:')
        if (httpEndpoint) {
          console.log('↩️  Reintentando por HTTP endpoint:', httpEndpoint)
          soapClientSIA.setEndpoint(httpEndpoint)
          const out = await soapClientSIA.ExecuteAsync(payload, options)
          if (currentEndpoint) soapClientSIA.setEndpoint(currentEndpoint)
          return out
        }
      } catch (e2) {
        console.error('❌ Fallback HTTP SIA también falló:', e2.message || e2)
      }
    }
    throw e
  } finally {
    // Restaurar endpoint anterior
    if (currentEndpoint) {
      try {
        soapClientSIA.setEndpoint(currentEndpoint)
      } catch {}
    }
  }
}

// ============================================================================
// FIN FUNCIONES SIA
// ============================================================================

// Cargar usuarios persistidos en el arranque
loadUsers()

// Helper para generar tokens
function generateToken() {
  return Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64')
}

// ============================================================================
// SISTEMA DE ROLES Y PERMISOS (admin backend granular)
// ============================================================================

/** Módulos de permiso válidos — conjunto fijo, no configurable en runtime */
const PERMISSION_MODULES = ['parametros', 'usuarios', 'credenciales', 'sia', 'reportes', 'salud', 'notificaciones']

/** Cache de roles en memoria — TTL 5 minutos */
const ROLES_CACHE_TTL_MS = 5 * 60 * 1000
let rolesCache = { roles: null, loadedAt: 0 }

/**
 * Carga todos los roles activos desde nurolper, parsea permisos y los guarda en cache.
 * @returns {Promise<Array>} Array de roles con { nurolid, nurolnombre, permisos: string[] }
 */
async function loadRolesCache() {
  try {
    const result = await db.pool.query(
      `SELECT nurolid, nurolnombre, nurolpermisos FROM nurolper WHERE nurolactivo = 'S' ORDER BY nurolid`
    )
    const roles = result.rows.map((r) => ({
      nurolid: r.nurolid,
      nurolnombre: r.nurolnombre,
      permisos: (() => { try { return JSON.parse(r.nurolpermisos) } catch { return [] } })(),
    }))
    rolesCache = { roles, loadedAt: Date.now() }
    return roles
  } catch (err) {
    console.error('❌ [roles] Error cargando cache de roles:', err.message)
    return rolesCache.roles || []
  }
}

/**
 * Devuelve el rol por id desde cache (recarga si TTL expiró o cache vacío).
 * @param {number|null} id
 * @returns {Promise<object|null>}
 */
async function getRoleById(id) {
  if (id == null) return null
  const now = Date.now()
  if (!rolesCache.roles || now - rolesCache.loadedAt > ROLES_CACHE_TTL_MS) {
    await loadRolesCache()
  }
  return rolesCache.roles.find((r) => r.nurolid === Number(id)) || null
}

/**
 * Invalida el cache de roles (fuerza recarga en el siguiente acceso).
 */
function invalidateRolesCache() {
  rolesCache = { roles: null, loadedAt: 0 }
}

/**
 * Middleware factory: verifica que el usuario tenga permiso para el módulo dado.
 * - Admins con nurolid = NULL tienen acceso total (retrocompatible).
 * - Requiere que requireAuth haya corrido antes.
 *
 * @param {string} module - Uno de PERMISSION_MODULES
 */
function requirePermission(module) {
  return async function permissionMiddleware(req, res, next) {
    if (!req.session) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'No autorizado' })
    }
    // Sin rol asignado → acceso total (retrocompatibilidad)
    const nurolid = req.session.nurolid
    if (nurolid == null) {
      return next()
    }
    const role = await getRoleById(nurolid)
    if (!role) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: `Rol asignado no encontrado o inactivo`,
        module,
      })
    }
    if (!role.permisos.includes(module)) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: `No tiene permiso para el módulo '${module}'`,
        module,
      })
    }
    return next()
  }
}

// ============================================================================
// FIN SISTEMA DE ROLES Y PERMISOS
// ============================================================================

const BACKEND_ADMIN_PARAM_GROUP = 'SEGURIDAD_APP'
const BACKEND_ADMIN_PARAM_TYPE = 'BackendAdminEmails'
const DEFAULT_BACKEND_ADMIN_EMAILS = ['admin@test.local', 'admin@osep.gob.ar']
const BACKEND_ADMIN_CACHE_TTL_MS = 60 * 1000
let backendAdminCache = {
  emails: [...DEFAULT_BACKEND_ADMIN_EMAILS],
  loadedAt: 0,
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function uniqEmails(emails = []) {
  const normalized = emails
    .map((e) => normalizeEmail(e))
    .filter(Boolean)
  return [...new Set(normalized)]
}

function parseBackendAdminEmails(rawValue) {
  if (!rawValue || !String(rawValue).trim()) {
    return [...DEFAULT_BACKEND_ADMIN_EMAILS]
  }

  const value = String(rawValue).trim()
  let parsed = []

  try {
    const json = JSON.parse(value)
    if (Array.isArray(json)) {
      parsed = json
    }
  } catch {
    parsed = value.split(/[;,\n]/g).map((item) => item.trim())
  }

  const unique = uniqEmails(parsed)
  return unique.length > 0 ? unique : [...DEFAULT_BACKEND_ADMIN_EMAILS]
}

async function getBackendAdminEmails(options = {}) {
  const forceRefresh = options.forceRefresh === true
  const now = Date.now()

  if (!forceRefresh && now - backendAdminCache.loadedAt < BACKEND_ADMIN_CACHE_TTL_MS) {
    return [...backendAdminCache.emails]
  }

  try {
    const param = await parametrosRepository.findOne(BACKEND_ADMIN_PARAM_GROUP, BACKEND_ADMIN_PARAM_TYPE)
    const emails = parseBackendAdminEmails(param?.nusisvalpa)
    backendAdminCache = { emails, loadedAt: now }
    return [...emails]
  } catch (error) {
    console.warn('⚠️  No se pudo cargar lista de admins backend. Usando cache/default.', error.message)
    if (!backendAdminCache.emails || backendAdminCache.emails.length === 0) {
      backendAdminCache = {
        emails: [...DEFAULT_BACKEND_ADMIN_EMAILS],
        loadedAt: now,
      }
    }
    return [...backendAdminCache.emails]
  }
}

async function saveBackendAdminEmails(emails) {
  const normalizedEmails = uniqEmails(emails)

  if (normalizedEmails.length === 0) {
    throw new Error('Debe existir al menos un administrador backend')
  }

  const payload = JSON.stringify(normalizedEmails)
  const existing = await parametrosRepository.findOne(BACKEND_ADMIN_PARAM_GROUP, BACKEND_ADMIN_PARAM_TYPE)

  if (existing) {
    await parametrosRepository.update(BACKEND_ADMIN_PARAM_GROUP, BACKEND_ADMIN_PARAM_TYPE, payload)
  } else {
    await parametrosRepository.create(BACKEND_ADMIN_PARAM_GROUP, BACKEND_ADMIN_PARAM_TYPE, payload)
  }

  backendAdminCache = {
    emails: normalizedEmails,
    loadedAt: Date.now(),
  }

  return [...normalizedEmails]
}

function buildLocalJwtSecret() {
  const envSecret = process.env.LOCAL_JWT_SECRET
  if (envSecret && String(envSecret).trim()) return String(envSecret).trim()

  // Compatibilidad: si no hay env var, usar un secreto estable derivado del clientSecret de GAM.
  // Esto evita que las sesiones locales se rompan tras reinicios en entornos donde ya existe config.json.
  const base = config?.jwtSecret || config?.localJwtSecret || config?.gam?.clientSecret
  if (!base) return null
  return crypto.createHash('sha256').update(String(base)).digest('hex')
}

const LOCAL_JWT_SECRET = buildLocalJwtSecret()
if (!LOCAL_JWT_SECRET) {
  console.warn('⚠️  LOCAL_JWT_SECRET no configurado. Las sesiones locales NO persistirán tras reinicios.')
}

function issueLocalJwt(session, options = {}) {
  if (!LOCAL_JWT_SECRET || !jwt) return null
  const payload = {
    nuusuid: session?.nuusuid || null,
    username: session?.username || null,
    afiliadoId: session?.afiliadoId || '',
    isAdmin: !!session?.isAdmin,
    sessionId: session?.sessionId || null,
    v: 1,
  }
  return jwt.sign(payload, LOCAL_JWT_SECRET, {
    expiresIn: options.expiresIn || LOCAL_ACCESS_TOKEN_EXPIRES_IN,
    issuer: 'app_afiliados_backend',
    audience: 'app_afiliados_client',
  })
}

function verifyLocalJwt(token) {
  if (!LOCAL_JWT_SECRET || !jwt) return null
  return jwt.verify(token, LOCAL_JWT_SECRET, {
    issuer: 'app_afiliados_backend',
    audience: 'app_afiliados_client',
  })
}

// Interpretar resultado de Execute: { Resultado, Mensajes }
function parseSoapResult(resultArr) {
  const out = { ok: false, payload: null, mensajes: [], mensajesRaw: null, errorDsc: null }
  try {
    const payload = Array.isArray(resultArr) ? resultArr[0] : resultArr
    out.payload = payload || {}
    
    // Parsear Resultado si es string JSON
    let resultadoParsed = null
    if (payload && typeof payload.Resultado === 'string' && payload.Resultado.trim().startsWith('{')) {
      try {
        resultadoParsed = JSON.parse(payload.Resultado)
      } catch {}
    }
    
    // Detectar ErrorDsc en el Resultado
    if (resultadoParsed && resultadoParsed.ErrorDsc) {
      out.errorDsc = resultadoParsed.ErrorDsc
      out.ok = false
      console.warn('❌ SOAP devolvió ErrorDsc:', resultadoParsed.ErrorDsc)
    }
    
    // SIA puede devolver mensajes en Mensajes O en Resultado (como array [{Id,Type,Description}])
    // Determinar cuál campo contiene los mensajes
    let mensajesStr = (payload && (payload.Mensajes || payload.mensajes)) || ''

    // Si Resultado es un JSON array con estructura de mensajes {Id, Type, Description},
    // tratarlo como mensajes (no como datos de solicitud)
    if (!mensajesStr && payload && typeof payload.Resultado === 'string') {
      const trim = payload.Resultado.trim()
      if (trim.startsWith('[')) {
        try {
          const arr = JSON.parse(trim)
          if (Array.isArray(arr) && arr.length > 0 && 'Type' in arr[0] && 'Description' in arr[0]) {
            // Es un array de mensajes de SIA
            mensajesStr = trim
          }
        } catch {}
      }
    }

    out.mensajesRaw = mensajesStr
    if (mensajesStr) {
      try {
        const arr = JSON.parse(mensajesStr)
        if (Array.isArray(arr)) {
          out.mensajes = arr
          // ok si no hay items con Type === 0 o Type === 1 (Error/Warning crítico)
          const hasError = arr.some(m => String(m.Type) === '0' || String(m.Type) === '1')
          if (hasError && !out.errorDsc) {
            out.ok = false
            out.errorDsc = out.errorDsc || arr.map(m => m.Description).join('; ')
          } else if (!out.errorDsc) {
            out.ok = true
          }
        } else {
          out.ok = false
        }
      } catch {
        out.ok = false
      }
    } else {
      // Si no hay mensajes pero hay ErrorDsc, ya se marcó ok=false arriba
      if (!out.errorDsc) {
        out.ok = true
      }
    }
  } catch {
    out.ok = false
  }
  return out
}

// (Eliminada la duplicación de callSoapExecute; se usa la versión anterior con Parametros planos)

// Helper: obtener credencial con distintos formatos de solicitud para aumentar compatibilidad
async function fetchCredencialFlexible(afiliadoId) {
  const baseCampos = [
    "|NOMBRE Y APELLIDO|",
    "|NUMERO DE AFILIADO|",
    "|PARENTESCO|",
    "|DOCUMENTO|",
    "|FECHA DE NACIMIENTO|",
    "|PLAN|",
    "|VIGENCIA DESDE|"
  ]

  const intentos = []
  // Formato 1: array de objetos { Nombre }
  intentos.push({
    formato: 'objetos',
    parametros: {
      AfiliadoId: afiliadoId,
      CredencialDatos: baseCampos.map(c => ({ Nombre: c }))
    }
  })
  // Formato 2: array de strings
  intentos.push({
    formato: 'strings',
    parametros: {
      AfiliadoId: afiliadoId,
      CredencialDatos: baseCampos
    }
  })
  // Formato 3: string único separado por pipe
  intentos.push({
    formato: 'string-pipes',
    parametros: {
      AfiliadoId: afiliadoId,
      CredencialDatos: baseCampos.join('|')
    }
  })

  const attemptDetails = []
  for (let i = 0; i < intentos.length; i++) {
    const intento = intentos[i]
    let detail = { formato: intento.formato, ok: false, error: null, payloadKeys: [], mensajes: [], items: 0 }
    try {
      console.log(`🔍 Intento credencial (${i+1}/${intentos.length}) formato=${intento.formato}`)
      const r = await callSoapExecutePlain('APPDATOSCREDENCIALES', intento.parametros)
      const parsed = parseSoapResult(r)
      detail.ok = parsed.ok
      detail.payloadKeys = Object.keys(parsed.payload || {})
      detail.mensajes = parsed.mensajes || []
      const datos = parsed.payload && (parsed.payload.CredencialDatos || parsed.payload.credencialDatos)
      if (Array.isArray(datos)) detail.items = datos.length
      // Nuevo: si no hay CredencialDatos pero Resultado es un JSON array de integrantes del grupo familiar
      if ((!datos || !Array.isArray(datos) || !datos.length) && parsed.payload && typeof parsed.payload.Resultado === 'string' && parsed.payload.Resultado.trim().startsWith('[')) {
        try {
          const familiaArr = JSON.parse(parsed.payload.Resultado)
          if (Array.isArray(familiaArr) && familiaArr.length) {
            detail.items = familiaArr.length
            const normalizarTexto = v => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v))
            
            // NUEVO: Verificar si el primer elemento YA tiene CredencialDatos dentro
            const titular = familiaArr[0]
            let credencialSintetica = null
            
            if (titular.CredencialDatos && Array.isArray(titular.CredencialDatos)) {
              // Caso 1: El SOAP ya devolvió CredencialDatos completo dentro del objeto
              credencialSintetica = titular.CredencialDatos
              console.log('✅ CredencialDatos encontrado DENTRO del resultado, items:', credencialSintetica.length)
            } else {
              // Caso 2: Construir credencialDatos sintéticos desde campos del grupo
              credencialSintetica = [
                { Nombre: '|NOMBRE Y APELLIDO|', Valor: normalizarTexto(`${titular.AfiliadoNombre} ${titular.AfiliadoApellido}`.trim()) },
                { Nombre: '|NUMERO DE AFILIADO|', Valor: normalizarTexto(titular.AfiliadoNumero) },
                { Nombre: '|DOCUMENTO|', Valor: normalizarTexto(titular.AfiliadoDocumento) },
                { Nombre: '|FECHA DE NACIMIENTO|', Valor: normalizarTexto(titular.AfiliadoFechaNacimiento) },
                { Nombre: '|PLAN|', Valor: normalizarTexto(titular.PlanDescripcion) },
                { Nombre: '|PARENTESCO|', Valor: titular.EsTitular === 'S' ? 'TITULAR' : 'FAMILIAR' },
                { Nombre: '|VIGENCIA DESDE|', Valor: '' }
              ]
              console.log('🔨 CredencialDatos sintéticos generados, items:', credencialSintetica.length)
            }
            
            // Inyectar estructura unificada en payload para uso aguas arriba
            parsed.payload.CredencialDatos = credencialSintetica
            parsed.payload.GrupoFamiliar = familiaArr.map(m => ({
              afiliadoId: m.AfiliadoId,
              numero: normalizarTexto(m.AfiliadoNumero),
              cuil: m.AfiliadoCUIL || null,
              apellido: normalizarTexto(m.AfiliadoApellido),
              nombre: normalizarTexto(m.AfiliadoNombre),
              fechaNacimiento: normalizarTexto(m.AfiliadoFechaNacimiento),
              documento: normalizarTexto(m.AfiliadoDocumento),
              sexo: normalizarTexto(m.AfiliadoSexo),
              planId: normalizarTexto(m.PlanId),
              planDescripcion: normalizarTexto(m.PlanDescripcion),
              nombreCompleto: normalizarTexto(`${m.AfiliadoNombre} ${m.AfiliadoApellido}`.trim()),
              // También incluir CredencialDatos si está presente en cada miembro
              credencialDatos: m.CredencialDatos || null
            }))
            detail.ok = true
            detail.items = credencialSintetica.length
            // Éxito inmediato usando formato especial grupo-familiar
            return { parsed, formatoUsado: 'grupo-familiar', intentosRealizados: i+1, attemptDetails }
          }
        } catch (eParse) {
          console.warn('No se pudo parsear Resultado grupo familiar:', eParse.message)
        }
      }
      if (parsed.ok && datos && Array.isArray(datos) && datos.length) {
        console.log(`✅ Credencial obtenida con formato ${intento.formato}, items=${datos.length}`)
        return { parsed, formatoUsado: intento.formato, intentosRealizados: i+1, attemptDetails }
      }
      console.log(`⚠️  Formato ${intento.formato} sin datos de credencial. keys=${detail.payloadKeys.join(',')}`)
    } catch (e) {
      detail.error = e.message || String(e)
      console.warn(`Error formato ${intento.formato}:`, detail.error)
    }
    attemptDetails.push(detail)
  }
  return { parsed: null, formatoUsado: null, intentosRealizados: intentos.length, attemptDetails }
}

// ===== ENDPOINTS =====

const requestUrlStatus = (url, timeoutMs = 8000) => {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url)
      const client = urlObj.protocol === 'https:' ? https : http

      const req = client.request(urlObj, { method: 'GET' }, (response) => {
        response.resume()
        resolve({ status: response.statusCode || 0 })
      })

      req.on('error', reject)
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error('Timeout de conectividad'))
      })
      req.end()
    } catch (error) {
      reject(error)
    }
  })
}

const checkExternalEndpoint = async (name, resolveUrl, acceptedStatuses = [200, 401, 403, 405]) => {
  try {
    const url = await resolveUrl()
    const startedAt = Date.now()
    const response = await requestUrlStatus(url, 8000)
    return {
      dependency: name,
      ok: acceptedStatuses.includes(response.status),
      status: response.status,
      latencyMs: Date.now() - startedAt,
      url,
    }
  } catch (error) {
    return {
      dependency: name,
      ok: false,
      error: error?.message || String(error),
    }
  }
}

const checkPostgres = async () => {
  const startedAt = Date.now()
  try {
    await db.query('SELECT 1')
    return {
      dependency: 'postgres',
      ok: true,
      latencyMs: Date.now() - startedAt,
    }
  } catch (error) {
    return {
      dependency: 'postgres',
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error?.message || String(error),
    }
  }
}

const runDependencyChecks = async (requestId = null) => {
  const checks = await Promise.all([
    checkPostgres(),
    checkExternalEndpoint('soapBeneficiarios', () => buildSoapUrl(true)),
    checkExternalEndpoint('soapSIA', () => buildSoapUrlSIA(true)),
    checkExternalEndpoint(
      'gam',
      () => `${String(config?.gam?.baseUrl || '').replace(/\/$/, '')}/oauth/userinfo`,
      [200, 400, 401, 403, 404, 405]
    ),
  ])

  updateDependencyMetrics(checks)

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: checks.every((check) => check.ok) ? 'info' : 'warn',
    event: 'dependency_check',
    requestId,
    checks,
  }))

  return {
    ok: checks.every((check) => check.ok),
    checks,
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    soapConnected: soapClient !== null,
    requestId: req.requestId,
    observability: {
      uptimeSeconds: Math.floor(process.uptime()),
      requestsTotal: observabilityState.requestsTotal,
      requestsInFlight: observabilityState.requestsInFlight,
      errors5xx: observabilityState.errors5xx,
    }
  })
})

app.get('/health/observability', rateLimiters.adminDiagnostics, requireAuth, requireAdmin, requirePermission('salud'), async (req, res) => {
  const dependencyReport = await runDependencyChecks(req.requestId)
  const payload = {
    status: dependencyReport.ok ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    observability: getObservabilitySnapshot(),
    dependencies: dependencyReport,
  }

  if (!dependencyReport.ok) {
    return res.status(503).json(payload)
  }

  return res.json(payload)
})

app.get('/health/alerts', rateLimiters.adminDiagnostics, requireAuth, requireAdmin, requirePermission('salud'), async (req, res) => {
  const [dependencyReport, errorRateThreshold, maxLatencyMs] = await Promise.all([
    runDependencyChecks(req.requestId),
    getParametroNumero('ALERTAS_OPS', 'ErrorRatePct', 20),
    getParametroNumero('ALERTAS_OPS', 'MaxLatencyMs', 8000),
  ])

  const snapshot = getObservabilitySnapshot()
  const total = snapshot.requests.total || 0
  const errors = snapshot.requests.errors5xx || 0
  const errorRatePct = total > 0 ? Number(((errors / total) * 100).toFixed(2)) : 0

  const unhealthyDependencies = dependencyReport.checks
    .filter((check) => !check.ok)
    .map((check) => check.dependency)

  const latencyAlerts = dependencyReport.checks
    .filter((check) => check.latencyMs && check.latencyMs >= maxLatencyMs)
    .map((check) => check.dependency)

  const alertState = {
    backendDown: false,
    highErrorRate: errorRatePct >= errorRateThreshold,
    highInFlight: (snapshot.requests.inFlight || 0) >= INFLIGHT_ALERT_THRESHOLD,
    dependencyFailures: unhealthyDependencies.length > 0,
    latencyHigh: latencyAlerts.length > 0,
    timeoutDetected: dependencyReport.checks.some((check) =>
      typeof check.error === 'string' && /timeout/i.test(check.error)
    ),
  }

  const payload = {
    status: Object.values(alertState).some(Boolean) ? 'alert' : 'ok',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    thresholds: {
      highErrorRatePct: errorRateThreshold,
      maxLatencyMs,
      maxInFlight: INFLIGHT_ALERT_THRESHOLD,
    },
    metrics: {
      requestsTotal: total,
      requestsInFlight: snapshot.requests.inFlight || 0,
      errors5xx: errors,
      errorRatePct,
    },
    alertState,
    unhealthyDependencies,
    latencyAlerts,
    dependencies: dependencyReport.checks,
  }

  if (payload.status === 'alert') {
    return res.status(503).json(payload)
  }

  return res.json(payload)
})

// Configuración de alertas desde nusispar (para consumo de monitor-backend.ps1)
app.get('/health/alerts/config', rateLimiters.adminDiagnostics, requireAuth, requireAdmin, requirePermission('salud'), async (req, res) => {
  const [
    enabled,
    errorRatePct,
    maxLatencyMs,
    intervalSeconds,
    smtpServer,
    smtpPort,
    mailFrom,
    mailTo,
    webhookUrl,
  ] = await Promise.all([
    getParametro('ALERTAS_OPS', 'Enabled', 'S'),
    getParametroNumero('ALERTAS_OPS', 'ErrorRatePct', 20),
    getParametroNumero('ALERTAS_OPS', 'MaxLatencyMs', 8000),
    getParametroNumero('ALERTAS_OPS', 'IntervalSeconds', 60),
    getParametro('ALERTAS_OPS', 'SmtpServer', ''),
    getParametroNumero('ALERTAS_OPS', 'SmtpPort', 25),
    getParametro('ALERTAS_OPS', 'MailFrom', ''),
    getParametro('ALERTAS_OPS', 'MailTo', ''),
    getParametro('ALERTAS_OPS', 'WebhookUrl', ''),
  ])

  return res.json({
    enabled: enabled === 'S',
    thresholds: { errorRatePct, maxLatencyMs },
    schedule: { intervalSeconds },
    notifications: { smtpServer, smtpPort, mailFrom, mailTo, webhookUrl },
    source: 'nusispar:ALERTAS_OPS',
    timestamp: new Date().toISOString(),
  })
})

// Diagnóstico rápido de conectividad de WS externos (SOAP)
app.get('/health/ws-connectivity', rateLimiters.adminDiagnostics, requireAuth, requireAdmin, requirePermission('salud'), async (req, res) => {
  const startedAt = Date.now()

  const checkService = async (service, resolveUrl) => {
    try {
      const url = await resolveUrl()
      const t0 = Date.now()
      const response = await requestUrlStatus(url, 8000)

      const acceptedStatuses = [200, 401, 403, 405]
      const ok = acceptedStatuses.includes(response.status)

      return {
        service,
        ok,
        status: response.status,
        latencyMs: Date.now() - t0,
        url,
      }
    } catch (error) {
      return {
        service,
        ok: false,
        error: error?.message || String(error),
      }
    }
  }

  const results = await Promise.all([
    checkService('WSBENEFTK', () => buildSoapUrl(true)),
    checkService('WSSIATK', () => buildSoapUrlSIA(true)),
  ])

  const ok = results.every((r) => r.ok)
  const payload = {
    ok,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    services: results,
  }

  if (!ok) {
    return res.status(503).json(payload)
  }

  return res.json(payload)
})

// Suite ampliada de conectividad (endpoints internos + WS)
app.get('/health/connectivity-suite', rateLimiters.adminDiagnostics, requireAuth, requireAdmin, requirePermission('salud'), async (req, res) => {
  const startedAt = Date.now()
  // Usar loopback evita falsos negativos por DNS/host externo dentro del contenedor
  const localPort = Number.parseInt(process.env.PORT || '3000', 10) || 3000
  const baseUrl = `http://127.0.0.1:${localPort}`

  const runCheck = async ({ name, method = 'GET', endpoint, body, acceptedStatuses = [200] }) => {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`
    const t0 = Date.now()

    try {
      if (method !== 'GET') {
        throw new Error(`Método no soportado en connectivity-suite: ${method}`)
      }

      if (body) {
        throw new Error('Body no soportado en connectivity-suite')
      }

      const response = await requestUrlStatus(url, 9000)

      return {
        name,
        endpoint,
        method,
        ok: acceptedStatuses.includes(response.status),
        status: response.status,
        latencyMs: Date.now() - t0,
      }
    } catch (error) {
      return {
        name,
        endpoint,
        method,
        ok: false,
        error: error?.message || String(error),
      }
    }
  }

  const checks = [
    { name: 'Backend health', endpoint: '/health', method: 'GET', acceptedStatuses: [200] },
    { name: 'UI inicio', endpoint: '/', method: 'GET', acceptedStatuses: [200, 301, 302, 307, 308] },
    { name: 'UI parámetros', endpoint: '/admin', method: 'GET', acceptedStatuses: [200, 301, 302, 307, 308] },
    { name: 'UI cartilla', endpoint: '/admin/cartilla', method: 'GET', acceptedStatuses: [200, 301, 302, 307, 308] },
    { name: 'UI info útil', endpoint: '/admin/info-util-ui', method: 'GET', acceptedStatuses: [200, 301, 302, 307, 308] },
    { name: 'UI diagnóstico', endpoint: '/admin/diagnostico', method: 'GET', acceptedStatuses: [200, 301, 302, 307, 308] },
    { name: 'UI usuarios', endpoint: '/admin/usuarios', method: 'GET', acceptedStatuses: [200, 301, 302, 307, 308] },
    // Endpoint protegido: 401/403 también indica que la ruta responde
    { name: 'API cartilla rubros (protegida)', endpoint: '/admin/cartilla/rubros', method: 'GET', acceptedStatuses: [200, 401, 403] },
    // Reutiliza diagnóstico SOAP dedicado
    { name: 'Diagnóstico SOAP', endpoint: '/health/ws-connectivity', method: 'GET', acceptedStatuses: [200, 401, 403, 503] },
  ]

  const results = await Promise.all(checks.map(runCheck))
  const ok = results.every((r) => r.ok)

  const payload = {
    ok,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    totals: {
      total: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    },
    checks: results,
  }

  if (!ok) {
    return res.status(503).json(payload)
  }

  return res.json(payload)
})

// Servir archivos estáticos (interfaz web)
app.use(express.static(path.join(__dirname, 'public'), { index: false }))
// Servir imágenes subidas (noticias, etc.)
app.use('/uploads', express.static(resolveUploadsRoot()))
app.get('/favicon.ico', (req, res) => {
  res.status(204).end()
})
app.get('/', (req, res) => {
  res.redirect('/admin')
})

// ============================================================================
// OPENAPI / SWAGGER UI — Tarea #21 del backlog
// Accesible en: GET /api-docs
// ============================================================================
try {
  const swaggerUi = require('swagger-ui-express')
  const swaggerSpec = require('./swaggerConfig')
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'APP Afiliados — API Docs',
    customCss: '.swagger-ui .topbar { background-color: #1565C0; } .swagger-ui .topbar-wrapper .link { display: none; }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
  }))
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })
  console.log('📖 OpenAPI docs disponibles en /api-docs')
} catch (swaggerError) {
  console.warn('⚠️  No se pudo inicializar Swagger UI:', swaggerError.message)
}

// ============================================================================
// ADMIN CARTILLA - Debe estar ANTES de /admin para evitar conflictos de rutas
// ============================================================================

// Servir interfaz web cartilla
// Nota: auth se maneja del lado cliente (initAdminPanelAuth). Sin guard server-side
// para evitar 401 cuando la cookie Secure no se envía en entornos HTTP.
app.get('/admin/cartilla', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-cartilla.html'))
})

// Página de test de geocodificación
app.get('/test-geocoding', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-geocoding.html'))
})

// Página de administración de parámetros
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-parametros.html'))
})

// Página de administración de Info útil (UI). NOTA: la API usa /admin/info-util
app.get('/admin/info-util-ui', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-info-util.html'))
})

// Página de diagnóstico de conectividad (UI)
app.get('/admin/diagnostico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-diagnostico.html'))
})

// Página de administración de usuarios
app.get('/admin/usuarios', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-usuarios.html'))
})

// Página de administración de credenciales
app.get('/admin/credenciales-ui', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-credenciales.html'))
})

// Página de gestión de noticias / novedades
app.get('/admin/noticias-ui', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  res.set('Surrogate-Control', 'no-store')
  res.sendFile(path.join(__dirname, 'public', 'admin-noticias.html'))
})

// Página de bitácora de soporte
app.get('/admin/soporte', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-soporte.html'))
})

// Página de mensajes institucionales / broadcast
app.get('/admin/notificaciones', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-notificaciones.html'))
})

// Página de analítica funcional
app.get('/admin/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-analytics.html'))
})

// POST /admin/login - Login admin contra BD (nuusuari + nuusuauth via userRepository)
app.post('/admin/login', rateLimiters.adminLogin, async (req, res) => {
  try {
    const { username, email, password } = req.body || {}
    const loginIdentifier = String(username || email || '').trim()

    if (!loginIdentifier || !password) {
      return sendLegacyValidationError(res, 'Usuario y contraseña requeridos', 'username')
    }

    // Buscar usuario en BD con el mismo repositorio que /auth/login
    const found = await userRepository.findForLogin(loginIdentifier)

    if (!found) {
      return res.status(401).json({ error: 'Usuario no encontrado en base de datos' })
    }

    // Verificar desactivación (nuusubajaf con fecha real > 1900)
    const fechaBaja = found.nuusubajaf ? new Date(found.nuusubajaf) : null
    if (fechaBaja && fechaBaja.getFullYear() > 1900) {
      return res.status(403).json({ error: 'Usuario desactivado' })
    }

    // Verificar contraseña
    const storedHash = found.nuusuauth?.nuusupass || null
    if (!storedHash || !verifyPassword(String(password), storedHash)) {
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }

    // Verificar que sea admin backend
    const adminEmail = normalizeEmail(found.nuusumail)
    const backendAdminEmails = await getBackendAdminEmails()
    const isBackendAdmin = backendAdminEmails.includes(adminEmail)

    if (!isBackendAdmin) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'El usuario no tiene permisos de administrador de backend'
      })
    }

    // Obtener permisos del rol si el usuario tiene uno asignado
    let userPermisos = null // null = super admin (acceso total)
    if (found.nurolid !== null && found.nurolid !== undefined) {
      try {
        const roleRow = await db.pool.query('SELECT nurolpermisos FROM nurolper WHERE nurolid = $1', [found.nurolid])
        if (roleRow.rows[0]?.nurolpermisos) {
          userPermisos = JSON.parse(roleRow.rows[0].nurolpermisos)
        }
      } catch (_) { /* sin permisos si falla */ }
    }

    const sessionMetadata = buildSessionMetadata(req)
    const sessionPayload = {
      nuusuid: found.nuusuid,
      username: adminEmail,
      email: adminEmail,
      loginAt: new Date().toISOString(),
      afiliadoId: found.nuusuafili || '',
      nurolid: found.nurolid ?? null,
      isAdmin: true,
      sessionId: sessionMetadata.sessionId,
      authType: 'LOCAL_ADMIN',
    }

    const token = issueLocalJwt(sessionPayload) || generateToken()
    const refreshToken = issueRefreshToken(sessionPayload, sessionMetadata, { authType: 'LOCAL_ADMIN' })
    sessions.set(token, { ...sessionPayload, refreshToken, sessionMetadata })
    updateRefreshSession(refreshToken, { currentAccessToken: token })
    setAdminAuthCookie(res, token)

    return res.json({
      token,
      refresh_token: refreshToken,
      expires_in: 8 * 60 * 60,
      user: {
        nuusuid: found.nuusuid,
        username: adminEmail,
        email: adminEmail,
        nombre: String(found.nuusuapell || 'Admin').trim(),
        afiliadoId: found.nuusuafili || '',
        nurolid: found.nurolid ?? null,
        isSuperAdmin: (found.nurolid === null || found.nurolid === undefined),
        permisos: userPermisos
      },
      session: {
        sessionId: sessionMetadata.sessionId,
        deviceId: sessionMetadata.deviceId,
        platform: sessionMetadata.platform,
        appVersion: sessionMetadata.appVersion,
      },
      authType: 'LOCAL_ADMIN',
      message: 'Login admin exitoso'
    })
  } catch (error) {
    console.error('❌ Error en /admin/login:', error)
    return res.status(500).json({ error: 'Error interno en login admin' })
  }
})

// POST /admin/logout - Cerrar sesión admin y limpiar cookie HttpOnly
app.post('/admin/logout', (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    const bearerToken = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null
    const cookieToken = getCookieValue(req, ADMIN_AUTH_COOKIE_NAME)
    const token = bearerToken || cookieToken

    if (token) {
      const currentSession = sessions.get(token)
      if (currentSession?.refreshToken) {
        revokeRefreshToken(currentSession.refreshToken)
      }
      sessions.delete(token)
    }

    clearAdminAuthCookie(res)
    return res.json({ success: true, message: 'Sesión admin cerrada' })
  } catch (error) {
    console.error('❌ Error en /admin/logout:', error)
    clearAdminAuthCookie(res)
    return res.status(500).json({ error: 'Error cerrando sesión admin' })
  }
})

// Debug rápido del estado SOAP (solo admins autenticados)
app.get('/debug/soap', requireAuth, requireAdmin, async (req, res) => {
  try {
    const wsdl = await getWsdlUrl()
    const soapUser = await getSoapUser()

    res.json({
      useSoapFlag: USE_SOAP,
      wsdl,
      soapConnected: !!soapClient,
      endpoint: soapEndpoint || null,
      soapUser,
      tlsRejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED || null
    })
  } catch (error) {
    res.status(500).json({
      error: 'ERROR_DEBUG_SOAP',
      message: error?.message || String(error)
    })
  }
})

// Debug configuración GAM (solo admins autenticados)
app.get('/debug/gam', requireAuth, requireAdmin, (req, res) => {
  res.json({
    gamConfigExists: !!config.gam,
    gamEnabled: config.gam?.enabled,
    gamBaseUrl: config.gam?.baseUrl,
    hasClientId: !!config.gam?.clientId,
    hasClientSecret: !!config.gam?.clientSecret
  })
})

// Último XML intercambiado (solo admins autenticados)
app.get('/debug/soap/last', requireAuth, requireAdmin, (req, res) => {
  if (!lastSoapExchange.timestamp) {
    return res.status(404).json({ error: 'Sin intercambio registrado todavía' })
  }
  const truncate = (s, max = 20000) => (s && s.length > max ? s.substring(0, max) + `\n...[truncado ${s.length - max} chars]` : s)
  res.json({
    timestamp: lastSoapExchange.timestamp,
    requestXml: truncate(lastSoapExchange.requestXml),
    responseXml: truncate(lastSoapExchange.responseXml)
  })
})

// Debug: ejecutar servicio SOAP arbitrario (solo admins autenticados)
app.post('/debug/soap/execute', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { servicio, parametros } = req.body || {}
    if (!servicio) return res.status(400).json({ error: 'Falta "servicio"' })
    if (!soapClient) return res.status(503).json({ error: 'SOAP no inicializado' })

    let result
    if (typeof parametros === 'string') {
      // Ejecutar como RAW con fallback TLS
      result = await callSoapExecuteRaw(servicio, parametros)
    } else {
      result = await callSoapExecute(servicio, parametros || {})
    }

    const parsed = parseSoapResult(result)
    res.json({ success: parsed.ok, parsed, raw: result[0] })
  } catch (err) {
    res.status(500).json({ error: String(err && err.message || err) })
  }
})

// ===== REGISTRO =====
// POST /register - Registrar nuevo usuario
app.post('/register', rateLimiters.register, validateBody(RegisterBodySchema), async (req, res) => {
  try {
    const { cuil, dni, nroAfiliado, fechaNacimiento, sexo, cantidadIntegrantes, email, password } = req.body

    // Validar datos requeridos
    if (!fechaNacimiento || !sexo || !cantidadIntegrantes) {
      return sendLegacyValidationError(
        res,
        'Faltan datos requeridos: fechaNacimiento, sexo, cantidadIntegrantes',
        'fechaNacimiento'
      )
    }

    const sexoNormalizadoRegistro = normalizeSexo(sexo)
    if (!sexoNormalizadoRegistro) {
      return sendLegacyValidationError(res, 'El campo sexo es obligatorio y debe ser F, M o N.', 'sexo')
    }

    if (!cuil && !dni && !nroAfiliado) {
      return sendLegacyValidationError(res, 'Debe proveer al menos uno: cuil, dni, o nroAfiliado', 'cuil')
    }

    if (!email || !String(email).trim().includes('@')) {
      return sendLegacyValidationError(res, 'El email es obligatorio y debe ser válido', 'email')
    }

    if (!password || String(password).length < 8) {
      return sendLegacyValidationError(res, 'Contraseña requerida (mínimo 8 caracteres)', 'password')
    }

    // === VALIDACIÓN EMAIL DUPLICADO EN BD LOCAL ===
    // Verificar si el email ya está en uso antes de llamar a SOAP/GAM
    const userIdentifierForEmail = nroAfiliado || cuil || dni
    const emailDupValidation = await validateEmailDuplication(email, userIdentifierForEmail)
    if (emailDupValidation.exists) {
      if (emailDupValidation.sameUser) {
        console.log('⚠️  /register: Email ya registrado para el mismo usuario')
        return res.status(409).json({
          error: 'Ya existe una cuenta registrada',
          code: 'EMAIL_EXISTS_SAME_USER',
          sameUser: true,
          canRecover: true,
          maskedEmail: emailDupValidation.maskedEmail,
          message: emailDupValidation.message,
          suggestion: 'Puede recuperar su contraseña usando el enlace "¿Olvidó su contraseña?"'
        })
      } else {
        console.log('❌ /register: Email ya en uso por otro usuario')
        return res.status(409).json({
          error: 'Email ya está en uso',
          code: 'EMAIL_EXISTS_DIFFERENT_USER',
          sameUser: false,
          canRecover: false,
          message: emailDupValidation.message
        })
      }
    }

    // Si está habilitado SOAP pero aún no inicializado, evitar caer a mock y avisar
    if (USE_SOAP && !soapClient) {
      return res.status(503).json({ error: 'Servicio SOAP inicializándose. Intenta nuevamente en unos segundos.' })
    }

    const gamEnabledForRegister = Boolean(config?.gam?.enabled) && await gamService.isGAMEnabled({ forceRefresh: true })
    console.log(`🔐 Registro con GAM ${gamEnabledForRegister ? 'HABILITADO' : 'DESHABILITADO'} (flag dinámico)`) 

    // === VALIDACIÓN GAM PREVIA ===
    // Verificar si el usuario ya existe en GAM ANTES de registrar en SOAP
    if (gamEnabledForRegister && email) {
      console.log('🔍 Verificando existencia previa en GAM:', { email })
      
      try {
        // Usar checkUserExistsInGAM que hace una verificación más robusta
        const checkResult = await gamService.checkUserExistsInGAM(email)
        
        if (checkResult.exists) {
          console.log('❌ Usuario ya registrado en GAM:', email)
          return res.status(409).json({
            error: 'EMAIL_YA_REGISTRADO',
            message: 'Este email ya está registrado. Iniciá sesión o recuperá tu contraseña.',
            shouldLogin: true,
            code: 'USER_ALREADY_EXISTS'
          })
        }
        
        console.log('✅ Email disponible en GAM, continuando con registro...')
      } catch (checkError) {
        // Si hay error en la verificación, por seguridad continuar con el registro
        // El error real se capturará más adelante cuando intente registrar en GAM
        console.log('⚠️ No se pudo verificar email en GAM, continuando con registro...')
      }
    }

    // Llamar al servicio SOAP REGISTRACION
    if (USE_SOAP && soapClient) {
      try {
        // Formato exacto esperado por el servicio Tekhne:
        // AfiliadoNro: CUIL/DNI/NroAfiliado, FecNacimiento: DD/MM/YYYY, Sexo, CantGrupo, etc.
        // Determinar fuente del AfiliadoNro y activar SOLO una bandera
        let afiliadoNro = ''
        let regConCUIL = 'N', regConDoc = 'N', regConNro = 'N'
        if (nroAfiliado) {
          afiliadoNro = nroAfiliado
          regConNro = 'S'
        } else if (dni) {
          afiliadoNro = dni
          regConDoc = 'S'
        } else if (cuil) {
          afiliadoNro = cuil
          regConCUIL = 'S'
        }
        // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY (formato requerido por REGISTRACION)
        const partes = fechaNacimiento.split('-')
        const fecNac = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaNacimiento
        
        const parametros = {
          AfiliadoNro: afiliadoNro,
          FecNacimiento: fecNac,
          Sexo: sexoNormalizadoRegistro,
          CantGrupo: String(cantidadIntegrantes),
          TitularNro: '0',
          eMail: email || '',
          RegistracionConNroAfiliado: regConNro,
          RegistracionConDocumento: regConDoc,
          RegistracionConCUIL: regConCUIL
        }
        // Reintentos agregando posibles campos Usuario/USUARIO si el servicio los exige.
        const variantes = []
        variantes.push({ ...parametros })
        variantes.push({ ...parametros, Usuario: parametros.AfiliadoNro })
        variantes.push({ ...parametros, USUARIO: parametros.AfiliadoNro })
        variantes.push({ ...parametros, Usuario: parametros.AfiliadoNro, USUARIO: parametros.AfiliadoNro })

        let parsed = null
        let lastResult = null
        
        console.log('🔍 Endpoint REGISTRACION que se usará (desde nusispar)...')
        
        for (let i = 0; i < variantes.length; i++) {
          const intentoParams = variantes[i]
            console.log(`SOAP Execute REGISTRACION intento ${i+1}/${variantes.length} parametros:`, intentoParams)
          try {
            // Log mínimo del payload para diagnóstico
            console.log('→ REGISTRACION payload JSON:', JSON.stringify({ Parametros: intentoParams }))
            const r = await callSoapExecute('REGISTRACION', intentoParams)
            lastResult = r
            parsed = parseSoapResult(r)
            console.log(`SOAP REGISTRACION parsed intento ${i+1}: ok=${parsed.ok} mensajes=${(parsed.mensajes||[]).length}`)
            if (parsed.ok) break
            const isNombreUsuario = parsed.mensajes.some(m => /nombre de usuario/i.test(m.Description))
            if (!isNombreUsuario) break
          } catch (e) {
            console.warn(`Error intento ${i+1} REGISTRACION:`, e.message)
          }
        }

        if (!parsed || !parsed.ok) {
          const errorMsg = parsed?.errorDsc || 'Error al validar tus datos'
          console.error('❌ REGISTRACION falló:', {
            ok: parsed?.ok,
            errorDsc: parsed?.errorDsc,
            mensajes: parsed?.mensajes,
            intentos: variantes.length
          })
          return res.status(400).json({ 
            error: 'DATOS_INVALIDOS',
            message: 'Verificá tus datos e intentá nuevamente.',
            detalle: errorMsg,
            mensajes: parsed ? parsed.mensajes : [], 
            raw: parsed ? parsed.mensajesRaw : null,
            intentos: variantes.length
          })
        }

        // Extraer AfiliadoId de la respuesta
        const userKey = cuil || dni || nroAfiliado
        const payload = parsed.payload || {}
        let resultadoParsed = null
        try {
          if (payload && typeof payload.Resultado === 'string' && payload.Resultado.trim().startsWith('{')) {
            resultadoParsed = JSON.parse(payload.Resultado)
          } else if (payload && typeof payload.Resultado === 'object') {
            resultadoParsed = payload.Resultado
          } else {
            // Algunos servicios pueden devolver campos en el nivel raíz
            resultadoParsed = payload
          }
        } catch (e) {
          console.warn('No se pudo parsear Resultado JSON. Usando payload crudo.')
          resultadoParsed = payload
        }

        // Construir AfiliadoId desde los componentes devueltos por REGISTRACION
        let afiliadoId = null
        if (resultadoParsed && (resultadoParsed.TitularNro || resultadoParsed.OrganizacionId || resultadoParsed.FamiliarNro)) {
          afiliadoId = buildAfiliadoId(
            resultadoParsed.TitularNro,
            resultadoParsed.OrganizacionId,
            resultadoParsed.FamiliarNro
          )
          console.log('✅ AfiliadoId construido:', afiliadoId, {
            titular: resultadoParsed.TitularNro,
            organizacion: resultadoParsed.OrganizacionId,
            familiar: resultadoParsed.FamiliarNro
          })
        } else if (resultadoParsed && resultadoParsed.AfiliadoId && resultadoParsed.AfiliadoId.length === 30) {
          afiliadoId = resultadoParsed.AfiliadoId
          console.log('✅ AfiliadoId directo desde respuesta:', afiliadoId)
        }
        
        // Validar que tenemos un AfiliadoId válido (30 caracteres)
        if (!afiliadoId || afiliadoId.length !== 30) {
          const errorMsg = resultadoParsed?.ErrorDsc || 'No se pudo determinar el Afiliado'
          console.error('❌ REGISTRACION no devolvió AfiliadoId válido:', {
            afiliadoId,
            length: afiliadoId?.length,
            errorDsc: errorMsg,
            respuesta: resultadoParsed
          })
          return res.status(400).json({ 
            error: 'AFILIADO_NO_ENCONTRADO',
            message: 'No encontramos tus datos. Verificá tu información.',
            detalle: errorMsg,
            afiliadoNroEnviado: afiliadoNro,
            respuestaSOAP: resultadoParsed
          })
        }
        
        // Guardar en registeredUsers con hash de password
        if (password) {
          const passwordHash = hashPassword(String(password))
          registeredUsers.set(userKey, {
            cuil: cuil || null,
            dni: dni || null,
            nroAfiliado: nroAfiliado || null,
            email: email || null,
            passwordHash,
            afiliadoId,  // Guardar AfiliadoId completo
            registradoEn: new Date().toISOString(),
            resultado: resultadoParsed  // Guardar respuesta parseada para referencia
          })
          saveUsersToFile()
          console.log('💾 Usuario guardado localmente con AfiliadoId:', userKey)
        }

        // === VALIDACIÓN DUPLICADO POR AFILIADOID ===
        // Verificar si ya existe un usuario con el mismo nuusuafili en PostgreSQL
        console.log('🔍 Verificando duplicado por AfiliadoId en base de datos...')
        try {
          const client = await db.pool.connect()
          try {
            const checkAfiliadoQuery = {
              text: 'SELECT nuusuid, nuusumail, nuusuapell FROM nuusuari WHERE nuusuafili = $1 LIMIT 1',
              values: [afiliadoId]
            }
            
            const existingAfiliado = await client.query(checkAfiliadoQuery)
            console.log('✅ Query ejecutada:', { text: checkAfiliadoQuery.text, rows: existingAfiliado.rows.length })
            
            if (existingAfiliado.rows.length > 0) {
              const existing = existingAfiliado.rows[0]
              console.log('❌ AfiliadoId ya registrado:', {
                afiliadoId: afiliadoId,
                email: existing.nuusumail,
                nombre: existing.nuusuapell
              })
              
              client.release()
              return res.status(409).json({
                error: 'YA_REGISTRADO',
                message: 'Ya tenés una cuenta. Iniciá sesión.',
                hint: existing.nuusumail ? 'Email: ' + existing.nuusumail.substring(0, 3) + '***' : null,
                shouldLogin: true,
                code: 'AFFILIATE_ID_ALREADY_EXISTS'
              })
            }
            
            client.release()
            console.log('✅ AfiliadoId disponible, continuando...')
          } catch (dbError) {
            client.release()
            throw dbError
          }
        } catch (dbError) {
          console.error('⚠️ Error verificando AfiliadoId en BD:', dbError.message)
          // En caso de error de BD, rechazar el registro por seguridad
          return res.status(500).json({
            error: 'ERROR_SISTEMA',
            message: 'Error al verificar datos. Intentá nuevamente.'
          })
        }

        // Guardar en la tabla nuusuari de PostgreSQL
        let nuusuid = null
        let gamUserData = null
        let userExistsInGAM = false // Mover al scope superior
        
        try {
          // === INTEGRACIÓN GAM: Registrar usuario en GAM después de validación SOAP exitosa ===
          console.log('🔍 Verificando config.gam:', { 
            hasConfig: !!config.gam, 
            enabled: config.gam?.enabled, 
            enabledByParam: gamEnabledForRegister,
            hasEmail: !!email,
            email: email
          })
          
          if (gamEnabledForRegister && email) {
            console.log('🔐 Iniciando integración GAM para:', email)
            
            try {
              // 1. Verificar si el usuario ya existe en GAM
              let existingGAMUser = null
              
              try {
                existingGAMUser = await gamService.validateUserGAM(email)
                userExistsInGAM = existingGAMUser && existingGAMUser.UserGUID
                console.log('🔍 Usuario existe en GAM:', userExistsInGAM ? 'SÍ' : 'NO')
              } catch (validateError) {
                // Si validateUserGAM retorna error, el usuario no existe
                console.log('🔍 Usuario no encontrado en GAM, procederá a registrar')
                userExistsInGAM = false
              }
              
              // 2. Si usuario YA EXISTE en GAM: hacer login y traer datos (REGLAS_GAM_BDD PUNTO 2.1)
              if (userExistsInGAM) {
                console.log('✅ Usuario ya existe en GAM - Sincronizando datos desde GAM...')
                try {
                  // Login en GAM para obtener access_token
                  const gamLogin = await gamService.loginGAM(email, password)
                  if (gamLogin && gamLogin.access_token) {
                    console.log('✅ Login GAM exitoso - Obteniendo datos del usuario...')
                    
                    // Obtener información completa del usuario desde GAM
                    const userInfo = await gamService.getUserInfo(gamLogin.access_token)
                    console.log('✅ UserInfo obtenido desde GAM:', {
                      id: userInfo.Id,
                      email: userInfo.Email,
                      name: userInfo.Name,
                      nroAfiliado: userInfo.NroAfiliado
                    })
                    
                    // Usar datos de GAM para sincronización
                    gamUserData = {
                      userId: userInfo.Id,
                      email: userInfo.Email,
                      firstName: userInfo.Name?.split(' ')[0] || '',
                      lastName: userInfo.Name?.split(' ').slice(1).join(' ') || '',
                      access_token: gamLogin.access_token,
                      nroAfiliado: userInfo.NroAfiliado
                    }
                    
                    console.log('✅ Datos de GAM sincronizados (usuario existente)')
                  } else {
                    console.error('❌ Login GAM falló - Password incorrecta o usuario desactivado')
                    throw new Error('No se pudo autenticar con GAM. Verifica tu contraseña.')
                  }
                } catch (loginError) {
                  console.error('❌ Error al sincronizar usuario existente de GAM:', loginError.message)
                  throw new Error(`No se pudo sincronizar con GAM: ${loginError.message}`)
                }
              } 
              // 3. Si usuario NO EXISTE en GAM: registrar nuevo
              else {
                console.log('📝 Registrando usuario nuevo en GAM...')
                
                // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD (formato ISO requerido por GAM)
                let fechaNacimientoISO = fechaNacimiento
                if (fechaNacimiento && fechaNacimiento.includes('/')) {
                  const partes = fechaNacimiento.split('/')
                  if (partes.length === 3) {
                    fechaNacimientoISO = `${partes[2]}-${partes[1]}-${partes[0]}`
                    console.log(`📅 Fecha convertida: ${fechaNacimiento} → ${fechaNacimientoISO}`)
                  }
                }
                
                // Usar AfiliadoNro de la respuesta SOAP (puede ser diferente al formulario)
                const nroAfiliadoFinal = resultadoParsed.AfiliadoNro || nroAfiliado || cuil || dni || ''
                console.log(`🔢 Nro Afiliado para GAM: ${nroAfiliadoFinal} (fuente: ${resultadoParsed.AfiliadoNro ? 'SOAP' : 'formulario'})`)

                // Resolver nombre/apellido para GAM con fallback robusto.
                // Algunos servicios SOAP devuelven solo ApellidoNombre ("APELLIDO, NOMBRE").
                const nombreSoap = String(
                  resultadoParsed.Nombre ||
                  resultadoParsed.FirstName ||
                  req.body.firstName ||
                  ''
                ).trim()

                const apellidoSoap = String(
                  resultadoParsed.Apellido ||
                  resultadoParsed.LastName ||
                  req.body.lastName ||
                  ''
                ).trim()

                const apellidoNombreSoap = String(
                  resultadoParsed.ApellidoNombre ||
                  resultadoParsed.ApellidoYNombre ||
                  resultadoParsed.NombreCompleto ||
                  ''
                ).trim()

                let firstNameGam = nombreSoap
                let lastNameGam = apellidoSoap

                if ((!firstNameGam || !lastNameGam) && apellidoNombreSoap) {
                  if (apellidoNombreSoap.includes(',')) {
                    const partes = apellidoNombreSoap.split(',').map((p) => p.trim()).filter(Boolean)
                    if (!lastNameGam && partes[0]) lastNameGam = partes[0]
                    if (!firstNameGam && partes[1]) firstNameGam = partes.slice(1).join(' ')
                  } else {
                    const partes = apellidoNombreSoap.split(/\s+/).filter(Boolean)
                    if (partes.length >= 2) {
                      if (!firstNameGam) firstNameGam = partes[0]
                      if (!lastNameGam) lastNameGam = partes.slice(1).join(' ')
                    }
                  }
                }

                // Último fallback para evitar nulos/vacíos en GAM.
                if (!firstNameGam) firstNameGam = 'Afiliado'
                if (!lastNameGam) lastNameGam = 'Osep'
                
                const gamRegisterData = {
                  email: email,
                  firstName: firstNameGam,
                  lastName: lastNameGam,
                  password: password,
                  telefono: req.body.telefono || '',
                  cuil: cuil,
                  documento: dni,
                  nroAfiliado: nroAfiliadoFinal,
                  sexo: sexo,
                  fechaNacimiento: fechaNacimientoISO,
                  canMiembrosFamiliar: req.body.cantidadIntegrantes || 1
                }
                
                console.log('📋 Datos enviados a GAM:', JSON.stringify(gamRegisterData, null, 2))
                gamUserData = await gamService.registerUserGAM(gamRegisterData)
                console.log('✅ Usuario registrado en GAM con UserID:', gamUserData.userId)
              }
              
              // 4. Usar UserID de GAM como nuusuid
              if (gamUserData && (gamUserData.userId || gamUserData.UserGUID)) {
                nuusuid = gamUserData.userId || gamUserData.UserGUID
                console.log('🔑 Usando GAM UserID como nuusuid:', nuusuid)
              }
              
            } catch (gamError) {
              console.error('❌ Error CRÍTICO en integración GAM:', gamError.message || gamError)
              console.error('📋 Detalles del error:', {
                name: gamError.name,
                message: gamError.message,
                details: gamError.details,
                response: gamError.response?.data
              })
              const gamStatusCode = gamError?.statusCode || gamError?.response?.status || null
              const gamDetailMessage =
                gamError?.details?.error?.message ||
                gamError?.response?.data?.error?.message ||
                gamError?.response?.data?.message ||
                gamError?.message ||
                'Error desconocido en integración GAM'

              const isGamRegisterEndpointMissing =
                gamStatusCode === 404 ||
                /not found/i.test(String(gamDetailMessage || ''))

              // ABORTAR registro local ante cualquier error de GAM
              return res.status(400).json({
                error: 'ERROR_AUTENTICACION',
                message: isGamRegisterEndpointMissing
                  ? 'No pudimos crear tu cuenta: el servicio de registro GAM no está disponible en este entorno.'
                  : 'No pudimos crear tu cuenta. Verificá tus datos.',
                code: 'GAM_REGISTRATION_FAILED',
                statusCode: gamStatusCode,
                detalle: gamDetailMessage
              })
            }
          } else {
            console.log('⚠️ GAM deshabilitado por parámetro, usando registro local')
          }
          
          // 4. Guardar en base de datos PostgreSQL
          // Si tenemos nuusuid de GAM, usarlo; sino generar uno nuevo (legacy)
          nuusuid = await saveToNuusuari(
            { cuil, dni, nroAfiliado, fechaNacimiento, sexo, email, telefono: req.body.telefono },
            resultadoParsed,
            nuusuid  // Pasar nuusuid de GAM si existe
          )
          console.log('✅ Registro guardado en base de datos PostgreSQL con ID:', nuusuid)
          
          // 5. Guardar contraseña hasheada en nuusuauth (solo para usuarios legacy o backup)
          // NOTA: Usuarios GAM NO necesitan contraseña local, pero la guardamos como backup
          if (password && nuusuid) {
            const passwordHash = hashPassword(String(password))
            try {
              await db.query(
                'INSERT INTO nuusuauth (nuusuid, nuusupass) VALUES ($1, $2)',
                [nuusuid, passwordHash]
              )
              console.log('✅ Contraseña guardada en nuusuauth')
            } catch (authError) {
              // Si ya existe, actualizar
              if (authError.code === '23505') {
                await db.query(
                  'UPDATE nuusuauth SET nuusupass = $2 WHERE nuusuid = $1',
                  [nuusuid, passwordHash]
                )
                console.log('✅ Contraseña actualizada en nuusuauth')
              } else {
                throw authError
              }
            }
          }
          
          // 6. Guardar datos de GAM en nuusuari si existen
          if (gamUserData && gamUserData.access_token) {
            try {
              // NOTA: nuusuid ya contiene el UserID de GAM, solo actualizamos token y expiración
              await db.query(
                'UPDATE nuusuari SET nuusugamtok = $1, nuusugamexp = $2 WHERE nuusuid = $3',
                [
                  gamUserData.access_token,
                  new Date(Date.now() + (gamUserData.expires_in || 3600) * 1000),
                  nuusuid
                ]
              )
              console.log('✅ Token GAM guardado en nuusuari')
            } catch (gamTokenError) {
              console.error('⚠️ Error al guardar token GAM:', gamTokenError.message)
              // No fallar el registro por esto
            }
          }
          
        } catch (dbError) {
          console.error('⚠️ Error al guardar en PostgreSQL (registro SOAP exitoso):', dbError.message)
          // No fallar el registro si la DB falla, pero loguear el error
        }
        
        // SINCRONIZAR CREDENCIALES inmediatamente después del registro
        let credenciales = []
        if (nuusuid && afiliadoId && USE_SOAP && soapClient) {
          console.log('🎫 Sincronizando credenciales del grupo familiar...')
          try {
            const syncResult = await syncCredencialesGrupoFamiliar(nuusuid, afiliadoId)
            if (syncResult.success) {
              credenciales = syncResult.credenciales || []
              console.log(`✅ Credenciales sincronizadas: ${credenciales.length} credenciales`)
            } else {
              console.warn('⚠️ Sincronización de credenciales falló:', syncResult.error)
            }
          } catch (syncError) {
            console.error('❌ Error al sincronizar credenciales:', syncError.message)
          }
        } else {
          console.log('⚠️ No se sincronizaron credenciales (SOAP no disponible o datos incompletos)')
        }
        
        // Construir respuesta completa con todos los datos requeridos
        const responseData = {
          userKey,
          nuusuid,
          afiliadoId,
          credenciales: credenciales.length,
          // Datos del afiliado desde SOAP
          apellido: resultadoParsed.Apellido || null,
          nombre: resultadoParsed.Nombre || null,
          apellidoNombre: resultadoParsed.Apellido && resultadoParsed.Nombre 
            ? `${resultadoParsed.Apellido}, ${resultadoParsed.Nombre}` 
            : (resultadoParsed.Apellido || resultadoParsed.Nombre || null),
          planId: resultadoParsed.PlanId || null,
          planDescripcion: resultadoParsed.PlanDescripcion || null,
          esTitular: resultadoParsed.EsTitular || null,
          afiliadoNro: resultadoParsed.AfiliadoNro || null,
          // Datos de GAM (si se integró exitosamente)
          gam: gamUserData ? {
            userId: gamUserData.userId || gamUserData.UserGUID,
            registered: !userExistsInGAM,
            hasToken: !!gamUserData.access_token
          } : null,
          // Respuesta completa para debugging
          resultado: resultadoParsed
        }
        
        return res.json({ 
          success: true, 
          message: 'Usuario registrado (SOAP)', 
          data: responseData, 
          intentos: variantes.length 
        })
      } catch (soapError) {
        console.error('Error SOAP REGISTRACION:', soapError)
        if (res.headersSent) return;
        return res.status(502).json({ 
          error: 'Error al registrar en el servicio de la obra social',
          message: 'No se pudo completar el registro. Intentá nuevamente.'
        })
      }
    } else {
      // Modo mock o sin SOAP: registro local y persistente con contraseña hasheada
      const userKey = cuil || dni || nroAfiliado

      if (registeredUsers.has(userKey)) {
        return res.status(409).json({ error: 'El usuario ya existe' })
      }

      const passwordHash = hashPassword(String(password))
      const userObj = {
        cuil: cuil || null,
        dni: dni || null,
        nroAfiliado: nroAfiliado || null,
        fechaNacimiento,
        sexo,
        cantidadIntegrantes,
        email: email || null,
        passwordHash,
        registeredAt: new Date().toISOString()
      }

      registeredUsers.set(userKey, userObj)
      saveUsersToFile()

      return res.json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: { userKey, email }
      })
    }
  } catch (error) {
    console.error('Error en /register:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  }
})

// ===== AUTENTICACIÓN =====
// POST /auth/login - Login de usuario registrado
app.post(
  '/auth/login',
  rateLimiters.authLogin,
  validateBody(
    z.object({
      username: z.string().min(1),
      password: z.string().min(1)
    })
  ),
  async (req, res) => {
  console.log('🔐 Solicitud de login recibida')
  console.log('Body:', req.body)
  try {
    const { username, password } = req.body
    const gamEnabledForAuth = Boolean(config?.gam?.enabled) && await gamService.isGAMEnabled({ forceRefresh: true })
    console.log(`🔐 Login con GAM ${gamEnabledForAuth ? 'HABILITADO' : 'DESHABILITADO'} (flag dinámico)`)

    if (!username || !password) {
      console.log('⚠️ Faltan credenciales')
      return sendLegacyValidationError(res, 'Usuario y contraseña requeridos', 'username')
    }
    console.log('✅ Credenciales presentes, buscando usuario...')

    // PRIMERO: Buscar usuario en base de datos PostgreSQL
    let dbUser = null
    let passwordHash = null
    
    try {
      const found = await userRepository.findForLogin(username)

      if (found) {
        dbUser = {
          nuusuid: found.nuusuid,
          nuusuafili: found.nuusuafili,
          nuusuapell: found.nuusuapell,
          nuusumail: found.nuusumail,
          nuusunroaf: found.nuusunroaf,
          nuusubajaf: found.nuusubajaf,
          nuusupass: found.nuusuauth?.nuusupass || null,
          nurolid: found.nurolid ?? null
        }
        
        // PUNTO 4: Verificar si el usuario está desactivado
        // Consideramos desactivado solo si nuusubajaf es una fecha real (no '0001-01-01' ni NULL)
        const fechaBaja = dbUser.nuusubajaf ? new Date(dbUser.nuusubajaf) : null
        const estaDesactivado = fechaBaja && fechaBaja.getFullYear() > 1900
        
        if (estaDesactivado) {
          console.log('❌ Usuario desactivado:', dbUser.nuusumail)
          return res.status(403).json({
            error: 'Cuenta desactivada',
            code: 'ACCOUNT_DEACTIVATED',
            message: 'Su cuenta ha sido desactivada y no puede iniciar sesión.',
            fecha_desactivacion: dbUser.nuusubajaf,
            motivo: 'Cuenta desactivada'
          })
        }
        
        passwordHash = dbUser.nuusupass
        console.log(`✅ Usuario encontrado en BD:`, dbUser.nuusumail || dbUser.nuusunroaf)
        console.log(`Password hash disponible:`, !!passwordHash)
      } else {
        console.log('⚠️ Usuario NO encontrado en BD')
      }
    } catch (dbError) {
      console.error('⚠️ Error buscando usuario en BD:', dbError.message)
    }
    
    // FALLBACK: Si no se encuentra en BD, buscar en registeredUsers Map
    if (!dbUser) {
      let userKey = null
      let userData = null
      
      // Búsqueda directa por key (CUIL/DNI/NroAfiliado)
      if (registeredUsers.has(username)) {
        userKey = username
        userData = registeredUsers.get(username)
      } else {
        // Búsqueda por email, DNI o CUIL
        for (const [key, user] of registeredUsers.entries()) {
          const matchEmail = user.email && user.email.toLowerCase() === username.toLowerCase()
          const matchDni = user.dni && String(user.dni) === String(username)
          const matchCuil = user.cuil && String(user.cuil) === String(username)
          
          if (matchEmail || matchDni || matchCuil) {
            userKey = key
            userData = user
            break
          }
        }
      }

      if (!userData) {
        console.log('⚠️ Usuario no encontrado en BD local ni en Map')
        if (!gamEnabledForAuth) {
          return res.status(401).json({ error: 'Usuario no encontrado. Debes registrarte primero.' })
        }
        console.log('🔍 Intentando login directo en GAM...')
        
        // FALLBACK FINAL: Intentar login directo en GAM
        try {
          const gamLogin = await gamService.loginGAM(username, String(password))
          
          if (gamLogin && gamLogin.access_token) {
            console.log('✅ Login GAM exitoso - Usuario existe solo en GAM')
            
            // Obtener info del usuario de GAM
            const userInfo = await gamService.getUserInfo(gamLogin.access_token)
            
            if (userInfo && (userInfo.GUID || userInfo.Id || userInfo.id)) {
              const gamUserId = userInfo.GUID || userInfo.Id || userInfo.id
              console.log('✅ UserInfo obtenido de GAM:', userInfo.Email, '| GUID:', gamUserId)
              
              // Normalizar userInfo.Id para que el resto del bloque use gamUserId
              userInfo.Id = gamUserId
              
              const gamNroAfiliado = userInfo.NroAfiliado || null
              const gamSexo = normalizeSexo(userInfo.Sexo || userInfo.Gender || userInfo.sex)
              const gamEsTitular = normalizeEsTitular(userInfo.EsTitular || userInfo.IsTitular)
              const gamPlanId = await ensurePlanExists(userInfo.PlanId || userInfo.planId, userInfo.Plan || userInfo.PlanDescripcion || '')

              // Crear/actualizar entrada en BD local con nuusuafili si está disponible
              try {
                await db.query(
                  `INSERT INTO nuusuari (
                    nuusuid, nuusumail, nuusunroaf, nuusuapell, nuusubajaf, nuusufecha,
                    nuusuafili, nuusugamtok, nuusugamexp, nuususexo, nuplaid, nuusuestit
                  ) VALUES ($1, $2, $3, $4, NULL, NOW(), $5, $6, NOW() + INTERVAL '1 hour', $7, $8, $9)
                  ON CONFLICT (nuusuid) DO UPDATE SET
                    nuusuapell  = EXCLUDED.nuusuapell,
                    nuusugamtok = EXCLUDED.nuusugamtok,
                    nuusugamexp = EXCLUDED.nuusugamexp,
                    nuusuafili  = COALESCE(EXCLUDED.nuusuafili, nuusuari.nuusuafili),
                    nuususexo   = COALESCE(EXCLUDED.nuususexo, nuusuari.nuususexo),
                    nuplaid     = COALESCE(EXCLUDED.nuplaid, nuusuari.nuplaid),
                    nuusuestit  = COALESCE(EXCLUDED.nuusuestit, nuusuari.nuusuestit)`,
                  [
                    userInfo.Id,
                    userInfo.Email || username,
                    gamNroAfiliado || username,
                    userInfo.Name ||
                      `${userInfo.FirstName || ''} ${userInfo.LastName || ''}`.trim() ||
                      userInfo.Email?.split('@')[0] || 'Usuario GAM',
                    gamNroAfiliado,
                    gamLogin.access_token,
                    gamSexo,
                    gamPlanId,
                    gamEsTitular
                  ]
                )
                console.log('✅ Usuario GAM sincronizado en BD local (con nuusuafili:', gamNroAfiliado, ')')
              } catch (syncError) {
                console.warn('⚠️ Error sincronizando usuario GAM en BD:', syncError.message)
              }

              // Registrar sesión en Map para que requireAuth no necesite consultar GAM
              const gamSessionPayload = {
                nuusuid: userInfo.Id,
                username: userInfo.Email || username,
                loginAt: new Date().toISOString(),
                afiliadoId: gamNroAfiliado || ''
              }
              sessions.set(gamLogin.access_token, gamSessionPayload)
              console.log('🔑 Sesión GAM registrada en sessions Map')

              // Sincronizar credenciales via SOAP si tenemos AfiliadoId y SOAP disponible
              let credenciales = []
              let syncStats = null
              if (USE_SOAP && soapClient && gamNroAfiliado) {
                try {
                  console.log('🚀 [GAM fallback] Iniciando sync credenciales SOAP...')
                  const syncResult = await syncCredencialesGrupoFamiliar(userInfo.Id, gamNroAfiliado)
                  credenciales = syncResult.credenciales || []
                  syncStats = syncResult.sync || null
                  console.log(`✅ [GAM fallback] Credenciales sincronizadas: ${credenciales.length}`)
                } catch (soapErr) {
                  console.warn('⚠️ [GAM fallback] Error sync SOAP (continuando):', soapErr.message)
                  // Intentar cargar desde BD si había registros previos
                  try {
                    const localCreds = await db.query(
                      `SELECT c.*, cu.crcrepropi FROM crcreden c
                       INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
                       WHERE cu.nuusuid = $1 ORDER BY cu.crcrepropi DESC, c.crcreapeno`,
                      [userInfo.Id]
                    )
                    credenciales = localCreds.rows
                  } catch {}
                }

                // Adjuntar token temporal a credenciales
                if (credenciales.length > 0) {
                  try {
                    const tokenSvc = require('./tokenService')
                    const now = new Date()
                    const toutMin = await tokenSvc.getTimeoutMinutes()
                    await Promise.all(credenciales.map(async (c) => {
                      const afId = c.crcreafili || c.AfiliadoId || ''
                      c.tokenTemporal = await tokenSvc.generateTokenFor(afId, now)
                      c.tokenTemporalGeneradoEn = now.toISOString()
                      c.tokenTemporalVenceEn = new Date(now.getTime() + toutMin * 60 * 1000).toISOString()
                    }))
                  } catch (e) {
                    console.warn('⚠️ No se pudo adjuntar token temporal (GAM fallback):', e.message)
                  }
                }
              }
              
              // Token timeout desde parámetro
              let tokenTimeout = 10
              try {
                const tokenSvc = require('./tokenService')
                tokenTimeout = await tokenSvc.getTimeoutMinutes()
              } catch {}

              // Construir respuesta de login con token GAM (igual a la ruta principal)
              return res.json({
                token: gamLogin.access_token,
                user: {
                  username: userInfo.Email || username,
                  email: userInfo.Email,
                  nombre: userInfo.Name ||
                    `${userInfo.FirstName || ''} ${userInfo.LastName || ''}`.trim() ||
                    userInfo.Email?.split('@')[0] || null,
                  afiliadoId: gamNroAfiliado || ''
                },
                credenciales,
                sync: syncStats,
                tokenTimeout,
                authType: 'GAM',
                message: 'Login exitoso con GAM - Usuario sincronizado'
              })
            }
          }
        } catch (gamError) {
          console.error('❌ Error intentando login GAM:', gamError.message)
        }
        
        return res.status(401).json({ error: 'Usuario no encontrado. Debes registrarte primero.' })
      }

      // Verificar contraseña desde registeredUsers Map
      if (!userData.passwordHash || !verifyPassword(String(password), userData.passwordHash)) {
        return res.status(401).json({ error: 'Contraseña incorrecta' })
      }
      
      // Construir dbUser desde registeredUsers para continuar flujo
      dbUser = {
        nuusuid: null,  // No tiene ID en BD aún
        nuusuafili: userData.afiliadoId || '',
        nuusuapell: '',
        nuusumail: userData.email || '',
        nuusunroaf: userData.nroAfiliado || userData.cuil || userData.dni || ''
      }

      // Migrar usuario legacy (Map) → BD via GAM para obtener GUID real y habilitar SOAP sync
      if (dbUser.nuusumail && gamEnabledForAuth) {
        console.log('🔄 Intentando migrar usuario Map → BD via GAM...')
        try {
          const mapGamLogin = await gamService.loginGAM(dbUser.nuusumail, String(password))
          if (mapGamLogin && mapGamLogin.access_token) {
            const mapUserInfo = await gamService.getUserInfo(mapGamLogin.access_token)
            const mapGuid = mapUserInfo?.GUID || mapUserInfo?.Id || mapUserInfo?.id
            if (mapGuid) {
              const mapApell = mapUserInfo.Name ||
                `${mapUserInfo.FirstName || ''} ${mapUserInfo.LastName || ''}`.trim() ||
                dbUser.nuusumail.split('@')[0]
              const mapSexo = normalizeSexo(mapUserInfo?.Sexo || mapUserInfo?.Gender || mapUserInfo?.sex || userData?.sexo)
              const mapEsTitular = normalizeEsTitular(mapUserInfo?.EsTitular || mapUserInfo?.IsTitular)
              const mapPlanId = await ensurePlanExists(mapUserInfo?.PlanId || mapUserInfo?.planId, mapUserInfo?.Plan || mapUserInfo?.PlanDescripcion || '')
              // Insertar/actualizar en BD con el GUID de GAM
              await db.query(
                `INSERT INTO nuusuari (nuusuid, nuusumail, nuusunroaf, nuusuapell, nuusubajaf, nuusufecha, nuusuafili, nuusugamtok, nuusugamexp, nuususexo, nuplaid, nuusuestit)
                 VALUES ($1, $2, $3, $4, NULL, NOW(), $5, $6, NOW() + INTERVAL '1 hour', $7, $8, $9)
                 ON CONFLICT (nuusuid) DO UPDATE SET
                   nuusuapell  = EXCLUDED.nuusuapell,
                   nuusugamtok = EXCLUDED.nuusugamtok,
                   nuusugamexp = EXCLUDED.nuusugamexp,
                   nuusuafili  = COALESCE(EXCLUDED.nuusuafili, nuusuari.nuusuafili),
                   nuususexo   = COALESCE(EXCLUDED.nuususexo, nuusuari.nuususexo),
                   nuplaid     = COALESCE(EXCLUDED.nuplaid, nuusuari.nuplaid),
                   nuusuestit  = COALESCE(EXCLUDED.nuusuestit, nuusuari.nuusuestit)`,
                [mapGuid, dbUser.nuusumail, dbUser.nuusunroaf || '', mapApell,
                 dbUser.nuusuafili || null, mapGamLogin.access_token, mapSexo, mapPlanId, mapEsTitular]
              )
              dbUser.nuusuid  = mapGuid
              dbUser.nuusuapell = mapApell
              console.log('✅ Usuario Map migrado a BD con GUID:', mapGuid.substring(0, 8) + '...')
            }
          }
        } catch (mapMigErr) {
          console.warn('⚠️ No se pudo migrar usuario Map a BD via GAM:', mapMigErr.message)
        }
      }
    } else {
      // Usuario encontrado en BD - verificar contraseña
      console.log('🔐 Verificando contraseña...')
      
      if (!passwordHash) {
        console.log('⚠️ No hay hash de contraseña en la BD local')
        
        // Verificar si es usuario GAM (GUID)
        const isGAMUser = dbUser.nuusuid && !/^\d+$/.test(dbUser.nuusuid)
        
        if (isGAMUser && dbUser.nuusumail && gamEnabledForAuth) {
          console.log('🔐 Usuario GAM sin password local - intentando login GAM...')
          try {
            const gamLogin = await gamService.loginGAM(dbUser.nuusumail, String(password))
            
            if (gamLogin && gamLogin.access_token) {
              console.log('✅ Login GAM exitoso')
              
              // VALIDACIÓN CRÍTICA: Verificar credenciales SOAP antes de guardar hash
              if (USE_SOAP && soapClient && dbUser.nuusuafili) {
                console.log('🔍 Validando afiliación en SOAP antes de guardar credenciales...')
                try {
                  // Intentar obtener credenciales del grupo familiar (incluir campos para que SOAP devuelva datos)
                  const soapValidation = await callSoapExecutePlain('APPDATOSCREDENCIALES', {
                    AfiliadoId: dbUser.nuusuafili,
                    CredencialDatos: [
                      { Nombre: "|NOMBRE Y APELLIDO|" },
                      { Nombre: "|NUMERO DE AFILIADO|" },
                      { Nombre: "|PARENTESCO|" },
                      { Nombre: "|DOCUMENTO|" },
                      { Nombre: "|FECHA DE NACIMIENTO|" },
                      { Nombre: "|CUIL|" },
                      { Nombre: "|SEXO|" },
                      { Nombre: "|PLAN|" },
                      { Nombre: "|FECHA VIGENCIA|" },
                      { Nombre: "|LINEA|" }
                    ]
                  })
                  
                  // Parsear respuesta SOAP
                  const soapResult = soapValidation?.BE_WSResult?.Resultado
                  let credencialesSOAP = []
                  
                  if (typeof soapResult === 'string') {
                    try {
                      credencialesSOAP = JSON.parse(soapResult)
                    } catch (e) {
                      console.error('❌ Error parseando respuesta SOAP:', e.message)
                    }
                  }
                  
                  // Verificar si hay credenciales válidas
                  if (!credencialesSOAP || credencialesSOAP.length === 0) {
                    console.log('⚠️  No se encontraron credenciales en SOAP')
                    
                    // Verificar mensajes de error específicos
                    const mensajes = soapValidation?.BE_WSResult?.Mensajes || []
                    console.log('📨 Mensajes SOAP:', JSON.stringify(mensajes))
                    
                    const tieneErrorAfiliado = mensajes.some(m => 
                      m.Description && m.Description.includes('No existe el Afiliado')
                    )
                    
                    if (tieneErrorAfiliado) {
                      console.log('❌ RECHAZANDO: Afiliado no existe en SOAP')
                      return res.status(403).json({ 
                        error: 'Afiliación no encontrada',
                        code: 'AFILIACION_NO_VIGENTE',
                        message: 'Su número de afiliado no se encuentra vigente en el sistema. Por favor, contacte con OSEP para verificar su situación.',
                        details: 'El número de afiliado asociado a su usuario no existe en el padrón de beneficiarios.'
                      })
                    } else {
                      // Si no hay error explícito de "no existe", permitir login sin credenciales
                      // (el usuario podrá autenticarse pero no tendrá credenciales para mostrar)
                      console.log('⚠️  Usuario sin credenciales pero NO hay error de afiliado inexistente - permitiendo login')
                      console.log('   El usuario podrá hacer login pero no tendrá credenciales para mostrar en la app')
                      // NO retornar error 403, continuar con el login
                    }
                  }
                  
                  console.log(`✅ Validación SOAP exitosa: ${credencialesSOAP.length} credenciales encontradas`)
                } catch (soapError) {
                  console.error('❌ Error validando afiliación en SOAP:', soapError.message)
                  return res.status(503).json({ 
                    error: 'Error verificando afiliación',
                    code: 'SOAP_ERROR',
                    message: 'No se pudo verificar su afiliación en este momento. Por favor, intente nuevamente más tarde.'
                  })
                }
              }
              
              // Si llegamos aquí, la validación SOAP fue exitosa (o SOAP no está activo)
              // Ahora SÍ guardar hash de contraseña en nuusuauth
              console.log('💾 Guardando hash local para futuros logins...')
              const crypto = require('crypto')
              const salt = crypto.randomBytes(16).toString('hex')
              const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
              passwordHash = `${salt}:${hash}`
              
              await db.pool.query(
                `INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
                 VALUES ($1, $2, NOW(), NOW())
                 ON CONFLICT (nuusuid) DO UPDATE SET
                   nuusupass = EXCLUDED.nuusupass,
                   nuusuultm = NOW()`,
                [dbUser.nuusuid, passwordHash]
              )
              
              console.log('✅ Password guardado en nuusuauth')
              // Continuar con el flujo normal (passwordHash ya está seteado)
            } else {
              console.log('❌ Login GAM falló')
              return res.status(401).json({ error: 'Credenciales inválidas' })
            }
          } catch (gamError) {
            console.error('❌ Error en login GAM:', gamError.message)
            return res.status(401).json({ 
              error: 'Error de autenticación',
              message: 'No pudimos verificar tu cuenta. Intentá nuevamente.'
            })
          }
        } else {
          if (isGAMUser && !gamEnabledForAuth) {
            return res.status(401).json({
              error: 'Contraseña no configurada para este usuario',
              message: 'GAM está deshabilitado y el usuario no tiene credenciales locales.'
            })
          }
          console.log('❌ Usuario legacy sin password configurado')
          return res.status(401).json({ error: 'Contraseña no configurada para este usuario' })
        }
      } else {
        // Hay passwordHash - verificar normalmente
        const passwordValid = verifyPassword(String(password), passwordHash)
        console.log('Password válida:', passwordValid)
        
        if (!passwordValid) {
          console.log('❌ Contraseña incorrecta')
          return res.status(401).json({ error: 'Contraseña incorrecta' })
        }
        console.log('✅ Contraseña verificada correctamente')
      }
    }

    // Si el usuario tiene UUID (es usuario GAM), intentar obtener token GAM
    const isGAMUser = dbUser.nuusuid && !/^\d+$/.test(dbUser.nuusuid)
    let gamAccessToken = null
    let gamRefreshToken = null
    let gamAuthWarning = null
    
    if (isGAMUser && gamEnabledForAuth) {
      console.log('🔐 Usuario GAM detectado - obteniendo token GAM para manejo de sesión...')
      try {
        const gamLogin = await gamService.loginGAM(
          dbUser.nuusumail || username,
          String(password)
        )

        if (gamLogin && gamLogin.access_token) {
          console.log('✅ Token GAM obtenido - sesión manejada por GAM')
          gamAccessToken = gamLogin.access_token
          gamRefreshToken = gamLogin.refresh_token || null
          
          // Guardar token y refresh_token en BD para referencia
          await db.pool.query(
            `UPDATE nuusuari 
             SET nuusugamtok = $1,
                 nuusugamexp = NOW() + INTERVAL '1 hour',
                 nuusugamrefresh = $2
             WHERE nuusuid = $3`,
            [gamAccessToken, gamRefreshToken, dbUser.nuusuid]
          )
          
          console.log('✅ Token GAM guardado en BD')
        } else {
          console.error('❌ No se pudo obtener token GAM - login fallido')
          gamAuthWarning = 'No se pudo autenticar con GAM; se utilizará sesión local.'
        }
      } catch (gamError) {
        console.error('❌ Error obteniendo token GAM:', gamError.message)
        gamAuthWarning = `Error autenticando con GAM; se utilizará sesión local. (${gamError.message})`
      }
    }

    const sessionMetadata = buildSessionMetadata(req)

    // Login exitoso: crear token según tipo de usuario
    console.log('✅ Login exitoso, creando sesión...')
    // Si es usuario GAM pero no se pudo obtener token GAM, hacemos fallback a token local
    const useLocalToken = !gamAccessToken
    let token = (isGAMUser && !useLocalToken) ? gamAccessToken : null
    let refreshToken = (isGAMUser && !useLocalToken) ? (gamRefreshToken || null) : null
    const afiliadoIdToUse = dbUser.nuusuafili || ''
    
    // Crear sesión local para usuarios legacy o GAM-fallback
    if (!isGAMUser || useLocalToken) {
      const sessionPayload = {
        nuusuid: dbUser.nuusuid || 'test_' + (dbUser.nuusumail || dbUser.nuusunroaf),
        username: dbUser.nuusumail || dbUser.nuusunroaf,
        loginAt: new Date().toISOString(),
        afiliadoId: afiliadoIdToUse,
        nurolid: dbUser.nurolid ?? null,
        sessionId: sessionMetadata.sessionId,
        authType: !isGAMUser ? 'LOCAL' : 'GAM_FALLBACK',
      }

      token = issueLocalJwt(sessionPayload) || generateToken()
      refreshToken = issueRefreshToken(sessionPayload, sessionMetadata, { authType: sessionPayload.authType })
      sessions.set(token, { ...sessionPayload, refreshToken, sessionMetadata })
      updateRefreshSession(refreshToken, { currentAccessToken: token })
      console.log('📝 Sesión local creada:', {
        user: dbUser.nuusumail || dbUser.nuusunroaf,
        reason: !isGAMUser ? 'LEGACY' : 'GAM_FALLBACK'
      })
    } else {
      // Usuario GAM con token GAM válido: registrar en sessions Map para que
      // requireAuth no tenga que validar contra GAM en cada request (mejora rendimiento
      // y evita 401 por tokens aún válidos en GAM pero no en sessions local)
      const gamSessionPayload = {
        nuusuid: dbUser.nuusuid,
        username: dbUser.nuusumail || dbUser.nuusunroaf,
        loginAt: new Date().toISOString(),
        afiliadoId: afiliadoIdToUse,
        sessionId: sessionMetadata.sessionId,
        authType: 'GAM',
      }
      if (gamRefreshToken) {
        issueRefreshToken(gamSessionPayload, sessionMetadata, {
          authType: 'GAM',
          sourceRefreshToken: gamRefreshToken,
          currentAccessToken: gamAccessToken,
        })
      }
      sessions.set(gamAccessToken, { ...gamSessionPayload, refreshToken: gamRefreshToken, sessionMetadata })
      console.log('🔐 Sesión GAM registrada en sessions Map:', {
        user: dbUser.nuusumail,
        token: gamAccessToken.substring(0, 30) + '...'
      })
    }

    // Preparar variables para sincronización
    let credenciales = []
    let syncStats = null
    let soapMensajes = null
    let afiliadoIdUsadoSync = null
    let credencialesInfo = null
    
    console.log('🔍 Verificando sincronización de credenciales...')
    console.log('  - Usuario:', dbUser.nuusumail)
    console.log('  - NuUsuId:', dbUser.nuusuid)
    console.log('  - AfiliadoId:', afiliadoIdToUse || 'NO DISPONIBLE')
    console.log('  - USE_SOAP:', USE_SOAP)
    console.log('  - soapClient:', soapClient ? 'CONECTADO' : 'NO CONECTADO')
    
    try {
      // Si tenemos nuusuid de BD, proceder a sincronizar credenciales
      if (dbUser.nuusuid) {
        console.log('👤 Usuario autenticado con ID:', dbUser.nuusuid)
        console.log('  - nuusuafili en BD:', dbUser.nuusuafili)
        
        // Sincronizar credenciales del grupo familiar si hay SOAP y AfiliadoId
        if (USE_SOAP && soapClient && afiliadoIdToUse) {
          try {
            console.log('🚀 Iniciando sincronización de credenciales...')
            const syncResult = await syncCredencialesGrupoFamiliar(
              dbUser.nuusuid,
              afiliadoIdToUse
            )
            credenciales = syncResult.credenciales
            syncStats = syncResult.sync
            soapMensajes = syncResult.soapMensajes || null
            afiliadoIdUsadoSync = syncResult.afiliadoIdUsado || null
            credencialesInfo = syncResult.credencialesInfo || null
            console.log(`✅ Credenciales sincronizadas: ${syncStats.total} total (${syncStats.inserted} nuevas, ${syncStats.updated} actualizadas)`)
            
            // VALIDACIÓN CRÍTICA: Si no hay credenciales y hay error de SOAP, rechazar login
            if (credenciales.length === 0 && credencialesInfo) {
              console.log('⚠️  No se obtuvieron credenciales - validando motivo...')
              
              if (credencialesInfo.code === 'AFILIADO_NO_EXISTE') {
                console.log('❌ RECHAZANDO LOGIN: Afiliado no existe en SOAP')
                
                // Eliminar nuusuauth si se creó en este login
                try {
                  await db.pool.query(
                    'DELETE FROM nuusuauth WHERE nuusuid = $1 AND nuusucrea >= NOW() - INTERVAL \'1 minute\'',
                    [dbUser.nuusuid]
                  )
                  console.log('🗑️  nuusuauth recién creado fue eliminado (rollback)')
                } catch (delError) {
                  console.warn('⚠️  No se pudo eliminar nuusuauth:', delError.message)
                }
                
                return res.status(403).json({
                  error: 'Afiliación no vigente',
                  code: 'AFILIACION_NO_VIGENTE',
                  message: 'Su número de afiliado no se encuentra vigente en el sistema. Por favor, contacte con OSEP para verificar su situación.',
                  details: credencialesInfo.message || 'El número de afiliado asociado a su usuario no existe en el padrón de beneficiarios.',
                  afiliadoId: afiliadoIdToUse
                })
              } else if (credencialesInfo.code) {
                console.log(`⚠️  Sin credenciales pero continuando login (code: ${credencialesInfo.code})`)
              }
            }
          } catch (syncError) {
            console.error('⚠️  Error sincronizando credenciales desde SOAP (continuando login):', syncError.message)
            console.error('Stack trace:', syncError.stack)
            
            // Fallback: cargar credenciales existentes de BD local si falla SOAP
            try {
              console.log('🔄 Intentando cargar credenciales desde BD local...')
              const localCreds = await db.query(
                `SELECT c.*, cu.crcrepropi
                 FROM crcreden c
                 INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
                 WHERE cu.nuusuid = $1
                 ORDER BY cu.crcrepropi DESC, c.crcreapeno`,
                [dbUser.nuusuid]
              )
              
              if (localCreds.rows.length > 0) {
                credenciales = localCreds.rows
                console.log(`✅ ${localCreds.rows.length} credenciales cargadas desde BD local`)
              } else {
                console.warn('⚠️  No hay credenciales en BD local')
              }
            } catch (localError) {
              console.error('❌ Error cargando credenciales locales:', localError.message)
            }
          }
        } else {
          const reasons = []
          if (!USE_SOAP) reasons.push('SOAP desactivado')
          if (!soapClient) reasons.push('Cliente SOAP no conectado')
          if (!afiliadoIdToUse) reasons.push('Sin AfiliadoId')
          console.log(`ℹ️  Sincronización de credenciales omitida: ${reasons.join(', ')}`)
          
          // Sin SOAP: cargar credenciales existentes de BD local
          try {
            console.log('🔄 Cargando credenciales desde BD local (SOAP desactivado)...')
            const localCreds = await db.query(
              `SELECT c.*, cu.crcrepropi
               FROM crcreden c
               INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
               WHERE cu.nuusuid = $1
               ORDER BY cu.crcrepropi DESC, c.crcreapeno`,
              [dbUser.nuusuid]
            )
            
            if (localCreds.rows.length > 0) {
              credenciales = localCreds.rows
              console.log(`✅ ${localCreds.rows.length} credenciales cargadas desde BD local`)
            }
          } catch (localError) {
            console.error('❌ Error cargando credenciales locales:', localError.message)
          }
        }
      } else {
        console.warn('⚠️  Usuario no encontrado en tabla nuusuari (usando solo registeredUsers Map)')
      }
    } catch (dbError) {
      console.error('⚠️  Error consultando BD durante login:', dbError.message)
      console.error('Stack trace:', dbError.stack)
      // No fallar el login si hay error de BD
    }

    // Adjuntar descripción de plan a cada credencial
    try {
      await attachPlanDescriptionsToCredenciales(credenciales)
    } catch (e) {
      console.warn('⚠️  No se pudo adjuntar descripción de plan en login:', e.message)
    }

    // Adjuntar layout efectivo (general/por plan) a cada credencial del login
    // Esto es necesario para que el caché offline tenga la tipografía e imagen correcta del plan
    try {
      await Promise.all((credenciales || []).map(async (c) => {
        const planId = c.crcreplaid ? String(c.crcreplaid).trim() : ''
        const layoutData = await getCredencialLayoutForPlan(planId)
        c.credencialLayout = layoutData.effectiveConfig
        c.credencialLayoutSource = layoutData.source
      }))
      console.log(`🎨 Layout de credenciales adjuntado para ${credenciales?.length || 0} credenciales`)
    } catch (e) {
      console.warn('⚠️  No se pudo adjuntar layout de credenciales en login:', e.message)
    }

    // Adjuntar token temporal a cada credencial del grupo ANTES de enviar respuesta
    let timeoutMinutes = 10 // default
    try {
      const tokenService = require('./tokenService')
      const now = new Date()
      timeoutMinutes = await tokenService.getTimeoutMinutes()
      await Promise.all((credenciales || []).map(async (c) => {
        const afiliadoForToken = c.crcreafili || c.AfiliadoId || afiliadoIdToUse || dbUser.nuusuafili || ''
        c.tokenTemporal = await tokenService.generateTokenFor(afiliadoForToken, now)
        c.tokenTemporalGeneradoEn = now.toISOString()
        c.tokenTemporalVenceEn = new Date(now.getTime() + timeoutMinutes * 60 * 1000).toISOString()
      }))
      console.log(`🎫 Tokens temporales generados para ${credenciales?.length || 0} credenciales (timeout: ${timeoutMinutes} min)`)
    } catch (e) {
      console.warn('⚠️  No se pudo adjuntar token a credenciales en login:', e.message)
    }

    // Refrescar nombre desde BD por si la sincronización SOAP actualizó nuusuapell
    try {
      if (dbUser.nuusuid) {
        const nameRefresh = await db.pool.query(
          'SELECT nuusuapell FROM nuusuari WHERE nuusuid = $1',
          [dbUser.nuusuid]
        )
        if (nameRefresh.rows.length > 0 && nameRefresh.rows[0].nuusuapell) {
          dbUser.nuusuapell = nameRefresh.rows[0].nuusuapell
        }
      }
    } catch (nameRefreshErr) {
      console.warn('⚠️  No se pudo refrescar nuusuapell desde BD:', nameRefreshErr.message)
    }
    
    return res.json({ 
      token, 
      refresh_token: refreshToken,
      expires_in: (!isGAMUser || useLocalToken) ? 8 * 60 * 60 : null,
      authType: (!isGAMUser || useLocalToken) ? 'LOCAL' : 'GAM',
      warning: gamAuthWarning,
      credencialesInfo,
      user: { 
        username: dbUser.nuusumail || dbUser.nuusunroaf,
        email: dbUser.nuusumail,
        nombre: dbUser.nuusuapell || null,
        afiliadoId: afiliadoIdToUse
      },
      credenciales: credenciales || [],
      session: {
        sessionId: sessionMetadata.sessionId,
        deviceId: sessionMetadata.deviceId,
        platform: sessionMetadata.platform,
        appVersion: sessionMetadata.appVersion,
      },
      sync: syncStats,
      tokenTimeout: timeoutMinutes, // Incluir timeout en respuesta
      afiliadoIdUsadoSync,
      soapMensajes,
      message: 'Login exitoso' 
    })

  } catch (error) {
    console.error('Error en /auth/login:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /auth/refresh-token - Refrescar access_token usando refresh_token
app.post('/auth/refresh-token', validateBody(AuthRefreshTokenBodySchema), async (req, res) => {
  try {
    const { refresh_token } = req.body

    console.log('🔄 Intentando refrescar token...')

    const localRefreshSession = refreshSessions.get(refresh_token)
    if (localRefreshSession) {
      if (Date.now() > localRefreshSession.expiresAt) {
        refreshSessions.delete(refresh_token)
        return res.status(401).json({ error: 'Refresh token expirado' })
      }

      const nextSession = {
        ...localRefreshSession.session,
        loginAt: new Date().toISOString(),
      }
      const nextMetadata = {
        ...(localRefreshSession.metadata || {}),
        lastRefreshedAt: new Date().toISOString(),
      }

      const newAccessToken = issueLocalJwt(nextSession) || generateToken()
      revokeSessionBySessionId(nextSession.nuusuid, nextSession.sessionId, { revokeCurrent: true })
      const newRefreshToken = issueRefreshToken(nextSession, nextMetadata, {
        authType: localRefreshSession.authType || 'LOCAL',
        currentAccessToken: newAccessToken,
      })

      refreshSessions.delete(refresh_token)
      sessions.set(newAccessToken, {
        ...nextSession,
        refreshToken: newRefreshToken,
        sessionMetadata: nextMetadata,
      })

      return res.json({
        token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: 8 * 60 * 60,
        authType: localRefreshSession.authType || 'LOCAL',
        session: {
          sessionId: nextMetadata.sessionId || null,
          deviceId: nextMetadata.deviceId || null,
          platform: nextMetadata.platform || null,
          appVersion: nextMetadata.appVersion || null,
          lastRefreshedAt: nextMetadata.lastRefreshedAt,
        },
        message: 'Sesión local renovada exitosamente'
      })
    }

    // Llamar a GAM para refrescar el token
    const gamRefresh = await gamService.refreshAccessToken(refresh_token)

    if (!gamRefresh || !gamRefresh.access_token) {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' })
    }

    console.log('✅ Token refrescado exitosamente')

    let sessionPayload = null

    // Actualizar token en BD si tenemos user_id
    if (gamRefresh.user_id) {
      try {
        const prisma = getPrisma()
        await prisma.nuusuari.updateMany({
          where: { nuusuid: String(gamRefresh.user_id) },
          data: {
            nuusugamtok: String(gamRefresh.access_token),
            nuusugamexp: new Date(Date.now() + 60 * 60 * 1000),
          },
        })
        console.log('✅ Token actualizado en BD')
      } catch (dbError) {
        console.warn('⚠️  No se pudo actualizar token en BD:', dbError.message)
      }

      const existingSession = Array.from(refreshSessions.values()).find((entry) =>
        entry?.sourceRefreshToken === refresh_token && String(entry?.session?.nuusuid || '') === String(gamRefresh.user_id)
      )
      sessionPayload = existingSession?.session || {
        nuusuid: String(gamRefresh.user_id),
        username: null,
        afiliadoId: '',
        authType: 'GAM',
      }
    }

    if (sessionPayload) {
      const nextMetadata = {
        ...(Array.from(refreshSessions.values()).find((entry) => entry?.sourceRefreshToken === refresh_token)?.metadata || {}),
        lastRefreshedAt: new Date().toISOString(),
      }
      issueRefreshToken(sessionPayload, nextMetadata, {
        authType: 'GAM',
        sourceRefreshToken: gamRefresh.refresh_token,
        currentAccessToken: gamRefresh.access_token,
      })
      sessions.set(gamRefresh.access_token, {
        ...sessionPayload,
        refreshToken: gamRefresh.refresh_token,
        sessionMetadata: nextMetadata,
      })
      refreshSessions.delete(refresh_token)
    }

    return res.json({
      token: gamRefresh.access_token,
      refresh_token: gamRefresh.refresh_token,
      expires_in: gamRefresh.expires_in,
      authType: 'GAM',
      message: 'Token refrescado exitosamente'
    })

  } catch (error) {
    console.error('❌ Error refrescando token:', error)
    const statusCode = error.statusCode || 500
    const errorMsg = error.error || error.message || 'Error refrescando token'
    res.status(statusCode).json({ error: errorMsg })
  }
})

// GET /auth/verify-token - Verificar si el token GAM es válido
app.get('/auth/verify-token', requireAuth, async (req, res) => {
  try {
    console.log('🔐 Verificando validez del token GAM')
    
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Token no proporcionado' 
      })
    }

    const result = await gamService.verifyTokenGAM(token)
    
    res.json({
      valid: result.valid,
      userId: result.userId,
      message: result.valid ? 'Token válido' : 'Token inválido'
    })

  } catch (error) {
    console.error('❌ Error verificando token:', error)
    res.status(500).json({ 
      valid: false,
      error: 'Error al verificar token' 
    })
  }
})

// ===== Sistema de recuperación de contraseña con código de verificación =====
// Store en memoria: { email -> { code, resetToken, nuusuid, userName, expiresAt, attempts, verified } }
const recoveryCodes = new Map()
const RECOVERY_CODE_TTL = 10 * 60 * 1000  // 10 minutos
const RESET_TOKEN_TTL = 15 * 60 * 1000    // 15 minutos para usar el resetToken
const MAX_CODE_ATTEMPTS = 5

function generateRecoveryCode() {
  return String(Math.floor(100000 + Math.random() * 900000)) // 6 dígitos
}
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex')
}
function cleanExpiredRecoveryCodes() {
  const now = Date.now()
  for (const [key, val] of recoveryCodes) {
    if (now > val.expiresAt) recoveryCodes.delete(key)
  }
}
// Limpieza automática cada 5 minutos
setInterval(cleanExpiredRecoveryCodes, 5 * 60 * 1000)

// POST /auth/recover-password - Paso 1: Enviar código de verificación por email
app.post('/auth/recover-password', rateLimiters.recovery, validateBody(AuthRecoverPasswordBodySchema), async (req, res) => {
  try {
    const { email } = req.body
    const emailLower = email.toLowerCase()

    // Rate limit: no reenviar si ya hay un código vigente con <2 min de antigüedad
    const existing = recoveryCodes.get(emailLower)
    if (existing && (Date.now() - (existing.createdAt || 0)) < 2 * 60 * 1000) {
      return res.json({
        success: true,
        message: 'Si el email está registrado, recibirás un código de verificación en tu correo electrónico.',
        expiresInMinutes: 10,
      })
    }

    // Buscar usuario por email en BD
    let foundUser = null
    try {
      const prisma = getPrisma()
      foundUser = await prisma.nuusuari.findFirst({
        where: { nuusumail: { equals: emailLower, mode: 'insensitive' } },
        select: { nuusuid: true, nuusumail: true, nuusuapell: true, nuusubajaf: true },
      })
    } catch (e) {
      console.warn('⚠️  No se pudo consultar BD en recover-password:', e.message)
    }

    // Si el usuario existe y no está dado de baja, generar y enviar código
    if (foundUser && !foundUser.nuusubajaf) {
      const code = generateRecoveryCode()
      const userName = foundUser.nuusuapell ? foundUser.nuusuapell.trim().split(',')[0].trim() : null

      recoveryCodes.set(emailLower, {
        code,
        resetToken: null,
        nuusuid: foundUser.nuusuid.trim(),
        userName,
        expiresAt: Date.now() + RECOVERY_CODE_TTL,
        createdAt: Date.now(),
        attempts: 0,
        verified: false,
      })

      // Enviar código por email usando emailService
      try {
        const emailService = require('./emailService')
        await emailService.sendValidationCodeEmail(foundUser.nuusumail.trim(), code, userName)
        console.log(`📧 Código de recuperación enviado a ${emailService.maskEmail(emailLower)}`)
      } catch (emailErr) {
        console.error('❌ Error enviando email de recuperación:', emailErr)
        // No revelamos el error al usuario por seguridad
      }
    } else {
      console.log(`Solicitud de recuperación para: ${emailLower} (${foundUser ? 'dado de baja' : 'no encontrado'})`)
    }

    // Siempre responder éxito por seguridad (no revelar si el email existe)
    return res.json({
      success: true,
      message: 'Si el email está registrado, recibirás un código de verificación en tu correo electrónico.',
      expiresInMinutes: 10,
    })
  } catch (error) {
    console.error('Error en /auth/recover-password:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /auth/verify-recovery-code - Paso 2: Verificar código y obtener token de reset
app.post('/auth/verify-recovery-code', rateLimiters.recovery, validateBody(AuthVerifyRecoveryCodeBodySchema), async (req, res) => {
  try {
    const { email, code } = req.body
    const emailLower = email.toLowerCase()
    const entry = recoveryCodes.get(emailLower)

    if (!entry || Date.now() > entry.expiresAt) {
      recoveryCodes.delete(emailLower)
      return res.status(400).json({
        success: false,
        error: 'EXPIRED',
        message: 'El código ha expirado. Solicitá uno nuevo.',
      })
    }

    if (entry.attempts >= MAX_CODE_ATTEMPTS) {
      recoveryCodes.delete(emailLower)
      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Demasiados intentos fallidos. Solicitá un nuevo código.',
      })
    }

    if (entry.code !== code) {
      entry.attempts++
      return res.status(400).json({
        success: false,
        error: 'INVALID_CODE',
        message: 'Código incorrecto. Intentos restantes: ' + (MAX_CODE_ATTEMPTS - entry.attempts),
        remainingAttempts: MAX_CODE_ATTEMPTS - entry.attempts,
      })
    }

    // Código válido → generar token de reset
    const resetToken = generateResetToken()
    entry.verified = true
    entry.resetToken = resetToken
    entry.expiresAt = Date.now() + RESET_TOKEN_TTL  // Extender TTL para el paso de reset
    entry.attempts = 0

    console.log(`✅ Código de recuperación verificado para ${emailLower}`)

    return res.json({
      success: true,
      resetToken,
      message: 'Código verificado. Ingresá tu nueva contraseña.',
      expiresInMinutes: 15,
    })
  } catch (error) {
    console.error('Error en /auth/verify-recovery-code:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /auth/reset-password - Paso 3: Establecer nueva contraseña
app.post('/auth/reset-password', rateLimiters.recovery, validateBody(AuthResetPasswordBodySchema), async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body
    const emailLower = email.toLowerCase()
    const entry = recoveryCodes.get(emailLower)

    if (!entry || !entry.verified || entry.resetToken !== resetToken || Date.now() > entry.expiresAt) {
      recoveryCodes.delete(emailLower)
      return res.status(400).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'El token de restablecimiento es inválido o expiró. Iniciá el proceso nuevamente.',
      })
    }

    // Actualizar contraseña en nuusuauth
    const prisma = getPrisma()
    const hashedPassword = hashPassword(String(newPassword))

    const authRecord = await prisma.nuusuauth.findUnique({
      where: { nuusuid: entry.nuusuid },
    })

    if (authRecord) {
      await prisma.nuusuauth.update({
        where: { nuusuid: entry.nuusuid },
        data: { nuusupass: hashedPassword, nuusuultm: new Date() },
      })
    } else {
      // Crear registro si no existe (edge case)
      await prisma.nuusuauth.create({
        data: { nuusuid: entry.nuusuid, nuusupass: hashedPassword, nuusucrea: new Date(), nuusuultm: new Date() },
      })
    }

    // Limpiar el código de recuperación
    recoveryCodes.delete(emailLower)

    console.log(`🔐 Contraseña restablecida exitosamente para ${emailLower} (nuusuid=${entry.nuusuid})`)

    return res.json({
      success: true,
      message: 'Tu contraseña fue restablecida exitosamente. Ya podés iniciar sesión.',
    })
  } catch (error) {
    console.error('Error en /auth/reset-password:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /debug/create-test-user - Crear usuario de prueba (solo admins autenticados)
app.post('/debug/create-test-user', requireAuth, requireAdmin, (req, res) => {
  try {
    const { username, password, email } = req.body
    
    if (!username || !password) {
      return sendLegacyValidationError(res, 'Username y password requeridos', 'body')
    }

    // Crear usuario simple para pruebas
    const testUser = {
      key: username,
      cuil: username.length === 11 ? username : null,
      dni: username.length === 8 ? username : null,
      nroAfiliado: username,
      email: email || `${username}@test.com`,
      passwordHash: hashPassword(password),
      registradoEn: new Date().toISOString(),
      afiliadoId: null
    }

    // Guardar con múltiples claves para búsqueda flexible
    registeredUsers.set(username, testUser)
    if (email) {
      registeredUsers.set(email, testUser)
    }
    saveUsersToFile()

    console.log('✅ Usuario de prueba creado:', username)
    console.log('📧 Email:', testUser.email)
    console.log('🔑 Password hash:', testUser.passwordHash.substring(0, 20) + '...')

    return res.json({
      success: true,
      message: 'Usuario de prueba creado',
      user: {
        username: testUser.key,
        email: testUser.email
      },
      credentials: {
        username,
        password
      }
    })
  } catch (error) {
    console.error('Error creando usuario de prueba:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /users/password - Cambiar contraseña (requiere token)
app.put('/users/password', requireAuth, validateBody(UsersPasswordBodySchema), async (req, res) => {
  try {
    if (req.session?.isAdmin) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Operación no permitida para sesión admin local',
      })
    }

    if (req.session?.authType === 'GAM') {
      return res.status(400).json({
        error: 'NOT_SUPPORTED',
        message: 'Cambio de contraseña no disponible para usuarios GAM en este endpoint. Usá /gam/change-password.',
      })
    }

    const { currentPassword, newPassword } = req.body

    const prisma = getPrisma()
    const auth = await prisma.nuusuauth.findUnique({
      where: { nuusuid: req.session.nuusuid },
      select: { nuusupass: true },
    })

    if (!auth?.nuusupass) {
      return res.status(400).json({
        error: 'NO_PASSWORD',
        message: 'Este usuario no tiene contraseña legacy registrada',
      })
    }

    const ok = verifyPassword(String(currentPassword), auth.nuusupass)
    if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' })

    await prisma.nuusuauth.update({
      where: { nuusuid: req.session.nuusuid },
      data: { nuusupass: hashPassword(String(newPassword)), nuusuultm: new Date() },
    })

    return res.json({ success: true, message: 'Contraseña actualizada' })
  } catch (error) {
    console.error('Error en PUT /users/password:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /auth/me - Obtener datos del usuario autenticado
app.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const baseProfile = {
      nuusuid: req.session?.nuusuid || null,
      username: req.session?.username || null,
      loginAt: req.session?.loginAt || null,
      authType: req.session?.authType || null,
      email: req.session?.email || null,
      nombre: null,
      afiliadoId: req.session?.afiliadoId || null,
      session: req.session?.sessionMetadata ? {
        sessionId: req.session.sessionId || req.session.sessionMetadata.sessionId || null,
        deviceId: req.session.sessionMetadata.deviceId || null,
        platform: req.session.sessionMetadata.platform || null,
        appVersion: req.session.sessionMetadata.appVersion || null,
        lastActivityAt: req.session.sessionMetadata.lastActivityAt || null,
        lastRefreshedAt: req.session.sessionMetadata.lastRefreshedAt || null,
      } : null,
    }

    if (req.session?.isAdmin) {
      let adminPermisos = null
      if (req.session.nurolid !== null && req.session.nurolid !== undefined) {
        try {
          const roleRow = await db.pool.query('SELECT nurolpermisos FROM nurolper WHERE nurolid = $1', [req.session.nurolid])
          if (roleRow.rows[0]?.nurolpermisos) {
            adminPermisos = JSON.parse(roleRow.rows[0].nurolpermisos)
          }
        } catch (_) { /* sin permisos */ }
      }
      return res.json({
        ...baseProfile,
        nombre: 'Admin',
        nurolid: req.session.nurolid ?? null,
        isSuperAdmin: (req.session.nurolid === null || req.session.nurolid === undefined),
        permisos: adminPermisos
      })
    }

    if (!req.session?.nuusuid) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'No autorizado. Sesión inválida.',
      })
    }

    const dbUser = await userRepository.findPublicById(req.session.nuusuid)
    if (!dbUser) {
      return res.json(baseProfile)
    }

    return res.json({
      ...baseProfile,
      username: dbUser.nuusumail,
      email: dbUser.nuusumail,
      nombre: dbUser.nuusuapell || null,
      afiliadoId: dbUser.nuusuafili || null,
    })
  } catch (error) {
    console.error('Error en /auth/me:', error)
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    })
  }
})

app.get('/auth/sessions', requireAuth, async (req, res) => {
  try {
    if (!req.session?.nuusuid) {
      return res.status(400).json({
        error: 'NO_SESSION_USER',
        message: 'No se pudo determinar el usuario de la sesión actual',
      })
    }

    const currentSessionId = req.session.sessionId || req.session.sessionMetadata?.sessionId || null
    const sessionsForUser = collectSessionsForUser(req.session.nuusuid).map((entry) => ({
      ...entry,
      current: !!currentSessionId && entry.sessionId === currentSessionId,
    }))

    return res.json({
      success: true,
      total: sessionsForUser.length,
      currentSessionId,
      sessions: sessionsForUser,
    })
  } catch (error) {
    console.error('Error en GET /auth/sessions:', error)
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno obteniendo sesiones activas',
    })
  }
})

app.delete('/auth/sessions/:id', requireAuth, validateParams(SessionIdParamsSchema), async (req, res) => {
  try {
    const sessionId = req.params.id
    const currentSessionId = req.session?.sessionId || req.session?.sessionMetadata?.sessionId || null
    const result = revokeSessionBySessionId(req.session?.nuusuid, sessionId, {
      revokeCurrent: true,
      currentSessionId,
    })

    if ((result.removedAccessTokens + result.removedRefreshTokens) === 0) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'No se encontró la sesión indicada para el usuario actual',
      })
    }

    return res.json({
      success: true,
      sessionId,
      revokedCurrentSession: !!currentSessionId && currentSessionId === sessionId,
      removedAccessTokens: result.removedAccessTokens,
      removedRefreshTokens: result.removedRefreshTokens,
      message: 'Sesión revocada correctamente',
    })
  } catch (error) {
    console.error('Error en DELETE /auth/sessions/:id:', error)
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno revocando sesión',
    })
  }
})

app.post('/auth/sessions/revoke-others', requireAuth, async (req, res) => {
  try {
    const currentSessionId = req.session?.sessionId || req.session?.sessionMetadata?.sessionId || null
    const allSessions = collectSessionsForUser(req.session?.nuusuid)
    let removedAccessTokens = 0
    let removedRefreshTokens = 0
    let revokedSessions = 0

    for (const entry of allSessions) {
      if (entry.sessionId === currentSessionId) continue
      const result = revokeSessionBySessionId(req.session?.nuusuid, entry.sessionId, {
        revokeCurrent: true,
      })
      if ((result.removedAccessTokens + result.removedRefreshTokens) > 0) {
        revokedSessions += 1
        removedAccessTokens += result.removedAccessTokens
        removedRefreshTokens += result.removedRefreshTokens
      }
    }

    return res.json({
      success: true,
      currentSessionId,
      revokedSessions,
      removedAccessTokens,
      removedRefreshTokens,
      message: 'Otras sesiones revocadas correctamente',
    })
  } catch (error) {
    console.error('Error en POST /auth/sessions/revoke-others:', error)
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno revocando otras sesiones',
    })
  }
})

// ===== BUSCAR CUIL =====

// GET /credenciales/refresh - Refrescar credenciales del grupo familiar
app.get('/credenciales/refresh', requireAuth, async (req, res) => {
  try {
    const nuusuid = req.session?.nuusuid
    if (!nuusuid) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    // Obtener usuario desde nuusuari usando el nuusuid de la sesión
    const userQuery = await db.query(
      'SELECT nuusuid, nuusuafili FROM nuusuari WHERE nuusuid = $1',
      [nuusuid]
    )

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado en base de datos',
        message: 'El usuario debe registrarse primero'
      })
    }

    const dbUser = userQuery.rows[0]

    if (!USE_SOAP || !soapClient) {
      return res.status(503).json({ 
        error: 'Servicio SOAP no disponible',
        message: 'No se pueden sincronizar credenciales sin conexión SOAP'
      })
    }

    if (!dbUser.nuusuafili) {
      return res.status(400).json({ 
        error: 'AfiliadoId no disponible',
        message: 'No se puede sincronizar sin identificador de afiliado'
      })
    }

    const afiliadoId = dbUser.nuusuafili

    // Sincronizar credenciales
    const syncResult = await syncCredencialesGrupoFamiliar(
      dbUser.nuusuid,
      afiliadoId
    )

    // Adjuntar descripción de plan
    await attachPlanDescriptionsToCredenciales(syncResult.credenciales)

    // Adjuntar layout efectivo (general/por plan) a cada credencial refrescada
    try {
      await Promise.all((syncResult.credenciales || []).map(async (c) => {
        const planId = c.crcreplaid ? String(c.crcreplaid).trim() : ''
        const layoutData = await getCredencialLayoutForPlan(planId)
        c.credencialLayout = layoutData.effectiveConfig
        c.credencialLayoutSource = layoutData.source
      }))
    } catch (e) {
      console.warn('No se pudo adjuntar layout de credenciales en refresh:', e.message)
    }

    // Adjuntar token a cada credencial del grupo
    try {
      const tokenService = require('./tokenService')
      const now = new Date()
      const timeoutMinutes = await tokenService.getTimeoutMinutes()
      await Promise.all((syncResult.credenciales || []).map(async (c) => {
        const afiliadoForToken = c.crcreafili || c.AfiliadoId || afiliadoId || ''
        c.tokenTemporal = await tokenService.generateTokenFor(afiliadoForToken, now)
        c.tokenTemporalGeneradoEn = now.toISOString()
        c.tokenTemporalVenceEn = new Date(now.getTime() + timeoutMinutes * 60 * 1000).toISOString()
      }))
    } catch (e) {
      console.warn('No se pudo adjuntar token a credenciales en refresh:', e.message)
    }

    res.json({
      credenciales: syncResult.credenciales,
      sync: syncResult.sync,
      credencialesInfo: syncResult.credencialesInfo || null,
      soapMensajes: syncResult.soapMensajes || null,
      message: 'Credenciales actualizadas exitosamente'
    })

  } catch (error) {
    console.error('❌ Error refrescando credenciales:', error)

    if (error?.code === 'AFILIACION_NO_VIGENTE') {
      return res.status(403).json({
        error: 'Afiliación no vigente',
        code: 'AFILIACION_NO_VIGENTE',
        message: 'El afiliado no figura activo en el padrón de WS_BENEF. No se renovó la credencial.'
      })
    }

    if (error?.code === 'AFILIACION_VALIDACION_NO_DISPONIBLE') {
      return res.status(503).json({
        error: 'No se pudo validar afiliación',
        code: 'AFILIACION_VALIDACION_NO_DISPONIBLE',
        message: 'No se pudo verificar la afiliación en WS_BENEF en este momento. Intente nuevamente.'
      })
    }

    if (error?.code === 'PARAMETROS_INVALIDOS') {
      return res.status(400).json({
        error: 'Parámetros inválidos',
        code: 'PARAMETROS_INVALIDOS',
        message: 'No se pudo validar afiliación por datos incompletos del afiliado.'
      })
    }

    res.status(500).json({ 
      error: 'Error al refrescar credenciales'
    })
  }
})

// GET /credenciales - Obtener credenciales sin sincronizar (solo lectura de BD)
// Nota: usa requireAuth para soportar tokens GAM y sesiones locales.
app.get('/credenciales', requireAuth, async (req, res) => {
  try {
    const nuusuid = req.session?.nuusuid
    if (!nuusuid) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    // Obtener credenciales de BD (Prisma / $queryRaw)
    const credenciales = await credencialesRepository.listByUserId(nuusuid)

    // Adjuntar descripción de plan
    await attachPlanDescriptionsToCredenciales(credenciales)

    // Adjuntar layout efectivo (general/por plan) a cada credencial
    try {
      await Promise.all((credenciales || []).map(async (c) => {
        const planId = c.crcreplaid ? String(c.crcreplaid).trim() : ''
        const layoutData = await getCredencialLayoutForPlan(planId)
        c.credencialLayout = layoutData.effectiveConfig
        c.credencialLayoutSource = layoutData.source
      }))
    } catch (e) {
      console.warn('No se pudo adjuntar layout de credenciales:', e.message)
    }

    // Adjuntar token a cada credencial obtenida desde BD
    try {
      const tokenService = require('./tokenService')
      const now = new Date()
      const timeoutMinutes = await tokenService.getTimeoutMinutes()
      await Promise.all((credenciales || []).map(async (c) => {
        const afiliadoForToken = c.crcreafili || c.AfiliadoId || ''
        c.tokenTemporal = await tokenService.generateTokenFor(afiliadoForToken, now)
        c.tokenTemporalGeneradoEn = now.toISOString()
        c.tokenTemporalVenceEn = new Date(now.getTime() + timeoutMinutes * 60 * 1000).toISOString()
      }))
    } catch (e) {
      console.warn('No se pudo adjuntar token a credenciales desde BD:', e.message)
    }

    res.json({
      credenciales,
      message: credenciales.length > 0 
        ? 'Credenciales obtenidas de base de datos' 
        : 'No hay credenciales disponibles'
    })

  } catch (error) {
    console.error('❌ Error obteniendo credenciales:', error)
    res.status(500).json({ 
      error: 'Error al obtener credenciales'
    })
  }
})

// ===== BUSCAR CUIL =====
// GET /buscar-cuil?dni=12345678&sexo=M - Buscar CUIL por DNI y sexo
app.get(
  '/buscar-cuil',
  validateQuery(
    z.object({
      dni: z.string().min(1),
      sexo: z.string().min(1)
    })
  ),
  async (req, res) => {
  try {
    const { dni, sexo } = req.query

    if (!dni || !sexo) {
      return res.status(400).json({ error: 'DNI y sexo requeridos' })
    }

    if (false && soapClient) {
      try {
        const result = await soapClient.ExecuteAsync({
          servicio: 'APPBUSCACUIL',
          dni,
          sexo
        })

        console.log('SOAP APPBUSCACUIL response:', JSON.stringify(result, null, 2))

        return res.json({
          success: true,
          data: result[0]
        })
      } catch (soapError) {
        console.error('Error SOAP APPBUSCACUIL:', soapError)
        return res.status(500).json({ 
          error: 'Error al buscar CUIL',
          message: 'No se pudo buscar el CUIL en este momento. Intentá nuevamente.'
        })
      }
    } else {
      // Modo mock - generar CUIL ficticio
      const prefix = sexo.toUpperCase() === 'M' ? '20' : '27'
      const suffix = Math.floor(Math.random() * 10)
      const cuil = `${prefix}-${dni}-${suffix}`

      return res.json({
        success: true,
        data: { cuil },
        mock: true
      })
    }
  } catch (error) {
    console.error('Error en /buscar-cuil:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ===== CREDENCIALES =====
// GET /credenciales/sync - Forzar sincronización de credenciales desde SOAP
app.get('/credenciales/sync', (req, res, next) => {
  console.log('📥 /credenciales/sync - Authorization:', req.headers['authorization']?.substring(0, 50))
  next()
}, requireAuth, async (req, res) => {
  try {
    const { username } = req.session
    console.log('🔄 [/credenciales/sync] Solicitada por:', username)
    
    const dbUser = await getUserByUsername(username)
    if (!dbUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    
    if (!dbUser.nuusuafili) {
      return res.status(400).json({ 
        error: 'Usuario sin AfiliadoId',
        message: 'Complete su registro para sincronizar credenciales'
      })
    }
    
    console.log(`📡 Sincronizando credenciales para nuusuid=${dbUser.nuusuid}, AfiliadoId=${dbUser.nuusuafili}`)
    
    const syncResult = await syncCredencialesGrupoFamiliar(
      dbUser.nuusuid, 
      dbUser.nuusuafili
    )

    // Adjuntar descripción de plan
    await attachPlanDescriptionsToCredenciales(syncResult.credenciales)

    // Adjuntar layout efectivo (general/por plan) a cada credencial sincronizada
    try {
      await Promise.all((syncResult.credenciales || []).map(async (c) => {
        const planId = c.crcreplaid ? String(c.crcreplaid).trim() : ''
        const layoutData = await getCredencialLayoutForPlan(planId)
        c.credencialLayout = layoutData.effectiveConfig
        c.credencialLayoutSource = layoutData.source
      }))
    } catch (e) {
      console.warn('No se pudo adjuntar layout de credenciales en sync endpoint:', e.message)
    }
    
    console.log(`✅ Sync completado: ${syncResult.credenciales.length} credenciales, Stats:`, syncResult.sync)
    // Adjuntar token temporal a cada credencial
    try {
      const tokenService = require('./tokenService')
      const now = new Date()
      const timeoutMinutes = await tokenService.getTimeoutMinutes()
      await Promise.all((syncResult.credenciales || []).map(async (c) => {
        const afiliadoForToken = c.crcreafili || c.AfiliadoId || dbUser.nuusuafili || ''
        c.tokenTemporal = await tokenService.generateTokenFor(afiliadoForToken, now)
        c.tokenTemporalGeneradoEn = now.toISOString()
        c.tokenTemporalVenceEn = new Date(now.getTime() + timeoutMinutes * 60 * 1000).toISOString()
      }))
    } catch (e) {
      console.warn('No se pudo adjuntar token a credenciales en sync endpoint:', e.message)
    }

    return res.json({
      success: true,
      credenciales: syncResult.credenciales,
      sync: syncResult.sync,
      credencialesInfo: syncResult.credencialesInfo || null,
      soapMensajes: syncResult.soapMensajes || null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error en /credenciales/sync:', error)

    // Fallback resiliente: si SOAP falla, devolver credenciales locales para no bloquear la app móvil.
    try {
      const nuusuid = req.session?.nuusuid
      if (nuusuid) {
        const credencialesFallback = await credencialesRepository.listByUserId(nuusuid)

        await attachPlanDescriptionsToCredenciales(credencialesFallback)

        try {
          await Promise.all((credencialesFallback || []).map(async (c) => {
            const planId = c.crcreplaid ? String(c.crcreplaid).trim() : ''
            const layoutData = await getCredencialLayoutForPlan(planId)
            c.credencialLayout = layoutData.effectiveConfig
            c.credencialLayoutSource = layoutData.source
          }))
        } catch (layoutErr) {
          console.warn('No se pudo adjuntar layout en fallback /credenciales/sync:', layoutErr.message)
        }

        try {
          const tokenService = require('./tokenService')
          const now = new Date()
          const timeoutMinutes = await tokenService.getTimeoutMinutes()
          await Promise.all((credencialesFallback || []).map(async (c) => {
            const afiliadoForToken = c.crcreafili || c.AfiliadoId || ''
            c.tokenTemporal = await tokenService.generateTokenFor(afiliadoForToken, now)
            c.tokenTemporalGeneradoEn = now.toISOString()
            c.tokenTemporalVenceEn = new Date(now.getTime() + timeoutMinutes * 60 * 1000).toISOString()
          }))
        } catch (tokenErr) {
          console.warn('No se pudo adjuntar token en fallback /credenciales/sync:', tokenErr.message)
        }

        console.warn(`⚠️ /credenciales/sync fallback a BD local: ${credencialesFallback.length} credenciales`)
        return res.json({
          success: true,
          fallback: true,
          warning: 'No se pudo sincronizar con SOAP. Se devolvieron credenciales locales.',
          credenciales: credencialesFallback,
          sync: null,
          credencialesInfo: null,
          soapMensajes: null,
          timestamp: new Date().toISOString()
        })
      }
    } catch (fallbackError) {
      console.error('❌ Error en fallback de /credenciales/sync:', fallbackError)
    }

    if (error?.code === 'AFILIACION_NO_VIGENTE') {
      return res.status(403).json({
        error: 'Afiliación no vigente',
        code: 'AFILIACION_NO_VIGENTE',
        message: 'El afiliado no figura activo en el padrón de WS_BENEF. No se renovó la credencial.'
      })
    }

    if (error?.code === 'AFILIACION_VALIDACION_NO_DISPONIBLE') {
      return res.status(503).json({
        error: 'No se pudo validar afiliación',
        code: 'AFILIACION_VALIDACION_NO_DISPONIBLE',
        message: 'No se pudo verificar la afiliación en WS_BENEF en este momento. Intente nuevamente.'
      })
    }

    if (error?.code === 'PARAMETROS_INVALIDOS') {
      return res.status(400).json({
        error: 'Parámetros inválidos',
        code: 'PARAMETROS_INVALIDOS',
        message: 'No se pudo validar afiliación por datos incompletos del afiliado.'
      })
    }

    res.status(500).json({ 
      error: 'Error sincronizando credenciales'
    })
  }
})

// ===== FAVORITOS Y RECIENTES =====

app.post('/api/me/favoritos', requireAuth, async (req, res) => {
  try {
    const { caentid } = req.body
    const { nuusuid } = req.session

    if (!caentid) {
      return res.status(400).json({ error: 'caentid requerido' })
    }

    if (!nuusuid) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const result = await favoritosRepository.addFavoritoOReciente(nuusuid, caentid, 'favorito')

    return res.status(201).json({
      success: true,
      favorito: result,
      message: 'Prestador agregado a favoritos'
    })
  } catch (error) {
    console.error('Error en POST /api/me/favoritos:', error)
    return res.status(500).json({ error: 'Error al agregar favorito' })
  }
})

app.delete('/api/me/favoritos/:caentid', requireAuth, async (req, res) => {
  try {
    const { caentid } = req.params
    const { nuusuid } = req.session

    if (!nuusuid) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const removed = await favoritosRepository.removeFavorito(nuusuid, caentid)

    return res.json({
      success: removed,
      message: removed ? 'Prestador removido de favoritos' : 'Prestador no estaba en favoritos',
      caentid
    })
  } catch (error) {
    console.error('Error en DELETE /api/me/favoritos/:caentid:', error)
    return res.status(500).json({ error: 'Error al remover favorito' })
  }
})

app.get('/api/me/favoritos', requireAuth, async (req, res) => {
  try {
    const { nuusuid } = req.session
    const { limit = 20 } = req.query

    if (!nuusuid) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const favoritos = await favoritosRepository.getFavoritos(nuusuid, parseInt(limit, 10))

    return res.json({
      success: true,
      favoritos,
      total: favoritos.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error en GET /api/me/favoritos:', error)
    return res.status(500).json({ error: 'Error al obtener favoritos' })
  }
})

app.get('/api/me/recientes', requireAuth, async (req, res) => {
  try {
    const { nuusuid } = req.session
    const { limit = 10 } = req.query

    if (!nuusuid) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const recientes = await favoritosRepository.getRecientes(nuusuid, parseInt(limit, 10))

    return res.json({
      success: true,
      recientes,
      total: recientes.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error en GET /api/me/recientes:', error)
    return res.status(500).json({ error: 'Error al obtener recientes' })
  }
})

app.post('/api/me/recientes', requireAuth, async (req, res) => {
  try {
    const { caentid } = req.body
    const { nuusuid } = req.session

    if (!caentid) {
      return res.status(400).json({ error: 'caentid requerido' })
    }

    if (!nuusuid) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const result = await favoritosRepository.addFavoritoOReciente(nuusuid, caentid, 'reciente')

    return res.status(201).json({
      success: true,
      reciente: result,
      message: 'Acceso registrado'
    })
  } catch (error) {
    console.error('Error en POST /api/me/recientes:', error)
    return res.status(500).json({ error: 'Error al registrar acceso' })
  }
})

app.get('/api/me/favoritos-y-recientes', requireAuth, async (req, res) => {
  try {
    const { nuusuid } = req.session
    const { limit = 5 } = req.query

    if (!nuusuid) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const combo = await favoritosRepository.getFavoritosYRecientes(nuusuid, parseInt(limit, 10))

    return res.json({
      success: true,
      ...combo,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error en GET /api/me/favoritos-y-recientes:', error)
    return res.status(500).json({ error: 'Error al obtener combo' })
  }
})

app.delete('/api/me/recientes', requireAuth, async (req, res) => {
  try {
    const { nuusuid } = req.session

    if (!nuusuid) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const count = await favoritosRepository.limpiarTodosLosRecientes(nuusuid)

    return res.json({
      success: true,
      message: `${count} recientes eliminados`,
      count
    })
  } catch (error) {
    console.error('Error en DELETE /api/me/recientes:', error)
    return res.status(500).json({ error: 'Error al limpiar recientes' })
  }
})

// ============================================================================
// PREFERENCIAS DE NOTIFICACIÓN (Tarea 17)
// ============================================================================

const NOTIF_CATEGORIAS = ['credencial', 'autorizaciones', 'noticias', 'sistema']

const NotifPrefsBodySchema = z.object({
  preferences: z.array(z.object({
    categoria: z.enum(['credencial', 'autorizaciones', 'noticias', 'sistema']),
    push: z.boolean().optional(),
    in_app: z.boolean().optional(),
  })).min(1),
})

/**
 * Obtener preferencias de notificación del usuario autenticado.
 * Devuelve todas las categorías; si no existe fila para una categoría usa defaults (push=true, in_app=true).
 */
app.get('/api/me/notification-preferences', requireAuth, async (req, res) => {
  try {
    const { nuusuid } = req.session
    if (!nuusuid) return res.status(401).json({ error: 'No autenticado' })

    const rows = await db.query(
      'SELECT categoria, push, in_app, updated_at FROM nu_notif_prefs WHERE nuusuid = $1',
      [nuusuid]
    )

    const byCategoria = {}
    for (const row of rows.rows) {
      byCategoria[row.categoria] = { push: row.push, in_app: row.in_app, updated_at: row.updated_at }
    }

    const preferences = NOTIF_CATEGORIAS.map((cat) => ({
      categoria: cat,
      push: byCategoria[cat]?.push ?? true,
      in_app: byCategoria[cat]?.in_app ?? true,
      updated_at: byCategoria[cat]?.updated_at ?? null,
    }))

    return res.json({ preferences, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Error en GET /api/me/notification-preferences:', error)
    return res.status(500).json({ error: 'Error al obtener preferencias' })
  }
})

/**
 * Actualizar preferencias de notificación del usuario autenticado.
 * Upsert por categoría; solo actualiza los campos enviados (push y/o in_app).
 */
app.put('/api/me/notification-preferences', requireAuth, validateBody(NotifPrefsBodySchema), async (req, res) => {
  try {
    const { nuusuid } = req.session
    if (!nuusuid) return res.status(401).json({ error: 'No autenticado' })

    const { preferences } = req.body
    const now = new Date()

    for (const pref of preferences) {
      const push = pref.push ?? true
      const in_app = pref.in_app ?? true
      await db.query(
        `INSERT INTO nu_notif_prefs (nuusuid, categoria, push, in_app, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (nuusuid, categoria)
         DO UPDATE SET push = EXCLUDED.push, in_app = EXCLUDED.in_app, updated_at = EXCLUDED.updated_at`,
        [nuusuid, pref.categoria, push, in_app, now]
      )
    }

    // Devolver estado actualizado
    const rows = await db.query(
      'SELECT categoria, push, in_app, updated_at FROM nu_notif_prefs WHERE nuusuid = $1',
      [nuusuid]
    )

    const byCategoria = {}
    for (const row of rows.rows) {
      byCategoria[row.categoria] = { push: row.push, in_app: row.in_app, updated_at: row.updated_at }
    }

    const updatedPrefs = NOTIF_CATEGORIAS.map((cat) => ({
      categoria: cat,
      push: byCategoria[cat]?.push ?? true,
      in_app: byCategoria[cat]?.in_app ?? true,
      updated_at: byCategoria[cat]?.updated_at ?? null,
    }))

    return res.json({ success: true, preferences: updatedPrefs, timestamp: now.toISOString() })
  } catch (error) {
    console.error('Error en PUT /api/me/notification-preferences:', error)
    return res.status(500).json({ error: 'Error al guardar preferencias' })
  }
})

// ============================================================================
// FIN PREFERENCIAS DE NOTIFICACIÓN
// ============================================================================

// GET /debug/session-info - Endpoint de debug para ver qué usuario está logueado
app.get('/debug/session-info', requireAuth, async (req, res) => {
  try {
    const sessionData = {
      session: req.session,
      headers: {
        authorization: req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'NO AUTH HEADER'
      },
      timestamp: new Date().toISOString()
    }
    
    // Si hay nuusuid, obtener datos de BD
    if (req.session?.nuusuid) {
      try {
        const userResult = await db.pool.query(
          'SELECT nuusuid, nuusumail, nuusuapell, nuusuafili FROM nuusuari WHERE nuusuid = $1',
          [req.session.nuusuid]
        )
        if (userResult.rows.length > 0) {
          sessionData.userFromDB = userResult.rows[0]
        }
      } catch (dbErr) {
        sessionData.dbError = dbErr.message
      }
    }
    
    res.json(sessionData)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /credencial - Obtener datos de credencial del afiliado
app.get('/credencial', requireAuth, requirePermission('credenciales'), async (req, res) => {
  try {
    const afiliadoId = req.session?.afiliadoId

    if (USE_SOAP && soapClient) {
      try {
        if (!afiliadoId) {
          return res.status(200).json({ 
            credencial: null,
            message: 'AfiliadoId no disponible. Complete su registro para obtener la credencial.',
            hint: 'El AfiliadoId se obtiene durante el registro exitoso en REGISTRACION'
          })
        }
        
        const parametros = {
          AfiliadoId: afiliadoId
        }
        const flex = await fetchCredencialFlexible(afiliadoId)
        if (!flex.parsed || !flex.parsed.ok) {
          return res.status(400).json({
            error: 'Error al obtener credencial',
            formatoIntentado: flex.formatoUsado,
            intentosRealizados: flex.intentosRealizados,
            attempts: flex.attemptDetails
          })
        }
        const payload = flex.parsed.payload
        // Adjuntar token a cada credencial del payload (grupo familiar)
        try {
          const tokenService = require('./tokenService')
          const credList = payload.CredencialDatos || payload.credencialDatos || []
          const now = new Date()
          const timeoutMinutes = await tokenService.getTimeoutMinutes()
          await Promise.all((credList || []).map(async (c) => {
            const afiliadoForToken = c.AfiliadoId || c.crcreafili || afiliadoId || ''
            c.tokenTemporal = await tokenService.generateTokenFor(afiliadoForToken, now)
            c.tokenTemporalGeneradoEn = now.toISOString()
            c.tokenTemporalVenceEn = new Date(now.getTime() + timeoutMinutes * 60 * 1000).toISOString()
          }))
          // Normalizar salida
          payload.CredencialDatos = credList
        } catch (e) {
          console.warn('No se pudo adjuntar token a credenciales SOAP payload:', e.message)
        }

        return res.json({ 
          success: true, 
          data: payload, 
          credencialDatos: payload.CredencialDatos || payload.credencialDatos || [],
          formatoUsado: flex.formatoUsado,
          intentosRealizados: flex.intentosRealizados,
          attempts: flex.attemptDetails
        })
      } catch (soapError) {
        console.error('Error SOAP APPDATOSCREDENCIALES:', soapError)
        return res.status(500).json({ 
          error: 'Error al obtener credencial',
          details: soapError.message 
        })
      }
    } else {
      // Modo mock
      return res.json({
        data: {
          numeroAfiliado: '123456789',
          nombre: 'Juan',
          apellido: 'Pérez',
          dni: '12345678',
          fechaNacimiento: '1985-05-15',
          parentesco: 'Titular',
          plan: 'Plan 210',
          vigenciaDesde: '2020-01-01',
          imagenFondo: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800',
          fotoPerfil: 'https://ui-avatars.com/api/?name=Juan+Perez&size=200&background=2196f3&color=fff'
        }
      })
    }
  } catch (error) {
    console.error('Error en /credencial:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /credencial/constancia.pdf - Descargar constancia de credencial en PDF
app.get('/credencial/constancia.pdf', requireAuth, async (req, res) => {
  function formatDateDDMMYYYY(value) {
    if (!value) return 'N/D'
    const raw = String(value)
    const normalized = raw.length >= 10 ? raw.slice(0, 10) : raw
    const parts = normalized.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return normalized
  }

  try {
    const nuusuid = req.session?.nuusuid
    if (!nuusuid) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const afiliadoIdQuery = String(req.query?.afiliadoId || '').trim()
    const credenciales = await credencialesRepository.listByUserId(nuusuid)

    if (!Array.isArray(credenciales) || credenciales.length === 0) {
      return res.status(404).json({
        error: 'Sin credenciales disponibles',
        message: 'No hay credenciales para generar la constancia en PDF'
      })
    }

    let credencial = null
    if (afiliadoIdQuery) {
      credencial = credenciales.find((c) => String(c.crcreafili || '').trim() === afiliadoIdQuery) || null
      if (!credencial) {
        return res.status(404).json({
          error: 'Credencial no encontrada',
          message: 'No se encontró una credencial para el afiliadoId indicado'
        })
      }
    } else {
      credencial = credenciales.find((c) => c.crcrepropi === 'S' || c.crcrepropi === true) || credenciales[0]
    }

    const afiliadoId = String(credencial.crcreafili || '').trim()
    let tokenTemporal = 'N/D'
    let tokenTemporalVenceEn = null

    if (afiliadoId) {
      try {
        const tokenService = require('./tokenService')
        const now = new Date()
        const timeoutMinutes = await tokenService.getTimeoutMinutes()
        const bucketMs = timeoutMinutes * 60 * 1000
        const bucket = Math.floor(now.getTime() / bucketMs)
        tokenTemporal = await tokenService.generateTokenFor(afiliadoId, now)
        tokenTemporalVenceEn = new Date((bucket + 1) * bucketMs).toISOString()
      } catch (tokenErr) {
        console.warn('No se pudo generar token temporal para PDF:', tokenErr.message)
      }
    }

    const titularNombre = String(credencial.crcreapeno || req.session?.name || req.session?.username || 'Afiliado/a')
    const nroAfiliado = String(credencial.crcrenroaf || 'N/D')
    const cuil = credencial.crcrecuil ? String(credencial.crcrecuil) : 'N/D'
    const dni = credencial.crcredocum ? String(credencial.crcredocum) : 'N/D'
    const plan = credencial.crcreplaid ? String(credencial.crcreplaid) : 'N/D'
    const parentesco = String(credencial.crcreparen || (credencial.crcrepropi ? 'Titular' : 'Familiar'))
    const vigenciaHasta = formatDateDDMMYYYY(credencial.crcrefecvi)
    const emitidoEn = new Date().toLocaleString('es-AR')

    const safeFileKey = afiliadoId || nroAfiliado || String(nuusuid)
    const filename = `constancia-credencial-${safeFileKey}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_')

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    doc.pipe(res)

    doc.fontSize(18).text('APP Afiliados — Constancia de credencial digital', { align: 'left' })
    doc.moveDown(0.5)
    doc.fontSize(10).fillColor('#555555').text(`Emitido: ${emitidoEn}`)
    doc.moveDown(1.2)

    doc.fillColor('#000000').fontSize(12).text(`Nombre y apellido: ${titularNombre}`)
    doc.text(`Nro. afiliado: ${nroAfiliado}`)
    doc.text(`AfiliadoId: ${afiliadoId || 'N/D'}`)
    doc.text(`CUIL: ${cuil}`)
    doc.text(`DNI: ${dni}`)
    doc.text(`Plan: ${plan}`)
    doc.text(`Parentesco: ${parentesco}`)
    doc.text(`Vigencia hasta: ${vigenciaHasta}`)
    doc.moveDown(1)

    doc.fontSize(12).text(`Token temporal: ${tokenTemporal}`)
    doc.text(`Token vence: ${tokenTemporalVenceEn ? new Date(tokenTemporalVenceEn).toLocaleString('es-AR') : 'N/D'}`)
    doc.moveDown(1.5)

    doc.fontSize(10).fillColor('#555555').text(
      'Esta constancia fue emitida por APP Afiliados. La validez del token temporal puede verificarse con el endpoint /credencial/token-valido.',
      { align: 'left' }
    )

    doc.end()
  } catch (error) {
    console.error('Error en GET /credencial/constancia.pdf:', error)
    if (res.headersSent) {
      try { res.end() } catch {}
      return
    }
    return res.status(500).json({
      error: 'Error al generar constancia PDF'
    })
  }
})

// ===== AUTH AUX =====
// POST /auth/set-afiliado-id - Setear manualmente el AfiliadoId para el usuario autenticado
app.post('/auth/set-afiliado-id', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader ? authHeader.replace('Bearer ', '') : null

    const { afiliadoId } = req.body || {}
    if (!afiliadoId || typeof afiliadoId !== 'string') {
      return res.status(400).json({ error: 'Debe enviar campo afiliadoId (string)' })
    }
    if (afiliadoId.length !== 30) {
      return res.status(400).json({ error: 'AfiliadoId debe tener 30 caracteres (9+12+9)' })
    }

    const comps = parseAfiliadoId(afiliadoId)
    if (!comps) {
      return res.status(400).json({ error: 'AfiliadoId inválido' })
    }

    // Persistir en BD (usuarios legacy y GAM)
    if (!req.session?.nuusuid) {
      return res.status(400).json({ error: 'No se pudo determinar nuusuid del usuario autenticado' })
    }

    try {
      await db.query(
        'UPDATE nuusuari SET nuusuafili = $1 WHERE nuusuid = $2',
        [afiliadoId, req.session.nuusuid]
      )
    } catch (dbErr) {
      console.error('❌ Error actualizando nuusuafili:', dbErr)
      return res.status(500).json({ error: 'Error actualizando AfiliadoId en base de datos' })
    }

    // Si es sesión local, actualizar también la sesión en memoria
    if (token && sessions.has(token)) {
      const current = sessions.get(token)
      sessions.set(token, { ...current, afiliadoId })
    }
    try { saveUsersToFile() } catch {}

    return res.json({ success: true, afiliadoId, components: comps })
  } catch (e) {
    console.error('Error en /auth/set-afiliado-id:', e)
    return res.status(500).json({ error: 'Error interno' })
  }
})

// ===== OTROS ENDPOINTS (mantener compatibilidad) =====
app.get('/dashboard', (req, res) => {
  res.json({
    saldo: 0,
    plan: 'Plan 210',
    estado: 'Activo',
    proximoTurno: null,
    tramitesPendientes: 0,
    notificacionesNoLeidas: 0
  })
})

app.get('/transactions', (req, res) => {
  res.json([])
})

// ============================================================================
// NOTIFICACIONES
// ============================================================================

// GET /notifications - Listar notificaciones del usuario autenticado
app.get('/notifications', requireAuth, async (req, res) => {
  try {
    const nuusuid = req.session?.nuusuid
    if (!nuusuid) {
      return res.status(401).json({ error: 'Sesión inválida' })
    }

    // Consultar notificaciones del usuario
    const result = await db.query(
      `SELECT 
        id, 
        tipo, 
        titulo, 
        mensaje, 
        leida, 
        fecha_creacion, 
        fecha_leida, 
        metadata 
      FROM notifications 
      WHERE nuusuid = $1 
      ORDER BY fecha_creacion DESC`,
      [nuusuid]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('❌ Error en GET /notifications:', error)
    res.status(500).json({ error: 'Error al obtener notificaciones' })
  }
})

// POST /notifications/mark-read/:id - Marcar notificación como leída
app.post('/notifications/mark-read/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const nuusuid = req.session?.nuusuid
    if (!nuusuid) {
      return res.status(401).json({ error: 'Sesión inválida' })
    }

    const result = await db.query(
      `UPDATE notifications 
      SET leida = TRUE, fecha_leida = CURRENT_TIMESTAMP 
      WHERE id = $1 AND nuusuid = $2 
      RETURNING id`,
      [id, nuusuid]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' })
    }

    res.json({ success: true, message: 'Notificación marcada como leída' })
  } catch (error) {
    console.error('❌ Error en POST /notifications/mark-read:', error)
    res.status(500).json({ error: 'Error al marcar notificación' })
  }
})

// POST /notifications/mark-all-read - Marcar todas como leídas
app.post('/notifications/mark-all-read', requireAuth, async (req, res) => {
  try {
    const nuusuid = req.session?.nuusuid
    if (!nuusuid) {
      return res.status(401).json({ error: 'Sesión inválida' })
    }

    const result = await db.query(
      `UPDATE notifications 
      SET leida = TRUE, fecha_leida = CURRENT_TIMESTAMP 
      WHERE nuusuid = $1 AND leida = FALSE`,
      [nuusuid]
    )

    res.json({ 
      success: true, 
      message: `${result.rowCount} notificaciones marcadas como leídas` 
    })
  } catch (error) {
    console.error('❌ Error en POST /notifications/mark-all-read:', error)
    res.status(500).json({ error: 'Error al marcar notificaciones' })
  }
})

// DELETE /notifications/:id - Eliminar notificación
app.delete('/notifications/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const nuusuid = req.session?.nuusuid
    if (!nuusuid) {
      return res.status(401).json({ error: 'Sesión inválida' })
    }

    const result = await db.query(
      `DELETE FROM notifications 
      WHERE id = $1 AND nuusuid = $2 
      RETURNING id`,
      [id, nuusuid]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' })
    }

    res.json({ success: true, message: 'Notificación eliminada' })
  } catch (error) {
    console.error('❌ Error en DELETE /notifications:', error)
    res.status(500).json({ error: 'Error al eliminar notificación' })
  }
})

// POST /notifications/register-token - Registrar push token del dispositivo
app.post('/notifications/register-token', requireAuth, async (req, res) => {
  try {
    const nuusuid = req.session?.nuusuid
    if (!nuusuid) {
      return res.status(401).json({ error: 'Sesión inválida' })
    }
    const { pushToken, plataforma } = req.body

    if (!pushToken || !plataforma) {
      return res.status(400).json({ error: 'pushToken y plataforma requeridos' })
    }

    // Insertar o actualizar push token
    await db.query(
      `INSERT INTO push_tokens (nuusuid, push_token, plataforma, fecha_ultima_actualizacion, activo)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, TRUE)
      ON CONFLICT (nuusuid, push_token) 
      DO UPDATE SET 
        fecha_ultima_actualizacion = CURRENT_TIMESTAMP,
        activo = TRUE,
        plataforma = EXCLUDED.plataforma`,
      [nuusuid, pushToken, plataforma]
    )

    console.log(`📱 Push token registrado para usuario ${nuusuid}: ${plataforma}`)
    res.json({ success: true, message: 'Push token registrado' })
  } catch (error) {
    console.error('❌ Error en POST /notifications/register-token:', error)
    res.status(500).json({ error: 'Error al registrar push token' })
  }
})

// Función helper para enviar push notifications usando Expo Push API
async function sendPushNotification(pushToken, titulo, mensaje, data = {}) {
  try {
    const message = {
      to: pushToken,
      sound: 'default',
      title: titulo,
      body: mensaje,
      data: data
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    const result = await response.json()
    
    if (result.data && result.data[0] && result.data[0].status === 'ok') {
      console.log(`✅ Push notification enviada: ${titulo}`)
      return true
    } else {
      console.error('⚠️ Error enviando push:', result)
      return false
    }
  } catch (error) {
    console.error('❌ Error en sendPushNotification:', error.message)
    return false
  }
}

/**
 * Helper: obtener preferencia de notificación de un usuario para una categoría.
 * Devuelve { push: boolean, in_app: boolean } con defaults true si no hay fila.
 */
async function getNotifPref(nuusuid, categoria) {
  try {
    if (!nuusuid || !categoria) return { push: true, in_app: true }
    const result = await db.query(
      'SELECT push, in_app FROM nu_notif_prefs WHERE nuusuid = $1 AND categoria = $2',
      [nuusuid, categoria]
    )
    if (result.rows.length === 0) return { push: true, in_app: true }
    return { push: result.rows[0].push, in_app: result.rows[0].in_app }
  } catch {
    return { push: true, in_app: true }
  }
}

// Función helper para crear notificaciones (con push automático y respeto a preferencias)
// Parámetro opcional `categoria`: una de 'credencial' | 'autorizaciones' | 'noticias' | 'sistema'
async function createNotification(nuusuid, tipo, titulo, mensaje, metadata = {}, categoria = null) {
  try {
    const cat = categoria || metadata?.categoria || null
    const tituloSafe = sanitizeNotificationText(String(titulo || '').trim())
    const mensajeSafe = sanitizeNotificationText(String(mensaje || '').trim())

    // Verificar preferencia in_app: si está desactivado, no guardar en BD
    if (cat) {
      const pref = await getNotifPref(nuusuid, cat)
      if (!pref.in_app) {
        console.log(`🔕 Notificación in_app desactivada para ${nuusuid} (cat=${cat}): ${tituloSafe}`)
        // Aun así intentar push si está habilitado
        if (pref.push) {
          const tokensResult = await db.query(
            'SELECT push_token FROM push_tokens WHERE nuusuid = $1 AND activo = TRUE',
            [nuusuid]
          )
          for (const row of tokensResult.rows) {
            await sendPushNotification(row.push_token, tituloSafe, mensajeSafe, { tipo, ...metadata })
          }
        }
        return
      }
    }

    // Guardar notificación en BD
    await db.query(
      `INSERT INTO notifications (nuusuid, tipo, titulo, mensaje, metadata) 
      VALUES ($1, $2, $3, $4, $5)`,
      [nuusuid, tipo, tituloSafe, mensajeSafe, JSON.stringify({ ...(metadata || {}), categoria: cat })]
    )
    console.log(`📬 Notificación creada para usuario ${nuusuid}: ${tituloSafe}`)

    // Verificar preferencia push antes de enviar
    if (cat) {
      const pref = await getNotifPref(nuusuid, cat)
      if (!pref.push) {
        console.log(`🔕 Push desactivado para ${nuusuid} (cat=${cat}): ${titulo}`)
        return
      }
    }

    // Obtener push tokens activos del usuario
    const tokensResult = await db.query(
      'SELECT push_token FROM push_tokens WHERE nuusuid = $1 AND activo = TRUE',
      [nuusuid]
    )

    // Enviar push notification a todos los dispositivos
    if (tokensResult.rows.length > 0) {
      console.log(`📱 Enviando push a ${tokensResult.rows.length} dispositivo(s)...`)
      
      for (const row of tokensResult.rows) {
        await sendPushNotification(
          row.push_token,
          tituloSafe,
          mensajeSafe,
          { tipo, notificationId: nuusuid, categoria: cat, ...metadata }
        )
      }
    } else {
      console.log('ℹ️  No hay dispositivos registrados para push')
    }
  } catch (error) {
    console.error('❌ Error al crear notificación:', error)
  }
}

app.get('/profile', (req, res) => {
  res.json({ username: 'demo' })
})

// Compartir credencial (endpoints existentes)
const sharedCredentials = new Map()

app.post('/credencial/compartir', (req, res) => {
  const { duracion = 60 } = req.body
  const shareToken = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64')
  const expiresAt = Date.now() + (duracion * 60 * 1000)

  sharedCredentials.set(shareToken, { expiresAt })

  res.json({
    shareToken,
    shareUrl: `http://localhost:${PORT}/credencial/shared/${shareToken}`,
    expiresAt,
    duracionMinutos: duracion
  })
})

app.get('/credencial/shared/:token', (req, res) => {
  const { token } = req.params
  const share = sharedCredentials.get(token)

  if (!share) {
    return res.status(404).json({ error: 'Enlace no encontrado' })
  }

  if (Date.now() > share.expiresAt) {
    sharedCredentials.delete(token)
    return res.status(410).json({ error: 'Enlace expirado' })
  }

  res.json({
    data: {
      numeroAfiliado: '123456789',
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '12345678',
      plan: 'Plan 210'
    }
  })
})

// GET /credencial/token-valido - Valida si un token temporal de credencial es vigente
// Útil para receptores (ej. SIA) que no pueden replicar el algoritmo SHA256 localmente
// Parámetros: ?afiliadoId=XXX&token=NNN (token = 3 dígitos)
app.get('/credencial/token-valido', async (req, res) => {
  const { afiliadoId, token } = req.query

  if (!afiliadoId || !token) {
    return res.status(400).json({ error: 'Parámetros requeridos: afiliadoId, token' })
  }

  if (!/^\d{3}$/.test(token)) {
    return res.status(400).json({ error: 'El token debe ser un número de 3 dígitos (000-999)' })
  }

  try {
    const tokenService = require('./tokenService')
    const timeoutMinutes = await tokenService.getTimeoutMinutes()
    const now = new Date()
    const bucketMs = timeoutMinutes * 60 * 1000
    const epoch = now.getTime()
    const bucketActual = Math.floor(epoch / bucketMs)

    // Validar contra bucket actual y anterior (tolerancia a timing en borde de ventana)
    const tokenActual = await tokenService.generateTokenFor(afiliadoId, now)
    const tokenAnterior = await tokenService.generateTokenFor(afiliadoId, new Date(epoch - bucketMs))

    const valido = token === tokenActual || token === tokenAnterior

    const finDelBucket = (bucketActual + 1) * bucketMs
    const segundosRestantes = Math.max(0, Math.floor((finDelBucket - epoch) / 1000))

    return res.json({
      valido,
      expiraEn: new Date(finDelBucket).toISOString(),
      segundosRestantes,
      timeoutMinutos: timeoutMinutes
    })
  } catch (err) {
    console.error('Error validando token credencial:', err.message)
    return res.status(500).json({ error: 'Error interno al validar token' })
  }
})

// GET /credencial/token-valido-dni - Valida token de presencialidad dado un DNI de usuario
// Seguridad: autenticación (Bearer token o API Key SIA), rate limiting estricto por IP+DNI,
//            validación estricta de entrada, sin fuga de información, audit log con DNI enmascarado.
// Parámetros: ?dni=XXXXXXXX&token=NNN  |  Headers: Authorization: Bearer <token>  O  X-API-Key: <clave SIA>
app.get('/credencial/token-valido-dni', rateLimiters.tokenValidacionDni, async (req, res) => {
  const ip = getClientIp(req)
  const requestId = req.requestId || `tv-${Date.now()}`

  // ── 1. Verificar si el endpoint está habilitado ───────────────────────────
  const habilitado = await getParametroBoolean('CREDENCIAL', 'HabilitarValidTokenDni', true)
  if (!habilitado) {
    return res.status(503).json({ error: 'ENDPOINT_DISABLED', message: 'Endpoint deshabilitado temporalmente.' })
  }

  // ── 2. Autenticación: Bearer token (sesión local) o API Key (sistemas SIA) ──
  const authHeader = req.headers['authorization'] || ''
  const apiKey = req.headers['x-api-key'] || ''
  let autenticado = false

  if (authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7).trim()
    if (bearerToken && sessions && sessions.has(bearerToken)) {
      autenticado = true
    }
  }

  if (!autenticado && apiKey) {
    const clavePermitida = await getParametro('CREDENCIAL', 'ApiKeySistemaExterno', '')
    if (clavePermitida && apiKey === clavePermitida) {
      autenticado = true
    }
  }

  if (!autenticado) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(), level: 'warn',
      event: 'token_dni_auth_fail', requestId, ip,
    }))
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Autenticación requerida.' })
  }

  // ── 3. Validación estricta de parámetros ─────────────────────────────────
  const dniRaw = String(req.query.dni || '').trim()
  const tokenRaw = String(req.query.token || '').trim()

  if (!dniRaw || !tokenRaw) {
    return sendLegacyValidationError(res, 'Parámetros requeridos: dni, token', 'dni')
  }

  // DNI: solo dígitos, entre 6 y 9 caracteres (AR)
  if (!/^\d{6,9}$/.test(dniRaw)) {
    return sendLegacyValidationError(res, 'Formato de DNI inválido.', 'dni')
  }

  // Token: exactamente 3 dígitos
  if (!/^\d{3}$/.test(tokenRaw)) {
    return sendLegacyValidationError(res, 'El token debe ser un número de 3 dígitos (000-999).', 'token')
  }

  const dniMasked = dniRaw.slice(0, 2) + '****' + dniRaw.slice(-1)
  const normalizarDoc = (v) => String(v || '').replace(/\D/g, '').replace(/^0+/, '')

  try {
    // ── 4. Flujo solicitado: DNI -> nuusuari -> nuusuafili -> crcreden.crcreid -> crcredocum ──
    const usuarioResult = await db.pool.query(
      `SELECT nuusuafili
       FROM nuusuari
       WHERE nuusunroaf::text LIKE $1
         AND nuusuafili IS NOT NULL
         AND nuusuafili <> ''
       LIMIT 1`,
      ['%' + dniRaw + '%']
    )

    if (usuarioResult.rows.length === 0) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(), level: 'warn',
        event: 'token_dni_not_found_nuusuari', requestId, ip, dniMasked,
      }))
      return res.json({ valido: false })
    }

    const afiliadoId = String(usuarioResult.rows[0].nuusuafili || '').trim()

    const credencialResult = await db.pool.query(
      `SELECT crcredocum
       FROM crcreden
       WHERE TRIM(crcreid::text) = $1
       LIMIT 1`,
      [afiliadoId]
    )

    if (credencialResult.rows.length === 0) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(), level: 'warn',
        event: 'token_dni_not_found_crcreden', requestId, ip, dniMasked,
      }))
      return res.json({ valido: false })
    }

    const documCredencial = String(credencialResult.rows[0].crcredocum || '').trim()
    const dniConsultaNorm = normalizarDoc(dniRaw)
    const documNorm = normalizarDoc(documCredencial)

    // Si no coincide el documento de credencial con el DNI consultado, cortar flujo
    if (!dniConsultaNorm || !documNorm || dniConsultaNorm !== documNorm) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(), level: 'warn',
        event: 'token_dni_doc_mismatch', requestId, ip, dniMasked,
      }))
      return res.json({ valido: false })
    }

    // ── 5. Validar token ─────────────────────────────────────────────────────
    const tokenService = require('./tokenService')
    const timeoutMinutes = await tokenService.getTimeoutMinutes()
    const now = new Date()
    const bucketMs = timeoutMinutes * 60 * 1000
    const epoch = now.getTime()
    const bucketActual = Math.floor(epoch / bucketMs)

    const tokenActual = await tokenService.generateTokenFor(afiliadoId, now)
    const tokenAnterior = await tokenService.generateTokenFor(afiliadoId, new Date(epoch - bucketMs))

    const valido = tokenRaw === tokenActual || tokenRaw === tokenAnterior

    const finDelBucket = (bucketActual + 1) * bucketMs
    const segundosRestantes = Math.max(0, Math.floor((finDelBucket - epoch) / 1000))

    // ── 6. Audit log ─────────────────────────────────────────────────────────
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(), level: 'info',
      event: 'token_dni_validacion', requestId, ip, dniMasked,
      valido, segundosRestantes,
    }))

    return res.json({
      valido,
      expiraEn: new Date(finDelBucket).toISOString(),
      segundosRestantes,
      timeoutMinutos: timeoutMinutes,
    })
  } catch (err) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(), level: 'error',
      event: 'token_dni_error', requestId, ip, dniMasked,
      error: err.message,
    }))
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error interno al validar token.' })
  }
})

// POST /credencial/sync-manual - Sincronización manual para scripts de migración
// Solo accesible desde localhost o con token de autorización
app.post('/credencial/sync-manual', async (req, res) => {
  try {
    // Verificar que la petición viene de localhost
    const isLocalhost = req.ip === '127.0.0.1' || 
                       req.ip === '::1' || 
                       req.ip === '::ffff:127.0.0.1' ||
                       req.hostname === 'localhost';
    
    if (!isLocalhost) {
      const authHeader = req.headers['authorization'];
      // Permitir con Bearer token válido
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ 
          error: 'Acceso denegado',
          message: 'Este endpoint solo es accesible desde localhost o con token válido'
        });
      }
      
      // Verificar token en sessions (permite usar tokens de usuarios autenticados)
      const token = authHeader.substring(7);
      const session = sessions.get(token);
      if (!session) {
        return res.status(401).json({ 
          error: 'Token inválido',
          message: 'El token proporcionado no es válido o ha expirado'
        });
      }
    }
    
    const { nuusuid, afiliadoId } = req.body;
    
    if (!nuusuid || !afiliadoId) {
      return res.status(400).json({ 
        error: 'Parámetros requeridos',
        message: 'Se requieren nuusuid y afiliadoId'
      });
    }
    
    console.log(`🔄 [/credencial/sync-manual] Sincronizando nuusuid=${nuusuid}, AfiliadoId=${afiliadoId}`);
    
    const syncResult = await syncCredencialesGrupoFamiliar(nuusuid, afiliadoId);
    
    console.log(`✅ Sync manual completado: ${syncResult.credenciales.length} credenciales`);
    
    // Adjuntar tokens temporales
    try {
      const tokenService = require('./tokenService');
      const now = new Date();
      const timeoutMinutes = await tokenService.getTimeoutMinutes();
      
      await Promise.all((syncResult.credenciales || []).map(async (c) => {
        const afiliadoForToken = c.crcreafili || c.AfiliadoId || afiliadoId;
        c.tokenTemporal = await tokenService.generateTokenFor(afiliadoForToken, now);
        c.tokenTemporalGeneradoEn = now.toISOString();
        c.tokenTemporalVenceEn = new Date(now.getTime() + timeoutMinutes * 60 * 1000).toISOString();
      }));
    } catch (e) {
      console.warn('⚠️  No se pudo adjuntar token temporal:', e.message);
    }
    
    return res.json({
      success: true,
      credenciales: syncResult.credenciales,
      sync: syncResult.sync,
      credencialesInfo: syncResult.credencialesInfo || null,
      soapMensajes: syncResult.soapMensajes || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en /credencial/sync-manual:', error);

    if (error?.code === 'AFILIACION_NO_VIGENTE') {
      return res.status(403).json({
        error: 'Afiliación no vigente',
        code: 'AFILIACION_NO_VIGENTE',
        message: 'El afiliado no figura activo en el padrón de WS_BENEF. No se renovó la credencial.',
        details: error.details || error.message
      })
    }

    if (error?.code === 'AFILIACION_VALIDACION_NO_DISPONIBLE') {
      return res.status(503).json({
        error: 'No se pudo validar afiliación',
        code: 'AFILIACION_VALIDACION_NO_DISPONIBLE',
        message: 'No se pudo verificar la afiliación en WS_BENEF en este momento. Intente nuevamente.',
        details: error.details || error.message
      })
    }

    if (error?.code === 'PARAMETROS_INVALIDOS') {
      return res.status(400).json({
        error: 'Parámetros inválidos',
        code: 'PARAMETROS_INVALIDOS',
        message: 'No se pudo validar afiliación por datos incompletos del afiliado.',
        details: error.details || error.message
      })
    }

    res.status(500).json({ 
      error: 'Error sincronizando credenciales',
      details: error.message 
    });
  }
});

// ===== ADMINISTRACIÓN DE PARÁMETROS (Autenticado) =====

const AdminGrupoParamsSchema = z.object({
  grupo: z.string().min(1).max(30).transform((v) => v.trim()),
})

const AdminGrupoTipoParamsSchema = z.object({
  grupo: z.string().min(1).max(30).transform((v) => v.trim()),
  tipo: z.string().min(1).max(30).transform((v) => v.trim()),
})

const AdminParametroValorBodySchema = z.object({
  valor: z.union([z.string(), z.number(), z.boolean()]).transform((v) => String(v)),
})

const AdminParametroCreateBodySchema = z.object({
  grupo: z.string().min(1).max(30).transform((v) => v.trim()),
  tipo: z.string().min(1).max(30).transform((v) => v.trim()),
  valor: z.union([z.string(), z.number(), z.boolean()]).transform((v) => String(v)),
})

// Middleware: verificar autenticación
// Middleware de autenticación híbrido: GAM OAuth2 + sesiones locales legacy
async function requireAuth(req, res, next) {
  console.log('🔐 requireAuth ejecutándose...')
  let authHeader = req.headers['authorization']
  if (!authHeader) {
    const cookieToken = getCookieValue(req, ADMIN_AUTH_COOKIE_NAME)
    if (cookieToken) {
      authHeader = `Bearer ${cookieToken}`
      console.log('🍪 Usando token de cookie HttpOnly para autenticación')
    }
  }
  console.log('🔐 authHeader:', authHeader ? authHeader.substring(0, 50) : 'NO PRESENTE')
  if (!authHeader) {
    console.log('❌ No hay Authorization header')
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'No autorizado. Token o credenciales requeridas.'
    })
  }

  const parts = String(authHeader).trim().split(/\s+/)
  const scheme = (parts[0] || '').toLowerCase()
  const credentials = parts.slice(1).join(' ').trim()

  // ========== BASIC AUTH (para GeneXus y otros sistemas) ==========
  if (scheme === 'basic') {
    console.log('🔑 Autenticación Basic Auth detectada')
    
    try {
      // Decodificar Base64: "user:password"
      const decoded = Buffer.from(credentials, 'base64').toString('utf-8')
      const [username, password] = decoded.split(':')
      
      if (!username || !password) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Credenciales Basic Auth inválidas'
        })
      }
      
      console.log(`🔐 Basic Auth - Usuario: ${username}`)
      
      // Autenticar con la BD (mismo flujo que /auth/login)
      const user = await userRepository.findForLogin(username)
      
      if (!user) {
        console.log(`❌ Usuario no encontrado: ${username}`)
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Usuario o contraseña incorrectos'
        })
      }
      
      // Verificar contraseña (el hash está en nuusuauth)
      const storedHash = user.nuusuauth && user.nuusuauth.nuusupass
      
      if (!storedHash) {
        console.log(`❌ Usuario sin contraseña en nuusuauth: ${username}`)
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Usuario o contraseña incorrectos'
        })
      }
      
      const validPassword = await verifyPassword(password, storedHash)
      
      if (!validPassword) {
        console.log(`❌ Contraseña incorrecta para usuario: ${username}`)
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Usuario o contraseña incorrectos'
        })
      }
      
      // Verificar que no esté desactivado
      const fechaBaja = user.nuusubajaf
      const esUsuarioDesactivado = fechaBaja && new Date(fechaBaja).getFullYear() > 1900
      
      if (esUsuarioDesactivado) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Usuario desactivado',
          fechaBaja: user.nuusubajaf
        })
      }
      
      console.log(`✅ Basic Auth exitoso: ${user.nuusumail || username}`)
      
      // Crear sesión
      req.session = {
        nuusuid: user.nuusuid,
        username: user.nuusumail || username,
        email: user.nuusumail || null,
        afiliadoId: user.nuusuafili || '',
        authType: 'BASIC_AUTH'
      }
      
      return next()
      
    } catch (error) {
      console.error('❌ Error procesando Basic Auth:', error.message)
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Error procesando credenciales Basic Auth'
      })
    }
  }

  // ========== BEARER TOKEN (existente - para app móvil) ==========
  if (scheme !== 'bearer' || !credentials) {
    console.log('❌ Authorization inválido (se espera "Bearer <token>" o "Basic <credentials>")')
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'No autorizado. Formato esperado: Bearer <token> o Basic <credentials>.'
    })
  }

  const token = credentials
  console.log('🔑 Token Bearer recibido:', token.substring(0, 40) + '...')

  // Preferir sesión local si existe (evita falsos positivos al validar con GAM)
  const localSession = sessions.get(token)
  if (localSession) {
    touchSessionActivity({ token, sessionId: localSession.sessionId, req })
    req.session = {
      ...sessions.get(token),
      authType: 'LOCAL'
    }
    return next()
  }

  // JWT local persistente: permite mantener sesión aunque se reinicie el backend.
  try {
    const jwtSession = verifyLocalJwt(token)
    if (jwtSession && jwtSession.nuusuid) {
      if (!jwtSession.isAdmin) {
        const user = await userRepository.findPublicById(String(jwtSession.nuusuid))
        if (!user) {
          return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Usuario no encontrado en sistema local'
          })
        }

        const fechaBaja = user.nuusubajaf
        const esUsuarioDesactivado = fechaBaja && new Date(fechaBaja).getFullYear() > 1900
        if (esUsuarioDesactivado) {
          return res.status(403).json({
            error: 'FORBIDDEN',
            message: 'Usuario desactivado',
            fechaBaja: user.nuusubajaf
          })
        }
      }

      req.session = {
        nuusuid: String(jwtSession.nuusuid),
        username: jwtSession.username || null,
        afiliadoId: jwtSession.afiliadoId || '',
        isAdmin: !!jwtSession.isAdmin,
        sessionId: jwtSession.sessionId || null,
        authType: jwtSession.isAdmin ? 'LOCAL_ADMIN_JWT' : 'LOCAL_JWT'
      }
      touchSessionActivity({ token, sessionId: req.session.sessionId, req })
      return next()
    }
  } catch {
    // No es JWT local válido
  }

  // Heurística: evitar validar contra GAM tokens locales cortos.
  // Los tokens GAM suelen ser muy largos, tipo JWT (xxx.yyy.zzz) o contener '!'.
  const isProbablyGamToken = (t) => {
    if (!t) return false
    if (t.includes('!')) return true
    if (t.split('.').length === 3) return true
    if (t.length >= 120) return true
    return false
  }

  // Intentar validar como token GAM (OAuth2) solo si parece token GAM.
  // Para tokens locales (base64 corto) se omite GAM y se verifica sessions Map.
  if (isProbablyGamToken(token)) {
    try {
      const userInfo = await gamService.getUserInfo(token)
    
    // GAM puede retornar GUID o Id según versión/config
    const gamUserId = userInfo?.GUID || userInfo?.Id || userInfo?.id

      if (userInfo && gamUserId) {
        console.log('✅ Token GAM válido:', userInfo.EMail || userInfo.Email || userInfo.Name)

      // Buscar usuario en BD por GUID/Id de GAM o por token almacenado
      let user = await userRepository.findPublicByGamUserId(String(gamUserId))
      if (!user) {
        user = await userRepository.findPublicByGamToken(token)
      }

      if (!user) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Usuario no encontrado en sistema local',
          gamUserId
        })
      }
      
      // Verificar si usuario está desactivado
      // Fecha 0001-01-01 se considera NULL (usuario activo)
      const fechaBaja = user.nuusubajaf
      const esUsuarioDesactivado = fechaBaja && 
        new Date(fechaBaja).getFullYear() > 1900
      
      if (esUsuarioDesactivado) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Usuario desactivado',
          fechaBaja: user.nuusubajaf
        })
      }
      
      // Guardar datos de sesión GAM en request
      req.session = {
        nuusuid: user.nuusuid,
        username: user.nuusumail,
        email: userInfo.EMail || userInfo.Email,
        gamUserId,
        afiliadoId: user.nuusuafili,
        authType: 'GAM',
        gamUserInfo: userInfo
      }
      touchSessionActivity({ token, sessionId: req.session.sessionId, req })
      
      console.log('✅ req.session seteada:', {
        nuusuid: req.session.nuusuid,
        afiliadoId: req.session.afiliadoId
      })
      
        return next()
      }
    } catch (gamError) {
      // Si falla validación GAM, intentar con sesión local (usuarios legacy)
      console.log('🔍 Token GAM rechazado, verificando sesión local...')
      console.log('Error GAM:', gamError.message || gamError)

      // Si el error es 401, el token GAM expiró
      if (gamError.statusCode === 401 || gamError.message?.includes('401')) {
        console.log('❌ Token GAM expirado o inválido')
      }
    }
  }
  
  // Validación de sesión local (usuarios legacy)
  const session = sessions.get(token)

  if (!session) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      code: 'TOKEN_EXPIRED',
      message: 'Tu sesión ha expirado. Por favor iniciá sesión nuevamente.'
    })
  }

  // Guardar datos de sesión local en request
  req.session = {
    ...session,
    authType: 'LOCAL'
  }
  touchSessionActivity({ token, sessionId: session.sessionId, req })
  
  next()
}

// Middleware: verificar que el usuario es administrador
async function requireAdmin(req, res, next) {
  console.log('🔐 requireAdmin ejecutándose...')
  
  if (!req.session) {
    console.log('❌ No hay sesión en request')
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'No autorizado'
    })
  }
  
  // Verificar si es admin por sesión local (LOCAL_ADMIN_JWT o admin user)
  if (req.session.isAdmin) {
    console.log('✅ Usuario es admin (por sesión)', req.session.nuusuid)
    return next()
  }
  
  try {
    const backendAdminEmails = await getBackendAdminEmails()
    const backendAdminSet = new Set(backendAdminEmails.map((email) => normalizeEmail(email)))
    const userEmail = normalizeEmail(req.session.email || req.session.username)

    if (userEmail && backendAdminSet.has(userEmail)) {
      console.log('✅ Usuario es admin (por lista backend)', userEmail)
      return next()
    }

    console.log('❌ Usuario NO es admin:', req.session.nuusuid, userEmail)
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Acceso denegado. Solo administradores pueden acceder a este recurso.'
    })
  } catch (error) {
    console.error('❌ Error validando admin backend:', error)
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error validando permisos de administrador'
    })
  }
}

// ============================================================================
// ADMIN EMAIL — Diagnóstico y test del servicio de email
// ============================================================================

// GET /admin/email/status — Estado de configuración de email
app.get('/admin/email/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const emailService = require('./emailService')
    const result = await emailService.verifyEmailConfig()
    res.json({ success: true, ...result })
  } catch (error) {
    console.error('❌ Error en GET /admin/email/status:', error)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message })
  }
})

// POST /admin/email/test — Enviar email de prueba
app.post('/admin/email/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { to } = req.body
    if (!to) {
      return sendLegacyValidationError(res, 'Campo "to" requerido (email de destino)', 'to')
    }
    const emailService = require('./emailService')
    const result = await emailService.sendTestEmail(to)
    await writeAdminAuditLog({
      req,
      entity: 'email',
      action: 'SEND_TEST',
      summary: `Email de prueba enviado a ${to}`,
      meta: { to },
    })
    res.json(result)
  } catch (error) {
    console.error('❌ Error en POST /admin/email/test:', error)
    res.status(500).json({ error: 'SEND_ERROR', message: error.message || String(error) })
  }
})

// POST /admin/email/send — Enviar email genérico (admin)
app.post('/admin/email/send', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { to, subject, body, isHtml } = req.body
    if (!to || !subject || !body) {
      return sendLegacyValidationError(res, 'Campos requeridos: to, subject, body', 'to')
    }
    const emailService = require('./emailService')
    const result = await emailService.sendSimpleEmail({
      to: Array.isArray(to) ? to : [to],
      subject,
      body,
      isHtml: isHtml === true || isHtml === 'true',
    })
    await writeAdminAuditLog({
      req,
      entity: 'email',
      action: 'SEND',
      summary: `Email administrativo enviado a ${Array.isArray(to) ? to.length : 1} destinatario(s)`,
      meta: {
        to: Array.isArray(to) ? to : [to],
        subject,
        isHtml: isHtml === true || isHtml === 'true',
        bodyLength: typeof body === 'string' ? body.length : 0,
      },
    })
    res.json(result)
  } catch (error) {
    console.error('❌ Error en POST /admin/email/send:', error)
    res.status(500).json({ error: 'SEND_ERROR', message: error.message || String(error) })
  }
})

// POST /admin/email/clear-cache — Limpiar cache de configuración email
app.post('/admin/email/clear-cache', requireAuth, requireAdmin, async (req, res) => {
  try {
    const emailService = require('./emailService')
    emailService.clearEmailCache()
    await writeAdminAuditLog({
      req,
      entity: 'email',
      action: 'CLEAR_CACHE',
      summary: 'Cache de email limpiado manualmente',
    })
    res.json({ success: true, message: 'Cache de email limpiado (SMTP + API)' })
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message })
  }
})

// GET /admin/parametros - Listar todos los parámetros (requiere auth)
app.get('/admin/parametros', requireAuth, requirePermission('parametros'), async (req, res) => {
  try {
    const parametros = await parametrosRepository.listAll()

    const parametrosConRedaccion = parametros.map((p) => ({
      ...p,
      nusisvalpa: esParametroSensible(p.nusisgrupa, p.nusistippa) && String(p.nusisvalpa ?? '').trim() !== ''
        ? '<redacted>'
        : p.nusisvalpa,
    }))

    res.json({
      success: true,
      total: parametrosConRedaccion.length,
      parametros: parametrosConRedaccion
    })
  } catch (error) {
    console.error('Error al listar parámetros:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    })
  }
})

// GET /admin/parametros/:grupo - Listar parámetros de un grupo (requiere auth)
app.get('/admin/parametros/:grupo', requireAuth, requirePermission('parametros'), validateParams(AdminGrupoParamsSchema), async (req, res) => {
  try {
    const { grupo } = req.params
    const parametros = await parametrosRepository.listByGrupo(grupo)

    const parametrosConRedaccion = parametros.map((p) => ({
      ...p,
      nusisvalpa: esParametroSensible(p.nusisgrupa, p.nusistippa) && String(p.nusisvalpa ?? '').trim() !== ''
        ? '<redacted>'
        : p.nusisvalpa,
    }))

    if (parametrosConRedaccion.length === 0) {
      return res.status(404).json({ 
        error: 'Grupo no encontrado',
        grupo 
      })
    }
    
    res.json({
      success: true,
      grupo,
      total: parametrosConRedaccion.length,
      parametros: parametrosConRedaccion
    })
  } catch (error) {
    console.error('Error al obtener parámetros del grupo:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    })
  }
})

// GET /admin/parametros/:grupo/:tipo - Obtener parámetro específico (requiere auth)
app.get('/admin/parametros/:grupo/:tipo', requireAuth, requirePermission('parametros'), validateParams(AdminGrupoTipoParamsSchema), async (req, res) => {
  try {
    const { grupo, tipo } = req.params
    const parametro = await parametrosRepository.findOne(grupo, tipo)

    if (!parametro) {
      return res.status(404).json({ 
        error: 'Parámetro no encontrado',
        grupo,
        tipo 
      })
    }
    
    res.json({
      success: true,
      parametro
    })
  } catch (error) {
    console.error('Error al obtener parámetro:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    })
  }
})

// PUT /admin/parametros/:grupo/:tipo - Actualizar parámetro (requiere auth)
app.put(
      '/admin/parametros/:grupo/:tipo',
      requireAuth,
      requirePermission('parametros'),
      validateParams(AdminGrupoTipoParamsSchema),
      validateBody(AdminParametroValorBodySchema),
      async (req, res) => {
        try {
          const { grupo, tipo } = req.params
          const { valor } = req.body
          const parametroPrevio = await parametrosRepository.findOne(grupo, tipo)

          let parametro
          try {
            parametro = await parametrosRepository.update(grupo, tipo, valor)
          } catch (e) {
            // Prisma P2025: record not found
            if (e?.code === 'P2025') {
              return res.status(404).json({
                error: 'Parámetro no encontrado',
                grupo,
                tipo,
              })
            }
            throw e
          }

          // Forzar recarga del cache
          await recargarParametros()

          const valorLog = esParametroSensible(grupo, tipo) ? '<redacted>' : valor
          console.log(`✅ Parámetro actualizado por ${req.session.username}: ${grupo}.${tipo} = ${valorLog}`)

          await writeAdminAuditLog({
            req,
            entity: 'parametro',
            entityId: `${grupo}.${tipo}`,
            action: 'UPDATE',
            summary: `Parámetro ${grupo}.${tipo} actualizado`,
            before: redactParametroAuditState(parametroPrevio),
            after: redactParametroAuditState(parametro),
          })

          res.json({
            success: true,
            message: 'Parámetro actualizado correctamente',
            parametro
          })
        } catch (error) {
          console.error('Error al actualizar parámetro:', error)
          res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: 'Error interno del servidor'
          })
        }
      }
    )

// POST /admin/parametros - Crear nuevo parámetro (requiere auth)
app.post('/admin/parametros', requireAuth, requirePermission('parametros'), validateBody(AdminParametroCreateBodySchema), async (req, res) => {
  try {
    const { grupo, tipo, valor } = req.body

    let parametro
    try {
      parametro = await parametrosRepository.create(grupo, tipo, valor)
    } catch (e) {
      // Prisma P2002: unique constraint failed (PK compuesta)
      if (e?.code === 'P2002') {
        return res.status(409).json({
          error: 'El parámetro ya existe. Use PUT para actualizar.',
          grupo,
          tipo,
        })
      }
      throw e
    }
    
    // Forzar recarga del cache
    await recargarParametros()
    
    const valorLog = esParametroSensible(grupo, tipo) ? '<redacted>' : valor
    console.log(`✅ Parámetro creado por ${req.session.username}: ${grupo}.${tipo} = ${valorLog}`)

    await writeAdminAuditLog({
      req,
      entity: 'parametro',
      entityId: `${grupo}.${tipo}`,
      action: 'CREATE',
      summary: `Parámetro ${grupo}.${tipo} creado`,
      after: redactParametroAuditState(parametro),
    })
    
    res.status(201).json({
      success: true,
      message: 'Parámetro creado correctamente',
      parametro
    })
  } catch (error) {
    console.error('Error al crear parámetro:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    })
  }
})

// DELETE /admin/parametros/:grupo/:tipo - Eliminar parámetro (requiere auth)
app.delete('/admin/parametros/:grupo/:tipo', requireAuth, requirePermission('parametros'), validateParams(AdminGrupoTipoParamsSchema), async (req, res) => {
  try {
    const { grupo, tipo } = req.params
    const parametroPrevio = await parametrosRepository.findOne(grupo, tipo)

    let parametroEliminado
    try {
      parametroEliminado = await parametrosRepository.remove(grupo, tipo)
    } catch (e) {
      if (e?.code === 'P2025') {
        return res.status(404).json({
          error: 'Parámetro no encontrado',
          grupo,
          tipo,
        })
      }
      throw e
    }
    
    // Forzar recarga del cache
    await recargarParametros()
    
    console.log(`🗑️  Parámetro eliminado por ${req.session.username}: ${grupo}.${tipo}`)

    await writeAdminAuditLog({
      req,
      entity: 'parametro',
      entityId: `${grupo}.${tipo}`,
      action: 'DELETE',
      summary: `Parámetro ${grupo}.${tipo} eliminado`,
      before: redactParametroAuditState(parametroPrevio || parametroEliminado),
    })
    
    res.json({
      success: true,
      message: 'Parámetro eliminado correctamente',
      parametroEliminado
    })
  } catch (error) {
    console.error('Error al eliminar parámetro:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    })
  }
})

// ===== SISTEMA INTERNO DE CONFIGURACIÓN (nusispar) =====

// Caché de parámetros en memoria
const parametrosCache = new Map()
let parametrosCacheTimestamp = 0
const CACHE_TTL_MS = 60000 // 1 minuto

// Cargar todos los parámetros en memoria
async function cargarParametros() {
  try {
    const prisma = getPrisma()
    const parametros = await prisma.nusispar.findMany({
      select: { nusisgrupa: true, nusistippa: true, nusisvalpa: true },
      orderBy: [{ nusisgrupa: 'asc' }, { nusistippa: 'asc' }],
    })

    parametrosCache.clear()
    for (const row of parametros) {
      const nusisgrupa = String(row.nusisgrupa).trim()
      const nusistippa = String(row.nusistippa).trim()
      const key = `${nusisgrupa}.${nusistippa}`
      parametrosCache.set(key, row.nusisvalpa)
    }
    
    parametrosCacheTimestamp = Date.now()
    console.log(`📊 Parámetros cargados: ${parametrosCache.size} configuraciones`)
    return true
  } catch (error) {
    console.error('❌ Error al cargar parámetros:', error)
    return false
  }
}

// Obtener un parámetro (con cache y fallback)
async function getParametro(grupo, tipo, fallback = null) {
  const grupoNorm = String(grupo ?? '').trim()
  const tipoNorm = String(tipo ?? '').trim()

  // Verificar si cache expiró
  if (Date.now() - parametrosCacheTimestamp > CACHE_TTL_MS) {
    await cargarParametros()
  }
  
  const key = `${grupoNorm}.${tipoNorm}`
  let valor = parametrosCache.get(key)

  if (valor === undefined) {
    // Fallback por si en algún lugar se pasa grupo/tipo con minúsculas
    // (en este proyecto los grupos se usan en mayúsculas, e.g. WSBENEFTK/WSSIATK)
    const upperKey = `${grupoNorm.toUpperCase()}.${tipoNorm}`
    if (upperKey !== key) {
      valor = parametrosCache.get(upperKey)
    }

    if (valor === undefined) {
      const upperKey2 = `${grupoNorm.toUpperCase()}.${tipoNorm.toUpperCase()}`
      if (upperKey2 !== key) {
        valor = parametrosCache.get(upperKey2)
      }
    }
  }
  
  if (valor !== undefined) {
    return valor
  }
  
  // Si no está en cache, intentar desde BD directamente
  try {
    const prisma = getPrisma()
    const tryKeys = [
      { nusisgrupa: grupoNorm, nusistippa: tipoNorm, cacheKey: key },
      { nusisgrupa: grupoNorm.toUpperCase(), nusistippa: tipoNorm, cacheKey: `${grupoNorm.toUpperCase()}.${tipoNorm}` },
      { nusisgrupa: grupoNorm.toUpperCase(), nusistippa: tipoNorm.toUpperCase(), cacheKey: `${grupoNorm.toUpperCase()}.${tipoNorm.toUpperCase()}` },
    ]

    for (const k of tryKeys) {
      if (!k.nusisgrupa || !k.nusistippa) continue
      const row = await prisma.nusispar.findUnique({
        where: { nusisgrupa_nusistippa: { nusisgrupa: k.nusisgrupa, nusistippa: k.nusistippa } },
        select: { nusisvalpa: true },
      })

      if (row) {
        const v = row.nusisvalpa
        parametrosCache.set(k.cacheKey, v) // Actualizar cache con la key usada
        return v
      }
    }
  } catch (error) {
    console.error(`Error consultando parámetro ${grupoNorm}.${tipoNorm}:`, error)
  }
  
  return fallback
}

// Obtener parámetro como número
async function getParametroNumero(grupo, tipo, fallback = 0) {
  const valor = await getParametro(grupo, tipo, String(fallback))
  const numero = parseInt(valor)
  return isNaN(numero) ? fallback : numero
}

// Obtener parámetro como booleano (S/N)
async function getParametroBoolean(grupo, tipo, fallback = false) {
  const valor = await getParametro(grupo, tipo, fallback ? 'S' : 'N')
  return valor === 'S' || valor === 'true' || valor === '1'
}

async function getMaxFotosAutorizacion() {
  const valor = await getParametroNumero('FUNCIONES_APP', 'MaxFotosAutorizacion', 5)
  return Math.min(5, Math.max(1, valor || 5))
}

// Forzar recarga de parámetros (para uso interno)
async function recargarParametros() {
  console.log('🔄 Recargando parámetros...')
  return await cargarParametros()
}

function esParametroSensible(grupo, tipo) {
  const g = String(grupo ?? '').trim().toUpperCase()
  const t = String(tipo ?? '').trim().toUpperCase()

  if (t.includes('PASSWORD')) return true
  if (t.includes('SECRET')) return true
  if (t.includes('TOKEN')) return true
  if (t.includes('APIKEY') || t.includes('API_KEY')) return true

  if (g === 'GAM' && (t.includes('CLIENT') || t.includes('SECRET'))) return true

  return false
}

async function validarParametrosRequeridos() {
  const required = [
    'WSBENEFTK.Host',
    'WSBENEFTK.Port',
    'WSBENEFTK.Secure',
    'WSBENEFTK.BaseUrl',
    'WSBENEFTK.Servicio',
    'WSBENEFTK.User',
    'WSBENEFTK.Password',
    'WSSIATK.Host',
    'WSSIATK.Port',
    'WSSIATK.Secure',
    'WSSIATK.BaseUrl',
    'WSSIATK.Servicio',
    'WSSIATK.User',
    'WSSIATK.Password',
  ]

  const missing = []
  for (const key of required) {
    const [grupo, tipo] = key.split('.')
    const val = await getParametro(grupo, tipo, null)
    if (val === null || val === undefined || String(val).trim() === '') {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    console.warn('⚠️  Parámetros nusispar faltantes para SOAP/SIA:')
    for (const k of missing) console.warn(`   - ${k}`)
    console.warn('   Tip: podés cargarlos con set-soap-params.ps1 o desde /admin')
    return false
  }

  console.log('✅ Parámetros nusispar SOAP/SIA completos')
  return true
}

// ============================================================================
// ENDPOINTS PARA PARÁMETROS DE FUNCIONES
// ============================================================================

// GET /parametros/funciones-app/habilitar-autoriz-sin-orden
// Lee el parámetro que habilita autorizaciones sin prescripción
app.get('/parametros/funciones-app/habilitar-autoriz-sin-orden', async (req, res) => {
  try {
    const valor = await getParametro('FUNCIONES_APP', 'HabilitarAutorizSinOrden', 'N')
    const habilitado = valor === 'S'
    
    console.log(`📋 GET /parametros/funciones-app/habilitar-autoriz-sin-orden: ${valor} (${habilitado ? 'HABILITADO' : 'DESHABILITADO'})`)
    
    res.json({
      habilitado,
      valor
    })
  } catch (error) {
    console.error('❌ Error al leer parámetro HabilitarAutorizSinOrden:', error)
    res.status(500).json({
      error: 'Error al leer parámetro',
      details: error.message
    })
  }
})

// GET /parametros/funciones-app/max-fotos-autorizacion
// Lee el parámetro que define el máximo configurable de fotos por solicitud tipo P
app.get('/parametros/funciones-app/max-fotos-autorizacion', async (req, res) => {
  try {
    const valor = await getParametro('FUNCIONES_APP', 'MaxFotosAutorizacion', '5')
    const maxFotos = await getMaxFotosAutorizacion()

    console.log(`📋 GET /parametros/funciones-app/max-fotos-autorizacion: ${valor} (max ${maxFotos})`)

    res.json({
      maxFotos,
      valor: String(valor ?? maxFotos),
      minFotos: 1,
      maxPermitido: 5,
    })
  } catch (error) {
    console.error('❌ Error al leer parámetro MaxFotosAutorizacion:', error)
    res.status(500).json({
      error: 'Error al leer parámetro',
      details: error.message
    })
  }
})

// ============================================================================
// ENDPOINTS PÚBLICOS PARA FEATURE FLAGS (sin autenticación)
// ============================================================================

// GET /feature-flags
// Retorna todos los feature flags con su estado actual
// Útil para mobile: obtener en login y cachear localmente
app.get('/feature-flags', async (req, res) => {
  try {
    const flags = await featureFlagsService.obtenerTodosLosFlags(getParametro)
    const porModulo = {}
    
    // Agrupar por módulo para facilitar lectura
    for (const flag of flags) {
      if (!porModulo[flag.modulo]) {
        porModulo[flag.modulo] = []
      }
      porModulo[flag.modulo].push({
        nombre: flag.nombre,
        habilitado: flag.habilitado,
        impacto: flag.impacto,
      })
    }
    
    console.log(`📊 GET /feature-flags: ${flags.length} flags (`+
      `${flags.filter(f => f.habilitado).length} habilitados)`)
    
    res.json({
      success: true,
      total: flags.length,
      totalHabilitados: flags.filter(f => f.habilitado).length,
      timestamp: new Date().toISOString(),
      flags,
      porModulo,
    })
  } catch (error) {
    console.error('❌ Error al obtener feature flags:', error)
    res.status(500).json({
      error: 'Error al obtener feature flags',
      details: error.message
    })
  }
})

// GET /feature-flags/:nombre
// Obtener estado de un flag específico
app.get('/feature-flags/:nombre', async (req, res) => {
  try {
    const { nombre } = req.params
    
    if (!featureFlagsService.esUsunaFlagValido(nombre)) {
      return res.status(404).json({
        error: 'Flag no encontrado',
        nombre,
        sugerencia: 'Usa /feature-flags para ver lista completa',
      })
    }
    
    const habilitado = await featureFlagsService.obtenerFlag(nombre, getParametroBoolean)
    const definicion = featureFlagsService.FLAG_DEFINITIONS[nombre]
    
    console.log(`📋 GET /feature-flags/${nombre}: ${habilitado ? 'ON' : 'OFF'}`)
    
    res.json({
      success: true,
      nombre,
      habilitado,
      ...definicion,
    })
  } catch (error) {
    console.error(`❌ Error al obtener flag ${req.params.nombre}:`, error)
    res.status(500).json({
      error: 'Error al obtener feature flag',
      details: error.message
    })
  }
})

// GET /feature-flags/modulo/:modulo
// Obtener flags de un módulo específico
app.get('/feature-flags/modulo/:modulo', async (req, res) => {
  try {
    const { modulo } = req.params
    const flags = await featureFlagsService.obtenerFlagsPorModulo(modulo, getParametro)
    
    console.log(`📊 GET /feature-flags/modulo/${modulo}: ${flags.length} flags`)
    
    res.json({
      success: true,
      modulo,
      total: flags.length,
      totalHabilitados: flags.filter(f => f.habilitado).length,
      flags: flags.map(f => ({
        nombre: f.nombre,
        habilitado: f.habilitado,
        impacto: f.impacto,
      })),
    })
  } catch (error) {
    console.error(`❌ Error al obtener flags del módulo ${req.params.modulo}:`, error)
    res.status(500).json({
      error: 'Error al obtener feature flags por módulo',
      details: error.message
    })
  }
})

// ============================================================================
// GET /home/botonera — Botonera principal parametrizable del Home
// ============================================================================
//
// Devuelve la lista de botones configurados en nusispar (BOTONERA_PRINCIPAL.Botones).
// Si no existe el parámetro, devuelve el set por defecto hardcodeado.
// No requiere autenticación: es configuración de UI pública.
//
// Respuesta:
//   { success: true, botones: HomeButton[], version: number, generadoEn: string }
//
// Seed inicial: backend/db/insert_botonera_principal.sql
// ============================================================================

const HOME_BUTTONS_DEFAULT_BACKEND = [
  {
    id: 'autorizaciones',
    label: 'Autorizaciones',
    icon: 'document-text-outline',
    iconColor: '#F59E0B',
    iconBg: '#FFF5EB',
    route: 'SolicitudAutorizacionRoot',
    orden: 1,
    habilitado: true,
    featureFlagKey: 'HabilitarAutorizaciones',
    badgeKey: 'tramites_pendientes',
  },
  {
    id: 'farmacias',
    label: 'Farmacias',
    icon: 'medkit-outline',
    iconColor: '#EF4444',
    iconBg: '#FFF0F0',
    route: 'Farmacias',
    orden: 2,
    habilitado: true,
    featureFlagKey: 'HabilitarFarmacias',
  },
  {
    id: 'tramites',
    label: 'Trámites',
    icon: 'layers-outline',
    iconColor: '#8B5CF6',
    iconBg: '#F5F3FF',
    route: 'Transactions',
    orden: 3,
    habilitado: true,
    featureFlagKey: 'HabilitarTramites',
  },
  {
    id: 'historial_medico',
    label: 'Historial médico',
    icon: 'pulse-outline',
    iconColor: '#059669',
    iconBg: '#ECFDF5',
    route: 'Profile',
    routeParams: { screen: 'HistorialAtencion', params: { from: 'Home' } },
    orden: 4,
    habilitado: true,
    featureFlagKey: 'HabilitarHistorialAtencion',
  },
  {
    id: 'delegaciones',
    label: 'Delegaciones',
    icon: 'business-outline',
    iconColor: '#6366F1',
    iconBg: '#EEF2FF',
    route: 'Delegaciones',
    orden: 5,
    habilitado: true,
    featureFlagKey: 'HabilitarDelegaciones',
  },
  {
    id: 'mas_acciones',
    label: 'Más acciones',
    icon: 'add-circle-outline',
    iconColor: '#64748B',
    iconBg: '#F1F5F9',
    route: 'InfoUtil',
    orden: 6,
    habilitado: true,
    esAccionExtra: true,
    // Sin featureFlagKey: siempre visible
  },
]

app.get('/home/botonera', async (req, res) => {
  try {
    const raw = await getParametro('BOTONERA_PRINCIPAL', 'Botones', null)
    const version = await getParametroNumero('BOTONERA_PRINCIPAL', 'Version', 1)

    let botones
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          botones = parsed
        } else {
          console.warn('⚠️  BOTONERA_PRINCIPAL.Botones no es array válido, usando defaults')
          botones = HOME_BUTTONS_DEFAULT_BACKEND
        }
      } catch (parseErr) {
        console.error('❌ Error al parsear BOTONERA_PRINCIPAL.Botones:', parseErr.message)
        botones = HOME_BUTTONS_DEFAULT_BACKEND
      }
    } else {
      console.log('ℹ️  BOTONERA_PRINCIPAL.Botones no configurado en nusispar, usando defaults')
      botones = HOME_BUTTONS_DEFAULT_BACKEND
    }

    // 1. Ordenar por campo "orden"
    const botonesOrdenados = botones
      .slice()
      .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99))

    // 2. Aplicar feature flags de FUNCIONES_APP para cada botón que tenga featureFlagKey.
    //    Los botones sin featureFlagKey (ej: "Más acciones") siempre pasan.
    //    Valor 'S' = habilitado, cualquier otro valor = deshabilitado.
    const botonesConFlags = []
    for (const btn of botonesOrdenados) {
      if (!btn.habilitado) continue  // excluir los marcados como deshabilitados en datos

      if (!btn.featureFlagKey) {
        botonesConFlags.push(btn)
        continue
      }

      const valor = await getParametro('FUNCIONES_APP', btn.featureFlagKey, 'S')
      if (valor === 'S' || valor === 's') {
        botonesConFlags.push(btn)
      } else {
        console.log(`🔒 Botón '${btn.id}' oculto por FUNCIONES_APP.${btn.featureFlagKey}=${valor}`)
      }
    }

    console.log(`🎛️  GET /home/botonera: ${botonesConFlags.length}/${botonesOrdenados.length} botones activos, v${version}`)

    res.json({
      success: true,
      botones: botonesConFlags,
      version,
      generadoEn: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error en GET /home/botonera:', error)
    // Fallback con defaults sin filtrado de flags para no romper la app
    res.json({
      success: true,
      botones: HOME_BUTTONS_DEFAULT_BACKEND.filter(b => b.habilitado),
      version: 1,
      generadoEn: new Date().toISOString(),
      _fallback: true,
    })
  }
})

// ============================================================================
// ENDPOINTS REST PARA SERVICIOS SIA
// ============================================================================

// POST /sia/prestaciones - REC_PRESTACIONES_APP
// Devuelve listado de prestaciones disponibles (sin parámetros)
app.post('/sia/prestaciones', async (req, res) => {
  try {
    console.log('📥 POST /sia/prestaciones - REC_PRESTACIONES_APP')
    console.log('📋 Body recibido:', JSON.stringify(req.body))
    
    // REC_PRESTACIONES_APP no requiere parámetros
    console.log('🔄 Llamando a callSoapExecuteSIA con string vacío...')
    const result = await callSoapExecuteSIA('REC_PRESTACIONES_APP', '')
    console.log('📦 Resultado SOAP recibido:', JSON.stringify(result, null, 2))
    
    const parsed = parseSoapResult(result)
    console.log('📦 Resultado parseado:', JSON.stringify(parsed, null, 2))
    
    if (!parsed.ok) {
      console.error('❌ Error en parseSoapResult:', parsed.errorDsc, parsed.mensajes)
      return res.status(400).json({ 
        error: parsed.errorDsc || 'Error al obtener prestaciones', 
        mensajes: parsed.mensajes 
      })
    }
    
    // El payload de REC_PRESTACIONES_APP devuelve un objeto {Resultado: "[{...}]"}
    // donde Resultado es un STRING JSON con array de prestaciones
    let prestaciones = []
    
    if (parsed.payload && parsed.payload.Resultado) {
      try {
        // Parsear el string JSON dentro de Resultado
        const resultadoArray = JSON.parse(parsed.payload.Resultado)
        
        // Mapear campos SIA (Id, Descripcion) a frontend (AULPresID, AULPresDescripcion)
        prestaciones = resultadoArray.map(p => ({
          AULPresID: p.Id,
          AULPresDescripcion: (p.Descripcion || '').trim() // Trim espacios en blanco
        }))
        
        console.log(`✅ Prestaciones parseadas: ${prestaciones.length}`)
        if (prestaciones.length > 0) {
          console.log('📋 Primera prestación:', prestaciones[0])
          console.log('📋 Última prestación:', prestaciones[prestaciones.length - 1])
        }
      } catch (parseError) {
        console.error('❌ Error parseando Resultado JSON:', parseError.message)
        console.error('   Resultado recibido:', parsed.payload.Resultado)
      }
    } else {
      console.warn('⚠️ parsed.payload.Resultado no encontrado')
    }
    
    res.json({ 
      success: true, 
      prestaciones,
      total: prestaciones.length
    })
  } catch (error) {
    console.error('❌ Error en REC_PRESTACIONES_APP:', error)
    res.status(500).json({ 
      error: 'Error al obtener prestaciones',
      details: error.message 
    })
  }
})

// GET /mis-autorizaciones - Obtener autorizaciones del usuario desde SIA y sincronizar con BD local
// Requiere autenticación
app.get('/mis-autorizaciones', requireAuth, async (req, res) => {
  try {
    const nuusuid = req.session.nuusuid
    console.log('📋 ========== GET /mis-autorizaciones (BD → SOAP SYNC) ==========')
    console.log('   Usuario (nuusuid):', nuusuid)

    const safeTrim = (value) => (value == null ? '' : String(value)).trim()

    const normalizeEstadoFilter = (value) => {
      const estado = safeTrim(value).toUpperCase()
      const allowed = new Set(['ENV', 'AUD', 'AUT', 'REC', 'PEN', 'CON'])
      return allowed.has(estado) ? estado : ''
    }

    const normalizeTipoFilter = (value) => {
      const tipo = safeTrim(value).toUpperCase()
      return tipo === 'P' || tipo === 'S' ? tipo : ''
    }

    const normalizeDateFilter = (value) => {
      const fecha = safeTrim(value)
      if (!fecha) return ''
      const match = fecha.match(/^\d{4}-\d{2}-\d{2}$/)
      return match ? match[0] : ''
    }

    const filtros = {
      estado: normalizeEstadoFilter(req.query.estado),
      tipo: normalizeTipoFilter(req.query.tipo),
      fechaDesde: normalizeDateFilter(req.query.fechaDesde),
      fechaHasta: normalizeDateFilter(req.query.fechaHasta),
      search: safeTrim(req.query.search || req.query.q || '').toLowerCase()
    }

    console.log('   🎛️ Filtros recibidos:', filtros)

    const normalizeFecha = (value) => {
      const s = safeTrim(value)
      if (!s) return ''
      if (s === '0000-00-00' || s === '0001-01-01' || s.startsWith('0001-01-01')) return ''

      // Si ya viene en formato ISO-ish, lo dejamos para evitar corrimientos de zona horaria.
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)

      const d = new Date(s)
      if (Number.isNaN(d.getTime())) return ''
      return d.toISOString().slice(0, 10)
    }

    const normalizeCodigo = (value) => {
      const raw = safeTrim(value)
      if (!raw) return ''
      return raw.replace(/\.0+$/, '')
    }

    const matchesServerFilters = (item) => {
      if (filtros.estado && safeTrim(item?.estado).toUpperCase() !== filtros.estado) return false
      if (filtros.tipo && safeTrim(item?.tipo).toUpperCase() !== filtros.tipo) return false

      const fechaItem = safeTrim(item?.fecha_orden || item?.fecha_alta).slice(0, 10)
      if (filtros.fechaDesde && fechaItem && fechaItem < filtros.fechaDesde) return false
      if (filtros.fechaHasta && fechaItem && fechaItem > filtros.fechaHasta) return false

      if (filtros.search) {
        const searchableFields = [
          item?.descripcion,
          item?.texto,
          item?.profesional,
          item?.prestacion_descripcion,
          item?.gravamen_descripcion,
          item?.afiliado_nombre,
          item?.numero_afiliado,
          item?.autorizacion_numero
        ]
        const hayMatch = searchableFields
          .map((value) => safeTrim(value).toLowerCase())
          .some((value) => value.includes(filtros.search))

        if (!hayMatch) return false
      }

      return true
    }

    const prestacionesDescripcionById = new Map()
    try {
      const prestacionesRaw = await callSoapExecuteSIA('REC_PRESTACIONES_APP', '')
      const prestacionesParsed = parseSoapResult(prestacionesRaw)
      if (prestacionesParsed.ok) {
        let prestacionesPayload = prestacionesParsed.payload
        if (prestacionesPayload?.Resultado && typeof prestacionesPayload.Resultado === 'string') {
          try {
            prestacionesPayload = JSON.parse(prestacionesPayload.Resultado)
          } catch (e) {
            prestacionesPayload = []
          }
        }

        const prestacionesArray = Array.isArray(prestacionesPayload)
          ? prestacionesPayload
          : prestacionesPayload?.Prestaciones || prestacionesPayload?.PrestacionItem || []

        for (const item of prestacionesArray) {
          const codigo = safeTrim(item?.Id || item?.AULPresID || item?.AUSolPresId)
          const codigoNormalizado = normalizeCodigo(codigo)
          const descripcion = safeTrim(item?.Descripcion || item?.AULPresDescripcion || item?.AUSolPresDescripcion)
          if ((codigo || codigoNormalizado) && descripcion) {
            prestacionesDescripcionById.set(codigo, descripcion)
            if (codigoNormalizado) {
              prestacionesDescripcionById.set(codigoNormalizado, descripcion)
            }
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ No se pudo precargar descripciones de prestaciones para /mis-autorizaciones')
    }

    const getPrestacionDescripcion = (codigo, soapData = null) => {
      const codigoSafe = safeTrim(codigo)
      const codigoNormalizado = normalizeCodigo(codigoSafe)
      const desdeSoap = safeTrim(
        soapData?.AUSolPresDescripcion ||
        soapData?.AUSolPresDesc ||
        soapData?.AUSolPresDsc ||
        soapData?.AUSolPrestacionDescripcion ||
        soapData?.AUSolPrestacionDesc
      )
      if (desdeSoap) return desdeSoap
      if (codigoSafe && prestacionesDescripcionById.has(codigoSafe)) {
        return prestacionesDescripcionById.get(codigoSafe)
      }
      if (codigoNormalizado && prestacionesDescripcionById.has(codigoNormalizado)) {
        return prestacionesDescripcionById.get(codigoNormalizado)
      }
      return ''
    }

    const gravamenDescripcionByNroAfiliado = new Map()

    const normalizeTipoSolicitud = (value) => {
      const tipo = safeTrim(value).toUpperCase()
      return tipo === 'P' || tipo === 'S' ? tipo : ''
    }

    const resolveTipoSolicitud = ({ soapTipo = '', localTipo = '', fotosCount = 0 } = {}) => {
      const fotos = Number(fotosCount || 0)
      if (fotos > 0) return 'P'

      const tipoLocal = normalizeTipoSolicitud(localTipo)
      if (tipoLocal) return tipoLocal

      const tipoSoap = normalizeTipoSolicitud(soapTipo)
      if (tipoSoap) return tipoSoap

      return 'S'
    }

    const getGravamenDescripcion = (soapData = null) => {
      return safeTrim(
        soapData?.AUSolGravDescripcion ||
        soapData?.AUSolGravDesc ||
        soapData?.AUSolGravDsc ||
        soapData?.AUSolGravNombre ||
        soapData?.AUSolCoberturaDescripcion ||
        soapData?.AUSolCoberturaDesc
      )
    }

    const getGravamenDescripcionByCodigo = (soapData, codigo, nroAfiliado, localDescripcion = '') => {
      const desdeSoap = getGravamenDescripcion(soapData)
      if (desdeSoap) return desdeSoap

      const desdeLocal = safeTrim(localDescripcion)
      if (desdeLocal) return desdeLocal

      const nro = safeTrim(nroAfiliado)
      const codigoSafe = normalizeCodigo(codigo)
      if (!nro || !codigoSafe) return ''

      const mapCoberturas = gravamenDescripcionByNroAfiliado.get(nro)
      if (!mapCoberturas) return ''

      return mapCoberturas.get(codigoSafe) || ''
    }

    const detallePrestacionCache = new Map()

    const parseDetalleConsumoItems = (payload) => {
      if (!payload) return []
      if (Array.isArray(payload)) return payload

      if (typeof payload.Resultado === 'string') {
        try {
          const parsed = JSON.parse(payload.Resultado)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      }

      if (Array.isArray(payload.Resultado)) return payload.Resultado
      if (Array.isArray(payload.items)) return payload.items
      if (Array.isArray(payload.data)) return payload.data
      return []
    }

    const getPrestacionDesdeDetalle = async (numeroDelegacion, numeroAutorizacion) => {
      const delegacion = Number.parseInt(String(numeroDelegacion || ''), 10)
      const autorizacion = Number.parseInt(String(numeroAutorizacion || ''), 10)

      if (!Number.isFinite(delegacion) || !Number.isFinite(autorizacion)) return ''

      const cacheKey = `${delegacion}:${autorizacion}`
      if (detallePrestacionCache.has(cacheKey)) {
        return detallePrestacionCache.get(cacheKey)
      }

      try {
        const detalleRaw = await callSoapExecuteSIA('AUDETALLE_CONSUMO_APP', {
          NumeroDelegacion: delegacion,
          NumeroAutorizacion: autorizacion
        })
        const detalleParsed = parseSoapResult(detalleRaw)
        if (!detalleParsed.ok) {
          detallePrestacionCache.set(cacheKey, '')
          return ''
        }

        const items = parseDetalleConsumoItems(detalleParsed.payload)
        const first = Array.isArray(items) && items.length > 0 ? items[0] : null
        const descripcion = safeTrim(
          first?.Prestacion ||
          first?.NombrePractica ||
          first?.Descripcion ||
          first?.Detalle
        )

        detallePrestacionCache.set(cacheKey, descripcion)
        return descripcion
      } catch {
        detallePrestacionCache.set(cacheKey, '')
        return ''
      }
    }
    
    // PASO 1: Leer solicitudes guardadas en BD local (tabla ausolici)
    // JOIN con crcreden para obtener nombre del afiliado usando ausolnroaf
    const queryLocal = `
            SELECT a.ausolicid, a.ausoldescr, a.ausolfecal, a.ausolfecor, a.ausoltipo, a.ausolestad,
              a.ausolcantp, a.ausolpsoco, a.ausolautnu, a.autippreid, a.ausoltexto, a.ausolextid, a.ausolgravc, a.ausolentno,
             a.ausolnroaf, c.crcreapeno as afiliado_nombre,
             a.xmin::text::bigint as orden_local,
             COALESCE(af.fotos_count, 0) as fotos_count
      FROM ausolici a
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS fotos_count
        FROM ausoaufo af2
        WHERE af2.ausolicid = a.ausolicid
      ) af ON true
      LEFT JOIN crcreden c ON a.ausolnroaf = c.crcrenroaf AND c.crcreid IN (
        SELECT crcreid FROM crcredus WHERE nuusuid = $1
      )
      WHERE a.nuusuid = $1
      ORDER BY DATE(a.ausolfecor) DESC, DATE(a.ausolfecal) DESC, a.xmin::text::bigint DESC
    `
    const localResult = await db.pool.query(queryLocal, [nuusuid])
    console.log(`   📂 ${localResult.rows.length} solicitudes encontradas en BD local`)
    
    if (localResult.rows.length === 0) {
      console.log('   ℹ️  Usuario sin solicitudes en BD local')
      return res.json({
        success: true,
        autorizaciones: [],
        total: 0,
        sincronizado: true
      })
    }

    const fechaEnrol = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

    const nroAfiliados = [...new Set(localResult.rows.map((row) => safeTrim(row.ausolnroaf)).filter(Boolean))]
    for (const nroAfiliado of nroAfiliados) {
      try {
        const credQuery = `
          SELECT c.crcreid
          FROM crcreden c
          INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
          WHERE cu.nuusuid = $1
            AND (
              TRIM(c.crcrenroaf) = $2 OR
              regexp_replace(TRIM(c.crcrenroaf), '[^0-9]', '', 'g') = $3
            )
          LIMIT 1
        `
        const nroDigits = nroAfiliado.replace(/[^0-9]/g, '')
        const cred = await db.pool.query(credQuery, [nuusuid, nroAfiliado, nroDigits])
        const crcreid = safeTrim(cred.rows[0]?.crcreid)
        if (!crcreid) continue

        const nroInternoPersona = crcreid.replace(/[^0-9]/g, '').slice(-9)
        if (!nroInternoPersona) continue

        const enrolRaw = await callSoapExecuteSIA('ENROLAMIENTOS', {
          NroInternoPersona: nroInternoPersona,
          Fecha: fechaEnrol
        })
        const enrolParsed = parseSoapResult(enrolRaw)
        if (!enrolParsed.ok) continue

        let enrolamientos = []
        const payload = enrolParsed.payload
        if (Array.isArray(payload)) {
          enrolamientos = payload
        } else if (payload?.Coberturas) {
          enrolamientos = Array.isArray(payload.Coberturas) ? payload.Coberturas : [payload.Coberturas]
        } else if (payload?.Enrolamientos) {
          enrolamientos = Array.isArray(payload.Enrolamientos) ? payload.Enrolamientos : [payload.Enrolamientos]
        } else if (payload?.EnrolamientoItem) {
          enrolamientos = Array.isArray(payload.EnrolamientoItem) ? payload.EnrolamientoItem : [payload.EnrolamientoItem]
        }

        const mapCoberturas = new Map()
        for (const item of enrolamientos) {
          const codigo = normalizeCodigo(item?.CodigoCobertura || item?.EnrolCodigo || item?.Codigo)
          const descripcion = safeTrim(item?.DescripcionCobertura || item?.EnrolDescripcion || item?.Descripcion || item?.Detalle)
          if (codigo && descripcion) {
            mapCoberturas.set(codigo, descripcion)
          }
        }

        if (mapCoberturas.size > 0) {
          gravamenDescripcionByNroAfiliado.set(nroAfiliado, mapCoberturas)
        }
      } catch (e) {
        console.warn(`⚠️ No se pudo precargar gravámenes para afiliado ${nroAfiliado}`)
      }
    }
    
    // PASO 2: Para cada AUSolicId, consultar estado actual en SOAP
    const autorizacionesActualizadas = []
    const debugLogs = [] // Array para capturar logs de debug
    
    for (const solicitud of localResult.rows) {
      const ausolicid = solicitud.ausolicid
      const tipoLocalResolved = resolveTipoSolicitud({
        localTipo: solicitud.ausoltipo,
        fotosCount: solicitud.fotos_count
      })
      
      if (!ausolicid) {
        console.log(`   ⚠️  Solicitud sin ID válido, usando datos locales`)
        autorizacionesActualizadas.push({
          ausolicid: null,
          descripcion: solicitud.ausoldescr || '',
          texto: safeTrim(solicitud.ausoltexto) || safeTrim(solicitud.ausoldescr),
          fecha_alta: normalizeFecha(solicitud.ausolfecal) || normalizeFecha(solicitud.ausolfecor),
          fecha_orden: normalizeFecha(solicitud.ausolfecor) || normalizeFecha(solicitud.ausolfecal),
          tipo: tipoLocalResolved,
          estado: solicitud.ausolestad || 'PEN',
          cantidad: solicitud.ausolcantp || 1,
          profesional: solicitud.ausolpsoco || '',
          autorizacion_numero: safeTrim(solicitud.ausolautnu),
          numero_delegacion: '',
          tipo_prestacion_id: solicitud.autippreid || '',
          prestacion_descripcion: getPrestacionDescripcion(solicitud.autippreid),
          gravamen_descripcion: getGravamenDescripcionByCodigo(null, solicitud.ausolgravc, solicitud.ausolnroaf, solicitud.ausolentno),
          gravamen_codigo: safeTrim(solicitud.ausolgravc),
          afiliado_nombre: safeTrim(solicitud.afiliado_nombre) || 'Sin nombre',
          numero_afiliado: safeTrim(solicitud.ausolnroaf),
          orden_local: Number(solicitud.orden_local) || 0
        })
        continue
      }
      
      try {
        console.log(`   🔍 Consultando ausolicid: ${ausolicid}`)
        
        // Consultar estado actual en SOAP usando ausolicid
        const parametros = {
          Mode: 'DSP',
          AUSolIdExt: ausolicid
        }
        
        const result = await callSoapExecuteSIA('REC_SOLICITUDES_APP', parametros)
        const parsed = parseSoapResult(result)
        
        if (!parsed.ok) {
          console.error(`   ❌ Error consultando ${ausolicid}:`, parsed.errorDsc)
          // Usar datos locales si falla SOAP
          autorizacionesActualizadas.push({
            ausolicid: ausolicid,
            descripcion: solicitud.ausoldescr || '',
            texto: safeTrim(solicitud.ausoltexto) || safeTrim(solicitud.ausoldescr),
            fecha_alta: normalizeFecha(solicitud.ausolfecal) || normalizeFecha(solicitud.ausolfecor),
            fecha_orden: normalizeFecha(solicitud.ausolfecor) || normalizeFecha(solicitud.ausolfecal),
            tipo: tipoLocalResolved,
            estado: solicitud.ausolestad || 'PEN',
            afiliado_nombre: safeTrim(solicitud.afiliado_nombre) || 'Sin nombre',
            numero_afiliado: safeTrim(solicitud.ausolnroaf),
            cantidad: solicitud.ausolcantp || 1,
            profesional: solicitud.ausolpsoco || '',
            autorizacion_numero: safeTrim(solicitud.ausolautnu),
            numero_delegacion: '',
            tipo_prestacion_id: solicitud.autippreid || '',
            prestacion_descripcion: getPrestacionDescripcion(solicitud.autippreid),
            gravamen_descripcion: getGravamenDescripcionByCodigo(null, solicitud.ausolgravc, solicitud.ausolnroaf, solicitud.ausolentno),
            gravamen_codigo: safeTrim(solicitud.ausolgravc),
            orden_local: Number(solicitud.orden_local) || 0
          })
          continue
        }
        
        // Parsear payload SOAP (puede venir como objeto o string JSON en Resultado)
        let authData = null
        
        if (parsed.payload.Resultado) {
          try {
            authData = JSON.parse(parsed.payload.Resultado)
          } catch (e) {
            authData = parsed.payload
          }
        } else {
          authData = parsed.payload
        }
        
        // Validar que sea una respuesta válida
        if (!authData || authData.AUSolId === 0) {
          console.log(`   ⚠️  Solicitud ${ausolicid} no encontrada en SIA, usando datos locales`)
          autorizacionesActualizadas.push({
            ausolicid: ausolicid,
            descripcion: solicitud.ausoldescr || '',
            texto: safeTrim(solicitud.ausoltexto) || safeTrim(solicitud.ausoldescr),
            fecha_alta: normalizeFecha(solicitud.ausolfecal) || normalizeFecha(solicitud.ausolfecor),
            fecha_orden: normalizeFecha(solicitud.ausolfecor) || normalizeFecha(solicitud.ausolfecal),
            tipo: tipoLocalResolved,
            estado: solicitud.ausolestad || 'PEN',
            cantidad: solicitud.ausolcantp || 1,
            profesional: solicitud.ausolpsoco || '',
            autorizacion_numero: safeTrim(solicitud.ausolautnu),
            numero_delegacion: '',
            tipo_prestacion_id: solicitud.autippreid || '',
            prestacion_descripcion: getPrestacionDescripcion(solicitud.autippreid),
            gravamen_descripcion: getGravamenDescripcionByCodigo(null, solicitud.ausolgravc, solicitud.ausolnroaf, solicitud.ausolentno),
            gravamen_codigo: safeTrim(solicitud.ausolgravc)
          })
          continue
        }
        
        console.log(`   ✅ Solicitud ${ausolicid} encontrada en SIA`)
        console.log(`   📊 TODOS los campos SOAP recibidos:`, JSON.stringify(authData, null, 2))
        debugLogs.push({
          ausolicid,
          soap_completo: authData,
          timestamp: new Date().toISOString()
        })
        
        // PASO 3: Detectar cambios comparando datos locales vs SOAP
        // IMPORTANTE: SIA a veces devuelve campos vacíos; no debemos pisar valores locales con ''.
        const estadoSOAP = safeTrim(authData.AUSolAutEstado) || 'PEN'
        const descripcionSOAP = safeTrim(authData.AUSolRefAfiliado || authData.AUSolDescripcion)
        // AUSolAutNumero puede ser número, convertir a string
        const autorizacionSOAP = authData.AUSolAutNumero ? String(authData.AUSolAutNumero) : (safeTrim(authData.AUAutNumero) || '')
        const numeroDelegacionFinal = safeTrim(
          authData.NumeroDelegacion ||
          authData.AUSolAutDCodigo ||
          authData.AUSolDelegacion ||
          authData.AUSolAutDelegacion
        )

        const descripcionFinal = descripcionSOAP || safeTrim(solicitud.ausoldescr)
        const autorizacionFinal = autorizacionSOAP || safeTrim(solicitud.ausolautnu)
        const textoSOAP = safeTrim(authData.AUSolTexto || authData.AUSolTextoSolicitud || authData.AUSolTextoDescriptivo)
        const textoFinal = textoSOAP || safeTrim(solicitud.ausoltexto) || descripcionFinal
        const tipoFinal = resolveTipoSolicitud({
          soapTipo: authData.AUSolTipo,
          localTipo: solicitud.ausoltipo,
          fotosCount: solicitud.fotos_count
        })
        const fechaAltaSoap =
          normalizeFecha(authData.AUSolFecha || authData.AUSolFechaSolicitud || authData.AUSolFecAlta || authData.AUSolFecAl)
        const fechaOrdenSoap =
          normalizeFecha(authData.AUSolFechaOrden || authData.AUSolFechaOrdenSolicitud || authData.AUSolFecOrden || authData.AUSolFecOr)
        const fechaAltaLocal = normalizeFecha(solicitud.ausolfecal)
        const fechaOrdenLocal = normalizeFecha(solicitud.ausolfecor) || fechaAltaLocal

        // Fallback fuerte: si falta la fecha alta, usamos la fecha orden/local disponible.
        const fechaAltaFinal = fechaAltaSoap || fechaAltaLocal || fechaOrdenSoap || fechaOrdenLocal
        const fechaOrdenFinal = fechaOrdenSoap || fechaAltaSoap || fechaOrdenLocal || fechaAltaLocal
        const cantidadFinal = authData.AUSolPresCant || solicitud.ausolcantp || 1
        const profesionalFinal = safeTrim(authData.AUSolObsPref) || safeTrim(solicitud.ausolpsoco)
        const prestacionFinal = safeTrim(authData.AUSolPresId) || safeTrim(solicitud.autippreid)
        const gravamenFinal = safeTrim(authData.AUSolGravCodigo) || safeTrim(solicitud.ausolgravc)
        let prestacionDescripcionFinal = getPrestacionDescripcion(prestacionFinal, authData)
        if (!prestacionDescripcionFinal && numeroDelegacionFinal && autorizacionFinal) {
          prestacionDescripcionFinal = await getPrestacionDesdeDetalle(numeroDelegacionFinal, autorizacionFinal)
        }
        const gravamenDescripcionFinal = getGravamenDescripcionByCodigo(authData, gravamenFinal, solicitud.ausolnroaf, solicitud.ausolentno)

        console.log(`   🔍 Comparando cambios:`)
        console.log(`      Estado local: "${safeTrim(solicitud.ausolestad)}" vs SOAP: "${estadoSOAP}"`)
        console.log(`      Autorización local: "${safeTrim(solicitud.ausolautnu)}" vs SOAP: "${autorizacionFinal}"`)
        debugLogs.push({
          ausolicid,
          comparacion: {
            estado_local: safeTrim(solicitud.ausolestad),
            estado_soap: estadoSOAP,
            autorizacion_local: safeTrim(solicitud.ausolautnu),
            autorizacion_soap: autorizacionFinal,
            autorizacion_soap_numero: authData.AUSolAutNumero
          }
        })
        
        const cambiosDetectados =
          safeTrim(solicitud.ausolestad) !== estadoSOAP ||
          safeTrim(solicitud.ausoldescr) !== descripcionFinal ||
          safeTrim(solicitud.ausolautnu) !== autorizacionFinal ||
          normalizeTipoSolicitud(solicitud.ausoltipo) !== tipoFinal ||
          safeTrim(solicitud.ausolpsoco) !== profesionalFinal ||
          safeTrim(solicitud.autippreid) !== prestacionFinal ||
          safeTrim(solicitud.ausolgravc) !== gravamenFinal ||
          safeTrim(solicitud.ausolentno) !== gravamenDescripcionFinal
        
        if (cambiosDetectados) {
          console.log(`   ?? CAMBIOS DETECTADOS en solicitud ${ausolicid}:`)
          if (safeTrim(solicitud.ausolestad) !== estadoSOAP) {
            console.log(`      Estado: "${safeTrim(solicitud.ausolestad)}" ? "${estadoSOAP}"`)
          }
          if (safeTrim(solicitud.ausoldescr) !== descripcionFinal) {
            console.log(`      Descripci�n: "${safeTrim(solicitud.ausoldescr)}" ? "${descripcionFinal}"`)
          }
          if (safeTrim(solicitud.ausolautnu) !== autorizacionFinal) {
            console.log(`      Autorizaci�n: "${safeTrim(solicitud.ausolautnu)}" ? "${autorizacionFinal}"`)
          }
          
          // Actualizar en BD local con datos de SOAP
          const updateQuery = `
            UPDATE ausolici SET
              ausoldescr = $1,
              ausolfecal = $2,
              ausolfecor = $3,
              ausoltipo = $4,
              ausolestad = $5,
              ausolcantp = $6,
              ausolpsoco = $7,
              ausolautnu = $8,
              autippreid = $9,
              ausolgravc = $10,
              ausolentno = $11
            WHERE ausolicid = $12 AND nuusuid = $13
          `
          
          const updateResult = await db.pool.query(updateQuery, [
            descripcionFinal,
            fechaAltaFinal,
            fechaOrdenFinal,
            tipoFinal || '',
            estadoSOAP,
            cantidadFinal,
            profesionalFinal || '',
            autorizacionFinal,
            prestacionFinal || '',
            gravamenFinal || '',
            (gravamenDescripcionFinal || safeTrim(solicitud.ausolentno) || '').substring(0, 50),
            ausolicid,
            nuusuid
          ])
          
          console.log(`   ? BD ACTUALIZADA: ${updateResult.rowCount} fila(s) modificada(s)`)
        } else {
          console.log(`   ??  Sin cambios detectados en solicitud ${ausolicid}`)
        }
        
        // Agregar a resultado (siempre con datos actualizados de SOAP)
        autorizacionesActualizadas.push({
          ausolicid: ausolicid,
          descripcion: descripcionFinal,
          texto: textoFinal,
          fecha_alta: fechaAltaFinal,
          fecha_orden: fechaOrdenFinal,
          tipo: tipoFinal,
          estado: estadoSOAP,
          cantidad: cantidadFinal,
          profesional: profesionalFinal || '',
          autorizacion_numero: autorizacionFinal,
          numero_delegacion: numeroDelegacionFinal,
          tipo_prestacion_id: prestacionFinal,
          prestacion_descripcion: prestacionDescripcionFinal,
          gravamen_descripcion: gravamenDescripcionFinal,
          gravamen_codigo: gravamenFinal,
          afiliado_nombre: safeTrim(solicitud.afiliado_nombre) || 'Sin nombre',
          numero_afiliado: safeTrim(solicitud.ausolnroaf),
          orden_local: Number(solicitud.orden_local) || 0
        })
        
      } catch (syncError) {
        console.error(`   ⚠️  Error sincronizando ${ausolicid}:`, syncError.message)
        // Usar datos locales en caso de error
        autorizacionesActualizadas.push({
          ausolicid: ausolicid,
          descripcion: solicitud.ausoldescr || '',
          texto: safeTrim(solicitud.ausoltexto) || safeTrim(solicitud.ausoldescr),
          fecha_alta: normalizeFecha(solicitud.ausolfecal) || normalizeFecha(solicitud.ausolfecor),
          fecha_orden: normalizeFecha(solicitud.ausolfecor) || normalizeFecha(solicitud.ausolfecal),
          tipo: tipoLocalResolved,
          estado: solicitud.ausolestad || 'PEN',
          cantidad: solicitud.ausolcantp || 1,
          profesional: solicitud.ausolpsoco || '',
          autorizacion_numero: safeTrim(solicitud.ausolautnu),
          numero_delegacion: '',
          tipo_prestacion_id: solicitud.autippreid || '',
          prestacion_descripcion: getPrestacionDescripcion(solicitud.autippreid),
          gravamen_descripcion: getGravamenDescripcionByCodigo(null, solicitud.ausolgravc, solicitud.ausolnroaf, solicitud.ausolentno),
          gravamen_codigo: safeTrim(solicitud.ausolgravc),
          afiliado_nombre: safeTrim(solicitud.afiliado_nombre) || 'Sin nombre',
          numero_afiliado: safeTrim(solicitud.ausolnroaf),
          orden_local: Number(solicitud.orden_local) || 0
        })
      }
    }

    const autorizacionesFiltradas = autorizacionesActualizadas.filter(matchesServerFilters)

    autorizacionesFiltradas.sort((a, b) => {
      const fechaA = safeTrim(a.fecha_orden || a.fecha_alta).slice(0, 10)
      const fechaB = safeTrim(b.fecha_orden || b.fecha_alta).slice(0, 10)

      if (fechaA !== fechaB) {
        return fechaB.localeCompare(fechaA)
      }

      const ordenLocalA = Number(a.orden_local || 0)
      const ordenLocalB = Number(b.orden_local || 0)
      if (ordenLocalA !== ordenLocalB) {
        return ordenLocalB - ordenLocalA
      }

      return safeTrim(b.ausolicid).localeCompare(safeTrim(a.ausolicid))
    })
    
    console.log(`   ✅ Sincronización completada: ${autorizacionesFiltradas.length} autorizaciones (filtradas)`)
    console.log('   ====================================================')
    
    res.json({
      success: true,
      autorizaciones: autorizacionesFiltradas,
      total: autorizacionesFiltradas.length,
      sincronizado: true,
      filtrosAplicados: filtros,
      debug: debugLogs // Incluir logs de debug en la respuesta
    })
    
  } catch (error) {
    console.error('❌ Error en /mis-autorizaciones:', error)
    res.status(500).json({ 
      error: 'Error al obtener autorizaciones',
      details: error.message 
    })
  }
})

// GET /mis-autorizaciones/:ausolicid/fotos - Obtener fotos adjuntas de una autorización
// Requiere autenticación y valida que la solicitud pertenezca al usuario
app.get('/mis-autorizaciones/:ausolicid/fotos', requireAuth, async (req, res) => {
  try {
    const ausolicid = String(req.params.ausolicid || '').trim()
    const nuusuid = String(req.session?.nuusuid || '').trim()

    if (!ausolicid) {
      return res.status(400).json({
        error: 'Parámetros inválidos',
        message: 'ausolicid es requerido'
      })
    }

    const ownershipQuery = `
      SELECT 1
      FROM ausolici
      WHERE ausolicid = $1 AND nuusuid = $2
      LIMIT 1
    `
    const ownershipResult = await db.pool.query(ownershipQuery, [ausolicid, nuusuid])

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Solicitud no encontrada',
        message: 'La autorización no existe o no pertenece al usuario autenticado'
      })
    }

    const fotosQuery = `
      SELECT
        TRIM(af.ausolfotid) AS ausolfotid,
        encode(af.ausolf, 'base64') AS foto_base64,
        octet_length(af.ausolf) AS bytes
      FROM ausoaufo af
      WHERE af.ausolicid = $1
      ORDER BY af.ausolfotid ASC
    `

    const fotosResult = await db.pool.query(fotosQuery, [ausolicid])
    const fotos = fotosResult.rows
      .map((row) => ({
        id: row.ausolfotid,
        contentType: 'image/jpeg',
        sizeBytes: Number(row.bytes) || 0,
        dataUrl: row.foto_base64 ? `data:image/jpeg;base64,${row.foto_base64}` : ''
      }))
      .filter((foto) => !!foto.dataUrl)

    return res.json({
      success: true,
      ausolicid,
      total: fotos.length,
      fotos
    })
  } catch (error) {
    console.error('❌ Error en /mis-autorizaciones/:ausolicid/fotos:', error)
    return res.status(500).json({
      error: 'Error al obtener fotos de la autorización',
      details: error.message
    })
  }
})


// POST /sia/solicitudes - REC_SOLICITUDES_APP
// Requiere autenticación para obtener nuusuid del usuario
app.post('/sia/solicitudes', requireAuth, requirePermission('sia'), async (req, res) => {
  try {
    const safeTrim = (value) => (value == null ? '' : String(value)).trim()
    const normalizeFecha = (value) => {
      const s = safeTrim(value)
      if (!s) return ''
      if (s === '0000-00-00' || s === '0001-01-01' || s.startsWith('0001-01-01')) return ''
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
      const d = new Date(s)
      if (Number.isNaN(d.getTime())) return ''
      return d.toISOString().slice(0, 10)
    }

    const { Mode, AUSolIdExt } = req.body

    // Compatibilidad: si NO se pasa AUSolIdExt, se mantiene el comportamiento previo.
    // Si se pasa AUSolIdExt, debe ser un ausolicid (UUID) del usuario autenticado.
    let ausolIdExtFinal = String(req.session.nuusuid)

    if (AUSolIdExt) {
      const ausolicid = String(AUSolIdExt)
      const check = await db.pool.query(
        'SELECT ausolicid, ausoldescr, ausoltexto, ausolfecal, ausolfecor, ausoltipo, ausolestad, ausolcantp, ausolpsoco, ausolautnu, autippreid FROM ausolici WHERE nuusuid = $1 AND ausolicid = $2 LIMIT 1',
        [req.session.nuusuid, ausolicid]
      )
      if (check.rows.length === 0) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'AUSolIdExt no pertenece al usuario autenticado'
        })
      }
      ausolIdExtFinal = ausolicid
    }

    const parametros = {
      Mode: Mode || 'DSP',
      AUSolIdExt: ausolIdExtFinal
    }
    
    console.log('📥 POST /sia/solicitudes - REC_SOLICITUDES_APP')
    console.log('   Mode:', parametros.Mode)
    console.log('   AUSolIdExt:', parametros.AUSolIdExt)
    
    const result = await callSoapExecuteSIA('REC_SOLICITUDES_APP', parametros)
    const parsed = parseSoapResult(result)
    
    if (!parsed.ok) {
      return res.status(400).json({ 
        error: parsed.errorDsc || 'Error en servicio SIA', 
        mensajes: parsed.mensajes 
      })
    }
    
    // Si la consulta fue por AUSolIdExt=ausolicid, actualizar ausolici con la respuesta.
    if (AUSolIdExt) {
      const ausolicid = String(AUSolIdExt)

      // Parsear payload SOAP (puede venir como objeto o string JSON en Resultado)
      let authData = null
      if (parsed.payload?.Resultado) {
        try {
          authData = JSON.parse(parsed.payload.Resultado)
        } catch (e) {
          authData = parsed.payload
        }
      } else {
        authData = parsed.payload
      }

      const local = await db.pool.query(
        'SELECT ausoldescr, ausoltexto, ausolfecal, ausolfecor, ausoltipo, ausolestad, ausolcantp, ausolpsoco, ausolautnu, autippreid FROM ausolici WHERE nuusuid = $1 AND ausolicid = $2 LIMIT 1',
        [req.session.nuusuid, ausolicid]
      )
      const solicitud = local.rows[0] || {}

      if (authData && authData.AUSolId !== 0) {
        const estadoSOAP = safeTrim(authData.AUSolEstado) || safeTrim(solicitud.ausolestad) || 'PEN'
        const descripcionSOAP = safeTrim(authData.AUSolRefAfiliado || authData.AUSolDescripcion)
        const autorizacionSOAP = safeTrim(authData.AUAutNumero)
        const textoSOAP = safeTrim(authData.AUSolTexto || authData.AUSolTextoSolicitud || authData.AUSolTextoDescriptivo)

        const descripcionFinal = descripcionSOAP || safeTrim(solicitud.ausoldescr)
        const autorizacionFinal = autorizacionSOAP || safeTrim(solicitud.ausolautnu)
        const textoFinal = textoSOAP || safeTrim(solicitud.ausoltexto) || descripcionFinal
        const tipoFinal = safeTrim(authData.AUSolTipo) || safeTrim(solicitud.ausoltipo)

        const fechaAltaSoap = normalizeFecha(authData.AUSolFecha || authData.AUSolFechaSolicitud || authData.AUSolFecAlta || authData.AUSolFecAl)
        const fechaOrdenSoap = normalizeFecha(authData.AUSolFechaOrden || authData.AUSolFechaOrdenSolicitud || authData.AUSolFecOrden || authData.AUSolFecOr)
        const fechaAltaLocal = normalizeFecha(solicitud.ausolfecal)
        const fechaOrdenLocal = normalizeFecha(solicitud.ausolfecor) || fechaAltaLocal
        const fechaAltaFinal = fechaAltaSoap || fechaAltaLocal || fechaOrdenSoap || fechaOrdenLocal
        const fechaOrdenFinal = fechaOrdenSoap || fechaAltaSoap || fechaOrdenLocal || fechaAltaLocal

        const cantidadFinal = authData.AUSolPresCant || solicitud.ausolcantp || 1
        const profesionalFinal = safeTrim(authData.AUSolObsPref) || safeTrim(solicitud.ausolpsoco)
        const prestacionFinal = safeTrim(authData.AUSolPresId) || safeTrim(solicitud.autippreid)

        await db.pool.query(
          `UPDATE ausolici SET
             ausoldescr = $1,
             ausoltexto = $2,
             ausolfecal = $3,
             ausolfecor = $4,
             ausoltipo = $5,
             ausolestad = $6,
             ausolcantp = $7,
             ausolpsoco = $8,
             ausolautnu = $9,
             autippreid = $10
           WHERE nuusuid = $11 AND ausolicid = $12`,
          [
            descripcionFinal,
            textoFinal,
            fechaAltaFinal || solicitud.ausolfecal,
            fechaOrdenFinal || solicitud.ausolfecor,
            tipoFinal || '',
            estadoSOAP,
            cantidadFinal,
            profesionalFinal || '',
            autorizacionFinal,
            prestacionFinal || '',
            req.session.nuusuid,
            ausolicid
          ]
        )
      }
    }

    res.json({ success: true, data: parsed.payload })
  } catch (error) {
    console.error('❌ Error en /sia/solicitudes:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /debug/sia/rec-solicitudes - REC_SOLICITUDES_APP con AUSolIdExt arbitrario
// Solo permitido desde localhost para debugging (evita exponer consultas de terceros).
// Nota: no requiere auth porque está restringido por IP local.
app.post('/debug/sia/rec-solicitudes', async (req, res) => {
  try {
    const ip = (req.ip || '').toLowerCase()
    const remote = String(req.connection?.remoteAddress || '').toLowerCase()
    const isLocal =
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      remote === '127.0.0.1' ||
      remote === '::1' ||
      remote === '::ffff:127.0.0.1'

    if (!isLocal) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Endpoint de debugging habilitado solo desde localhost'
      })
    }

    const { Mode, AUSolIdExt } = req.body
    if (!AUSolIdExt) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'AUSolIdExt es requerido'
      })
    }

    const parametros = {
      Mode: Mode || 'DSP',
      AUSolIdExt: String(AUSolIdExt)
    }

    console.log('🧪 POST /debug/sia/rec-solicitudes - REC_SOLICITUDES_APP')
    console.log('   Mode:', parametros.Mode)
    console.log('   AUSolIdExt:', parametros.AUSolIdExt)

    const result = await callSoapExecuteSIA('REC_SOLICITUDES_APP', parametros)
    const parsed = parseSoapResult(result)

    if (!parsed.ok) {
      return res.status(400).json({
        error: parsed.errorDsc || 'Error en servicio SIA',
        mensajes: parsed.mensajes,
        payload: parsed.payload
      })
    }

    res.json({ success: true, data: parsed.payload })
  } catch (error) {
    console.error('❌ Error en /debug/sia/rec-solicitudes:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /sia/autorizacion-imprimir - AUTORIZACION_IMPRIMIR
// Requiere autenticación para obtener NUUsuAfiliadoID del usuario
app.post('/sia/autorizacion-imprimir', requireAuth, requirePermission('sia'), async (req, res) => {
  try {
    const { DelegacionNumero, AutorizacionNumero } = req.body
    
    if (!DelegacionNumero || !AutorizacionNumero) {
      return res.status(400).json({ error: 'DelegacionNumero y AutorizacionNumero son requeridos' })
    }
    
    // NUUsuAfiliadoID debe ser el nuusuid del usuario autenticado
    const parametros = {
      NUUsuAfiliadoID: req.session.nuusuid,
      DelegacionNumero: parseInt(DelegacionNumero),
      AutorizacionNumero: parseInt(AutorizacionNumero)
    }
    
    console.log('📥 POST /sia/autorizacion-imprimir - AUTORIZACION_IMPRIMIR')
    console.log('   NUUsuAfiliadoID (nuusuid):', parametros.NUUsuAfiliadoID)
    console.log('   DelegacionNumero:', parametros.DelegacionNumero)
    console.log('   AutorizacionNumero:', parametros.AutorizacionNumero)
    
    const result = await callSoapExecuteSIA('AUTORIZACION_IMPRIMIR', parametros)
    const parsed = parseSoapResult(result)
    
    if (!parsed.ok) {
      return res.status(400).json({ 
        error: parsed.errorDsc || 'Error en servicio SIA', 
        mensajes: parsed.mensajes 
      })
    }
    
    res.json({ success: true, data: parsed.payload })
  } catch (error) {
    console.error('❌ Error en /sia/autorizacion-imprimir:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /sia/prestaciones - REC_PRESTACIONES_APP
// No requiere parámetros (Parametros vacío)
app.post('/sia/prestaciones', async (req, res) => {
  try {
    console.log('📥 POST /sia/prestaciones - REC_PRESTACIONES_APP')
    console.log('   Sin parámetros (tag vacío)')
    
    // El servicio no requiere parámetros, enviar string vacío
    const result = await callSoapExecuteSIA('REC_PRESTACIONES_APP', '')
    const parsed = parseSoapResult(result)
    
    if (!parsed.ok) {
      return res.status(400).json({ 
        error: parsed.errorDsc || 'Error en servicio SIA', 
        mensajes: parsed.mensajes 
      })
    }
    
    res.json({ success: true, data: parsed.payload })
  } catch (error) {
    console.error('❌ Error en /sia/prestaciones:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /sia/pago-coseguro - PAGO_COSEGURO_APP
// Requiere autenticación (Bearer o Basic Auth)
app.post('/sia/pago-coseguro', requireAuth, requirePermission('sia'), async (req, res) => {
  try {
    const parametros = req.body
    console.log('📥 POST /sia/pago-coseguro - PAGO_COSEGURO_APP')
    
    const result = await callSoapExecuteSIA('PAGO_COSEGURO_APP', parametros)
    const parsed = parseSoapResult(result)
    
    if (!parsed.ok) {
      return res.status(400).json({ 
        error: parsed.errorDsc || 'Error en servicio SIA', 
        mensajes: parsed.mensajes 
      })
    }
    
    res.json({ success: true, data: parsed.payload })
  } catch (error) {
    console.error('❌ Error en /sia/pago-coseguro:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /sia/coseguros-pendientes - COSEGUROS_PENDIENTES_APP
// Requiere autenticación para obtener AfiliadoId del usuario
app.get('/sia/coseguros-pendientes', requireAuth, requirePermission('sia'), async (req, res) => {
  try {
    // Obtener AfiliadoId del usuario autenticado (nuusuafili)
    const userQuery = 'SELECT nuusuafili FROM nuusuari WHERE nuusuid = $1'
    const userResult = await db.pool.query(userQuery, [req.session.nuusuid])
    
    if (userResult.rows.length === 0 || !userResult.rows[0].nuusuafili) {
      return res.status(400).json({ error: 'Usuario sin AfiliadoId asociado' })
    }
    
    const parametros = {
      AfiliadoId: userResult.rows[0].nuusuafili
    }
    
    console.log('📥 GET /sia/coseguros-pendientes - COSEGUROS_PENDIENTES_APP')
    console.log('   AfiliadoId:', parametros.AfiliadoId)
    
    const result = await callSoapExecuteSIA('COSEGUROS_PENDIENTES_APP', parametros)
    const parsed = parseSoapResult(result)
    
    if (!parsed.ok) {
      return res.status(400).json({ 
        error: parsed.errorDsc || 'Error en servicio SIA', 
        mensajes: parsed.mensajes 
      })
    }
    
    res.json({ success: true, data: parsed.payload })
  } catch (error) {
    console.error('❌ Error en /sia/coseguros-pendientes:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /sia/enrolamientos - ENROLAMIENTOS
// Requiere autenticación (Bearer o Basic Auth)
app.post('/sia/enrolamientos', requireAuth, requirePermission('sia'), async (req, res) => {
  try {
    const parametros = req.body
    console.log('📥 POST /sia/enrolamientos - ENROLAMIENTOS')
    
    const result = await callSoapExecuteSIA('ENROLAMIENTOS', parametros)
    const parsed = parseSoapResult(result)
    
    if (!parsed.ok) {
      return res.status(400).json({ 
        error: parsed.errorDsc || 'Error en servicio SIA', 
        mensajes: parsed.mensajes 
      })
    }
    
    res.json({ success: true, data: parsed.payload })
  } catch (error) {
    console.error('❌ Error en /sia/enrolamientos:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /sia/enrolamientos-afiliado - Obtener enrolamientos de un afiliado
// Requiere autenticación (Bearer o Basic Auth)
app.get('/sia/enrolamientos-afiliado', requireAuth, requirePermission('sia'), async (req, res) => {
  try {
    const { AfiliadoId } = req.query
    
    if (!AfiliadoId) {
      return res.status(400).json({ error: 'AfiliadoId es requerido' })
    }
    
    console.log('📥 GET /sia/enrolamientos-afiliado')
    console.log('   🔍 AfiliadoId recibido del frontend:', AfiliadoId)
    
    // Remover guiones y espacios del AfiliadoId para buscar
    const afiliadoLimpio = AfiliadoId.replace(/[-\s]/g, '')
    console.log('   🔍 AfiliadoId sin guiones:', afiliadoLimpio)
    
    // Buscar en crcreden comparando sin guiones
    const credQuery = `
      SELECT crcreid, crcreafili
      FROM crcreden
      WHERE REPLACE(crcreafili, '-', '') = $1
         OR crcreafili = $1
      LIMIT 1
    `
    const credResult = await db.pool.query(credQuery, [afiliadoLimpio])
    
    let nroInternoPersona = ''
    
    if (credResult.rows.length > 0 && credResult.rows[0].crcreid) {
      const crcreid = credResult.rows[0].crcreid
      console.log('   ✅ crcreid COMPLETO desde crcreden:', crcreid)
      console.log('   ✅ crcreafili:', credResult.rows[0].crcreafili)
      console.log('   ✅ Longitud crcreid:', crcreid.length, 'caracteres')
      
      // Remover todos los caracteres no numéricos
      const crcreIdLimpio = crcreid.replace(/[^0-9]/g, '')
      console.log('   ✅ crcreid solo números:', crcreIdLimpio)
      console.log('   ✅ Longitud limpia:', crcreIdLimpio.length, 'caracteres')
      
      // Extraer ÚLTIMOS 9 dígitos como número interno
      nroInternoPersona = crcreIdLimpio.slice(-9)
      console.log('   ✅ Número Interno (últimos 9):', nroInternoPersona)
    } else {
      console.log('   ❌ No se encontró credencial en crcreden con AfiliadoId:', AfiliadoId, '(limpio:', afiliadoLimpio + ')')
      throw new Error('Credencial no encontrada en la base de datos')
    }
    
    // Fecha actual en formato DD/MM/YYYY
    const fechaActual = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    
    const parametros = {
      NroInternoPersona: nroInternoPersona,
      Fecha: fechaActual
    }
    
    console.log('   📤 Parámetros SOAP:', parametros)
    console.log('   📋 JSON que se enviará:', JSON.stringify(parametros, null, 2))
    
    const result = await callSoapExecuteSIA('ENROLAMIENTOS', parametros)
    const parsed = parseSoapResult(result)
    
    if (!parsed.ok) {
      console.log('⚠️ Servicio SIA retornó error, devolviendo lista vacía')
      if (parsed.mensajes && parsed.mensajes.length > 0) {
        console.log('   Mensajes:', JSON.stringify(parsed.mensajes))
      }
      return res.json({ success: true, data: { Enrolamientos: [] } })
    }
    
    // El servicio ENROLAMIENTOS puede devolver un array de enrolamientos
    // o un objeto con propiedad Enrolamientos o EnrolamientoItem
    let enrolamientos = []
    
    if (parsed.payload) {
      if (Array.isArray(parsed.payload)) {
        enrolamientos = parsed.payload
      } else if (parsed.payload.Enrolamientos) {
        enrolamientos = Array.isArray(parsed.payload.Enrolamientos) 
          ? parsed.payload.Enrolamientos 
          : [parsed.payload.Enrolamientos]
      } else if (parsed.payload.EnrolamientoItem) {
        enrolamientos = Array.isArray(parsed.payload.EnrolamientoItem) 
          ? parsed.payload.EnrolamientoItem 
          : [parsed.payload.EnrolamientoItem]
      }
    }
    
    console.log(`✅ ${enrolamientos.length} enrolamientos encontrados`)
    
    res.json({ 
      success: true, 
      data: { Enrolamientos: enrolamientos }
    })
  } catch (error) {
    console.error('❌ Error en /sia/enrolamientos-afiliado:', error)
    // En caso de error, devolver lista vacía en lugar de error 500
    res.json({ success: true, data: { Enrolamientos: [] } })
  }
})

// GET /sia/historial-atencion - HISTORIAL_ATENCION_APP
// Requiere autenticación para obtener AfiliadoId del usuario
app.get('/sia/historial-atencion', requireAuth, requirePermission('sia'), async (req, res) => {
  try {
    console.log('🔍 Endpoint historial - req.session:', req.session ? 'EXISTE' : 'UNDEFINED')
    console.log('🔍 req.session contenido:', req.session)
    
    const {
      DesdeFecha,
      HastaFecha,
      // SOAP-style params (original)
      Pagina,
      RegistrosXPagina,
      // REST-style aliases (estandar del proyecto)
      page,
      limit,
      AfiliadoId: AfiliadoIdQuery,
      Prestador,
      SearchText,
    } = req.query

    // Normalizar: page/limit tienen prioridad sobre Pagina/RegistrosXPagina si se envían
    const paginaNormalizada = parseInt(page || Pagina) || 1
    const limitNormalizado = parseInt(limit || RegistrosXPagina) || 10
    
    // Obtener AfiliadoId del usuario autenticado (desde req.session)
    const nuusuid = req.session?.nuusuid
    const afiliadoIdSession = req.session?.afiliadoId
    
    if (!nuusuid) {
      return res.status(401).json({ error: 'Sesión no válida' })
    }
    
    // Si se recibe AfiliadoId como query param (miembro del grupo familiar), usarlo directamente
    let afiliadoId = AfiliadoIdQuery ? String(AfiliadoIdQuery).trim() : afiliadoIdSession
    
    if (!afiliadoId) {
      const userQuery = 'SELECT nuusuafili FROM nuusuari WHERE nuusuid = $1'
      const userResult = await db.pool.query(userQuery, [nuusuid])
      
      if (userResult.rows.length === 0 || !userResult.rows[0].nuusuafili) {
        return res.status(400).json({ error: 'Usuario sin AfiliadoId asociado' })
      }
      
      afiliadoId = userResult.rows[0].nuusuafili
    }
    
    // Calcular HastaFecha = hoy
    const hastaFecha = HastaFecha || new Date().toISOString().split('T')[0]
    
    // Obtener días de vigencia desde parámetro BD (default 180 días = 6 meses)
    const diasHistorial = await getParametroNumero('FUNCIONES_APP', 'HistorialVigencia', 180)
    
    // Calcular DesdeFecha = HastaFecha - diasHistorial
    let desdeFecha = DesdeFecha
    if (!desdeFecha) {
      const hasta = new Date(hastaFecha)
      hasta.setDate(hasta.getDate() - diasHistorial)
      desdeFecha = hasta.toISOString().split('T')[0]
    }
    
    const parametros = {
      AfiliadoId: afiliadoId,
      DesdeFecha: desdeFecha,
      HastaFecha: hastaFecha,
      Pagina: paginaNormalizada,
      RegistrosXPagina: limitNormalizado
    }

    const filtrosAplicados = {
      prestador: Prestador ? String(Prestador).trim() : '',
      textoGeneral: SearchText ? String(SearchText).trim() : '',
    }
    
    console.log('📥 GET /sia/historial-atencion - HISTORIAL_ATENCION_APP')
    console.log('   AfiliadoId:', parametros.AfiliadoId)
    console.log('   DesdeFecha:', parametros.DesdeFecha, `(${diasHistorial} días atrás)`)
    console.log('   HastaFecha:', parametros.HastaFecha)
    console.log('   Pagina:', parametros.Pagina, '| RegistrosXPagina:', parametros.RegistrosXPagina)
    if (filtrosAplicados.prestador || filtrosAplicados.textoGeneral) {
      console.log('   Filtros extra:', filtrosAplicados)
    }
    
    const result = await callSoapExecuteSIA('HISTORIAL_ATENCION_APP', parametros)
    const parsed = parseSoapResult(result)
    
    if (!parsed.ok) {
      return res.status(400).json({ 
        error: parsed.errorDsc || 'Error en servicio SIA', 
        mensajes: parsed.mensajes 
      })
    }
    
    const payload = parsed.payload || {}
    let resultadoArray = []

    if (typeof payload.Resultado === 'string') {
      try {
        const parsedResultado = JSON.parse(payload.Resultado)
        resultadoArray = Array.isArray(parsedResultado) ? parsedResultado : []
      } catch {
        resultadoArray = []
      }
    } else if (Array.isArray(payload.Resultado)) {
      resultadoArray = payload.Resultado
    }

    // Si hay filtro de texto general, enriquecer cada ítem con NombrePractica
    // desde AUDETALLE_CONSUMO_APP (AtencionId = 5 chars delegación + resto autorizacion)
    if (filtrosAplicados.textoGeneral && resultadoArray.length > 0) {
      const enriched = await Promise.all(
        resultadoArray.map(async (item) => {
          const atencionId = String(item?.AtencionId || '')
          const numeroDelegacion = parseInt(atencionId.substring(0, 5), 10)
          const numeroAutorizacion = parseInt(atencionId.substring(5), 10)
          if (!Number.isFinite(numeroDelegacion) || !Number.isFinite(numeroAutorizacion) ||
              numeroDelegacion === 0 || numeroAutorizacion === 0) {
            return item
          }
          try {
            const detalleRaw = await callSoapExecuteSIA('AUDETALLE_CONSUMO_APP', {
              NumeroDelegacion: numeroDelegacion,
              NumeroAutorizacion: numeroAutorizacion,
            })
            const dp = parseSoapResult(detalleRaw)
            if (!dp.ok) return item
            let detalleItems = []
            const pl = dp.payload || {}
            if (typeof pl.Resultado === 'string') {
              try { detalleItems = JSON.parse(pl.Resultado) || [] } catch { detalleItems = [] }
            } else if (Array.isArray(pl.Resultado)) {
              detalleItems = pl.Resultado
            }
            const first = Array.isArray(detalleItems) && detalleItems.length > 0 ? detalleItems[0] : null
            const nombrePractica = (
              first?.NombrePractica || first?.Prestacion || first?.Descripcion || first?.Detalle || ''
            ).toString().trim()
            return nombrePractica ? { ...item, _nombrePractica: nombrePractica } : item
          } catch {
            return item
          }
        })
      )
      resultadoArray = enriched
    }

    const hasExtraFilters = !!(filtrosAplicados.prestador || filtrosAplicados.textoGeneral)

    if (hasExtraFilters && resultadoArray.length > 0) {
      const normalizedPrestador = filtrosAplicados.prestador.toLowerCase()
      const normalizedTextoGeneral = filtrosAplicados.textoGeneral.toLowerCase()

      resultadoArray = resultadoArray.filter((item) => {
        const itemData = item || {}

        const prestadorRaw = [
          itemData.EntidadNombre,
          itemData.Prestador,
          itemData.PrestadorNombre,
          itemData.Entidad,
        ]
          .filter(Boolean)
          .map((value) => String(value).trim().toLowerCase())
          .join(' ')

        const textoGeneralRaw = Object.values(itemData)
          .filter((value) => value !== undefined && value !== null)
          .map((value) => String(value).trim().toLowerCase())
          .join(' ')

        if (normalizedPrestador && !prestadorRaw.includes(normalizedPrestador)) return false
        if (normalizedTextoGeneral && !textoGeneralRaw.includes(normalizedTextoGeneral)) return false
        return true
      })
    }

    const data = { ...payload }
    if (typeof payload.Resultado === 'string') {
      data.Resultado = JSON.stringify(resultadoArray)
    } else if (Array.isArray(payload.Resultado)) {
      data.Resultado = resultadoArray
    }

    // Total de registros: desde SOAP si lo devuelve, si no desde el array filtrado
    const totalRegistros = parseInt(payload.TotalRegistros || payload.Total || payload.CantRegistros) || resultadoArray.length

    res.json({
      success: true,
      data,
      pagination: {
        page: paginaNormalizada,
        limit: limitNormalizado,
        total: totalRegistros,
        totalPages: limitNormalizado > 0 ? Math.ceil(totalRegistros / limitNormalizado) : 1,
      },
      filtrosAplicados,
    })
  } catch (error) {
    console.error('❌ Error en /sia/historial-atencion:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /sia/detalle-consumo - AUDETALLE_CONSUMO_APP
// Requiere autenticación (Bearer o Basic Auth)
app.get('/sia/detalle-consumo', requireAuth, requirePermission('sia'), async (req, res) => {
  try {
    const { NumeroDelegacion, NumeroAutorizacion } = req.query
    
    if (!NumeroDelegacion || !NumeroAutorizacion) {
      return res.status(400).json({ error: 'NumeroDelegacion y NumeroAutorizacion son requeridos' })
    }
    
    const parametros = {
      NumeroDelegacion: parseInt(NumeroDelegacion),
      NumeroAutorizacion: parseInt(NumeroAutorizacion)
    }
    
    console.log('📥 GET /sia/detalle-consumo - AUDETALLE_CONSUMO_APP')
    console.log('   NumeroDelegacion:', parametros.NumeroDelegacion)
    console.log('   NumeroAutorizacion:', parametros.NumeroAutorizacion)
    
    const result = await callSoapExecuteSIA('AUDETALLE_CONSUMO_APP', parametros)
    const parsed = parseSoapResult(result)
    
    if (!parsed.ok) {
      return res.status(400).json({ 
        error: parsed.errorDsc || 'Error en servicio SIA', 
        mensajes: parsed.mensajes 
      })
    }
    
    res.json({ success: true, data: parsed.payload })
  } catch (error) {
    console.error('❌ Error en /sia/detalle-consumo:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /sia/crear-solicitud - Crear nueva solicitud de autorización
// Requiere autenticación, permite adjuntar hasta 5 fotos (según parámetro)
// Guarda en tablas: ausolici (solicitud) y ausoaufo (fotos)
app.post('/sia/crear-solicitud', requireAuth, requirePermission('sia'), validateBody(SiaCrearSolicitudBodySchema), async (req, res) => {
  try {
    const { 
      afiliadoId,        // ID del afiliado del grupo familiar que solicita
      afiliadoNro,       // Número de afiliado (formato corto, opcional)
      AUSolTipo,         // Tipo: "P" = Con Prescripción (fotos), "S" = Sin Prescripción (combo prestaciones)
      AUSolPresTipo,     // Tipo de prestación (GeneXus AUTipPreID, default "A")
      cobertura,         // Código o nombre de la cobertura
      coberturaDescripcion, // Descripción de la cobertura/gravamen
      referencia,        // Referencia que identifica la solicitud (ausoldescr)
      texto,             // Texto descriptivo de la solicitud (ausoltexto)
      profesional,       // Profesional preferente (ausolpsoco)
      prestacionId,      // ID de prestación (SOLO tipo "S" - desde REC_PRESTACIONES_APP)
      AUSolPresCant,     // Cantidad de prestaciones (editable)
      foto1Base64,       // Primera foto en base64 (SOLO tipo "P")
      foto2Base64,       // Segunda foto en base64 (SOLO tipo "P")
      foto3Base64,       // Tercera foto en base64 (SOLO tipo "P")
      foto4Base64,       // Cuarta foto en base64 (SOLO tipo "P")
      foto5Base64,       // Quinta foto en base64 (SOLO tipo "P")
      fotosBase64        // Nuevo formato: array de fotos en base64 (SOLO tipo "P")
    } = req.body

    // Validar tipo de autorización
    const tipoSolicitud = AUSolTipo || 'P' // Default "P" (con prescripción)
    const coberturaStr = String(cobertura || '').trim()
    const coberturaDescripcionStr = String(coberturaDescripcion || '').trim()
    const coberturaCodigo = parseInt(coberturaStr, 10)
    const prestacionIdStr = String(prestacionId || '').trim()
    const maxFotosAutorizacion = await getMaxFotosAutorizacion()
    const fotosAdjuntas = (Array.isArray(fotosBase64)
      ? fotosBase64
      : [foto1Base64, foto2Base64, foto3Base64, foto4Base64, foto5Base64]
    )
      .map((foto) => (typeof foto === 'string' ? foto.trim() : ''))
      .filter(Boolean)

    if (!['P', 'S'].includes(tipoSolicitud)) {
      return sendLegacyValidationError(
        res,
        'AUSolTipo debe ser "P" (Con Prescripción) o "S" (Sin Prescripción)',
        'AUSolTipo'
      )
    }

    // Validar datos requeridos (comunes a ambos tipos)
    if (!afiliadoId || !cobertura || !referencia) {
      return sendLegacyValidationError(res, 'afiliadoId, cobertura y referencia son requeridos', 'afiliadoId')
    }
    // prestacionId es requerido solo para tipo "S" (Sin Prescripción)
    if (tipoSolicitud === 'S' && !prestacionId) {
      return sendLegacyValidationError(
        res,
        'prestacionId es requerido para autorizaciones Sin Prescripción',
        'prestacionId'
      )
    }

    if (!Number.isFinite(coberturaCodigo) || coberturaCodigo <= 0) {
      return sendLegacyValidationError(res, 'cobertura debe ser un código numérico válido', 'cobertura')
    }

    if (tipoSolicitud === 'S' && !prestacionIdStr) {
      return sendLegacyValidationError(res, 'prestacionId debe tener un valor válido para tipo S', 'prestacionId')
    }

    // Validación específica según tipo
    if (tipoSolicitud === 'S') {
      if (fotosAdjuntas.length > 0) {
        return sendLegacyValidationError(
          res,
          'Las autorizaciones sin prescripción (tipo S) no admiten fotos adjuntas',
          'fotosBase64'
        )
      }
    } else if (fotosAdjuntas.length > maxFotosAutorizacion) {
      return sendLegacyValidationError(
        res,
        `La solicitud admite hasta ${maxFotosAutorizacion} fotos adjuntas`,
        'fotosBase64'
      )
    }

    console.log('📝 POST /sia/crear-solicitud')
    console.log('   Usuario autenticado (nuusuid):', req.session.nuusuid)
    console.log('   Tipo solicitud:', tipoSolicitud === 'P' ? 'CON Prescripción (fotos)' : 'SIN Prescripción (combo)')
    console.log('   AfiliadoId:', afiliadoId)
    if (tipoSolicitud === 'P') {
      console.log('   Cobertura:', cobertura)
      console.log(`   Fotos adjuntas: ${fotosAdjuntas.length}/${maxFotosAutorizacion}`)
    } else {
      console.log('   PrestacionId:', prestacionId)
      console.log('   AUSolPresCant (cantidad):', AUSolPresCant || 1)
    }
    console.log('   Referencia:', referencia)
    console.log('   Profesional:', profesional || 'No especificado')

    // Obtener nuusuafili del usuario autenticado (para AUSolUsuAfiliadoId en SIA)
    const usuarioQuery = 'SELECT nuusuafili FROM nuusuari WHERE nuusuid = $1'
    const usuarioResult = await db.pool.query(usuarioQuery, [req.session.nuusuid])
    
    if (usuarioResult.rows.length === 0 || !usuarioResult.rows[0].nuusuafili) {
      return sendLegacyValidationError(
        res,
        'El usuario no tiene nuusuafili en la base de datos',
        'afiliadoId'
      )
    }
    
    const usuarioAfiliadoId = usuarioResult.rows[0].nuusuafili
    console.log('   Usuario AfiliadoId (nuusuafili):', usuarioAfiliadoId)

    const afiliadoIdInput = String(afiliadoId || '').trim()
    const afiliadoIdInputDigits = afiliadoIdInput.replace(/\D/g, '')
    let afiliadoNroSIA = String(afiliadoNro || '').trim()

    if (!afiliadoNroSIA && afiliadoIdInput) {
      try {
        const credencialQuery = `
          SELECT TRIM(c.crcreid) AS crcreid,
                 TRIM(c.crcreafili) AS crcreafili,
                 TRIM(c.crcrenroaf) AS crcrenroaf,
                 TRIM(COALESCE(c.crcredocum, '')) AS crcredocum,
                 TRIM(COALESCE(c.crcrecuil::text, '')) AS crcrecuil
          FROM crcreden c
          INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
          WHERE cu.nuusuid = $1
            AND (
              TRIM(c.crcreid) = $2 OR
              TRIM(c.crcreafili) = $2 OR
              TRIM(c.crcrenroaf) = $2 OR
              TRIM(COALESCE(c.crcredocum, '')) = $2 OR
              TRIM(COALESCE(c.crcrecuil::text, '')) = $2 OR
              regexp_replace(TRIM(c.crcrenroaf), '[^0-9]', '', 'g') = $3
            )
          LIMIT 1
        `

        const credencialResult = await db.pool.query(credencialQuery, [req.session.nuusuid, afiliadoIdInput, afiliadoIdInputDigits])
        if (credencialResult.rows.length > 0) {
          afiliadoNroSIA = String(credencialResult.rows[0].crcrenroaf || '').trim()
          console.log('   ✅ Afiliado resuelto desde credenciales:', {
            input: afiliadoIdInput,
            inputDigits: afiliadoIdInputDigits,
            crcreid: credencialResult.rows[0].crcreid,
            crcreafili: credencialResult.rows[0].crcreafili,
            crcrenroaf: credencialResult.rows[0].crcrenroaf,
            crcredocum: credencialResult.rows[0].crcredocum,
            crcrecuil: credencialResult.rows[0].crcrecuil
          })
        }
      } catch (resolveError) {
        console.warn('⚠️  No se pudo resolver crcrenroaf desde credenciales:', resolveError.message)
      }
    }

    if (!afiliadoNroSIA) {
      // Fallback flexible: usar el valor recibido (permite formatos históricos, p.ej. DNI)
      afiliadoNroSIA = afiliadoIdInput
    }

    console.log('   AfiliadoId input:', afiliadoIdInput)
    console.log('   AUSolNroAfiliado resuelto:', afiliadoNroSIA)

    // Generar IDs únicos con crypto.randomUUID() (Node.js 14.17+)
    const ausolicid = crypto.randomUUID() // ID de la solicitud
    const ahoraLocal = new Date()
    const fechaActual = ahoraLocal.toISOString() // timestamp completo (UTC)
    const fechaActualSolo = `${ahoraLocal.getFullYear()}-${String(ahoraLocal.getMonth() + 1).padStart(2, '0')}-${String(ahoraLocal.getDate()).padStart(2, '0')}` // YYYY-MM-DD local para SOAP

    const autippreidDB = String(coberturaStr || '').substring(0, 30)
    const ausolentidDB = ''
    const ausolextidDB = String(ausolicid || '').substring(0, 30)
    const cleanBase64 = (base64String) => {
      if (!base64String) return null

      const normalized = String(base64String).trim()
      const base64Prefix = normalized.indexOf(',')
      return base64Prefix !== -1 ? normalized.substring(base64Prefix + 1) : normalized
    }
    const buildFotoLocalId = (position) => `00000000-0000-0000-0000-${String(position).padStart(12, '0')}`

    console.log('   📏 Longitudes INSERT ausolici:', {
      ausolicid: String(ausolicid || '').length,
      nuusuid: String(req.session.nuusuid || '').length,
      autippreid: autippreidDB.length,
      ausolentid: ausolentidDB.length,
      ausolextid: ausolextidDB.length
    })
    
    // Iniciar transacción
    const client = await db.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Insertar en tabla ausolici
      const insertSolicitud = `
        INSERT INTO ausolici (
          ausolicid,      -- ID único de la solicitud
          nuusuid,        -- ID del usuario autenticado
          ausoldescr,     -- Descripción corta (referencia)
          ausolfecal,     -- Fecha de alta
          ausolfecor,     -- Fecha de origen
          autippreid,     -- Tipo de prestación (cobertura)
          ausolnroaf,     -- Número de afiliado
          ausoltexto,     -- Texto descriptivo
          ausolentid,     -- ID entidad (por definir)
          ausolfecve,     -- Fecha vencimiento
          ausolextid,     -- ID externo (por definir)
          ausolrechd,     -- Rechazado (N = No)
          ausolestad,     -- Estado (PEN = Pendiente)
          ausolentno,     -- Nombre entidad (vacío por ahora)
          ausolautnu,     -- Número autorización (vacío hasta aprobar)
          ausoltipo,      -- Tipo (P = Con Prescripción, S = Sin Prescripción)
          ausolpsoco,     -- Profesional solicitante/coordinador
          ausolcantp,     -- Cantidad de prácticas (1)
          ausolobspr,     -- Observaciones previas (vacío)
          ausolgravc      -- Gravedad (0 = Normal)
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        )
      `
      
      await client.query(insertSolicitud, [
        ausolicid,                          // $1
        req.session.nuusuid,                // $2
        referencia.substring(0, 40),        // $3 - máx 40 caracteres
        fechaActual,                        // $4 - fecha alta
        fechaActual,                        // $5 - fecha origen
        autippreidDB,                       // $6 - tipo prestación (bpchar 30)
        afiliadoNroSIA.substring(0, 20),    // $7 - nro afiliado
        texto || referencia,                // $8 - texto descriptivo
        ausolentidDB,                       // $9 - entidad ID (bpchar 30)
        fechaActual,                        // $10 - fecha vencimiento
        ausolextidDB,                       // $11 - ausolextid (bpchar 30)
        'N',                                // $12 - no rechazado
        'PEN',                              // $13 - estado pendiente
        coberturaDescripcionStr.substring(0, 50), // $14 - nombre cobertura/gravamen
        '',                                 // $15 - número autorización (vacío)
        tipoSolicitud,                      // $16 - tipo real P/S
        profesional?.substring(0, 40) || '', // $17 - profesional
        1,                                  // $18 - cantidad prácticas
        '',                                 // $19 - observaciones (vacío)
        0                                   // $20 - gravedad normal
      ])
      
      console.log('✅ Solicitud insertada en ausolici:', ausolicid)
      
      // Insertar fotos SOLO si es tipo "P" (Con Prescripción)
      let fotosInsertadas = 0
      
      if (tipoSolicitud === 'P') {
        for (const [index, fotoBase64] of fotosAdjuntas.entries()) {
          const fotoClean = cleanBase64(fotoBase64)
          if (!fotoClean) continue

          const fotoId = buildFotoLocalId(index + 1)
          const fotoBuffer = Buffer.from(fotoClean, 'base64')

          await client.query(
            'INSERT INTO ausoaufo (ausolicid, ausolfotid, ausolf) VALUES ($1, $2, $3)',
            [ausolicid, fotoId, fotoBuffer]
          )

          fotosInsertadas++
          console.log(`✅ Foto ${index + 1} insertada: ${fotoId} (${Math.round(fotoBuffer.length / 1024)}KB)`)
        }
      } else {
        console.log('⚠️  Tipo "S" (Sin Prescripción): NO se procesan fotos')
      }
      
      // Commit transacción
      await client.query('COMMIT')
      
      console.log(`✅ Solicitud guardada en BD: ${ausolicid}`)
      console.log(`   📸 Fotos adjuntas: ${fotosInsertadas}`)
      
      // Variables para IDs devueltos por SIA (declarar aquí para scope correcto)
      let ausolIdSIA = null
      let ausolIdExtSIA = null
      let siaEnviado = false
      let siaError = null
      
      // Enviar solicitud al SIA usando REC_SOLICITUDES_APP con estructura completa
      console.log('📤 Enviando solicitud al SIA...')
      
      try {
        // Construir array de fotos para SIA SOLO si tipo "P"
        const fotosSIA = []
        
        if (tipoSolicitud === 'P') {
          for (const [index, fotoBase64] of fotosAdjuntas.entries()) {
            const fotoIndex = index + 1
            const fotoClean = cleanBase64(fotoBase64)
            if (!fotoClean) continue

            fotosSIA.push({
              AUSoFId: fotoIndex,
              AUSoFIdExt: fotoIndex.toString(),
              AUSoFFileName: `f${fotoIndex}.jpg`,
              AUSoFFotoBase64: fotoClean
            })
          }
        }

        // Construir payload completo para REC_SOLICITUDES_APP
        // Regla: AUSolIdExt debe ser siempre el ID local de la solicitud
        const ausolIdExtSIAInput = ausolicid

        const parametrosSIA = {
          Mode: 'INS',                                    // INS = Insertar
          AUSolId: 0,                                     // 0 para nuevas (SIA genera el ID)
          AUSolTipo: tipoSolicitud,                       // 'P' o 'S'
          AUSolUsuAfiliadoId: usuarioAfiliadoId,          // AfiliadoId del usuario (nuusuafili)
          AUSolIdExt: ausolIdExtSIAInput,                 // Igual a ausolicid local
          AUSolNroAfiliado: afiliadoNroSIA.substring(0, 20), // Número de afiliado
          AUSolFecha: fechaActualSolo,                    // Fecha solicitud (YYYY-MM-DD)
          AUSolPresTipo: String(AUSolPresTipo || 'A').substring(0, 10), // AUTipPreID
          AUSolGravCodigo: coberturaCodigo,               // ID de cobertura/enrolamiento (común a ambos tipos)
          AUSolRefAfiliado: referencia.substring(0, 40),  // Referencia del afiliado
          AUSolObsPref: profesional?.substring(0, 40) || '' // Profesional preferente
        }
        
        // Campo AUSolPresId: Código de prestación desde REC_PRESTACIONES_APP (solo tipo S)
        if (prestacionId) {
          parametrosSIA.AUSolPresId = prestacionIdStr.substring(0, 40)
        }
        
        // Campos específicos según tipo
        if (tipoSolicitud === 'P') {
          // Tipo "P": Con Prescripción (con fotos)
          parametrosSIA.AUSolPresCant = 1                           // Cantidad fija
        } else {
          // Tipo "S": Sin Prescripción (cantidad editable)
          parametrosSIA.AUSolPresCant = parseInt(AUSolPresCant) || 1            // Cantidad editable
        }
        
        // Agregar fotos solo si existen (tipo "P")
        if (fotosSIA.length > 0) {
          // SIA espera array directo, NO objeto con FotoItem
          parametrosSIA.Foto = fotosSIA
          
          console.log(`📸 Fotos preparadas para SIA: ${fotosSIA.length}`)
          fotosSIA.forEach((foto, idx) => {
            console.log(`   Foto ${idx + 1}:`)
            console.log(`      AUSoFId: ${foto.AUSoFId}`)
            console.log(`      AUSoFIdExt: ${foto.AUSoFIdExt}`)
            console.log(`      AUSoFFileName: ${foto.AUSoFFileName}`)
            console.log(`      AUSoFFotoBase64 length: ${foto.AUSoFFotoBase64?.length || 0}`)
            console.log(`      Primeros 50 chars: ${foto.AUSoFFotoBase64?.substring(0, 50)}`)
            
            // Validar que sea base64 válido
            const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(foto.AUSoFFotoBase64)
            console.log(`      ✅ Base64 válido: ${isValidBase64}`)
          })
        } else {
          if (tipoSolicitud === 'P') {
            console.log('⚠️  Tipo "P" pero NO HAY FOTOS para enviar al SIA')
          } else {
            console.log('✅ Tipo "S": Sin fotos (correcto para autorizaciones sin prescripción)')
          }
        }
        
        console.log('   📋 Payload SIA:')
        console.log('      Mode:', parametrosSIA.Mode)
        console.log('      AUSolTipo:', parametrosSIA.AUSolTipo, `(${tipoSolicitud === 'P' ? 'Con Prescripción' : 'Sin Prescripción'})`)
        console.log('      AUSolUsuAfiliadoId:', parametrosSIA.AUSolUsuAfiliadoId)
        console.log('      AUSolIdExt:', parametrosSIA.AUSolIdExt)
        console.log('      AUSolNroAfiliado:', parametrosSIA.AUSolNroAfiliado)
        console.log('      AUSolFecha:', parametrosSIA.AUSolFecha)
        console.log('      AUSolPresTipo:', parametrosSIA.AUSolPresTipo)
        console.log('      AUSolGravCodigo:', parametrosSIA.AUSolGravCodigo, '(id cobertura ENROLAMIENTOS)')
        console.log('      AUSolPresId:', parametrosSIA.AUSolPresId, '(código prestación REC_PRESTACIONES_APP)')
        console.log('      AUSolRefAfiliado:', parametrosSIA.AUSolRefAfiliado)
        console.log('      AUSolObsPref:', parametrosSIA.AUSolObsPref)
        
        if (tipoSolicitud === 'P') {
          console.log('      AUSolPresCant:', parametrosSIA.AUSolPresCant, '(fijo)')
          console.log('      Fotos:', fotosSIA.length)
          if (fotosSIA.length > 0) {
            fotosSIA.forEach((f, i) => {
              console.log(`      Foto ${i+1}: ${f.AUSoFFileName} (${f.AUSoFFotoBase64.length} chars base64)`)
            })
          }
        } else {
          console.log('      AUSolPresCant:', parametrosSIA.AUSolPresCant, '(editable)')
        }
        
        console.log('   📦 Payload SIA JSON final:', JSON.stringify(parametrosSIA))

        const resultSIA = await callSoapExecuteSIA('REC_SOLICITUDES_APP', parametrosSIA)
        const parsedSIA = parseSoapResult(resultSIA)
        
        // LOG: Mostrar respuesta completa del servicio
        console.log('\n? ========== RESPUESTA REC_SOLICITUDES_APP ==========')
        console.log('? Estado:', parsedSIA.ok ? 'EXITOSO' : 'ERROR')
        if (parsedSIA.ok) {
          console.log('? Payload completo:', JSON.stringify(parsedSIA.payload, null, 2))
        } else {
          console.log('? Error:', parsedSIA.errorDsc)
          if (parsedSIA.mensajes && parsedSIA.mensajes.length > 0) {
            console.log('? Mensajes:')
            parsedSIA.mensajes.forEach((msg, idx) => {
              console.log(`   [${idx + 1}] ${msg.Description} (Type: ${msg.Type})`)
            })
          }
        }
        console.log('? ====================================================\n')
        
        if (parsedSIA.ok) {
          siaEnviado = true
          console.log('? Solicitud enviada a SIA exitosamente')
          
          // Extraer TODOS los datos de la respuesta SIA
          try {
            let siaData = parsedSIA.payload
            
            // Si viene como string JSON en Resultado, parsear
            if (siaData.Resultado && typeof siaData.Resultado === 'string') {
              siaData = JSON.parse(siaData.Resultado)
            }
            
            // Capturar todos los campos devueltos por SIA
            if (siaData.AUSolId) {
              ausolIdSIA = siaData.AUSolId
              console.log('   ?? AUSolId devuelto por SIA:', ausolIdSIA)
            }
            if (siaData.AUSolIdExt) {
              ausolIdExtSIA = siaData.AUSolIdExt
              console.log('   ?? AUSolIdExt devuelto por SIA:', ausolIdExtSIA)
            }
            
            // Actualizar TODOS los datos en BD local con respuesta de SIA
            if (siaData.AUSolId || siaData.AUSolIdExt) {
              const updateFields = []
              const updateValues = []
              let paramIndex = 1
              
              // ausolextid - ID num�rico de SIA
              if (siaData.AUSolId && siaData.AUSolId !== 0) {
                updateFields.push(`ausolextid = $${paramIndex++}`)
                updateValues.push(siaData.AUSolId.toString())
              }
              
              // ausolestad - Estado de la autorizaci�n
              if (siaData.AUSolEstado) {
                updateFields.push(`ausolestad = $${paramIndex++}`)
                updateValues.push(siaData.AUSolEstado)
                console.log('   ?? Estado:', siaData.AUSolEstado)
              }
              
              // ausolautnu - N�mero de autorizaci�n
              if (siaData.AUAutNumero) {
                updateFields.push(`ausolautnu = $${paramIndex++}`)
                updateValues.push(siaData.AUAutNumero)
                console.log('   ?? N�mero Autorizaci�n:', siaData.AUAutNumero)
              }
              
              // ausoldescr - Descripci�n/referencia
              if (siaData.AUSolRefAfiliado) {
                updateFields.push(`ausoldescr = $${paramIndex++}`)
                updateValues.push(siaData.AUSolRefAfiliado)
              }
              
              // ausolfecal - Fecha de alta (si es diferente)
              if (siaData.AUSolFecha) {
                updateFields.push(`ausolfecal = $${paramIndex++}`)
                updateValues.push(siaData.AUSolFecha)
              }
              
              // ausolfecor - Fecha de orden (si existe)
              if (siaData.AUSolFechaOrden) {
                updateFields.push(`ausolfecor = $${paramIndex++}`)
                updateValues.push(siaData.AUSolFechaOrden)
              }
              
              // ausolcantp - Cantidad de prestaciones
              if (siaData.AUSolPresCant) {
                updateFields.push(`ausolcantp = $${paramIndex++}`)
                updateValues.push(siaData.AUSolPresCant)
              }
              
              // ausolpsoco - Profesional/Observaciones
              if (siaData.AUSolObsPref) {
                updateFields.push(`ausolpsoco = $${paramIndex++}`)
                updateValues.push(siaData.AUSolObsPref)
              }
              
              // autippreid - ID de prestaci�n
              if (siaData.AUSolPresId) {
                updateFields.push(`autippreid = $${paramIndex++}`)
                updateValues.push(siaData.AUSolPresId)
              }
              
              if (updateFields.length > 0) {
                updateValues.push(ausolicid) // WHERE ausolicid = $N
                
                const updateQuery = `
                  UPDATE ausolici SET ${updateFields.join(', ')}
                  WHERE ausolicid = $${paramIndex}
                `
                
                const updateResult = await client.query(updateQuery, updateValues)
                console.log(`   ? ${updateFields.length} campos actualizados en BD local con datos de SIA`)
                console.log(`   ? Filas afectadas: ${updateResult.rowCount}`)
              }
            }
            
          } catch (parseError) {
            console.warn('   ??  No se pudo extraer/actualizar datos de respuesta SIA:', parseError.message)
          }
        } else {
          siaError = parsedSIA.errorDsc || 'Error desconocido en SIA'
          console.warn('⚠️  SIA rechazó la solicitud:', siaError)
          if (parsedSIA.mensajes && parsedSIA.mensajes.length > 0) {
            parsedSIA.mensajes.forEach((msg, idx) => {
              console.warn(`   [${idx + 1}] ${msg.Description} (Type: ${msg.Type})`)
            })
            siaError = parsedSIA.mensajes.map(m => m.Description).join('; ') || siaError
          }
        }
      } catch (errorSIA) {
        siaError = errorSIA.message
        console.error('❌ Error al enviar a SIA:', errorSIA.message)
        // Marcar estado ERR en BD para permitir reintento desde la app
        try {
          await client.query(
            `UPDATE ausolici SET ausolestad = 'ERR' WHERE ausolicid = $1`,
            [ausolicid]
          )
          console.log('   ⚠️  Solicitud marcada como ERR (fallo de conexión con SIA)')
        } catch (updateErr) {
          console.warn('⚠️  No se pudo marcar error de conexión en BD:', updateErr.message)
        }
      }
      
      // 🔔 Crear notificación para el usuario
      try {
        await createNotification(
          req.session.nuusuid,
          'autorizacion',
          'Nueva solicitud creada',
          `Tu solicitud de autorización ha sido registrada exitosamente`,
          { ausolicid, tipo: AUSolTipo, estado: 'PENDIENTE' },
          'autorizaciones'
        )
      } catch (notifError) {
        console.warn('⚠️  Error al crear notificación:', notifError.message)
      }
      
      if (!siaEnviado) {
        return res.status(502).json({
          success: false,
          error: 'SIA_REJECTED',
          message: siaError || 'SIA rechazó la solicitud',
          siaSent: false,
          siaError: siaError || 'Sin detalle',
          data: {
            solicitudId: ausolicid,
            fechaSolicitud: fechaActual,
            estado: 'PENDIENTE',
            fotosAdjuntas: fotosInsertadas,
            ausolIdSIA: ausolIdSIA,
            ausolIdExtSIA: ausolIdExtSIA
          }
        })
      }

      res.json({
        success: true,
        message: 'Solicitud de autorización creada correctamente',
        siaSent: true,
        siaError: null,
        data: {
          solicitudId: ausolicid,
          fechaSolicitud: fechaActual,
          estado: 'PENDIENTE',
          fotosAdjuntas: fotosInsertadas,
          ausolIdSIA: ausolIdSIA,
          ausolIdExtSIA: ausolIdExtSIA
        }
      })
      
    } catch (error) {
      // Rollback en caso de error
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Error en /sia/crear-solicitud:', error)
    res.status(500).json({ 
      error: 'Error al crear solicitud',
      message: error.message 
    })
  }
})

// ============================================================================
// FIN ENDPOINTS SIA
// ============================================================================

// ============================================================================
// VALIDACIÓN EMAIL DUPLICADO - REGLAS_GAM_BDD.md Sección 5
// ============================================================================

/**
 * Validar email duplicado cross-user según REGLAS_GAM_BDD.md Sección 5
 * 
 * Reglas:
 * 1. Si email NO existe → permitir registro
 * 2. Si email existe para EL MISMO usuario (mismo nroAfiliado/cuil/dni):
 *    - Informar que ya está registrado
 *    - Ofrecer password recovery
 *    - Retornar: { exists: true, sameUser: true, canRecover: true }
 * 3. Si email existe para OTRO usuario (diferente nroAfiliado/cuil/dni):
 *    - Bloquear registro
 *    - Mostrar error
 *    - Retornar: { exists: true, sameUser: false, canRecover: false }
 * 
 * @param {string} email - Email a validar
 * @param {string} nroAfiliado - Número de afiliado (o dni/cuil)
 * @returns {Promise<Object>} { exists, sameUser, canRecover, nuusuid?, maskedEmail? }
 */
async function validateEmailDuplication(email, nroAfiliado) {
  try {
    // Buscar usuarios con ese email
    const result = await db.pool.query(
      `SELECT nuusuid, nuusumail, nuusunroaf, nuusuapell, nuusubajaf 
       FROM nuusuari 
       WHERE LOWER(nuusumail) = LOWER($1)`,
      [email]
    )

    if (result.rows.length === 0) {
      // Email no existe → permitir registro
      return { 
        exists: false, 
        sameUser: false, 
        canRecover: false 
      }
    }

    // Email existe → verificar si es el mismo usuario
    const existingUser = result.rows[0]
    
    // Verificar si el usuario está desactivado en BD local
    // Fecha 0001-01-01 se considera NULL (usuario activo)
    const fechaBaja = existingUser.nuusubajaf
    const esUsuarioDesactivado = fechaBaja && 
      new Date(fechaBaja).getFullYear() > 1900
    
    if (esUsuarioDesactivado) {
      console.log('⚠️  Usuario DESACTIVADO en BD local:', {
        email: existingUser.nuusumail,
        nuusuid: existingUser.nuusuid,
        fechaBaja: existingUser.nuusubajaf
      })
      
      // VERIFICAR COHERENCIA CON GAM antes de permitir reactivación
      console.log('🔍 Verificando estado en GAM...')
      try {
        // Intentar validar usuario en GAM
        const gamService = require('./gamService')
        const gamValidation = await gamService.validateUserGAM({
          nroAfiliado: nroAfiliado || '',
          documento: nroAfiliado || '',
          cuil: nroAfiliado || '',
          sexo: 'M', // Dummy value para validación
          fechaNacimiento: '1980-01-01' // Dummy value
        })
        
        // Si GAM retorna usuario activo → HAY INCONSISTENCIA
        if (gamValidation.userExists && gamValidation.isActive) {
          console.error('❌ INCONSISTENCIA DETECTADA:')
          console.error('   BD Local: Usuario DESACTIVADO')
          console.error('   GAM: Usuario ACTIVO')
          
          return {
            exists: true,
            isInconsistent: true,
            localDeactivated: true,
            gamActive: true,
            canRecover: false,
            canReactivate: false,
            nuusuid: existingUser.nuusuid,
            fechaBaja: existingUser.nuusubajaf,
            message: 'Inconsistencia detectada: Usuario desactivado localmente pero activo en GAM. Contacte al administrador.'
          }
        }
        
        // Si GAM también tiene usuario desactivado → PERMITIR REACTIVACIÓN
        if (gamValidation.userExists && !gamValidation.isActive) {
          console.log('✅ Coherencia verificada: Usuario desactivado en LOCAL y GAM')
          console.log('   Permitiendo RE-REGISTRO')
          
          return {
            exists: false, // Permitir registro (tratarlo como no existente)
            isDeactivated: true,
            canReactivate: true,
            coherent: true,
            nuusuid: existingUser.nuusuid,
            fechaBaja: existingUser.nuusubajaf,
            message: 'Usuario desactivado en LOCAL y GAM - permitiendo re-registro'
          }
        }
        
        // Si GAM no encuentra usuario → PERMITIR REACTIVACIÓN (usuario solo en BD local)
        if (!gamValidation.userExists) {
          console.log('✅ Usuario desactivado solo en BD local (no existe en GAM)')
          console.log('   Permitiendo RE-REGISTRO')
          
          return {
            exists: false, // Permitir registro
            isDeactivated: true,
            canReactivate: true,
            coherent: true, // Coherente porque GAM no lo conoce
            localOnly: true,
            nuusuid: existingUser.nuusuid,
            fechaBaja: existingUser.nuusubajaf,
            message: 'Usuario desactivado localmente, no existe en GAM - permitiendo re-registro'
          }
        }
        
      } catch (gamError) {
        console.warn('⚠️  Error verificando estado GAM:', gamError.message)
        console.warn('   Bloqueando reactivación por precaución (no se puede verificar coherencia)')
        
        return {
          exists: true,
          isDeactivated: true,
          canRecover: false,
          canReactivate: false,
          gamCheckFailed: true,
          nuusuid: existingUser.nuusuid,
          fechaBaja: existingUser.nuusubajaf,
          message: 'No se pudo verificar estado en GAM. Por seguridad, contacte al administrador.'
        }
      }
    }
    
    // Comparar nroAfiliado (puede venir como CUIL, DNI, o nroAfiliado)
    // Normalizar quitando guiones y espacios
    const normalizeId = (id) => String(id || '').replace(/[-\s]/g, '').toLowerCase()
    const inputId = normalizeId(nroAfiliado)
    const existingId = normalizeId(existingUser.nuusunroaf)

    const isSameUser = inputId === existingId

    if (isSameUser) {
      // Mismo usuario → ofrecer recuperación
      const emailService = require('./emailService')
      return {
        exists: true,
        sameUser: true,
        canRecover: true,
        nuusuid: existingUser.nuusuid,
        maskedEmail: emailService.maskEmail(email),
        message: 'Ya existe una cuenta registrada con este email. ¿Desea recuperar su contraseña?'
      }
    } else {
      // Diferente usuario → bloquear registro
      return {
        exists: true,
        sameUser: false,
        canRecover: false,
        message: 'Este email ya está en uso por otro usuario. Por favor, use un email diferente.'
      }
    }

  } catch (error) {
    console.error('❌ Error validando email duplicado:', error)
    throw error
  }
}

// ============================================================================
// ENDPOINTS GAM (GeneXus Access Manager)
// ============================================================================

async function requireGAMEnabled(req, res, next) {
  try {
    const enabled = Boolean(config?.gam?.enabled) && await gamService.isGAMEnabled({ forceRefresh: true })
    if (!enabled) {
      return res.status(410).json({
        error: 'GAM deshabilitado',
        code: 'GAM_DISABLED',
        message: 'La integración con GAM está deshabilitada por configuración.'
      })
    }
    return next()
  } catch (error) {
    console.error('❌ Error evaluando flag GAM:', error)
    return res.status(500).json({
      error: 'Error evaluando configuración GAM',
      code: 'GAM_FLAG_ERROR'
    })
  }
}

// POST /gam/register - Registro de usuario con GAM
app.post('/gam/register', requireGAMEnabled, validateBody(GamRegisterBodySchema), async (req, res) => {
  try {
    console.log('🔐 POST /gam/register - Registro con GAM')
    const {
      email,
      password,
      firstName,
      lastName,
      telefono,
      nroAfiliado,
      documento,
      cuil,
      sexo,
      fechaNacimiento,
      canMiembrosFamiliar
    } = req.body

    // PUNTO 3: Validar email duplicado cross-user
    console.log('🔍 Validando email duplicado...')
    const userIdentifier = nroAfiliado || cuil || documento
    const emailValidation = await validateEmailDuplication(email, userIdentifier)

    // Verificar inconsistencia BD local vs GAM
    if (emailValidation.isInconsistent) {
      console.error('❌ INCONSISTENCIA DETECTADA: Local desactivado, GAM activo')
      return res.status(409).json({
        error: 'Inconsistencia de datos',
        code: 'DATA_INCONSISTENCY',
        isInconsistent: true,
        localDeactivated: emailValidation.localDeactivated,
        gamActive: emailValidation.gamActive,
        message: emailValidation.message,
        suggestion: 'Este usuario requiere intervención administrativa. Contacte al soporte.'
      })
    }

    // Usuario no puede verificar GAM → bloquear por seguridad
    if (emailValidation.gamCheckFailed) {
      console.error('❌ No se pudo verificar estado GAM - bloqueando por seguridad')
      return res.status(503).json({
        error: 'No se pudo verificar estado del usuario',
        code: 'GAM_CHECK_FAILED',
        message: emailValidation.message,
        suggestion: 'Intente nuevamente más tarde o contacte al administrador.'
      })
    }

    if (emailValidation.exists) {
      if (emailValidation.sameUser) {
        // Email existe para el MISMO usuario → ofrecer recovery
        console.log('⚠️  Email ya registrado para este usuario')
        return res.status(409).json({
          error: 'Ya existe una cuenta registrada',
          code: 'EMAIL_EXISTS_SAME_USER',
          sameUser: true,
          canRecover: true,
          maskedEmail: emailValidation.maskedEmail,
          message: emailValidation.message,
          suggestion: 'Puede recuperar su contraseña usando el enlace "¿Olvidó su contraseña?"'
        })
      } else {
        // Email existe para OTRO usuario → bloquear
        console.log('❌ Email ya registrado para otro usuario')
        return res.status(409).json({
          error: 'Email ya está en uso',
          code: 'EMAIL_EXISTS_DIFFERENT_USER',
          sameUser: false,
          canRecover: false,
          message: emailValidation.message
        })
      }
    }

    // Si es reactivación coherente, loguear
    const isReactivation = emailValidation.canReactivate && emailValidation.coherent
    let existingNuusuid = null
    
    if (isReactivation) {
      existingNuusuid = emailValidation.nuusuid
      
      if (emailValidation.localOnly) {
        console.log('🔄 REACTIVACIÓN PERMITIDA')
        console.log('   Local: DESACTIVADO')
        console.log('   GAM: NO EXISTE')
        console.log('   Caso: Usuario solo en BD local')
      } else {
        console.log('🔄 REACTIVACIÓN COHERENTE detectada')
        console.log('   Local: DESACTIVADO')
        console.log('   GAM: DESACTIVADO')
        console.log('   Permitiendo RE-REGISTRO...')
      }
      console.log('   nuusuid anterior:', existingNuusuid)
      console.log('   Fecha baja local:', emailValidation.fechaBaja)
    }

    console.log('✅ Email disponible, continuando con registro...')

    // ============================================================================
    // REGLA 2: Registration and Login
    // VERIFICAR si usuario existe en GAM ANTES de intentar registrar
    // ============================================================================
    
    console.log('🔍 Verificando existencia en GAM (REGLA 2.1)...')
    const gamCheck = await gamService.checkUserExistsInGAM(email)
    
    console.log('🔍 Resultado verificación GAM:', gamCheck)

    let userId = null

    // ============================================================================
    // CASO 2.1: Usuario EXISTE en GAM pero NO en BD local
    // ============================================================================
    if (gamCheck.exists) {
      console.log('📌 CASO 2.1: Usuario EXISTE en GAM, NO crear usuario nuevo')
      console.log('   - Usuario ya registrado en GAM (desde web u otro canal)')
      console.log('   - Se creará SOLO registro en BD local si la contraseña es la real de GAM')
      console.log('   - UserID se obtendrá mediante login')

      // Hacer login para obtener access_token y UserID
      console.log('🔐 Obteniendo UserID mediante login GAM...')
      let loginResult
      try {
        loginResult = await gamService.loginGAM(email, password)
        userId = loginResult.user_id
        console.log('✅ UserID obtenido via login:', userId)
      } catch (loginError) {
        console.error('❌ Error al hacer login para obtener UserID:', loginError)
        return res.status(400).json({
          error: 'Usuario existe en GAM pero la contraseña no coincide.',
          code: 'GAM_USER_EXISTS_LOGIN_FAILED',
          details: loginError.message || String(loginError),
          suggestion: 'Ingrese la contraseña real registrada en GAM o recupérela.'
        })
      }

      // Validar con SOAP Beneficiarios (si se proporcionan datos)
      if (nroAfiliado || documento || cuil) {
        console.log('🔍 Validando datos con SOAP Beneficiarios...')
        try {
          const soapValidation = await callSoapExecute('VALIDAAFIREG', {
            AfiliadoNro: nroAfiliado || '',
            Documento: documento || '',
            CUIL: cuil || ''
          })
          console.log('✅ Validación SOAP exitosa')
        } catch (soapError) {
          console.warn('⚠️  Error validación SOAP (continuando):', soapError.message)
          // No bloquear por error SOAP
        }
      }

      // Crear registro en BD local con UserID de GAM existente
      try {
        const client = await db.pool.connect()
        try {
          // Verificar si ya existe en BD local (doble verificación)
          const existingCheck = await client.query(
            'SELECT nuusuid FROM nuusuari WHERE nuusuid = $1 OR LOWER(nuusumail) = LOWER($2)',
            [userId, email]
          )

          if (existingCheck.rows.length > 0) {
            console.log('⚠️  Usuario ya existe en BD local (sincronizado previamente)')
            return res.status(409).json({ 
              error: 'Usuario ya sincronizado en BD local',
              code: 'USER_ALREADY_SYNCED',
              nuusuid: existingCheck.rows[0].nuusuid
            })
          }

          // Insertar en nuusuari con UserID de GAM existente
          console.log('💾 Creando registro en BD local (CASO 2.1)...')
          await client.query(
            `INSERT INTO nuusuari (
              nuusuid, nuusumail, nuusunroaf, nuusuapell, nuusutelef, nuusubajaf, nuusufecha
            ) VALUES ($1, $2, $3, $4, $5, NULL, NOW())`,
            [
              userId, // UserID de GAM EXISTENTE
              email,
              nroAfiliado || cuil || documento,
              `${lastName}, ${firstName}`,
              telefono || ''
            ]
          )

          console.log('✅ Usuario sincronizado desde GAM a BD local')
          console.log('   nuusuid:', userId)

          // Guardar contraseña en nuusuauth SOLO si login fue exitoso (ya validado)
          const crypto = require('crypto')
          const salt = crypto.randomBytes(16).toString('hex')
          const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
          const passwordHash = `${salt}:${hash}`

          await client.query(
            `INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
             VALUES ($1, $2, NOW(), NOW())`,
            [userId, passwordHash]
          )

          console.log('✅ Contraseña guardada en nuusuauth')

          // Intentar sincronizar credenciales SOAP si tenemos AfiliadoId
          if (nroAfiliado) {
            try {
              console.log('🔄 Sincronizando credenciales SOAP...')
              // Construir AfiliadoId si es posible (30 caracteres)
              let afiliadoId = nroAfiliado
              if (afiliadoId.length !== 30) {
                // Padding básico si no tiene 30 caracteres
                afiliadoId = afiliadoId.padStart(30, '0')
              }

              await syncCredencialesGrupoFamiliar(userId, afiliadoId)
              console.log('✅ Credenciales sincronizadas')
            } catch (syncError) {
              console.warn('⚠️  Error sincronizando credenciales (continuando):', syncError.message)
            }
          }

          res.json({
            success: true,
            userId: userId,
            nuusuid: userId,
            case: '2.1',
            message: 'Usuario sincronizado desde GAM (ya existía en GAM)',
            userExistedInGAM: true,
            createdInGAM: false,
            syncedToLocalDB: true,
            access_token: loginResult.access_token,
            expires_in: loginResult.expires_in
          })

        } finally {
          client.release()
        }
      } catch (dbError) {
        console.error('❌ Error guardando en BD local (CASO 2.1):', dbError)
        return res.status(500).json({
          error: 'Error sincronizando usuario desde GAM',
          code: 'DB_SYNC_ERROR',
          details: dbError.message
        })
      }

      return // Finalizar flujo CASO 2.1
    }

    // ============================================================================
    // CASO 2.2: Usuario NO existe en GAM - Registro completo
    // ============================================================================
    console.log('📌 CASO 2.2: Usuario NO existe en GAM, registro completo')
    console.log('   - Se creará usuario en GAM')
    console.log('   - Se creará registro en BD local')

    // Registrar en GAM
    const gamResult = await gamService.registerUserGAM({
      email,
      password,
      firstName,
      lastName,
      telefono: telefono || '',
      nroAfiliado: nroAfiliado || '',
      documento: documento || '',
      cuil: cuil || '',
      sexo: sexo || 'M',
      fechaNacimiento: fechaNacimiento || '',
      canMiembrosFamiliar: canMiembrosFamiliar || 1
    })

    if (!gamResult.success) {
      return res.status(400).json({ 
        error: gamResult.error || 'Error al registrar en GAM',
        details: gamResult.details
      })
    }

    userId = gamResult.userId
    console.log('✅ Usuario registrado en GAM, UserID:', userId)
    console.log('🔍 gamResult completo:', JSON.stringify(gamResult, null, 2))

    // Guardar/Actualizar en nuusuari con UserID de GAM como nuusuid
    try {
      const client = await db.pool.connect()
      try {
        if (isReactivation && existingNuusuid) {
          // REACTIVACIÓN: Actualizar registro existente
          console.log('🔄 REACTIVACIÓN: Actualizando registro existente...')
          
          await client.query(
            `UPDATE nuusuari SET
              nuusuid = $1,
              nuusumail = $2,
              nuusunroaf = $3,
              nuusuapell = $4,
              nuusutelef = $5,
              nuusubajaf = NULL,
              nuusufecha = NOW(),
              nuusugamtok = NULL,
              nuusugamexp = NULL
             WHERE nuusuid = $6`,
            [
              userId, // Nuevo UserID de GAM
              email,
              nroAfiliado || cuil || documento,
              `${lastName}, ${firstName}`,
              telefono || '',
              existingNuusuid // Buscar por nuusuid anterior
            ]
          )
          
          console.log('✅ Usuario REACTIVADO en nuusuari')
          console.log('   nuusuid anterior:', existingNuusuid)
          console.log('   nuusuid nuevo (GAM):', userId)
          console.log('   nuusubajaf: NULL (reactivado)')
          
          // Guardar contraseña hasheada en nuusuauth
          const crypto = require('crypto')
          const salt = crypto.randomBytes(16).toString('hex')
          const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
          const passwordHash = `${salt}:${hash}`
          
          // Verificar si ya existe en nuusuauth y actualizar o insertar
          const authCheck = await client.query(
            'SELECT nuusuid FROM nuusuauth WHERE nuusuid = $1',
            [userId]
          )
          
          if (authCheck.rows.length > 0) {
            await client.query(
              'UPDATE nuusuauth SET nuusupass = $1, nuusuultm = NOW() WHERE nuusuid = $2',
              [passwordHash, userId]
            )
            console.log('✅ Contraseña actualizada en nuusuauth')
          } else {
            await client.query(
              `INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
               VALUES ($1, $2, NOW(), NOW())`,
              [userId, passwordHash]
            )
            console.log('✅ Contraseña guardada en nuusuauth')
          }
          
        } else {
          // ALTA NORMAL: Verificar duplicados e insertar
          const existingCheck = await client.query(
            'SELECT nuusuid FROM nuusuari WHERE nuusumail = $1 OR nuusunroaf = $2',
            [email, nroAfiliado || cuil || documento]
          )

          if (existingCheck.rows.length > 0) {
            console.warn('⚠️  Usuario ya existe en BD local')
            return res.status(409).json({ 
              error: 'Usuario ya existe',
              nuusuid: existingCheck.rows[0].nuusuid
            })
          }

          // Insertar con UserID de GAM
          await client.query(
            `INSERT INTO nuusuari (
              nuusuid, nuusumail, nuusunroaf, nuusuapell, nuusutelef, nuusubajaf
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              userId, // UserID de GAM como nuusuid
              email,
              nroAfiliado || cuil || documento,
              `${lastName}, ${firstName}`,
              telefono || '',
              null // Usuario activo por defecto
            ]
          )

          console.log('✅ Usuario guardado en nuusuari con nuusuid =', userId)
          
          // Guardar contraseña hasheada en nuusuauth
          const crypto = require('crypto')
          const salt = crypto.randomBytes(16).toString('hex')
          const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
          const passwordHash = `${salt}:${hash}`
          
          await client.query(
            `INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
             VALUES ($1, $2, NOW(), NOW())`,
            [userId, passwordHash]
          )
          
          console.log('✅ Contraseña guardada en nuusuauth')
        }

        res.json({
          success: true,
          userId: userId,
          nuusuid: userId,
          case: isReactivation ? '2.2-reactivation' : '2.2',
          isReactivation: isReactivation,
          message: isReactivation ? 'Usuario reactivado exitosamente' : 'Usuario registrado exitosamente con GAM',
          userExistedInGAM: false,
          createdInGAM: true,
          syncedToLocalDB: true,
          debug: {
            gamResultKeys: Object.keys(gamResult),
            gamData: gamResult.data,
            allData: gamResult
          }
        })

      } finally {
        client.release()
      }
    } catch (dbError) {
      console.error('⚠️  Error guardando en BD local:', dbError.message)
      // Registro en GAM fue exitoso, pero fallo en BD local
      res.json({
        success: true,
        userId: userId,
        nuusuid: userId,
        message: 'Usuario registrado en GAM (error guardando localmente)',
        warning: dbError.message,
        debug: {
          userId: userId,
          gamResultKeys: Object.keys(gamResult),
          gamResultData: gamResult.data,
          fullGamResult: gamResult
        }
      })
    }

  } catch (error) {
    console.error('❌ Error en /gam/register:', error)
    console.error('❌ Stack trace:', error.stack)
    res.status(500).json({ 
      error: error.error || error.message || String(error),
      details: error.details,
      statusCode: error.statusCode,
      stack: error.stack,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    })
  }
})

// POST /gam/login - Login OAuth2 con GAM
app.post('/gam/login', requireGAMEnabled, rateLimiters.gamLogin, validateBody(GamLoginBodySchema), async (req, res) => {
  try {
    console.log('🔐 POST /gam/login - Login OAuth2 con GAM')
    const { username, password } = req.body

    // Login en GAM
    const loginResult = await gamService.loginGAM(username, password)

    if (!loginResult.access_token) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        details: loginResult
      })
    }

    console.log('✅ Login GAM exitoso')

    // Obtener GUID de GAM (userinfo)
    let gamGUID = null
    let gamUserInfo = null
    try {
      gamUserInfo = await gamService.getUserInfo(loginResult.access_token)
      gamGUID = gamUserInfo.GUID || gamUserInfo.Id || gamUserInfo.user_id || loginResult.user_id
      console.log('✅ GUID de GAM obtenido:', gamGUID)
    } catch (userInfoError) {
      console.warn('⚠️  No se pudo obtener GUID de GAM, usando user_id del login')
      gamGUID = loginResult.user_id
    }

    if (!gamGUID) {
      console.error('❌ No se pudo obtener GUID de GAM')
      return res.status(500).json({ error: 'No se pudo obtener ID de usuario desde GAM' })
    }

    // Buscar usuario en BD local (PRIMERO por email/username, luego por GUID)
    let dbUser = null
    let migrationResult = null
    
    try {
      // Intentar buscar por GUID primero (usuarios ya migrados)
      let result = await db.query(
        `SELECT nuusuid, nuusumail, nuusunroaf, nuusuapell, nuusuafili,
                nuusubajaf
         FROM nuusuari 
         WHERE nuusuid = $1`,
        [gamGUID]
      )

      if (result.rows.length === 0) {
        // No encontrado por GUID, buscar por email (posible usuario LEGACY)
        console.log('🔍 Usuario no encontrado por GUID, buscando por email...')
        result = await db.query(
          `SELECT nuusuid, nuusumail, nuusunroaf, nuusuapell, nuusuafili,
                  nuusubajaf
           FROM nuusuari 
           WHERE LOWER(nuusumail) = LOWER($1)`,
          [username]
        )

        if (result.rows.length > 0) {
          dbUser = result.rows[0]
          const isLegacyId = /^\d+$/.test(dbUser.nuusuid)
          
          if (isLegacyId) {
            // ¡MIGRACIÓN AUTOMÁTICA!
            console.log('🚀 Usuario LEGACY detectado, iniciando migración automática...')
            try {
              migrationResult = await migrateUserToGAM(
                dbUser.nuusuid,
                dbUser.nuusumail,
                gamGUID,
                loginResult.access_token
              )
              
              // Actualizar dbUser con nuevo nuusuid
              dbUser.nuusuid = gamGUID
              console.log('✅ Migración automática completada')
            } catch (migrationError) {
              console.error('❌ Error en migración automática:', migrationError)
              // NO fallar el login, continuar con usuario legacy
              console.warn('⚠️  Continuando con usuario legacy (migración fallida)')
            }
          }
        }
      } else {
        dbUser = result.rows[0]
        console.log('✅ Usuario encontrado en BD local (ya migrado a GAM)')
      }

      if (dbUser) {
        // PUNTO 4: Verificar si el usuario está desactivado
        const fechaBaja = dbUser.nuusubajaf ? new Date(dbUser.nuusubajaf) : null
        const estaDesactivado = fechaBaja && fechaBaja.getFullYear() > 1900
        
        if (estaDesactivado) {
          console.log('❌ Usuario desactivado:', dbUser.nuusumail)
          return res.status(403).json({
            error: 'Cuenta desactivada',
            code: 'ACCOUNT_DEACTIVATED',
            message: 'Su cuenta ha sido desactivada y no puede iniciar sesión.',
            fecha_desactivacion: dbUser.nuusubajaf,
            motivo: 'Cuenta desactivada'
          })
        }
      }
    } catch (dbError) {
      console.warn('⚠️  Error buscando usuario en BD:', dbError.message)
    }

    // Sincronizar credenciales si tiene AfiliadoId (usar nuevo nuusuid si se migró)
    let credenciales = []
    if (dbUser && dbUser.nuusuafili) {
      try {
        const nuusuidToUse = gamGUID // Siempre usar GUID de GAM
        const syncResult = await syncCredencialesGrupoFamiliar(nuusuidToUse, dbUser.nuusuafili)
        credenciales = syncResult.credenciales || []
        console.log(`✅ Credenciales sincronizadas: ${credenciales.length}`)
      } catch (syncError) {
        console.warn('⚠️  Error sincronizando credenciales:', syncError.message)
      }
    }

    const sessionMetadata = buildSessionMetadata(req)
    const gamSessionPayload = {
      nuusuid: gamGUID,
      username: dbUser?.nuusumail || username,
      email: dbUser?.nuusumail || username,
      loginAt: new Date().toISOString(),
      afiliadoId: dbUser?.nuusuafili || '',
      sessionId: sessionMetadata.sessionId,
      authType: 'GAM',
    }
    if (loginResult.refresh_token) {
      issueRefreshToken(gamSessionPayload, sessionMetadata, {
        authType: 'GAM',
        sourceRefreshToken: loginResult.refresh_token,
        currentAccessToken: loginResult.access_token,
      })
    }
    sessions.set(loginResult.access_token, {
      ...gamSessionPayload,
      refreshToken: loginResult.refresh_token || null,
      sessionMetadata,
    })

    const responseData = {
      access_token: loginResult.access_token,
      refresh_token: loginResult.refresh_token || null,
      token_type: loginResult.token_type,
      expires_in: loginResult.expires_in,
      user_id: gamGUID,
      user: dbUser ? {
        nuusuid: gamGUID, // Siempre retornar GUID de GAM
        email: dbUser.nuusumail,
        nroAfiliado: dbUser.nuusunroaf,
        apellido: dbUser.nuusuapell,
        afiliadoId: dbUser.nuusuafili
      } : { nuusuid: gamGUID },
      credenciales: credenciales,
      session: {
        sessionId: sessionMetadata.sessionId,
        deviceId: sessionMetadata.deviceId,
        platform: sessionMetadata.platform,
        appVersion: sessionMetadata.appVersion,
      },
    }

    // Agregar info de migración si ocurrió
    if (migrationResult) {
      responseData.migration = {
        completed: true,
        message: migrationResult.message,
        tablesUpdated: migrationResult.tablesUpdated
      }
      console.log('📊 Respuesta incluye info de migración automática')
    }

    res.json(responseData)

  } catch (error) {
    console.error('❌ Error en /gam/login:', error)
    res.status(500).json({ 
      error: error.error || error.message,
      details: error.details
    })
  }
})

// GET /gam/userinfo - Obtener info del usuario autenticado
app.get('/gam/userinfo', requireGAMEnabled, async (req, res) => {
  try {
    console.log('🔐 GET /gam/userinfo')
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorización requerido' })
    }

    const token = authHeader.substring(7) // Remover "Bearer "

    // Obtener info de GAM
    const userInfo = await gamService.getUserInfo(token)

    res.json(userInfo)

  } catch (error) {
    console.error('❌ Error en /gam/userinfo:', error)
    if (error.statusCode === 401) {
      res.status(401).json({ error: 'Token inválido o expirado' })
    } else {
      res.status(500).json({ 
        error: error.error || error.message 
      })
    }
  }
})

// POST /gam/change-password - Cambiar contraseña
app.post('/gam/change-password', requireGAMEnabled, validateBody(GamChangePasswordBodySchema), async (req, res) => {
  try {
    console.log('🔐 POST /gam/change-password')
    const authHeader = req.headers.authorization
    const { currentPassword, newPassword } = req.body

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorización requerido' })
    }

    const token = authHeader.substring(7)

    // Obtener username desde GAM
    const userInfo = await gamService.getUserInfo(token)
    const username = userInfo.username || userInfo.email

    // Cambiar contraseña en GAM
    const result = await gamService.changePasswordGAM(token, username, currentPassword, newPassword)

    res.json(result)

  } catch (error) {
    console.error('❌ Error en /gam/change-password:', error)
    res.status(500).json({ 
      error: error.error || error.message 
    })
  }
})

// POST /gam/password-recovery - Recuperación de contraseña
app.post('/gam/password-recovery', requireGAMEnabled, validateBody(GamPasswordRecoveryBodySchema), async (req, res) => {
  try {
    console.log('🔐 POST /gam/password-recovery')
    const { email, userName } = req.body

    // Verificar si el usuario existe y está activo en BD local
    try {
      const userCheck = await db.query(
        `SELECT nuusuid, nuusumail, nuusubajaf 
         FROM nuusuari 
         WHERE nuusumail = $1`,
        [email]
      )

      if (userCheck.rows.length > 0) {
        const user = userCheck.rows[0]
        
        // Si el usuario está desactivado, no permitir recuperación
        if (user.nuusubajaf) {
          console.log('❌ Usuario desactivado, recuperación bloqueada:', email)
          console.log('   Fecha baja:', user.nuusubajaf)
          
          return res.status(403).json({ 
            error: 'Usuario desactivado',
            message: 'Este usuario ha sido desactivado y no puede recuperar su contraseña. Contacte al administrador.',
            fechaBaja: user.nuusubajaf
          })
        }
        
        console.log('✅ Usuario activo, permitiendo recuperación')
      } else {
        console.log('⚠️  Usuario no encontrado en BD local, continuando con GAM')
      }
    } catch (dbError) {
      console.warn('⚠️  Error verificando estado usuario en BD:', dbError.message)
      // Continuar con GAM aunque falle la verificación local
    }

    // Enviar email de recuperación desde backend
    const result = await gamService.passwordRecoveryGAM(email, userName)

    res.json(result)

  } catch (error) {
    console.error('❌ Error en /gam/password-recovery:', error)
    res.status(500).json({ 
      error: error.error || error.message 
    })
  }
})

// POST /gam/logout - Cerrar sesión GAM
app.post('/gam/logout', requireGAMEnabled, requireAuth, async (req, res) => {
  try {
    console.log('🚪 POST /gam/logout - Cerrar sesión')
    
    // Verificar que es sesión GAM
    if (req.session.authType !== 'GAM') {
      console.log('⚠️  Logout de sesión local (no GAM)')
      
      // Para sesiones locales, simplemente eliminar del Map
      const authHeader = req.headers['authorization']
      const token = authHeader.replace('Bearer ', '')
      const currentSession = sessions.get(token)
      if (currentSession?.refreshToken) {
        revokeRefreshToken(currentSession.refreshToken)
      }
      sessions.delete(token)
      
      return res.json({ 
        success: true,
        message: 'Sesión local cerrada',
        authType: 'LOCAL'
      })
    }
    
    const authHeader = req.headers['authorization']
    const gamToken = authHeader.replace('Bearer ', '')
    const currentSession = sessions.get(gamToken)
    
    // Cerrar sesión en GAM (revocar token)
    try {
      await gamService.logoutGAM(gamToken)
      console.log('✅ Sesión GAM cerrada exitosamente')
    } catch (gamError) {
      console.warn('⚠️  Error cerrando sesión GAM:', gamError.message)
      // Continuar aunque falle el logout en GAM
    }
    
    // Limpiar token de BD
    try {
      await db.query(
        `UPDATE nuusuari 
         SET nuusugamtok = NULL,
             nuusugamexp = NULL
         WHERE nuusuid = $1`,
        [req.session.nuusuid]
      )
      console.log('✅ Token GAM limpiado de BD')
    } catch (dbError) {
      console.error('❌ Error limpiando token de BD:', dbError.message)
    }

    if (currentSession?.refreshToken) {
      revokeRefreshToken(currentSession.refreshToken)
    }
    sessions.delete(gamToken)
    
    res.json({ 
      success: true,
      message: 'Sesión GAM cerrada',
      authType: 'GAM'
    })

  } catch (error) {
    console.error('❌ Error en /gam/logout:', error)
    res.status(500).json({ 
      error: error.error || error.message 
    })
  }
})

// POST /gam/cancel-registration - Anular registración
app.post('/gam/cancel-registration', requireGAMEnabled, requireAuth, async (req, res) => {
  try {
    console.log('🗑️  POST /gam/cancel-registration - Anular registración')
    
    const nuusuid = req.session.nuusuid
    
    if (!nuusuid) {
      return res.status(400).json({
        error: 'No se pudo determinar el ID del usuario'
      })
    }

    console.log('👤 Usuario:', req.session.username, '- ID:', nuusuid)
    console.log('🔑 Tipo autenticación:', req.session.authType)

    // Determinar tipo de usuario por formato de nuusuid
    const isGAMUser = req.session.authType === 'GAM' || !/^\d+$/.test(nuusuid)
    
    console.log('🔍 Análisis de usuario:')
    console.log('   nuusuid:', nuusuid)
    console.log('   Tipo:', isGAMUser ? 'GAM (UUID)' : 'LEGACY (numérico)')

    if (isGAMUser) {
      // Usuario GAM: DEBE anularse en GAM obligatoriamente
      console.log('📋 Usuario GAM detectado - REQUIERE anulación en GAM')
      
      // El token GAM ya está validado por requireAuth middleware
      const authHeader = req.headers['authorization']
      const accessToken = authHeader.replace('Bearer ', '')

      if (!accessToken) {
        console.error('❌ Usuario GAM sin token - NO se puede anular')
        return res.status(400).json({
          error: 'No se puede anular registración',
          message: 'Usuario registrado con GAM pero sin token activo. Por favor, cierre sesión y vuelva a iniciar sesión con GAM para obtener un token válido.',
          code: 'GAM_TOKEN_REQUIRED',
          details: 'La anulación debe hacerse en GAM para mantener coherencia. Se requiere token GAM activo.'
        })
      }

      // Anular en GAM primero
      try {
        console.log('🔑 Anulando en GAM...')
        console.log('   UserID (nuusuid):', nuusuid)
        
        const result = await gamService.cancelRegistrationGAM(accessToken)
        
        if (!result.success) {
          console.error('❌ Error al anular en GAM:', result.message)
          return res.status(500).json({
            error: 'Error al anular en GAM',
            message: result.message || 'No se pudo anular la registración en el servidor de autenticación',
            details: 'No se realizó la desactivación local para mantener coherencia con GAM'
          })
        }
        
        console.log('✅ Anulación en GAM exitosa')
      } catch (gamError) {
        console.error('❌ Error comunicándose con GAM:', gamError)
        return res.status(500).json({
          error: 'Error al anular en GAM',
          message: gamError.message || 'No se pudo comunicar con el servidor de autenticación',
          details: 'No se realizó la desactivación local para mantener coherencia con GAM'
        })
      }
    } else {
      console.log('ℹ️  Usuario legacy (numérico) - anulación solo local')
    }

    // Desactivar usuario en BD local
    const motivoCompleto = isGAMUser 
      ? `Usuario GAM anuló su registración desde la app (UserID GAM en nuusuid: ${nuusuid})`
      : `Usuario legacy anuló su registración desde la app (solo local - nuusuid numérico: ${nuusuid})`
    
    await db.pool.query(
      'SELECT * FROM desactivar_usuario($1, $2)',
      [nuusuid, motivoCompleto]
    )

    console.log('✅ Usuario desactivado localmente')
    console.log(`📝 Tipo anulación: ${isGAMUser ? 'GAM+Local' : 'Solo Local'}`)

    // Invalidar sesión actual
    const authToken = req.headers.authorization?.replace('Bearer ', '')
    if (authToken) {
      sessions.delete(authToken)
      console.log('🔒 Sesión invalidada')
    }

    res.json({
      success: true,
      message: 'Registración anulada exitosamente. Su cuenta ha sido desactivada.'
    })

  } catch (error) {
    console.error('❌ Error en /gam/cancel-registration:', error)
    res.status(500).json({ 
      error: error.error || error.message || 'Error al anular registración'
    })
  }
})

// POST /gam/sync-token - Sincronizar token GAM para usuarios existentes
app.post('/gam/sync-token', requireGAMEnabled, validateBody(GamSyncTokenBodySchema), async (req, res) => {
  try {
    console.log('🔄 POST /gam/sync-token - Sincronizar token GAM')
    
    // Obtener token de sesión actual
    const authHeader = req.headers['authorization']
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado. Token requerido.' })
    }

    const token = authHeader.replace('Bearer ', '')
    const session = sessions.get(token)

    if (!session) {
      return res.status(401).json({ 
        error: 'Token inválido o expirado',
        message: 'Por favor, cierre sesión y vuelva a iniciar sesión',
        code: 'SESSION_EXPIRED'
      })
    }

    const { password } = req.body

    const nuusuid = session.nuusuid
    
    console.log('👤 Usuario:', session.username, '- ID:', nuusuid)

    // Obtener email del usuario
    const userResult = await db.pool.query(
      'SELECT nuusumail FROM nuusuari WHERE nuusuid = $1',
      [nuusuid]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const email = userResult.rows[0].nuusumail

    console.log('🔐 Intentando login en GAM con email:', email)

    // Login en GAM para obtener token
    const gamLogin = await gamService.loginGAM(email, password)

    if (!gamLogin.success || !gamLogin.access_token) {
      console.error('❌ Login GAM fallido')
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'No se pudo autenticar con GAM. Verifique su contraseña.',
        details: gamLogin.error || 'Error de autenticación'
      })
    }

    const accessToken = gamLogin.access_token
    const userId = gamLogin.user_id

    console.log('✅ Login GAM exitoso')
    console.log('   UserID GAM:', userId)
    console.log('   nuusuid actual:', nuusuid)

    // Verificar coherencia de UserID
    if (userId !== nuusuid) {
      console.warn('⚠️  ADVERTENCIA: UserID de GAM no coincide con nuusuid')
      console.warn('   UserID GAM:', userId)
      console.warn('   nuusuid BD:', nuusuid)
      
      return res.status(409).json({
        error: 'Incoherencia de datos',
        message: 'El UserID de GAM no coincide con el registrado en la base de datos',
        details: {
          gamUserId: userId,
          localUserId: nuusuid
        }
      })
    }

    // Actualizar token en BD
    await db.pool.query(
      `UPDATE nuusuari 
       SET nuusugamtok = $1,
           nuusugamexp = NOW() + INTERVAL '1 hour'
       WHERE nuusuid = $2`,
      [accessToken, nuusuid]
    )

    console.log('✅ Token GAM sincronizado en BD')

    res.json({
      success: true,
      message: 'Token GAM sincronizado exitosamente',
      userId: userId,
      tokenExpires: 'En 1 hora'
    })

  } catch (error) {
    console.error('❌ Error en /gam/sync-token:', error)
    res.status(500).json({ 
      error: error.error || error.message || 'Error al sincronizar token GAM'
    })
  }
})

// POST /gam/validate-user - Validar usuario
app.post('/gam/validate-user', requireGAMEnabled, validateBody(GamValidateUserBodySchema), async (req, res) => {
  try {
    console.log('🔐 POST /gam/validate-user')
    const validationData = req.body

    const result = await gamService.validateUserGAM(validationData)

    res.json(result)

  } catch (error) {
    console.error('❌ Error en /gam/validate-user:', error)
    res.status(500).json({ 
      error: error.error || error.message 
    })
  }
})

// ============================================================================
// FIN ENDPOINTS GAM
// ============================================================================

// ============================================================================
// ENDPOINTS ELIMINACIÓN LÓGICA (PUNTO 4)
// ============================================================================

// Middleware para verificar autenticación con sessions Map (legacy admin endpoints)
function requireAuthAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' })
  }
  
  const session = sessions.get(token)
  if (!session) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' })
  }
  
  req.user = session
  next()
}

// DELETE /user/account - Eliminar cuenta (eliminación lógica)
app.delete('/user/account', requireAuthAdmin, async (req, res) => {
  try {
    console.log('🗑️  DELETE /user/account - Eliminación lógica de cuenta')
    console.log('req.user:', JSON.stringify(req.user, null, 2))
    const nuusuid = req.user.nuusuid || req.user.userId
    console.log('nuusuid a desactivar:', nuusuid)
    const { motivo } = req.body
    
    if (!nuusuid) {
      return res.status(400).json({
        error: 'No se pudo determinar el ID del usuario',
        code: 'NO_USER_ID',
        debug: { user: req.user }
      })
    }
    
    // Llamar a función de BD para desactivar usuario
    const result = await db.pool.query(
      'SELECT * FROM desactivar_usuario($1, $2)',
      [nuusuid, motivo || 'Usuario solicitó eliminación de cuenta desde la app']
    )
    
    const response = result.rows[0]
    
    if (!response.success) {
      return res.status(400).json({
        error: response.message,
        code: 'DEACTIVATION_FAILED'
      })
    }
    
    console.log('✅ Usuario desactivado:', response)
    
    // Desactivar en GAM si es usuario GAM (detectado por nuusuid NO numérico)
    try {
      const userInfo = await db.pool.query(
        'SELECT nuusuid, nuusumail FROM nuusuari WHERE nuusuid = $1',
        [nuusuid]
      )
      
      // Usuario GAM si nuusuid NO es numérico (UserID de GAM es string)
      const isGamUser = userInfo.rows.length > 0 && !/^[0-9]+$/.test(userInfo.rows[0].nuusuid)
      
      if (isGamUser) {
        console.log('🔐 Usuario GAM detectado, desactivando en GAM...')
        // TODO: Implementar desactivación en GAM cuando tengamos el endpoint
        // await gamService.deactivateUserGAM(userInfo.rows[0].nuusuid)
        console.log('⚠️  Desactivación GAM pendiente de implementación')
      }
    } catch (gamError) {
      console.error('⚠️  Error desactivando en GAM:', gamError.message)
      // No fallar si GAM da error - la desactivación local ya se hizo
    }
    
    // Invalidar sesión actual
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (token) {
      sessions.delete(token)
    }
    
    res.json({
      success: true,
      message: 'Cuenta desactivada exitosamente',
      nuusuid: response.nuusuid,
      email: response.email,
      fecha_desactivacion: response.fecha,
      nota: 'Su cuenta ha sido desactivada. Los datos se preservan para historial.'
    })
    
  } catch (error) {
    console.error('❌ Error en eliminación lógica:', error)
    res.status(500).json({
      error: 'Error al desactivar cuenta',
      details: error.message
    })
  }
})

// POST /admin/user/reactivate - Reactivar usuario (solo admin)
app.post('/admin/user/reactivate', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('♻️  POST /admin/user/reactivate - Reactivar usuario')
    console.log('req.body:', JSON.stringify(req.body))
    console.log('req.user:', JSON.stringify(req.user))
    console.log('req.session:', JSON.stringify(req.session))
    
    const { nuusuid } = req.body
    
    console.log('nuusuid extraído:', nuusuid)
    
    if (!nuusuid) {
      console.log('❌ nuusuid faltante')
      return res.status(400).json({ error: 'nuusuid requerido' })
    }

    const adminEmailsAntes = await getBackendAdminEmails()
    const userBefore = await userRepository.findPublicById(nuusuid)
    
    // FIXED: Ahora usa req.session establecido por requireAuth middleware
    const adminId = req.session.nuusuid || req.session.username || 'admin'
    console.log('adminId:', adminId)
    
    // Llamar a función con 1 solo parámetro (nuusuid)
    console.log('Llamando a reactivar_usuario($1)...')
    console.log('$1 (nuusuid):', nuusuid)
    
    const result = await db.pool.query(
      'SELECT * FROM reactivar_usuario($1)',
      [nuusuid]
    )
    
    console.log('result.rows:', JSON.stringify(result.rows))
    
    const response = result.rows[0]
    
    console.log('response:', JSON.stringify(response))
    console.log('response.success:', response.success)
    
    if (!response.success) {
      console.log('❌ Reactivación falló según función')
      return res.status(400).json({
        error: response.message,
        code: 'REACTIVATION_FAILED'
      })
    }
    
    console.log('✅ Usuario reactivado exitosamente')

    const userAfter = await userRepository.findPublicById(nuusuid)
    await writeAdminAuditLog({
      req,
      entity: 'usuario',
      entityId: nuusuid,
      action: 'REACTIVATE',
      summary: `Usuario ${nuusuid} reactivado`,
      before: toUserAuditState(userBefore, {
        isBackendAdmin: adminEmailsAntes.includes(normalizeEmail(userBefore?.nuusumail)),
      }),
      after: toUserAuditState(userAfter, {
        isBackendAdmin: adminEmailsAntes.includes(normalizeEmail(userAfter?.nuusumail)),
      }),
    })
    
    res.json({
      success: true,
      message: response.message,
      nuusuid: nuusuid
    })
    
  } catch (error) {
    console.error('❌ Error en reactivación:', error)
    console.error('Stack:', error.stack)
    res.status(500).json({
      error: 'Error al reactivar usuario',
      details: error.message,
      stack: error.stack
    })
  }
})

// GET /user/status - Verificar estado de cuenta
app.get('/user/status', requireAuth, async (req, res) => {
  try {
    const nuusuid = req.user.nuusuid
    
    const result = await db.pool.query(`
      SELECT 
        nuusuid,
        nuusumail,
        nuusuapell,
        nuusubajaf,
        CASE 
          WHEN nuusubajaf IS NULL THEN 'ACTIVO'
          WHEN nuusubajaf IS NOT NULL THEN 'DESACTIVADO'
          ELSE 'DESCONOCIDO'
        END AS estado
      FROM nuusuari
      WHERE nuusuid = $1
    `, [nuusuid])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    
    const user = result.rows[0]
    
    res.json({
      nuusuid: user.nuusuid,
      email: user.nuusumail,
      nombre: user.nuusuapell,
      estado: user.estado,
      activo: user.nuusubajaf === null,
      fecha_desactivacion: user.nuusubajaf
    })
    
  } catch (error) {
    console.error('❌ Error obteniendo estado:', error)
    res.status(500).json({
      error: 'Error al obtener estado de cuenta',
      details: error.message
    })
  }
})

// GET /admin/stats/users - Estadísticas de usuarios (admin)
app.get('/admin/stats/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('📊 GET /admin/stats/users - Estadísticas')

    const { q, estado = 'todos', tipo = 'todos' } = req.query

    let whereClause = 'WHERE 1=1'
    const params = []
    let paramCount = 1

    if (q && q.trim()) {
      whereClause += ` AND (
        LOWER(u.nuusumail) LIKE LOWER($${paramCount})
        OR LOWER(u.nuusuapell) LIKE LOWER($${paramCount})
        OR u.nuusuid::text LIKE $${paramCount}
      )`
      params.push(`%${q}%`)
      paramCount++
    }

    if (estado === 'activo') {
      whereClause += ` AND u.nuusuactiv = 'S'`
    } else if (estado === 'desactivado') {
      whereClause += ` AND u.nuusuactiv = 'N'`
    }

    if (tipo === 'gam') {
      whereClause += ` AND u.nuusuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`
    } else if (tipo === 'local') {
      whereClause += ` AND u.nuusuid !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`
    }

    const backendAdminEmails = await getBackendAdminEmails()
    params.push(backendAdminEmails.map((email) => normalizeEmail(email)))
    const adminParamIndex = paramCount
    paramCount++

    const statsQuery = `
      SELECT
        COUNT(*)::int AS total_usuarios,
        COUNT(*) FILTER (WHERE u.nuusuactiv = 'S')::int AS usuarios_activos,
        COUNT(*) FILTER (WHERE u.nuusuactiv = 'N')::int AS usuarios_desactivados,
        COUNT(*) FILTER (WHERE u.nuusuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')::int AS usuarios_gam,
        COUNT(*) FILTER (WHERE u.nuusuid !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')::int AS usuarios_local,
        COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(u.nuusumail, ''))) = ANY($${adminParamIndex}::text[]))::int AS usuarios_admin_backend
      FROM nuusuari u
      ${whereClause}
    `

    const result = await db.pool.query(statsQuery, params)
    const stats = result.rows[0]
    
    res.json({
      success: true,
      estadisticas: stats,
      filtros: {
        q: q || '',
        estado,
        tipo
      }
    })
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error)
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      details: error.message
    })
  }
})

// GET /admin/backend-admins - Lista de administradores backend
app.get('/admin/backend-admins', requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminEmails = await getBackendAdminEmails({ forceRefresh: true })
    res.json({
      success: true,
      admins: adminEmails,
      total: adminEmails.length,
    })
  } catch (error) {
    console.error('❌ Error listando admins backend:', error)
    res.status(500).json({
      error: 'Error al listar administradores backend',
      details: error.message,
    })
  }
})

// POST /admin/user/grant-backend-admin - Otorga rol admin backend
app.post('/admin/user/grant-backend-admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nuusuid } = req.body || {}

    if (!nuusuid) {
      return res.status(400).json({ error: 'nuusuid requerido' })
    }

    const userResult = await db.pool.query(
      'SELECT nuusuid, nuusumail, nuusuapell FROM nuusuari WHERE nuusuid = $1',
      [nuusuid]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const targetUser = userResult.rows[0]
    const targetEmail = normalizeEmail(targetUser.nuusumail)

    if (!targetEmail) {
      return res.status(400).json({ error: 'El usuario no tiene email válido para rol admin backend' })
    }

    const currentAdmins = await getBackendAdminEmails()
    const userBefore = await userRepository.findPublicById(nuusuid)
    if (currentAdmins.includes(targetEmail)) {
      return res.json({
        success: true,
        message: 'El usuario ya es administrador backend',
        email: targetEmail,
        total_admins: currentAdmins.length,
      })
    }

    const updatedAdmins = await saveBackendAdminEmails([...currentAdmins, targetEmail])

    await writeAdminAuditLog({
      req,
      entity: 'backend_admin',
      entityId: nuusuid,
      action: 'GRANT',
      summary: `Rol admin backend otorgado a ${targetEmail}`,
      before: toUserAuditState(userBefore, { isBackendAdmin: false }),
      after: toUserAuditState(userBefore, { isBackendAdmin: true }),
      meta: { email: targetEmail, totalAdmins: updatedAdmins.length },
    })

    res.json({
      success: true,
      message: 'Administrador backend asignado correctamente',
      nuusuid,
      email: targetEmail,
      total_admins: updatedAdmins.length,
    })
  } catch (error) {
    console.error('❌ Error asignando admin backend:', error)
    res.status(500).json({
      error: 'Error al asignar administrador backend',
      details: error.message,
    })
  }
})

// POST /admin/user/revoke-backend-admin - Revoca rol admin backend
app.post('/admin/user/revoke-backend-admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nuusuid } = req.body || {}

    if (!nuusuid) {
      return res.status(400).json({ error: 'nuusuid requerido' })
    }

    const userResult = await db.pool.query(
      'SELECT nuusuid, nuusumail, nuusuapell FROM nuusuari WHERE nuusuid = $1',
      [nuusuid]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const targetUser = userResult.rows[0]
    const targetEmail = normalizeEmail(targetUser.nuusumail)

    if (!targetEmail) {
      return res.status(400).json({ error: 'El usuario no tiene email válido para rol admin backend' })
    }

    const currentAdmins = await getBackendAdminEmails()
    const userBefore = await userRepository.findPublicById(nuusuid)
    if (!currentAdmins.includes(targetEmail)) {
      return res.json({
        success: true,
        message: 'El usuario no tenía rol de administrador backend',
        email: targetEmail,
        total_admins: currentAdmins.length,
      })
    }

    const currentActorEmail = normalizeEmail(req.session?.email || req.session?.username)
    if (targetEmail === currentActorEmail) {
      return res.status(400).json({
        error: 'No podés quitarte tu propio rol de administrador backend',
      })
    }

    const updatedAdmins = currentAdmins.filter((email) => normalizeEmail(email) !== targetEmail)
    if (updatedAdmins.length === 0) {
      return res.status(400).json({
        error: 'Debe quedar al menos un administrador backend',
      })
    }

    const savedAdmins = await saveBackendAdminEmails(updatedAdmins)

    await writeAdminAuditLog({
      req,
      entity: 'backend_admin',
      entityId: nuusuid,
      action: 'REVOKE',
      summary: `Rol admin backend revocado a ${targetEmail}`,
      before: toUserAuditState(userBefore, { isBackendAdmin: true }),
      after: toUserAuditState(userBefore, { isBackendAdmin: false }),
      meta: { email: targetEmail, totalAdmins: savedAdmins.length },
    })

    res.json({
      success: true,
      message: 'Rol de administrador backend revocado correctamente',
      nuusuid,
      email: targetEmail,
      total_admins: savedAdmins.length,
    })
  } catch (error) {
    console.error('❌ Error revocando admin backend:', error)
    res.status(500).json({
      error: 'Error al revocar administrador backend',
      details: error.message,
    })
  }
})

// POST /admin/backend-admins/add - Agregar admin backend (crea usuario en BD si no existe)
app.post('/admin/backend-admins/add', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, nombre, password, roleId } = req.body || {}
    const targetEmail = normalizeEmail(email)

    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ error: 'Email válido requerido' })
    }

    // Verificar si el usuario ya existe en BD
    const existingUser = await db.pool.query(
      `SELECT nuusuid, nuusumail, nuusuapell FROM nuusuari WHERE LOWER(TRIM(nuusumail)) = $1 LIMIT 1`,
      [targetEmail]
    )

    let nuusuid = null
    let createdInDb = false

    if (existingUser.rows.length > 0) {
      // Usuario ya existe en BD
      nuusuid = existingUser.rows[0].nuusuid
      // Asignar rol si se especificó
      if (roleId && Number.isInteger(parseInt(roleId))) {
        await db.pool.query('UPDATE nuusuari SET nurolid = $1 WHERE nuusuid = $2', [parseInt(roleId), nuusuid])
        invalidateRolesCache()
      }
    } else {
      // Usuario NO existe en BD: crear nuevo registro
      if (!password) {
        return res.status(400).json({
          error: 'El usuario no existe en la base de datos. Se requiere una contraseña para crearlo.',
          code: 'PASSWORD_REQUIRED'
        })
      }

      const nombreFinal = (nombre || targetEmail.split('@')[0]).toUpperCase()
      const passwordHash = hashPassword(String(password))

      const client = await db.pool.connect()
      try {
        await client.query('BEGIN')

        const insertUser = await client.query(`
          INSERT INTO nuusuari (
            nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo,
            nuusuapell, nuusuestit, nuusutelef, nuusumail,
            nuusubajaf, nuusunivel
          ) VALUES (
            '', NULL, NOW(), '', NULL,
            $1, NULL, '', $2,
            '0001-01-01'::timestamp, 0
          ) RETURNING nuusuid
        `, [nombreFinal, targetEmail])

        nuusuid = insertUser.rows[0].nuusuid

        await client.query(`
          INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
          VALUES ($1, $2, NOW(), NOW())
        `, [nuusuid, passwordHash])

        await client.query('COMMIT')
        createdInDb = true
        console.log('✅ Admin creado en BD:', { nuusuid, email: targetEmail, nombre: nombreFinal })

        // Asignar rol si se especificó
        if (roleId && Number.isInteger(parseInt(roleId))) {
          await db.pool.query('UPDATE nuusuari SET nurolid = $1 WHERE nuusuid = $2', [parseInt(roleId), nuusuid])
          invalidateRolesCache()
        }
      } catch (dbError) {
        await client.query('ROLLBACK')
        throw dbError
      } finally {
        client.release()
      }
    }

    // Agregar a la lista de admins backend
    const currentAdmins = await getBackendAdminEmails()
    if (currentAdmins.includes(targetEmail)) {
      return res.json({
        success: true,
        message: `${targetEmail} ya es administrador backend`,
        admins: currentAdmins,
        nuusuid,
        createdInDb,
      })
    }

    const updatedAdmins = await saveBackendAdminEmails([...currentAdmins, targetEmail])

    const userAfter = nuusuid ? await userRepository.findPublicById(nuusuid) : null
    await writeAdminAuditLog({
      req,
      entity: 'backend_admin',
      entityId: nuusuid || targetEmail,
      action: createdInDb ? 'CREATE_AND_GRANT' : 'GRANT',
      summary: createdInDb
        ? `Usuario admin backend creado y habilitado: ${targetEmail}`
        : `Email agregado como admin backend: ${targetEmail}`,
      after: toUserAuditState(userAfter, { isBackendAdmin: true }),
      meta: { email: targetEmail, createdInDb, totalAdmins: updatedAdmins.length },
    })

    res.json({
      success: true,
      message: createdInDb
        ? `${targetEmail} creado en BD y agregado como administrador backend`
        : `${targetEmail} agregado como administrador backend`,
      admins: updatedAdmins,
      nuusuid,
      createdInDb,
    })
  } catch (error) {
    console.error('❌ Error agregando admin backend:', error)
    res.status(500).json({ error: 'Error al agregar administrador backend', details: error.message })
  }
})

// POST /admin/backend-admins/remove - Quitar admin backend por email directo
app.post('/admin/backend-admins/remove', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body || {}
    const targetEmail = normalizeEmail(email)

    if (!targetEmail) {
      return sendLegacyValidationError(res, 'Email requerido', 'body')
    }

    const currentAdmins = await getBackendAdminEmails()
    if (!currentAdmins.includes(targetEmail)) {
      return res.json({
        success: true,
        message: `${targetEmail} no era administrador backend`,
        admins: currentAdmins,
      })
    }

    const currentActorEmail = normalizeEmail(req.session?.email || req.session?.username)
    if (targetEmail === currentActorEmail) {
      return res.status(400).json({ error: 'No podés quitarte tu propio rol de administrador backend' })
    }

    const updatedAdmins = currentAdmins.filter((e) => normalizeEmail(e) !== targetEmail)
    if (updatedAdmins.length === 0) {
      return res.status(400).json({ error: 'Debe quedar al menos un administrador backend' })
    }

    const savedAdmins = await saveBackendAdminEmails(updatedAdmins)

    const userRow = await db.pool.query(
      'SELECT nuusuid FROM nuusuari WHERE LOWER(TRIM(nuusumail)) = $1 LIMIT 1',
      [targetEmail]
    )
    const userAfter = userRow.rows[0]?.nuusuid ? await userRepository.findPublicById(userRow.rows[0].nuusuid) : null
    await writeAdminAuditLog({
      req,
      entity: 'backend_admin',
      entityId: userRow.rows[0]?.nuusuid || targetEmail,
      action: 'REVOKE',
      summary: `Email removido de admins backend: ${targetEmail}`,
      before: userAfter ? toUserAuditState(userAfter, { isBackendAdmin: true }) : { email: targetEmail, isBackendAdmin: true },
      after: userAfter ? toUserAuditState(userAfter, { isBackendAdmin: false }) : { email: targetEmail, isBackendAdmin: false },
      meta: { email: targetEmail, totalAdmins: savedAdmins.length },
    })

    res.json({
      success: true,
      message: `${targetEmail} removido de administradores backend`,
      admins: savedAdmins,
    })
  } catch (error) {
    console.error('❌ Error removiendo admin backend:', error)
    res.status(500).json({ error: 'Error al remover administrador backend', details: error.message })
  }
})

// ============================================================================
// ADMIN ROLES — CRUD de roles y permisos granulares (Tarea backend-user-roles-permissions)
// ============================================================================

// GET /admin/roles — Listar roles activos
app.get('/admin/roles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.pool.query(
      `SELECT nurolid, nurolnombre, nurolpermisos, nurolactivo, nurolcrea, nurolultm
       FROM nurolper
       ORDER BY nurolid`
    )
    const roles = result.rows.map((r) => ({
      id: r.nurolid,
      nombre: r.nurolnombre,
      permisos: (() => { try { return JSON.parse(r.nurolpermisos) } catch { return [] } })(),
      activo: r.nurolactivo === 'S',
      crea: r.nurolcrea,
      ultm: r.nurolultm,
    }))
    res.json({ success: true, roles })
  } catch (error) {
    console.error('❌ Error listando roles:', error)
    res.status(500).json({ error: 'Error al listar roles', details: error.message })
  }
})

// POST /admin/roles — Crear nuevo rol
app.post('/admin/roles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nombre, permisos = [] } = req.body || {}
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'El campo nombre es requerido' })
    }
    if (!Array.isArray(permisos)) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'permisos debe ser un array' })
    }
    const invalid = permisos.filter((p) => !PERMISSION_MODULES.includes(p))
    if (invalid.length > 0) {
      return res.status(400).json({
        error: 'INVALID_PERMISSION',
        message: `Módulos inválidos: ${invalid.join(', ')}. Válidos: ${PERMISSION_MODULES.join(', ')}`,
        invalid,
      })
    }
    const result = await db.pool.query(
      `INSERT INTO nurolper (nurolnombre, nurolpermisos, nurolactivo)
       VALUES ($1, $2, 'S')
       RETURNING nurolid, nurolnombre, nurolpermisos, nurolactivo, nurolcrea`,
      [nombre.trim(), JSON.stringify(permisos)]
    )
    invalidateRolesCache()
    const r = result.rows[0]
    res.status(201).json({
      success: true,
      role: {
        id: r.nurolid,
        nombre: r.nurolnombre,
        permisos: JSON.parse(r.nurolpermisos),
        activo: r.nurolactivo === 'S',
        crea: r.nurolcrea,
      },
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'ROLE_EXISTS', message: 'Ya existe un rol con ese nombre' })
    }
    console.error('❌ Error creando rol:', error)
    res.status(500).json({ error: 'Error al crear rol', details: error.message })
  }
})

// PUT /admin/roles/:id — Actualizar rol existente
app.put('/admin/roles/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

    const { nombre, permisos } = req.body || {}
    const updates = []
    const params = []
    let idx = 1

    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || !nombre.trim()) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'nombre no puede estar vacío' })
      }
      updates.push(`nurolnombre = $${idx++}`)
      params.push(nombre.trim())
    }
    if (permisos !== undefined) {
      if (!Array.isArray(permisos)) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'permisos debe ser un array' })
      }
      const invalid = permisos.filter((p) => !PERMISSION_MODULES.includes(p))
      if (invalid.length > 0) {
        return res.status(400).json({
          error: 'INVALID_PERMISSION',
          message: `Módulos inválidos: ${invalid.join(', ')}`,
          invalid,
        })
      }
      updates.push(`nurolpermisos = $${idx++}`)
      params.push(JSON.stringify(permisos))
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    updates.push(`nurolultm = NOW()`)
    params.push(id)

    const result = await db.pool.query(
      `UPDATE nurolper SET ${updates.join(', ')} WHERE nurolid = $${idx}
       RETURNING nurolid, nurolnombre, nurolpermisos, nurolactivo, nurolultm`,
      params
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' })
    }
    invalidateRolesCache()
    const r = result.rows[0]
    res.json({
      success: true,
      role: {
        id: r.nurolid,
        nombre: r.nurolnombre,
        permisos: (() => { try { return JSON.parse(r.nurolpermisos) } catch { return [] } })(),
        activo: r.nurolactivo === 'S',
        ultm: r.nurolultm,
      },
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'ROLE_EXISTS', message: 'Ya existe un rol con ese nombre' })
    }
    console.error('❌ Error actualizando rol:', error)
    res.status(500).json({ error: 'Error al actualizar rol', details: error.message })
  }
})

// DELETE /admin/roles/:id — Soft delete de rol
app.delete('/admin/roles/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

    // Verificar si hay usuarios con este rol asignado
    const usersCheck = await db.pool.query(
      `SELECT COUNT(*)::int AS total FROM nuusuari WHERE nurolid = $1`,
      [id]
    )
    const usersWithRole = usersCheck.rows[0]?.total || 0
    if (usersWithRole > 0) {
      return res.status(409).json({
        error: 'ROLE_IN_USE',
        message: `No se puede eliminar: ${usersWithRole} usuario(s) tienen este rol asignado`,
        usersCount: usersWithRole,
      })
    }

    const result = await db.pool.query(
      `UPDATE nurolper SET nurolactivo = 'N', nurolultm = NOW() WHERE nurolid = $1
       RETURNING nurolid, nurolnombre`,
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' })
    }
    invalidateRolesCache()
    res.json({ success: true, message: `Rol '${result.rows[0].nurolnombre}' desactivado` })
  } catch (error) {
    console.error('❌ Error eliminando rol:', error)
    res.status(500).json({ error: 'Error al eliminar rol', details: error.message })
  }
})

// POST /admin/roles/reload-cache — Forzar recarga del cache de roles
app.post('/admin/roles/reload-cache', requireAuth, requireAdmin, async (req, res) => {
  invalidateRolesCache()
  const roles = await loadRolesCache()
  res.json({ success: true, message: 'Cache de roles recargado', count: roles.length })
})

// POST /admin/users/:id/role — Asignar o quitar rol a usuario admin (solo super admin = nurolid null)
app.post('/admin/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { roleId } = req.body || {}

    // Solo super admin (sin rol asignado = acceso total) puede cambiar roles
    const session = sessions.get(req.headers.authorization?.replace('Bearer ', ''))
    if (session && session.nurolid !== null && session.nurolid !== undefined) {
      return res.status(403).json({
        error: 'SUPER_ADMIN_REQUIRED',
        message: 'Solo un Super Admin (sin rol asignado) puede modificar roles de otros usuarios',
      })
    }

    // Verificar que el usuario exista
    const userCheck = await db.pool.query(
      `SELECT nuusuid, nuusumail FROM nuusuari WHERE nuusuid = $1`,
      [id]
    )
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // Verificar que sea admin backend
    const backendAdminEmails = await getBackendAdminEmails()
    const backendAdminSet = new Set(backendAdminEmails.map(normalizeEmail))
    if (!backendAdminSet.has(normalizeEmail(userCheck.rows[0].nuusumail))) {
      return res.status(400).json({
        error: 'NOT_BACKEND_ADMIN',
        message: 'Solo se puede asignar rol a usuarios que sean administradores backend',
      })
    }

    // roleId null = quitar rol
    if (roleId === null || roleId === undefined) {
      await db.pool.query(`UPDATE nuusuari SET nurolid = NULL WHERE nuusuid = $1`, [id])
      invalidateRolesCache()
      return res.json({ success: true, message: 'Rol removido. Usuario con acceso total.', role: null })
    }

    // Verificar que el rol exista y esté activo
    const roleCheck = await db.pool.query(
      `SELECT nurolid, nurolnombre, nurolpermisos FROM nurolper WHERE nurolid = $1 AND nurolactivo = 'S'`,
      [parseInt(roleId, 10)]
    )
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ROLE_NOT_FOUND', message: 'Rol no encontrado o inactivo' })
    }

    await db.pool.query(`UPDATE nuusuari SET nurolid = $1 WHERE nuusuid = $2`, [parseInt(roleId, 10), id])
    invalidateRolesCache()

    const r = roleCheck.rows[0]
    res.json({
      success: true,
      message: `Rol '${r.nurolnombre}' asignado al usuario`,
      role: {
        id: r.nurolid,
        nombre: r.nurolnombre,
        permisos: (() => { try { return JSON.parse(r.nurolpermisos) } catch { return [] } })(),
      },
    })
  } catch (error) {
    console.error('❌ Error asignando rol:', error)
    res.status(500).json({ error: 'Error al asignar rol', details: error.message })
  }
})

// ============================================================================
// FIN ADMIN ROLES
// ============================================================================

// PUT /admin/users/:id - Editar datos de un usuario (nombre, email, contraseña)
app.put('/admin/users/:id', requireAuth, requireAdmin, requirePermission('usuarios'), async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, email, password } = req.body || {}

    if (!id) return res.status(400).json({ error: 'ID requerido' })

    const userCheck = await db.pool.query('SELECT nuusuid, nuusumail FROM nuusuari WHERE nuusuid = $1', [id])
    if (userCheck.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' })

    const updates = []
    const values = []
    let idx = 1

    if (nombre && nombre.trim()) {
      updates.push(`nuusuapell = $${idx++}`)
      values.push(nombre.trim().toUpperCase())
    }

    if (email && email.trim() && email.includes('@')) {
      const targetEmail = normalizeEmail(email)
      const emailCheck = await db.pool.query(
        'SELECT nuusuid FROM nuusuari WHERE LOWER(TRIM(nuusumail)) = $1 AND nuusuid != $2 LIMIT 1',
        [targetEmail, id]
      )
      if (emailCheck.rows.length > 0) return res.status(409).json({ error: 'El email ya está en uso por otro usuario', code: 'EMAIL_IN_USE' })
      updates.push(`nuusumail = $${idx++}`)
      values.push(targetEmail)
    }

    if (updates.length === 0 && !password) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    if (updates.length > 0) {
      values.push(id)
      await db.pool.query(`UPDATE nuusuari SET ${updates.join(', ')} WHERE nuusuid = $${idx}`, values)
    }

    if (password && String(password).length >= 6) {
      const hashed = hashPassword(String(password))
      await db.pool.query(`
        INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (nuusuid) DO UPDATE SET nuusupass = $2, nuusuultm = NOW()
      `, [id, hashed])
    }

    console.log(`✅ Usuario editado por admin: ${id}`)
    res.json({ success: true, message: 'Usuario actualizado correctamente' })
  } catch (err) {
    console.error('Error editando usuario:', err)
    res.status(500).json({ error: 'Error interno al editar usuario' })
  }
})

// POST /admin/user/deactivate - Admin desactiva cualquier usuario (Semana 29 - UI)
app.post('/admin/user/deactivate', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('🗑️  POST /admin/user/deactivate - Admin desactivando usuario')
    console.log('req.body:', JSON.stringify(req.body, null, 2))
    const { nuusuid, motivo } = req.body
    
    console.log('nuusuid recibido:', nuusuid)
    console.log('motivo recibido:', motivo)
    
    if (!nuusuid) {
      console.log('❌ nuusuid faltante')
      return res.status(400).json({ 
        error: 'nuusuid requerido',
        code: 'MISSING_USER_ID'
      })
    }
    
    // Verificar que el usuario exista
    console.log('Verificando si usuario existe...')
    const userCheck = await db.pool.query(
      'SELECT nuusuid, nuusumail FROM nuusuari WHERE nuusuid = $1',
      [nuusuid]
    )
    
    console.log('userCheck.rows:', userCheck.rows)
    
    if (userCheck.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      })
    }

    const adminEmailsAntes = await getBackendAdminEmails()
    const userBefore = await userRepository.findPublicById(nuusuid)
    
    // Llamar a función de BD para desactivar usuario
    console.log('Llamando a desactivar_usuario...')
    const motivoFinal = motivo || `Desactivado por admin (${req.user.nuusumail || req.session.email || 'admin'})`
    console.log('motivo final:', motivoFinal)
    
    const result = await db.pool.query(
      'SELECT * FROM desactivar_usuario($1, $2)',
      [nuusuid, motivoFinal]
    )
    
    console.log('result.rows:', JSON.stringify(result.rows, null, 2))
    
    const response = result.rows[0]
    
    console.log('response.success:', response.success)
    console.log('response.message:', response.message)
    
    if (!response.success) {
      console.log('❌ Desactivación falló según función BD')
      return res.status(400).json({
        error: response.message,
        code: 'DEACTIVATION_FAILED'
      })
    }
    
    console.log('✅ Usuario desactivado por admin:', response)

    const userAfter = await userRepository.findPublicById(nuusuid)
    await writeAdminAuditLog({
      req,
      entity: 'usuario',
      entityId: nuusuid,
      action: 'DEACTIVATE',
      summary: `Usuario ${nuusuid} desactivado`,
      before: toUserAuditState(userBefore, {
        isBackendAdmin: adminEmailsAntes.includes(normalizeEmail(userBefore?.nuusumail)),
      }),
      after: toUserAuditState(userAfter, {
        isBackendAdmin: adminEmailsAntes.includes(normalizeEmail(userAfter?.nuusumail)),
      }),
      meta: { motivo: motivoFinal },
    })
    
    res.json({
      success: true,
      message: response.message,
      fecha_desactivacion: response.fecha_desactivacion,
      usuario_desactivado: userCheck.rows[0].nuusumail
    })
    
  } catch (error) {
    console.error('❌ Error en desactivación admin:', error)
    console.error('Stack trace:', error.stack)
    res.status(500).json({
      error: 'Error al desactivar usuario',
      details: error.message,
      stack: error.stack
    })
  }
})

// ============================================================================
// FIN ENDPOINTS ELIMINACIÓN LÓGICA
// ============================================================================

// ============================================================================
// DEBUG ENDPOINTS - Análisis de inconsistencias BD
// ============================================================================

// GET /admin/debug/users-status - Diagnóstico detallado campo nuusuactiv
app.get('/admin/debug/users-status', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Iniciando diagnóstico de usuarios...')
    
    const query = `
      SELECT 
        nuusuid,
        nuusumail,
        nuusuactiv,
        LENGTH(nuusuactiv) as activ_length,
        ASCII(SUBSTRING(nuusuactiv, 1, 1)) as activ_ascii,
        nuusufecde,
        nuusumotde,
        CASE 
          WHEN nuusuactiv IS NULL THEN 'NULL'
          WHEN nuusuactiv = '' THEN 'EMPTY'
          WHEN nuusuactiv = 'S' THEN 'VALID_S'
          WHEN nuusuactiv = 'N' THEN 'VALID_N'
          ELSE 'UNKNOWN: [' || nuusuactiv || ']'
        END as diagnosis,
        CASE WHEN nuusuactiv = 'S' THEN 'ACTIVO' ELSE 'DESACTIVADO' END as estado_calculado
      FROM nuusuari
      WHERE nuusuid IN (
        '0000000000000000000000000000000000000023',
        '0000000000000000000000000000000000000024'
      )
      OR nuusuactiv IS NULL
      OR nuusuactiv = ''
      OR nuusuactiv NOT IN ('S', 'N')
      ORDER BY nuusuid
    `
    
    const result = await db.pool.query(query)
    
    console.log('🔍 [DEBUG] Usuarios analizados:', result.rows.length)
    result.rows.forEach(row => {
      console.log('🔍 [DEBUG] Usuario:', {
        nuusuid: row.nuusuid,
        email: row.nuusumail,
        nuusuactiv: `[${row.nuusuactiv}]`,
        length: row.activ_length,
        ascii: row.activ_ascii,
        diagnosis: row.diagnosis,
        estado_calculado: row.estado_calculado
      })
    })
    
    res.json({
      success: true,
      total: result.rows.length,
      users: result.rows
    })
    
  } catch (error) {
    console.error('❌ [DEBUG] Error en diagnóstico:', error)
    res.status(500).json({
      error: 'Error en diagnóstico',
      details: error.message
    })
  }
})

// POST /admin/debug/normalize-users - Normalizar campo nuusuactiv
app.post('/admin/debug/normalize-users', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 [DEBUG] Iniciando normalización de usuarios...')
    
    // Primero verificar cuántos usuarios necesitan normalización
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM nuusuari
      WHERE nuusuactiv IS NULL 
         OR nuusuactiv = '' 
         OR nuusuactiv NOT IN ('S', 'N')
    `
    
    const checkResult = await db.pool.query(checkQuery)
    const countBefore = parseInt(checkResult.rows[0].count)
    
    console.log('🔧 [DEBUG] Usuarios a normalizar:', countBefore)
    
    if (countBefore === 0) {
      return res.json({
        success: true,
        message: 'No hay usuarios que necesiten normalización',
        normalized: 0
      })
    }
    
    // Normalizar: establecer 'S' (activo) por defecto para valores inválidos
    const normalizeQuery = `
      UPDATE nuusuari
      SET nuusuactiv = 'S'
      WHERE nuusuactiv IS NULL 
         OR nuusuactiv = '' 
         OR nuusuactiv NOT IN ('S', 'N')
      RETURNING nuusuid, nuusumail
    `
    
    const normalizeResult = await db.pool.query(normalizeQuery)
    
    console.log('✅ [DEBUG] Usuarios normalizados:', normalizeResult.rows.length)
    normalizeResult.rows.forEach(row => {
      console.log('✅ [DEBUG] Normalizado:', row.nuusuid, '-', row.nuusumail)
    })
    
    // Verificar después de normalización
    const verifyResult = await db.pool.query(checkQuery)
    const countAfter = parseInt(verifyResult.rows[0].count)
    
    res.json({
      success: true,
      message: `Normalización completada exitosamente`,
      normalized: normalizeResult.rows.length,
      before: countBefore,
      after: countAfter,
      users: normalizeResult.rows
    })
    
  } catch (error) {
    console.error('❌ [DEBUG] Error en normalización:', error)
    res.status(500).json({
      error: 'Error en normalización',
      details: error.message
    })
  }
})

// POST /admin/debug/test-desactivar-function - Llamar directamente a función SQL
app.post('/admin/debug/test-desactivar-function', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nuusuid } = req.body
    
    console.log('🧪 [DEBUG] Test función desactivar_usuario...')
    console.log('🧪 [DEBUG] nuusuid:', nuusuid)
    console.log('🧪 [DEBUG] typeof nuusuid:', typeof nuusuid)
    console.log('🧪 [DEBUG] length:', nuusuid ? nuusuid.length : 'undefined')
    
    if (!nuusuid) {
      return res.status(400).json({ error: 'nuusuid requerido' })
    }
    
    // Verificar estado actual
    const checkQuery = `
      SELECT nuusuid, nuusumail, nuusuactiv,
             LENGTH(nuusuactiv) as len_activ,
             ASCII(SUBSTRING(nuusuactiv, 1, 1)) as ascii_activ
      FROM nuusuari 
      WHERE nuusuid = $1
    `
    const checkResult = await db.pool.query(checkQuery, [nuusuid])
    
    console.log('🧪 [DEBUG] Usuario encontrado:', checkResult.rows[0])
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    
    const user = checkResult.rows[0]
    
    // Llamar a la función desactivar_usuario
    console.log('🧪 [DEBUG] Llamando a desactivar_usuario($1, $2)...')
    console.log('🧪 [DEBUG] $1 (nuusuid):', nuusuid)
    console.log('🧪 [DEBUG] $2 (motivo):', 'Test debug function')
    
    const functionQuery = 'SELECT * FROM desactivar_usuario($1, $2)'
    const functionResult = await db.pool.query(functionQuery, [nuusuid, 'Test debug function'])
    
    console.log('🧪 [DEBUG] Resultado función:')
    console.log('🧪 [DEBUG]   rows.length:', functionResult.rows.length)
    console.log('🧪 [DEBUG]   rows[0]:', JSON.stringify(functionResult.rows[0], null, 2))
    
    const response = functionResult.rows[0]
    
    res.json({
      success: true,
      user_before: user,
      function_result: response,
      test_info: {
        nuusuid_type: typeof nuusuid,
        nuusuid_length: nuusuid.length,
        activ_before: user.nuusuactiv,
        activ_length: user.len_activ,
        activ_ascii: user.ascii_activ
      }
    })
    
  } catch (error) {
    console.error('❌ [DEBUG] Error en test función:', error)
    res.status(500).json({
      error: 'Error en test función',
      details: error.message,
      stack: error.stack
    })
  }
})

// POST /admin/debug/recreate-function - Recrear función desactivar_usuario (FIX)
app.post('/admin/debug/recreate-function', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 [DEBUG] Recreando funciones desactivar_usuario() y reactivar_usuario()...')
    
    // DROP funciones existentes (todas las versiones)
    await db.pool.query('DROP FUNCTION IF EXISTS desactivar_usuario CASCADE')
    await db.pool.query('DROP FUNCTION IF EXISTS reactivar_usuario CASCADE')
    console.log('✅ [DEBUG] Funciones anteriores eliminadas')
    
    // Crear función DESACTIVAR corregida
    const createDesactivarSQL = `
CREATE OR REPLACE FUNCTION desactivar_usuario(
  p_nuusuid VARCHAR(100),
  p_motivo TEXT DEFAULT 'Usuario solicitó eliminación de cuenta'
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  usuario_id VARCHAR(100),
  email VARCHAR(100),
  fecha_desactivacion TIMESTAMP
) AS $$
DECLARE
  v_email VARCHAR(100);
  v_activ CHAR(1);
BEGIN
  -- Verificar si el usuario existe
  SELECT nuusumail, nuusuactiv INTO v_email, v_activ
  FROM nuusuari
  WHERE nuusuid = p_nuusuid;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      'Usuario no encontrado'::TEXT,
      p_nuusuid::VARCHAR(100),
      NULL::VARCHAR(100),
      NULL::TIMESTAMP;
    RETURN;
  END IF;
  
  -- Verificar si ya está desactivado (comparación directa con variable)
  IF v_activ = 'N' THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      'Usuario ya está desactivado'::TEXT,
      p_nuusuid::VARCHAR(100),
      v_email::VARCHAR(100),
      (SELECT nuusufecde FROM nuusuari WHERE nuusuid = p_nuusuid)::TIMESTAMP;
    RETURN;
  END IF;
  
  -- Desactivar el usuario
  UPDATE nuusuari
  SET 
    nuusuactiv = 'N',
    nuusufecde = NOW(),
    nuusumotde = p_motivo,
    nuusugamtok = NULL
  WHERE nuusuid = p_nuusuid;
  
  -- Retornar resultado exitoso
  RETURN QUERY SELECT 
    TRUE::BOOLEAN,
    'Usuario desactivado exitosamente'::TEXT,
    p_nuusuid::VARCHAR(100),
    v_email::VARCHAR(100),
    NOW()::TIMESTAMP;
    
END;
$$ LANGUAGE plpgsql
`
    
    await db.pool.query(createDesactivarSQL)
    console.log('✅ [DEBUG] Función desactivar_usuario() recreada')
    
    // Crear función REACTIVAR corregida
    const createReactivarSQL = `
CREATE OR REPLACE FUNCTION reactivar_usuario(p_nuusuid VARCHAR(100))
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  usuario_id VARCHAR(100),
  email VARCHAR(100)
) AS $$
DECLARE
  v_email VARCHAR(100);
  v_activ CHAR(1);
BEGIN
  -- Verificar si el usuario existe
  SELECT nuusumail, nuusuactiv INTO v_email, v_activ
  FROM nuusuari
  WHERE nuusuid = p_nuusuid;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      'Usuario no encontrado'::TEXT,
      p_nuusuid::VARCHAR(100),
      NULL::VARCHAR(100);
    RETURN;
  END IF;
  
  -- Verificar si el usuario ya está activo
  IF v_activ = 'S' THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      'Usuario ya está activo'::TEXT,
      p_nuusuid::VARCHAR(100),
      v_email::VARCHAR(100);
    RETURN;
  END IF;
  
  -- Reactivar el usuario
  UPDATE nuusuari
  SET 
    nuusuactiv = 'S',
    nuusufecde = NULL,
    nuusumotde = NULL
  WHERE nuusuid = p_nuusuid;
  
  -- Retornar resultado exitoso
  RETURN QUERY SELECT 
    TRUE::BOOLEAN,
    'Usuario reactivado exitosamente'::TEXT,
    p_nuusuid::VARCHAR(100),
    v_email::VARCHAR(100);
    
END;
$$ LANGUAGE plpgsql
`
    
    await db.pool.query(createReactivarSQL)
    console.log('✅ [DEBUG] Función reactivar_usuario() recreada')
    
    // Test manual (sin llamar a las funciones aún para evitar conflictos)
    res.json({
      success: true,
      message: 'Funciones desactivar_usuario() y reactivar_usuario() recreadas exitosamente',
      note: 'Funciones recreadas. Ahora puedes ejecutar test-desactivar-reactivar-admin.ps1'
    })
    
  } catch (error) {
    console.error('❌ [DEBUG] Error recreando función:', error)
    res.status(500).json({
      error: 'Error recreando función',
      details: error.message,
      stack: error.stack
    })
  }
})

// ============================================================================
// FIN DEBUG ENDPOINTS
// ============================================================================

// ============================================================================
// ADMIN USUARIOS - ENDPOINTS CRUD (SEMANA 29)
// ============================================================================

// GET /admin/users - Listar usuarios con filtros y paginación
app.get('/admin/users', requireAuth, requireAdmin, validateQuery(AdminUsersQuerySchema), async (req, res) => {
  try {
    const { page, limit, q, estado, tipo, orderBy, orderDir } = req.query
    
    // Query base
    let query = `
      SELECT 
        u.nuusuid,
        u.nuusumail,
        u.nuusuapell,
        u.nuusuactiv,
        u.nuusufecde,
        u.nuusumotde,
        u.nuusufecha,
        u.nurolid,
        r.nurolnombre AS rol_nombre,
        CASE WHEN u.nuusuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'GAM' ELSE 'LOCAL' END as tipo_auth,
        CASE WHEN u.nuusuactiv = 'S' THEN 'ACTIVO' ELSE 'DESACTIVADO' END as estado
      FROM nuusuari u
      LEFT JOIN nurolper r ON r.nurolid = u.nurolid
      WHERE 1=1
    `
    
    const params = []
    let paramCount = 1
    
    // Filtro búsqueda texto libre
    if (q && q.trim()) {
      query += ` AND (
        LOWER(u.nuusumail) LIKE LOWER($${paramCount}) 
        OR LOWER(u.nuusuapell) LIKE LOWER($${paramCount})
        OR u.nuusuid::text LIKE $${paramCount}
      )`
      params.push(`%${q}%`)
      paramCount++
    }
    
    // Filtro estado
    if (estado === 'activo') {
      query += ` AND u.nuusuactiv = 'S'`
    } else if (estado === 'desactivado') {
      query += ` AND u.nuusuactiv = 'N'`
    }
    
    // Filtro tipo
    if (tipo === 'gam') {
      query += ` AND u.nuusuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`
    } else if (tipo === 'local') {
      query += ` AND u.nuusuid !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`
    }
    
    // Count total para paginación
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subq`
    const countResult = await db.pool.query(countQuery, params)
    const total = parseInt(countResult.rows[0].total, 10)
    
    // Order by
    const orderByMapping = {
      email: 'u.nuusumail',
      fecha_creacion: 'u.nuusufecha',
      nuusuid: 'u.nuusuid',
      nombre: 'u.nuusuapell'
    }
    query += ` ORDER BY ${orderByMapping[orderBy]} ${orderDir.toUpperCase()}`
    
    // Paginación
    const offset = (page - 1) * limit
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`
    params.push(limit, offset)
    
    const result = await db.pool.query(query, params)
    const backendAdminEmails = await getBackendAdminEmails()
    const backendAdminSet = new Set(backendAdminEmails.map((email) => normalizeEmail(email)))
    const users = result.rows.map((user) => ({
      ...user,
      is_backend_admin: backendAdminSet.has(normalizeEmail(user.nuusumail)),
      rolNombre: user.rol_nombre || null,
    }))
    
    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    })
    
  } catch (error) {
    console.error('❌ Error listando usuarios:', error)
    res.status(500).json({
      error: 'Error al listar usuarios',
      details: error.message
    })
  }
})

// GET /admin/users/:id - Detalle de un usuario específico
app.get('/admin/users/:id', requireAuth, requireAdmin, validateParams(UserIdParamsSchema), async (req, res) => {
  try {
    const { id } = req.params
    
    const result = await db.pool.query(`
      SELECT 
        u.*,
        r.nurolid AS rol_id,
        r.nurolnombre AS rol_nombre,
        r.nurolpermisos AS rol_permisos,
        CASE WHEN u.nuusuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'GAM' ELSE 'LOCAL' END as tipo_autenticacion,
        CASE WHEN u.nuusuactiv = 'S' THEN 'ACTIVO' ELSE 'DESACTIVADO' END as estado,
        COALESCE((
          SELECT COUNT(*) 
          FROM crcreden c 
          INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
          WHERE cu.nuusuid = $1
        ), 0) as total_credenciales,
        COALESCE((
          SELECT json_agg(json_build_object(
            'afiliadoId', c.crcreafili,
            'nombre', c.crcreapeno,
            'nroAfiliado', c.crcrenroaf,
            'cuil', c.crcrecuil,
            'parentesco', COALESCE(c.crcreparen, 'N/A'),
            'vence', c.crcrefecvi,
            'esPropietario', cu.crcrepropi IS NOT NULL AND cu.crcrepropi = 'S'
          ))
          FROM crcreden c 
          INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
          WHERE cu.nuusuid = $1
          LIMIT 10
        ), '[]'::json) as credenciales_grupo_familiar
      FROM nuusuari u
      LEFT JOIN nurolper r ON r.nurolid = u.nurolid
      WHERE u.nuusuid = $1
    `, [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        nuusuid: id
      })
    }
    
    const backendAdminEmails = await getBackendAdminEmails()
    const backendAdminSet = new Set(backendAdminEmails.map((email) => normalizeEmail(email)))
    const rawUser = result.rows[0]
    const roleData = rawUser.rol_id
      ? {
          id: rawUser.rol_id,
          nombre: rawUser.rol_nombre,
          permisos: (() => { try { return JSON.parse(rawUser.rol_permisos) } catch { return [] } })(),
        }
      : null
    const user = {
      ...rawUser,
      is_backend_admin: backendAdminSet.has(normalizeEmail(rawUser.nuusumail)),
      isFullAdmin: rawUser.rol_id == null,
      role: roleData,
    }

    res.json({
      success: true,
      user
    })
    
  } catch (error) {
    console.error('❌ Error obteniendo usuario:', error)
    res.status(500).json({
      error: 'Error al obtener usuario',
      details: error.message
    })
  }
})

// ============================================================================
// ADMIN CREDENCIALES - Tarea 34
// ============================================================================

// GET /admin/credenciales - Listar credenciales con filtros y paginación
app.get('/admin/credenciales', requireAuth, requireAdmin, async (req, res) => {
  try {
    return res.status(410).json({
      success: false,
      error: 'Esta operación fue deshabilitada. Use el editor de plantilla general/por plan en /admin/credenciales-ui.'
    })

    const { page = '1', limit = '20', q = '', nuusuid, activo } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let conditions = ['1=1']
    const params = []

    if (q) {
      params.push(`%${q}%`)
      conditions.push(`(TRIM(c.crcreapeno) ILIKE $${params.length} OR TRIM(c.crcrenroaf) ILIKE $${params.length} OR TRIM(c.crcreafili) ILIKE $${params.length} OR c.crcrecuil::text ILIKE $${params.length})`)
    }
    if (nuusuid) {
      params.push(nuusuid)
      conditions.push(`cu.nuusuid = $${params.length}`)
    }
    if (activo === 'S' || activo === 'N') {
      params.push(activo)
      conditions.push(`c.crcreactiv = $${params.length}`)
    }

    const whereClause = conditions.join(' AND ')

    params.push(parseInt(limit))
    params.push(offset)
    const dataQuery = `
      SELECT
        c.crcreid, TRIM(c.crcreapeno) AS crcreapeno, TRIM(c.crcrenroaf) AS crcrenroaf,
        TRIM(c.crcreafili) AS crcreafili, c.crcrecuil, TRIM(c.crcreplaid) AS crcreplaid,
        TRIM(c.crcredocum) AS crcredocum, TRIM(c.crcresexo) AS crcresexo,
        c.crcrefecvi, c.crcrefecha, c.crcreifech,
        COALESCE(c.crcreactiv, 'S') AS crcreactiv,
        COALESCE(c.crcreparen, '') AS crcreparen,
        cu.nuusuid, TRIM(u.nuusumail) AS nuusumail
      FROM crcreden c
      LEFT JOIN crcredus cu ON cu.crcreid = c.crcreid
      LEFT JOIN nuusuari u ON u.nuusuid = cu.nuusuid
      WHERE ${whereClause}
      ORDER BY c.crcreifech DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM crcreden c
      LEFT JOIN crcredus cu ON cu.crcreid = c.crcreid
      WHERE ${whereClause.replace(/\$(\d+)/g, (m, n) => `$${n}`)}
    `
    const countParams = params.slice(0, params.length - 2)

    const [dataResult, countResult] = await Promise.all([
      db.pool.query(dataQuery, params),
      db.pool.query(countQuery, countParams),
    ])

    res.json({
      success: true,
      credenciales: dataResult.rows,
      total: countResult.rows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.rows[0].total / parseInt(limit)),
    })
  } catch (error) {
    console.error('❌ Error listando credenciales:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /admin/credenciales/:id - Detalle de una credencial
app.get('/admin/credenciales/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    return res.status(410).json({
      success: false,
      error: 'La consulta por afiliado individual está deshabilitada. Use plantilla general/por plan.'
    })

    const { id } = req.params
    const result = await db.pool.query(
      `SELECT
         c.crcreid, TRIM(c.crcreapeno) AS crcreapeno, TRIM(c.crcrenroaf) AS crcrenroaf,
         TRIM(c.crcreafili) AS crcreafili, c.crcrecuil, TRIM(c.crcreplaid) AS crcreplaid,
         TRIM(c.crcredocum) AS crcredocum, TRIM(c.crcresexo) AS crcresexo,
         c.crcrefecvi, c.crcrefecha, c.crcreifech, c.crcrehash,
         COALESCE(c.crcreactiv, 'S') AS crcreactiv,
         COALESCE(c.crcreparen, '') AS crcreparen,
         cu.nuusuid, TRIM(u.nuusumail) AS nuusumail, TRIM(u.nuusuapell) AS nuusuapell
       FROM crcreden c
       LEFT JOIN crcredus cu ON cu.crcreid = c.crcreid
       LEFT JOIN nuusuari u ON u.nuusuid = cu.nuusuid
       WHERE TRIM(c.crcreid) = TRIM($1)`,
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credencial no encontrada' })
    }
    res.json({ success: true, credencial: result.rows[0] })
  } catch (error) {
    console.error('❌ Error obteniendo credencial:', error)
    res.status(500).json({ error: error.message })
  }
})

// PATCH /admin/credenciales/:id - Editar credencial con auditoría
app.patch('/admin/credenciales/:id', requireAuth, requireAdmin, validateParams(AdminCartillaEntidadIdParamsSchema), async (req, res) => {
  try {
    return res.status(410).json({
      success: false,
      error: 'La edición por afiliado está deshabilitada. Use /admin/credenciales-layout.'
    })

    const { id } = req.params
    const { crcrefecvi, crcreapeno, crcreactiv, crcreplaid, crcreparen } = req.body

    // Leer estado anterior
    const beforeResult = await db.pool.query(
      `SELECT c.crcreid, TRIM(c.crcreapeno) AS crcreapeno, c.crcrefecvi,
              COALESCE(c.crcreactiv, 'S') AS crcreactiv,
              TRIM(c.crcreplaid) AS crcreplaid, COALESCE(c.crcreparen,'') AS crcreparen
       FROM crcreden c WHERE TRIM(c.crcreid) = TRIM($1)`,
      [id]
    )
    if (beforeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Credencial no encontrada' })
    }
    const before = beforeResult.rows[0]

    // Construir SET dinámico solo con campos enviados
    const updates = []
    const values = []

    if (crcrefecvi !== undefined) {
      values.push(crcrefecvi)
      updates.push(`crcrefecvi = $${values.length}`)
    }
    if (crcreapeno !== undefined) {
      values.push(String(crcreapeno).trim())
      updates.push(`crcreapeno = $${values.length}`)
    }
    if (crcreactiv !== undefined) {
      if (crcreactiv !== 'S' && crcreactiv !== 'N') {
        return res.status(400).json({ error: 'crcreactiv debe ser "S" o "N"' })
      }
      values.push(crcreactiv)
      updates.push(`crcreactiv = $${values.length}`)
    }
    if (crcreplaid !== undefined) {
      values.push(String(crcreplaid).trim() || null)
      updates.push(`crcreplaid = $${values.length}`)
    }
    if (crcreparen !== undefined) {
      values.push(String(crcreparen).trim() || null)
      updates.push(`crcreparen = $${values.length}`)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar' })
    }

    values.push(id)
    await db.pool.query(
      `UPDATE crcreden SET ${updates.join(', ')} WHERE TRIM(crcreid) = TRIM($${values.length})`,
      values
    )

    // Leer estado posterior
    const afterResult = await db.pool.query(
      `SELECT c.crcreid, TRIM(c.crcreapeno) AS crcreapeno, c.crcrefecvi,
              COALESCE(c.crcreactiv, 'S') AS crcreactiv,
              TRIM(c.crcreplaid) AS crcreplaid, COALESCE(c.crcreparen,'') AS crcreparen
       FROM crcreden c WHERE TRIM(c.crcreid) = TRIM($1)`,
      [id]
    )
    const after = afterResult.rows[0]

    // Auditoría
    await writeAdminAuditLog({
      req,
      entity: 'credencial',
      entityId: id.trim(),
      action: 'UPDATE',
      summary: `Credencial editada por admin: ${id.trim()}`,
      before,
      after,
    })

    res.json({ success: true, credencial: after })
  } catch (error) {
    console.error('❌ Error editando credencial:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================================================
// FIN ADMIN CREDENCIALES
// ============================================================================

// ============================================================================
// FIN ADMIN USUARIOS
// ============================================================================

// ============================================================================
// ADMIN CARTILLA - ENDPOINTS DE API (SEMANA 12-13)
// ============================================================================
// NOTA: El endpoint GET /admin/cartilla (interfaz web) está definido arriba
//       junto con /admin para evitar conflictos de orden de rutas

// Listar entidades con filtros
app.get('/admin/cartilla/entidades', requireAuth, validateQuery(AdminCartillaEntidadesQuerySchema), async (req, res) => {
  try {
    const { 
      page,
      limit,
      q,
      rubroId, 
      especialidadId, 
      localidadId, 
      conGeo,
      includeInactivas
    } = req.query

    const result = await cartillaRepository.listEntidades({
      page,
      limit,
      q,
      rubroId: rubroId || null,
      especialidadId: especialidadId || null,
      localidadId: localidadId || null,
      conGeo: conGeo || null,
      includeInactivas
    })

    // Convertir BigInt a string para JSON
    const jsonSafe = JSON.parse(JSON.stringify(result, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ))

    res.json(jsonSafe)
  } catch (error) {
    console.error('Error listando entidades:', error)
    res.status(500).json({ error: error.message })
  }
})

// Detalle de entidad
app.get('/admin/cartilla/entidades/:id', requireAuth, async (req, res) => {
  try {
    const entidad = await cartillaRepository.getEntidadById(req.params.id)
    
    if (!entidad) {
      return res.status(404).json({ error: 'Entidad no encontrada' })
    }

    res.json(entidad)
  } catch (error) {
    console.error('Error obteniendo entidad:', error)
    res.status(500).json({ error: error.message })
  }
})

// Crear entidad
app.post('/admin/cartilla/entidades', requireAuth, async (req, res) => {
  try {
    const entidad = await cartillaRepository.createEntidad(req.body)
    await writeAdminAuditLog({
      req,
      entity: 'cartilla_entidad',
      entityId: entidad.caentid,
      action: 'CREATE',
      summary: `Entidad de cartilla creada: ${entidad.caentid}`,
      after: toCartillaAuditState(entidad),
    })
    res.status(201).json(entidad)
  } catch (error) {
    console.error('Error creando entidad:', error)
    res.status(500).json({ error: error.message })
  }
})

// Actualizar entidad
app.put('/admin/cartilla/entidades/:id', requireAuth, validateParams(AdminCartillaEntidadIdParamsSchema), validateBody(AdminCartillaEntidadUpdateBodySchema), async (req, res) => {
  try {
    const entidadBefore = await cartillaRepository.getEntidadById(req.params.id)
    const entidad = await cartillaRepository.updateEntidad(req.params.id, req.body)
    await writeAdminAuditLog({
      req,
      entity: 'cartilla_entidad',
      entityId: req.params.id,
      action: 'UPDATE',
      summary: `Entidad de cartilla actualizada: ${req.params.id}`,
      before: toCartillaAuditState(entidadBefore),
      after: toCartillaAuditState(entidad),
    })
    res.json(entidad)
  } catch (error) {
    console.error('Error actualizando entidad:', error)
    res.status(500).json({ error: error.message })
  }
})

// Eliminar entidad (baja lógica)
app.delete('/admin/cartilla/entidades/:id', requireAuth, async (req, res) => {
  try {
    const entidadBefore = await cartillaRepository.getEntidadById(req.params.id)
    const result = await cartillaRepository.deleteEntidad(req.params.id)
    const entidadAfter = await cartillaRepository.getEntidadById(req.params.id)
    await writeAdminAuditLog({
      req,
      entity: 'cartilla_entidad',
      entityId: req.params.id,
      action: 'DELETE',
      summary: `Entidad de cartilla dada de baja lógica: ${req.params.id}`,
      before: toCartillaAuditState(entidadBefore),
      after: toCartillaAuditState(entidadAfter),
    })
    res.json(result)
  } catch (error) {
    console.error('Error eliminando entidad:', error)
    res.status(500).json({ error: error.message })
  }
})

// Listar rubros
app.get('/admin/cartilla/rubros', requireAuth, async (req, res) => {
  try {
    const rubros = await cartillaRepository.listRubros()
    res.json(rubros)
  } catch (error) {
    console.error('Error listando rubros:', error)
    res.status(500).json({ error: error.message })
  }
})

// Listar especialidades
app.get('/admin/cartilla/especialidades', requireAuth, validateQuery(CartillaEspecialidadesQuerySchema), async (req, res) => {
  try {
    const { rubroId } = req.query
    const especialidades = await cartillaRepository.listEspecialidades(rubroId || null)
    res.json(especialidades)
  } catch (error) {
    console.error('Error listando especialidades:', error)
    res.status(500).json({ error: error.message })
  }
})

// Endpoint público especialidades (para filtros mobile)
app.get('/api/cartilla/especialidades', validateQuery(CartillaEspecialidadesQuerySchema), async (req, res) => {
  try {
    const { rubroId } = req.query
    const especialidades = await cartillaRepository.listEspecialidades(rubroId || null)
    res.json(especialidades)
  } catch (error) {
    console.error('Error listando especialidades:', error)
    res.status(500).json({ error: error.message })
  }
})

// Listar localidades
app.get('/admin/cartilla/localidades', requireAuth, async (req, res) => {
  try {
    const localidades = await cartillaRepository.listLocalidades()
    res.json(localidades)
  } catch (error) {
    console.error('Error listando localidades:', error)
    res.status(500).json({ error: error.message })
  }
})

// Upload de archivo JSONL
app.post('/admin/cartilla/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo' })
    }

    console.log(`📁 Procesando archivo: ${req.file.originalname}`)

    const result = await cartillaImportService.importCartillaFromFile(req.file.path, {
      dryRun: false,
      batchSize: 100
    })

    await writeAdminAuditLog({
      req,
      entity: 'cartilla_import',
      action: 'UPLOAD',
      summary: `Importación de cartilla ejecutada desde archivo ${req.file.originalname}`,
      meta: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        result,
      },
    })

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path)

    res.json(result)
  } catch (error) {
    console.error('Error procesando upload:', error)
    
    // Limpiar archivo temporal si existe
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch {}
    }

    res.status(500).json({ error: error.message })
  }
})

// Estadísticas de geocodificación (solo admins autenticados)
app.get('/admin/cartilla/geocoding/stats', requireAuth, requireAdmin, requirePermission('salud'), async (req, res) => {
  try {
    const stats = await geocodingService.getGeocodingStats()
    res.json(stats)
  } catch (error) {
    console.error('Error obteniendo stats geocoding:', error)
    res.status(500).json({ error: error.message })
  }
})

// Procesar batch de geocodificación (solo admins autenticados)
app.post('/admin/cartilla/geocoding/process', requireAuth, requireAdmin, requirePermission('salud'), async (req, res) => {
  try {
    const { batchSize = 50 } = req.body

    console.log(`🌍 Iniciando geocodificación batch (${batchSize} registros)`)

    const result = await geocodingService.processBatchGeocoding(batchSize)

    await writeAdminAuditLog({
      req,
      entity: 'cartilla_geocoding',
      action: 'PROCESS',
      summary: `Geocodificación batch ejecutada (${batchSize})`,
      meta: { batchSize, result },
    })

    res.json(result)
  } catch (error) {
    console.error('Error procesando geocoding:', error)
    res.status(500).json({ 
      error: error.message,
      processed: 0,
      success: 0,
      errors: 0,
      pending: 0
    })
  }
})

// Reintentar geocodificación fallida (solo admins autenticados)
app.post('/admin/cartilla/geocoding/retry', requireAuth, requireAdmin, requirePermission('salud'), async (req, res) => {
  try {
    const { limit = 20 } = req.body

    console.log(`🔄 Reintentando geocodificación de errores (${limit} registros)`)

    const result = await geocodingService.retryFailedGeocoding(limit)

    await writeAdminAuditLog({
      req,
      entity: 'cartilla_geocoding',
      action: 'RETRY',
      summary: `Reintento de geocodificación ejecutado (${limit})`,
      meta: { limit, result },
    })

    res.json(result)
  } catch (error) {
    console.error('Error reintentando geocoding:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================================================
// API PÚBLICA CARTILLA v1 (SEMANA 14) - SIN AUTENTICACIÓN
// ============================================================================

const { CartillaListQuerySchema, CartillaDetailParamsSchema, CartillaChangesQuerySchema } = require('./validators/cartillaValidators')

// GET /api/cartilla/sugerencias - Autocomplete inteligente (#28 Búsqueda inteligente)
// DEBE ir antes de /api/cartilla/:id para no colisionar con el param route
app.get('/api/cartilla/sugerencias', async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    const limit = Math.min(parseInt(req.query.limit || '8', 10), 20)
    const rubroId = req.query.rubroId || null
    const excludeRubroId = req.query.excludeRubroId || null

    if (!q || q.length < 2) {
      return res.json({ sugerencias: [] })
    }

    const sugerencias = await cartillaRepository.sugerirEntidades({
      q,
      limit,
      rubroId,
      excludeRubroId
    })

    // Convertir BigInt a string para JSON
    const jsonSafe = JSON.parse(JSON.stringify(sugerencias, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ))

    res.json({ sugerencias: jsonSafe, query: q })
  } catch (error) {
    console.error('❌ Error en sugerencias cartilla:', error)
    res.status(500).json({ sugerencias: [], error: 'Error interno' })
  }
})

// GET /api/cartilla - Listado con filtros (incluye filtros geográficos Semana 15)
app.get('/api/cartilla', validateQuery(CartillaListQuerySchema), async (req, res) => {
  try {
    const { 
      page, limit, q, especialidadId, rubroId, localidadId, conGeo,
      lat, lng, radioKm, orderBy, excludeRubroId
    } = req.query

    const result = await cartillaRepository.listEntidades({
      page,
      limit,
      q: q || '',
      especialidadId: especialidadId || null,
      rubroId: rubroId || null,
      localidadId: localidadId || null,
      conGeo: conGeo || null,
      lat: lat !== undefined ? Number(lat) : null,
      lng: lng !== undefined ? Number(lng) : null,
      radioKm: radioKm !== undefined ? Number(radioKm) : 10,
      orderBy: orderBy || 'distancia',
      excludeRubroId: excludeRubroId || null // Puede ser string o array
    })

    // Convertir BigInt a string para JSON
    const jsonSafe = JSON.parse(JSON.stringify(result, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ))

    res.json(jsonSafe)
  } catch (error) {
    console.error('❌ Error listando entidades cartilla:', error)
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    })
  }
})

// GET /api/cartilla/changes - Sincronización incremental (Semana 20)
// IMPORTANTE: Esta ruta debe ir ANTES de /api/cartilla/:id para evitar conflictos
app.get('/api/cartilla/changes', validateQuery(CartillaChangesQuerySchema), async (req, res) => {
  try {
    const { since, rubroId, excludeRubroId, page, limit } = req.query

    const result = await cartillaRepository.getChanges({
      since: since || null,
      rubroId: rubroId || null,
      excludeRubroId: excludeRubroId || null,
      page: page || 1,
      limit: limit || 50
    })

    // Convertir BigInt a string para JSON (si es necesario)
    const jsonSafe = JSON.parse(JSON.stringify(result, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ))

    res.json(jsonSafe)
  } catch (error) {
    console.error('❌ Error en sync incremental cartilla:', error)
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    })
  }
})

// GET /api/cartilla/:id - Detalle de entidad
app.get('/api/cartilla/:id', validateParams(CartillaDetailParamsSchema), async (req, res) => {
  try {
    const entidad = await cartillaRepository.getEntidadById(req.params.id)
    
    if (!entidad) {
      return res.status(404).json({ 
        error: 'Entidad no encontrada',
        id: req.params.id
      })
    }

    res.json(entidad)
  } catch (error) {
    console.error('❌ Error obteniendo detalle entidad:', error)
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    })
  }
})

// ============================================================================
// FIN API PÚBLICA CARTILLA v1
// ============================================================================

// ============================================================================
// API PÚBLICA INFO ÚTIL v1 - SIN AUTENTICACIÓN
// ============================================================================

app.get('/api/info-util', async (req, res) => {
  try {
    const { categoria } = req.query
    const items = await infoUtilRepository.listPublic(categoria || null)
    res.json({ items })
  } catch (error) {
    console.error('❌ Error listando info útil:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
    })
  }
})

// ============================================================================
// ADMIN INFO ÚTIL v1 - AUTENTICADO
// ============================================================================

app.get('/admin/info-util/tipos', requireAuth, async (req, res) => {
  try {
    const tipos = await infoUtilRepository.getTipoCatalogo()
    res.json({ tipos })
  } catch (error) {
    console.error('❌ Error listando tipos info útil:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/admin/info-util', requireAuth, async (req, res) => {
  try {
    const items = await infoUtilRepository.listAdmin()
    res.json({ items })
  } catch (error) {
    console.error('❌ Error listando admin info útil:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/admin/info-util', requireAuth, validateBody(InfoUtilCreateBodySchema), async (req, res) => {
  try {
    const created = await infoUtilRepository.createAdmin(req.body)
    await writeAdminAuditLog({
      req,
      entity: 'info_util',
      entityId: created.id,
      action: 'CREATE',
      summary: `Info útil creada: ${created.titulo}`,
      after: toInfoUtilAuditState(created),
    })
    res.json(created)
  } catch (error) {
    console.error('❌ Error creando info útil:', error)
    res.status(500).json({ error: error.message })
  }
})

app.put(
  '/admin/info-util/:id',
  requireAuth,
  validateParams(InfoUtilIdParamsSchema),
  validateBody(InfoUtilUpdateBodySchema),
  async (req, res) => {
    try {
      const previous = await findInfoUtilAdminById(req.params.id)
      const updated = await infoUtilRepository.updateAdmin(req.params.id, req.body)
      await writeAdminAuditLog({
        req,
        entity: 'info_util',
        entityId: req.params.id,
        action: 'UPDATE',
        summary: `Info útil actualizada: ${req.params.id}`,
        before: toInfoUtilAuditState(previous),
        after: toInfoUtilAuditState(updated),
      })
      res.json(updated)
    } catch (error) {
      console.error('❌ Error actualizando info útil:', error)
      res.status(500).json({ error: error.message })
    }
  }
)

app.delete('/admin/info-util/:id', requireAuth, validateParams(InfoUtilIdParamsSchema), async (req, res) => {
  try {
    const previous = await findInfoUtilAdminById(req.params.id)
    const result = await infoUtilRepository.removeAdmin(req.params.id)
    await writeAdminAuditLog({
      req,
      entity: 'info_util',
      entityId: req.params.id,
      action: 'DELETE',
      summary: `Info útil eliminada: ${req.params.id}`,
      before: toInfoUtilAuditState(previous),
    })
    res.json(result)
  } catch (error) {
    console.error('❌ Error eliminando info útil:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================================================
// DISPOSITIVOS (PUSH TOKENS) v1 - AUTENTICADO
// ============================================================================

app.get('/admin/audit-logs', requireAuth, requireAdmin, validateQuery(AdminAuditQuerySchema), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      entity,
      action,
      actor,
      targetId,
      from,
      to,
    } = req.query

    const where = []
    const params = []

    if (entity) {
      params.push(entity)
      where.push(`entity = $${params.length}`)
    }

    if (action) {
      params.push(action)
      where.push(`action = $${params.length}`)
    }

    if (actor) {
      params.push(`%${actor}%`)
      where.push(`(
        LOWER(COALESCE(payload->'actor'->>'email', '')) LIKE $${params.length}
        OR LOWER(COALESCE(payload->'actor'->>'username', '')) LIKE $${params.length}
        OR LOWER(COALESCE(payload->'actor'->>'nuusuid', '')) LIKE $${params.length}
      )`)
    }

    if (targetId) {
      params.push(targetId)
      where.push(`COALESCE(payload->>'targetId', '') = $${params.length}`)
    }

    if (from) {
      params.push(from)
      where.push(`created_at >= $${params.length}::timestamptz`)
    }

    if (to) {
      params.push(to)
      where.push(`created_at <= $${params.length}::timestamptz`)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const offset = (page - 1) * limit

    const rowsResult = await db.pool.query(
      `SELECT id, entity, entity_id, action, payload, created_at
       FROM audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    const countResult = await db.pool.query(
      `SELECT COUNT(*)::int AS total FROM audit_logs ${whereClause}`,
      params
    )

    const total = countResult.rows[0]?.total || 0
    const items = rowsResult.rows.map((row) => ({
      id: row.id,
      entity: row.entity,
      entityId: row.payload?.targetId || row.entity_id || null,
      action: row.action,
      createdAt: row.created_at,
      summary: row.payload?.summary || null,
      actor: row.payload?.actor || null,
      request: row.payload?.request || null,
      before: row.payload?.before || null,
      after: row.payload?.after || null,
      meta: row.payload?.meta || null,
      payload: row.payload,
    }))

    res.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        entity: entity || null,
        action: action || null,
        actor: actor || null,
        targetId: targetId || null,
        from: from || null,
        to: to || null,
      },
    })
  } catch (error) {
    console.error('❌ Error listando auditoría administrativa:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    })
  }
})

app.get('/admin/analytics/summary', requireAuth, requireAdmin, requirePermission('reportes'), validateQuery(AdminAnalyticsQuerySchema), async (req, res) => {
  try {
    await ensureFunctionalAnalyticsTable()
    const { days } = req.query

    const totalResult = await db.pool.query(
      `SELECT COUNT(*)::int AS total
       FROM app_functional_events
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')`,
      [days]
    )

    const byEventResult = await db.pool.query(
      `SELECT event_name AS event, COUNT(*)::int AS count
       FROM app_functional_events
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
       GROUP BY event_name
       ORDER BY count DESC`,
      [days]
    )

    const byModuleResult = await db.pool.query(
      `SELECT module, COUNT(*)::int AS count
       FROM app_functional_events
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
       GROUP BY module
       ORDER BY count DESC`,
      [days]
    )

    const topScreensResult = await db.pool.query(
      `SELECT screen, COUNT(*)::int AS count
       FROM app_functional_events
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
       GROUP BY screen
       ORDER BY count DESC
       LIMIT 10`,
      [days]
    )

    const dailyResult = await db.pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
       FROM app_functional_events
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY DATE_TRUNC('day', created_at) ASC`,
      [days]
    )

    const lastEventsResult = await db.pool.query(
      `SELECT created_at, event_name, module, screen, method, path, status_code, actor
       FROM app_functional_events
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
       ORDER BY created_at DESC
       LIMIT 50`,
      [days]
    )

    return res.json({
      success: true,
      range: { days },
      totals: {
        events: totalResult.rows[0]?.total || 0,
      },
      byEvent: byEventResult.rows,
      byModule: byModuleResult.rows,
      topScreens: topScreensResult.rows,
      daily: dailyResult.rows,
      lastEvents: lastEventsResult.rows,
    })
  } catch (error) {
    console.error('❌ Error obteniendo analítica funcional:', error)
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'No se pudo obtener analítica funcional',
    })
  }
})

/**
 * POST /devices/register
 * Registra un nuevo dispositivo o actualiza si ya existe (upsert)
 * Requiere autenticación Bearer token
 */
app.post('/devices/register', requireAuth, validateBody(RegisterDeviceBodySchema), async (req, res) => {
  try {
    const { push_token, plataforma, device_info } = req.body
    const nuusuid = req.session.nuusuid
    
    console.log(`📱 Registrando dispositivo para usuario ${nuusuid}`)
    
    const prisma = getPrisma()
    
    // Upsert: actualiza si existe (mismo usuario + token), crea si no existe
    const device = await prisma.push_tokens.upsert({
      where: {
        unique_user_token: {
          nuusuid,
          push_token,
        },
      },
      update: {
        plataforma,
        fecha_ultima_actualizacion: new Date(),
        activo: true,
      },
      create: {
        nuusuid,
        push_token,
        plataforma,
        activo: true,
      },
    })
    
    console.log(`✅ Dispositivo registrado/actualizado: ${device.id}`)
    
    res.json({
      success: true,
      device: {
        id: device.id,
        push_token: device.push_token,
        plataforma: device.plataforma,
        activo: device.activo,
        fecha_registro: device.fecha_registro,
        fecha_ultima_actualizacion: device.fecha_ultima_actualizacion,
      },
    })
  } catch (error) {
    console.error('❌ Error registrando dispositivo:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
    })
  }
})

/**
 * GET /devices
 * Lista todos los dispositivos activos del usuario autenticado
 */
app.get('/devices', requireAuth, async (req, res) => {
  try {
    const nuusuid = req.session.nuusuid
    
    console.log(`📱 Listando dispositivos del usuario ${nuusuid}`)
    
    const prisma = getPrisma()
    const devices = await prisma.push_tokens.findMany({
      where: {
        nuusuid,
        activo: true,
      },
      orderBy: {
        fecha_ultima_actualizacion: 'desc',
      },
      select: {
        id: true,
        push_token: true,
        plataforma: true,
        fecha_registro: true,
        fecha_ultima_actualizacion: true,
        activo: true,
      },
    })
    
    console.log(`✅ Encontrados ${devices.length} dispositivos activos`)
    
    res.json({ devices })
  } catch (error) {
    console.error('❌ Error listando dispositivos:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
    })
  }
})

/**
 * DELETE /devices/:id
 * Desactiva un dispositivo (soft delete)
 * Valida que el dispositivo pertenece al usuario autenticado
 */
app.delete('/devices/:id', requireAuth, validateParams(DeviceIdParamsSchema), async (req, res) => {
  try {
    const { id } = req.params
    const nuusuid = req.session.nuusuid
    
    console.log(`📱 Desactivando dispositivo ${id} del usuario ${nuusuid}`)
    
    const prisma = getPrisma()
    
    // Verificar que el dispositivo pertenece al usuario
    const device = await prisma.push_tokens.findUnique({
      where: { id },
    })
    
    if (!device) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Dispositivo no encontrado',
      })
    }
    
    if (device.nuusuid !== nuusuid) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'No tienes permiso para eliminar este dispositivo',
      })
    }
    
    // Soft delete: marcar como inactivo
    await prisma.push_tokens.update({
      where: { id },
      data: {
        activo: false,
        fecha_ultima_actualizacion: new Date(),
      },
    })
    
    console.log(`✅ Dispositivo ${id} desactivado`)
    
    res.status(204).send()
  } catch (error) {
    console.error('❌ Error desactivando dispositivo:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
    })
  }
})

// ============================================================================
// NOTIFICACIONES v1 - AUTENTICADO (Semana 26)
// ============================================================================

/**
 * GET /notifications
 * Lista notificaciones del usuario con paginación y filtros (Semana 26 + 27)
 * Query params: page, limit, orderBy, orderDir, tipo, leida, fecha_desde, fecha_hasta
 */
app.get('/notifications', requireAuth, validateQuery(NotificationsQuerySchema), async (req, res) => {
  try {
    const { page, limit, orderBy, orderDir, tipo, leida, fecha_desde, fecha_hasta } = req.query
    const nuusuid = req.session.nuusuid
    
    console.log(`📬 Listando notificaciones del usuario ${nuusuid} (página ${page}, limit ${limit})`)
    if (tipo) console.log(`  🔍 Filtro tipo: ${tipo}`)
    if (leida !== undefined) console.log(`  🔍 Filtro leida: ${leida}`)
    if (fecha_desde) console.log(`  🔍 Filtro fecha_desde: ${fecha_desde}`)
    if (fecha_hasta) console.log(`  🔍 Filtro fecha_hasta: ${fecha_hasta}`)
    
    const prisma = getPrisma()
    
    // Construir WHERE dinámico con filtros
    const where = { nuusuid }
    if (tipo) where.tipo = tipo
    if (leida !== undefined) where.leida = leida
    if (fecha_desde || fecha_hasta) {
      where.fecha_creacion = {}
      if (fecha_desde) where.fecha_creacion.gte = new Date(fecha_desde)
      if (fecha_hasta) where.fecha_creacion.lte = new Date(fecha_hasta)
    }
    
    // Construir orderBy dinámico
    const orderByClause = {}
    orderByClause[orderBy] = orderDir
    
    // Contar total de notificaciones del usuario con filtros
    const totalCount = await prisma.notifications.count({ where })
    
    // Obtener notificaciones paginadas
    const skip = (page - 1) * limit
    const notifications = await prisma.notifications.findMany({
      where,
      orderBy: orderByClause,
      skip,
      take: limit,
      select: {
        id: true,
        tipo: true,
        titulo: true,
        mensaje: true,
        leida: true,
        fecha_creacion: true,
        fecha_leida: true,
        metadata: true,
      },
    })
    const notificationsSanitized = notifications.map(sanitizeNotificationRow)
    
    const totalPages = Math.ceil(totalCount / limit)
    
    console.log(`✅ Notificaciones obtenidas: ${notifications.length} de ${totalCount} total`)
    
    res.json({
      notifications: notificationsSanitized,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    })
  } catch (error) {
    console.error('❌ Error listando notificaciones:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
    })
  }
})

/**
 * GET /notifications/unread-count
 * Cuenta notificaciones no leídas del usuario
 */
app.get('/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const nuusuid = req.session.nuusuid
    
    console.log(`📬 Contando notificaciones no leídas del usuario ${nuusuid}`)
    
    const prisma = getPrisma()
    const unreadCount = await prisma.notifications.count({
      where: {
        nuusuid,
        leida: false,
      },
    })
    
    console.log(`✅ Notificaciones no leídas: ${unreadCount}`)
    
    res.json({ unreadCount })
  } catch (error) {
    console.error('❌ Error contando notificaciones no leídas:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
    })
  }
})

/**
 * PUT /notifications/:id/mark-read
 * Marca una notificación como leída
 * Valida que la notificación pertenece al usuario
 */
app.put('/notifications/:id/mark-read', requireAuth, validateParams(NotificationIdParamsSchema), async (req, res) => {
  try {
    const { id } = req.params
    const nuusuid = req.session.nuusuid
    
    console.log(`📬 Marcando notificación ${id} como leída para usuario ${nuusuid}`)
    
    const prisma = getPrisma()
    
    // Verificar que la notificación existe y pertenece al usuario
    const notification = await prisma.notifications.findUnique({
      where: { id },
    })
    
    if (!notification) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Notificación no encontrada',
      })
    }
    
    if (notification.nuusuid !== nuusuid) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'No tienes permiso para modificar esta notificación',
      })
    }
    
    // Marcar como leída
    const updatedNotification = await prisma.notifications.update({
      where: { id },
      data: {
        leida: true,
        fecha_leida: new Date(),
      },
      select: {
        id: true,
        tipo: true,
        titulo: true,
        mensaje: true,
        leida: true,
        fecha_creacion: true,
        fecha_leida: true,
        metadata: true,
      },
    })
    
    console.log(`✅ Notificación ${id} marcada como leída`)
    
    res.json({ notification: updatedNotification })
  } catch (error) {
    console.error('❌ Error marcando notificación como leída:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
    })
  }
})

/**
 * POST /notifications/mark-all-read (Semana 27)
 * Marca TODAS las notificaciones no leídas del usuario como leídas
 * Retorna count de notificaciones actualizadas
 */
app.post('/notifications/mark-all-read', requireAuth, async (req, res) => {
  try {
    const nuusuid = req.session.nuusuid
    
    console.log(`📬 Marcando TODAS las notificaciones como leídas para usuario ${nuusuid}`)
    
    const prisma = getPrisma()
    
    // Marcar todas las notificaciones no leídas del usuario
    const result = await prisma.notifications.updateMany({
      where: {
        nuusuid,
        leida: false,
      },
      data: {
        leida: true,
        fecha_leida: new Date(),
      },
    })
    
    console.log(`✅ ${result.count} notificaciones marcadas como leídas`)
    
    res.json({
      success: true,
      count: result.count,
      message: `${result.count} notificaciones marcadas como leídas`,
    })
  } catch (error) {
    console.error('❌ Error marcando todas las notificaciones como leídas:', error)
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
    })
  }
})

/**
 * POST /api/notifications/send
 * Crear notificación con validaciones y envío automático de push
 * Requiere autenticación (Basic Auth o Bearer Token)
 * Soporta request/response en JSON o YAML
 */
app.get('/api/notifications/send', (req, res) => {
  const acceptHeader = req.get('Accept') || ''
  const responseFormat = (acceptHeader.includes('yaml') ||
    acceptHeader.includes('x-yaml')) ? 'yaml' : 'json'

  const payload = {
    error: 'METHOD_NOT_ALLOWED',
    message: 'Este endpoint requiere POST. Usar POST /api/notifications/send',
    allowed: ['POST'],
  }

  res.set('Allow', 'POST')

  if (responseFormat === 'yaml') {
    return res.status(405)
      .set('Content-Type', 'application/yaml')
      .send(yaml.dump(payload))
  }

  return res.status(405).json(payload)
})

app.post('/api/notifications/send', requireAuth, async (req, res) => {
  try {
    const { nuusuid, tipo, titulo, mensaje, metadata } = req.body
    
    // Detectar formato de respuesta según header Accept
    const acceptHeader = req.get('Accept') || ''
    const responseFormat = (acceptHeader.includes('yaml') || 
                           acceptHeader.includes('x-yaml')) ? 'yaml' : 'json'
    
    console.log(`📬 Creando notificación para usuario ${nuusuid} (formato: ${responseFormat})`)
    
    // Helper para responder en el formato correcto
    const sendResponse = (statusCode, data) => {
      if (responseFormat === 'yaml') {
        res.status(statusCode)
           .set('Content-Type', 'application/yaml')
           .send(yaml.dump(data))
      } else {
        res.status(statusCode).json(data)
      }
    }
    
    // ========== VALIDACIONES ==========
    
    // 1. Validar que nuusuid no esté vacío
    if (!nuusuid || nuusuid.trim() === '') {
      return sendResponse(400, {
        error: 'VALIDATION_ERROR',
        message: 'El campo nuusuid es requerido'
      })
    }
    
    // 2. Validar que el usuario existe en la BD
    const prisma = getPrisma()
    const usuario = await prisma.nuusuari.findUnique({
      where: { nuusuid }
    })
    
    if (!usuario) {
      console.warn(`⚠️  Usuario no encontrado: ${nuusuid}`)
      return sendResponse(404, {
        error: 'USER_NOT_FOUND',
        message: 'El usuario no existe en la base de datos'
      })
    }
    
    // 3. Validar tipo
    const tiposValidos = ['autorizacion', 'credencial', 'general']
    if (!tipo || !tiposValidos.includes(tipo)) {
      return sendResponse(400, {
        error: 'VALIDATION_ERROR',
        message: `El tipo debe ser uno de: ${tiposValidos.join(', ')}`
      })
    }
    
    // 4. Validar título
    if (!titulo || titulo.trim() === '') {
      return sendResponse(400, {
        error: 'VALIDATION_ERROR',
        message: 'El título no puede estar vacío'
      })
    }
    
    if (titulo.length > 255) {
      return sendResponse(400, {
        error: 'VALIDATION_ERROR',
        message: 'El título no puede exceder 255 caracteres'
      })
    }
    
    // 5. Validar mensaje
    if (!mensaje || mensaje.trim() === '') {
      return sendResponse(400, {
        error: 'VALIDATION_ERROR',
        message: 'El mensaje no puede estar vacío'
      })
    }
    
    if (mensaje.length > 5000) {
      return sendResponse(400, {
        error: 'VALIDATION_ERROR',
        message: 'El mensaje no puede exceder 5000 caracteres'
      })
    }
    
    // 6. Validar metadata (si se proporciona)
    let metadataObj = {}
    if (metadata) {
      if (typeof metadata === 'object') {
        metadataObj = metadata
      } else {
        try {
          metadataObj = JSON.parse(metadata)
        } catch (e) {
          return sendResponse(400, {
            error: 'VALIDATION_ERROR',
            message: 'La metadata debe ser un objeto JSON válido'
          })
        }
      }
    }

    metadataObj = {
      origen: metadataObj?.origen || 'interna',
      canal: metadataObj?.canal || 'api_notifications_send',
      source: metadataObj?.source || 'api_notifications_send',
      ...metadataObj,
    }
    
    // ========== CREAR NOTIFICACIÓN ==========
    
    // Insertar en BD y obtener objeto creado
    const result = await prisma.notifications.create({
      data: {
        nuusuid,
        tipo,
        titulo,
        mensaje,
        leida: false,
        metadata: metadataObj,
      }
    })
    
    console.log(`✅ Notificación creada con ID: ${result.id}`)
    
    // ========== ENVIAR PUSH NOTIFICATION ==========
    
    // Obtener push tokens activos del usuario
    const tokens = await prisma.push_tokens.findMany({
      where: {
        nuusuid,
        activo: true
      }
    })
    
    // Enviar push a todos los dispositivos registrados
    if (tokens.length > 0) {
      console.log(`📱 Enviando push a ${tokens.length} dispositivo(s)...`)
      
      for (const token of tokens) {
        try {
          await sendPushNotification(
            token.push_token,
            titulo,
            mensaje,
            { tipo, notificationId: result.id, ...metadataObj }
          )
        } catch (pushError) {
          console.error(`❌ Error enviando push a token ${token.push_token}:`, pushError.message)
          // Continuar con otros tokens aunque falle uno
        }
      }
      
      console.log(`✅ Push notifications enviadas`)
    } else {
      console.log('ℹ️  Usuario no tiene dispositivos registrados para push')
    }
    
    // ========== RESPUESTA ==========
    
    sendResponse(201, {
      success: true,
      notification: {
        id: result.id,
        nuusuid: result.nuusuid,
        tipo: result.tipo,
        titulo: result.titulo,
        mensaje: result.mensaje,
        leida: result.leida,
        fecha_creacion: result.fecha_creacion,
        metadata: result.metadata
      }
    })
    
  } catch (error) {
    console.error('❌ Error creando notificación:', error)
    
    // Detectar formato de respuesta
    const acceptHeader = req.get('Accept') || ''
    const responseFormat = (acceptHeader.includes('yaml') || 
                           acceptHeader.includes('x-yaml')) ? 'yaml' : 'json'
    
    const errorData = {
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor al crear la notificación',
      details: error.message
    }
    
    if (responseFormat === 'yaml') {
      res.status(500)
         .set('Content-Type', 'application/yaml')
         .send(yaml.dump(errorData))
    } else {
      res.status(500).json(errorData)
    }
  }
})

/**
 * WS_NOTIFICACION
 * POST /api/ws/WS_NOTIFICACION
 *
 * Contrato: responde el MISMO SDT que recibe (mismos campos) y completa Messages.
 * Formatos: request YAML/JSON (Content-Type), response YAML/JSON (Accept).
 * Auth: requireAuth (Basic Auth para integraciones + Bearer para compatibilidad).
 *
 * SDT_WS_NOTIFICACION:
 * - Titulo (char 80)
 * - Mensaje (varchar 256) — se trunca automáticamente si supera el límite
 * - NUMesId (num 12)
 * - Afiliados[]: { NUUsuAfiliadoID (CrCreId), NUUsuNroAfiliado (opcional) }
 * - Messages[] (solo salida)
 */
app.get('/api/ws/WS_NOTIFICACION', (req, res) => {
  const acceptHeader = req.get('Accept') || ''
  const responseFormat = (acceptHeader.includes('yaml') ||
    acceptHeader.includes('x-yaml')) ? 'yaml' : 'json'

  const payload = {
    error: 'METHOD_NOT_ALLOWED',
    message: 'Este endpoint requiere POST. Usar POST /api/ws/WS_NOTIFICACION',
    allowed: ['POST'],
  }

  res.set('Allow', 'POST')

  if (responseFormat === 'yaml') {
    return res.status(405)
      .set('Content-Type', 'application/yaml')
      .send(yaml.dump(payload))
  }

  return res.status(405).json(payload)
})

app.post('/api/ws/WS_NOTIFICACION', requireAuth, async (req, res) => {
  const acceptHeader = req.get('Accept') || ''
  const responseFormat = (acceptHeader.includes('yaml') ||
    acceptHeader.includes('x-yaml')) ? 'yaml' : 'json'

  const sendResponse = (statusCode, data) => {
    if (responseFormat === 'yaml') {
      return res.status(statusCode)
        .set('Content-Type', 'application/yaml')
        .send(yaml.dump(data))
    }
    return res.status(statusCode).json(data)
  }

  const safeString = (value) => {
    if (value === null || value === undefined) return ''
    return String(value)
  }

  const trimString = (value) => safeString(value).trim()
  const isBlank = (value) => trimString(value) === ''

  const getFieldCaseInsensitive = (obj, fieldName) => {
    if (!obj || typeof obj !== 'object') return undefined
    const keys = Object.keys(obj)
    const key = keys.find((k) => k.toLowerCase() === fieldName.toLowerCase())
    return key ? obj[key] : undefined
  }

  const input = req.body || {}
  const titulo = safeString(getFieldCaseInsensitive(input, 'Titulo') ?? getFieldCaseInsensitive(input, 'titulo'))
  let mensaje = safeString(getFieldCaseInsensitive(input, 'Mensaje') ?? getFieldCaseInsensitive(input, 'mensaje'))
  const numesIdRaw = getFieldCaseInsensitive(input, 'NUMesId') ?? getFieldCaseInsensitive(input, 'numesId')
  const afiliadosRaw = getFieldCaseInsensitive(input, 'Afiliados') ?? getFieldCaseInsensitive(input, 'afiliados')
  const afiliados = Array.isArray(afiliadosRaw) ? afiliadosRaw : []

  const messages = []
  const addMessage = ({ id, type, description }) => {
    messages.push({
      Id: safeString(id).slice(0, 128),
      Type: type,
      Description: safeString(description).slice(0, 256),
    })
  }

  const buildSdtResponse = () => ({
    Titulo: titulo,
    Mensaje: mensaje,
    NUMesId: numesIdRaw ?? null,
    Afiliados: afiliados,
    Messages: messages,
  })

  // ========== VALIDACIONES TOP-LEVEL ==========

  if (isBlank(titulo)) {
    addMessage({ id: 'Titulo', type: 1, description: 'Titulo es requerido' })
    return sendResponse(400, buildSdtResponse())
  }
  if (titulo.length > 80) {
    addMessage({ id: 'Titulo', type: 1, description: 'Titulo no puede exceder 80 caracteres' })
    return sendResponse(400, buildSdtResponse())
  }
  if (isBlank(mensaje)) {
    addMessage({ id: 'Mensaje', type: 1, description: 'Mensaje es requerido' })
    return sendResponse(400, buildSdtResponse())
  }
  // Truncar a 256 chars en lugar de rechazar, para permitir mensajes largos del sistema
  if (mensaje.length > 256) {
    mensaje = mensaje.slice(0, 253) + '...'
    console.log('ℹ️  WS_NOTIFICACION: Mensaje truncado a 256 caracteres')
  }

  const numesIdStr = trimString(numesIdRaw)
  const numesIdDigits = numesIdStr.replace(/[^0-9]/g, '')
  const numesId = Number.parseInt(numesIdDigits, 10)

  if (isBlank(numesIdStr) || !Number.isFinite(numesId)) {
    addMessage({ id: 'NUMesId', type: 1, description: 'NUMesId es requerido y debe ser numérico' })
    return sendResponse(400, buildSdtResponse())
  }
  if (numesIdDigits.length > 12) {
    addMessage({ id: 'NUMesId', type: 1, description: 'NUMesId no puede exceder 12 dígitos' })
    return sendResponse(400, buildSdtResponse())
  }

  if (!Array.isArray(afiliadosRaw)) {
    addMessage({ id: 'Afiliados', type: 1, description: 'Afiliados es requerido y debe ser una colección' })
    return sendResponse(400, buildSdtResponse())
  }

  if (afiliados.length < 1) {
    addMessage({ id: 'Afiliados', type: 1, description: 'Afiliados debe contener al menos 1 item' })
    return sendResponse(400, buildSdtResponse())
  }

  // ========== PROCESAMIENTO ==========

  const prisma = getPrisma()
  let okCount = 0
  let errorCount = 0
  const itemErrors = [] // acumula detalle de errores por afiliado

  for (let i = 0; i < afiliados.length; i++) {
    const item = afiliados[i]

    const crcreid = trimString(getFieldCaseInsensitive(item, 'NUUsuAfiliadoID'))
    const nroAfiliado = trimString(getFieldCaseInsensitive(item, 'NUUsuNroAfiliado'))
    const msgId = crcreid || `Afiliados[${i}]`

    if (isBlank(crcreid)) {
      errorCount++
      itemErrors.push(`${msgId}: NUUsuAfiliadoID (CrCreId) es requerido`)
      continue
    }

    if (crcreid.length > 40) {
      errorCount++
      itemErrors.push(`${msgId}: NUUsuAfiliadoID no puede exceder 40 caracteres`)
      continue
    }

    // NUUsuNroAfiliado es opcional; si viene vacío se omite la validación cruzada con crcreden
    if (!isBlank(nroAfiliado) && nroAfiliado.length > 20) {
      errorCount++
      itemErrors.push(`${msgId}: NUUsuNroAfiliado no puede exceder 20 caracteres`)
      continue
    }

    try {
      // 1) Resolver CrCreId -> nuusuid
      const userMap = await db.pool.query(
        'SELECT nuusuid FROM crcredus WHERE TRIM(crcreid) = TRIM($1) LIMIT 1',
        [crcreid]
      )

      if (!userMap.rows.length) {
        errorCount++
        itemErrors.push(`${msgId}: No se encontró usuario para el CrCreId indicado (crcredus)`)
        continue
      }

      const nuusuid = userMap.rows[0].nuusuid

      // 2) Validar NroAfiliado vs crcreden solo si fue informado
      const cred = await db.pool.query(
        'SELECT crcrenroaf FROM crcreden WHERE TRIM(crcreid) = TRIM($1) LIMIT 1',
        [crcreid]
      )

      if (!isBlank(nroAfiliado) && cred.rows.length) {
        const nroDb = trimString(cred.rows[0].crcrenroaf)
        if (nroDb && nroDb !== nroAfiliado) {
          errorCount++
          itemErrors.push(`${msgId}: NUUsuNroAfiliado no coincide con el registrado para el CrCreId (crcreden)`)
          continue
        }
      }

      // 3) Crear notificación + push (mismo patrón que /api/notifications/send)
      const tipo = 'general'
      const metadataObj = {
        numesId,
        crcreid,
        nroAfiliado,
        ws: 'WS_NOTIFICACION',
        origen: 'externa',
        canal: 'ws_notificacion',
        source: 'ws_notificacion_externo',
      }

      const notification = await prisma.notifications.create({
        data: {
          nuusuid,
          tipo,
          titulo: titulo.trim(),
          mensaje: mensaje.trim(),
          leida: false,
          metadata: metadataObj,
        }
      })

      const tokens = await prisma.push_tokens.findMany({
        where: {
          nuusuid,
          activo: true,
        }
      })

      if (tokens.length > 0) {
        for (const tokenRow of tokens) {
          try {
            await sendPushNotification(
              tokenRow.push_token,
              titulo,
              mensaje,
              { tipo, notificationId: notification.id, ...metadataObj }
            )
          } catch (pushError) {
            console.error(`❌ Error enviando push a token ${tokenRow.push_token}:`, pushError.message)
          }
        }
      }

      okCount++
      console.log(`✅ WS_NOTIFICACION: notificación creada para nuusuid=${nuusuid} (${msgId})`)
    } catch (error) {
      errorCount++
      console.error('❌ Error procesando WS_NOTIFICACION item:', error)
      itemErrors.push(`${msgId}: Error interno al procesar el afiliado`)
    }
  }

  // Mensaje único de respuesta
  if (errorCount === 0) {
    addMessage({
      id: 'WS_NOTIFICACION',
      type: 2,
      description: `OK - Procesados ${afiliados.length} afiliado(s)`,
    })
  } else {
    const detail = itemErrors.join(' | ')
    addMessage({
      id: 'WS_NOTIFICACION',
      type: 1,
      description: `ERROR - OK=${okCount} ERROR=${errorCount}. ${detail}`.slice(0, 256),
    })
  }

  return sendResponse(200, buildSdtResponse())
})

// ============================================================================
// MENSAJES INSTITUCIONALES — BROADCAST (Tarea 16)
// ============================================================================

/**
 * Construye el WHERE dinámico para segmentación de broadcast.
 * Filtros admitidos: plan, tipo (titular/familiar/todos), sexo (M/F/todos), edadMin, edadMax.
 */
function buildBroadcastFilterSQL(filtros = {}) {
  const conditions = [
    `(nuusubajaf IS NULL OR EXTRACT(YEAR FROM nuusubajaf) <= 1900)`,
    `nuusuid IS NOT NULL`,
  ]
  const params = []
  let idx = 1

  if (filtros.plan && String(filtros.plan).trim()) {
    conditions.push(`nuplaid = $${idx++}`)
    params.push(String(filtros.plan).trim())
  }
  if (filtros.tipo === 'titular') {
    conditions.push(`nuusuestit = 'S'`)
  } else if (filtros.tipo === 'familiar') {
    conditions.push(`(nuusuestit = 'N' OR nuusuestit IS NULL OR nuusuestit = '')`)
  }
  if (filtros.sexo === 'M' || filtros.sexo === 'F') {
    conditions.push(`nuususexo = $${idx++}`)
    params.push(filtros.sexo)
  }
  const edadMin = filtros.edadMin !== undefined && filtros.edadMin !== '' ? Number(filtros.edadMin) : null
  const edadMax = filtros.edadMax !== undefined && filtros.edadMax !== '' ? Number(filtros.edadMax) : null
  if (edadMin !== null && !Number.isNaN(edadMin) && edadMin >= 0) {
    conditions.push(`nuusufecha IS NOT NULL AND EXTRACT(YEAR FROM AGE(NOW(), nuusufecha)) >= $${idx++}`)
    params.push(edadMin)
  }
  if (edadMax !== null && !Number.isNaN(edadMax) && edadMax >= 0) {
    conditions.push(`nuusufecha IS NOT NULL AND EXTRACT(YEAR FROM AGE(NOW(), nuusufecha)) <= $${idx++}`)
    params.push(edadMax)
  }
  // Nota: plataforma NO filtra usuarios — solo afecta el canal push (ver broadcast handler)

  return { whereClause: conditions.join(' AND '), params }
}

/**
 * GET /admin/notifications/broadcast/preview
 *
 * Devuelve la cantidad de usuarios que recibirían el broadcast con los filtros dados.
 * Query params: plan, tipo, sexo, edadMin, edadMax
 */
app.get('/admin/notifications/broadcast/preview', requireAuth, requireAdmin, requirePermission('notificaciones'), async (req, res) => {
  try {
    const { plan, tipo, sexo, edadMin, edadMax, plataforma } = req.query
    const { whereClause, params } = buildBroadcastFilterSQL({ plan, tipo, sexo, edadMin, edadMax, plataforma })
    const result = await db.pool.query(
      `SELECT COUNT(DISTINCT nuusuid)::int AS total FROM nuusuari WHERE ${whereClause}`,
      params
    )
    const total = result.rows[0].total

    // Contar dispositivos de la plataforma indicada (independiente)
    let dispositivosPlat = null
    if (plataforma === 'ios' || plataforma === 'android') {
      const platResult = await db.pool.query(
        `SELECT COUNT(DISTINCT pt.nuusuid)::int AS cnt
         FROM push_tokens pt
         INNER JOIN nuusuari u ON u.nuusuid = pt.nuusuid
         WHERE pt.plataforma = $1 AND pt.activo = TRUE
           AND (u.nuusubajaf IS NULL OR EXTRACT(YEAR FROM u.nuusubajaf) <= 1900)`,
        [plataforma]
      )
      dispositivosPlat = platResult.rows[0].cnt
    }

    return res.json({ total, dispositivosPlat, plataformaFiltro: plataforma || null, filtros: { plan, tipo, sexo, edadMin, edadMax, plataforma } })
  } catch (error) {
    console.error('❌ Error en preview broadcast:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message })
  }
})

/**
 * POST /admin/notifications/broadcast
 *
 * Envía un mensaje institucional a un segmento de usuarios activos.
 * Respeta las preferencias de notificación (nu_notif_prefs) de cada usuario.
 *
 * Body:
 *   titulo    {string}  — hasta 80 chars
 *   mensaje   {string}  — hasta 1000 chars
 *   categoria {string}  — 'noticias' | 'sistema'
 *   filtros   {object}  — { plan?, tipo?: 'todos'|'titular'|'familiar', sexo?: 'M'|'F', edadMin?, edadMax? }
 *
 * Respuesta:
 *   { success, stats: { usuarios, push_enviados, in_app_creadas, omitidos_pref, errores }, filtros }
 */
app.post('/admin/notifications/broadcast', requireAuth, requireAdmin, requirePermission('notificaciones'), async (req, res) => {
  try {
    const { titulo, mensaje, categoria, filtros = {} } = req.body
    // Validar plataforma si se indica
    if (filtros.plataforma && !['ios', 'android'].includes(filtros.plataforma)) {
      return sendLegacyValidationError(res, "plataforma debe ser 'ios' o 'android'", 'filtros.plataforma')
    }

    // ── Validaciones básicas ──────────────────────────────────────────────────
    if (!titulo || titulo.trim() === '') {
      return sendLegacyValidationError(res, 'El campo titulo es requerido', 'titulo')
    }
    if (titulo.length > 80) {
      return sendLegacyValidationError(res, 'titulo no puede exceder 80 caracteres', 'titulo')
    }
    if (!mensaje || mensaje.trim() === '') {
      return sendLegacyValidationError(res, 'El campo mensaje es requerido', 'mensaje')
    }
    if (mensaje.length > 1000) {
      return sendLegacyValidationError(res, 'mensaje no puede exceder 1000 caracteres', 'mensaje')
    }
    const categoriasPermitidas = ['noticias', 'sistema']
    if (!categoria || !categoriasPermitidas.includes(categoria)) {
      return sendLegacyValidationError(res, `categoria debe ser: ${categoriasPermitidas.join(' | ')}`, 'categoria')
    }

    const { whereClause, params } = buildBroadcastFilterSQL(filtros)
    const segmentoDesc = [
      filtros.plan ? `plan=${filtros.plan}` : null,
      filtros.tipo && filtros.tipo !== 'todos' ? `tipo=${filtros.tipo}` : null,
      filtros.sexo ? `sexo=${filtros.sexo}` : null,
      filtros.edadMin ? `edadMin=${filtros.edadMin}` : null,
      filtros.edadMax ? `edadMax=${filtros.edadMax}` : null,
      filtros.plataforma ? `dispositivo=${filtros.plataforma === 'ios' ? 'Apple' : 'Android'}` : null,
    ].filter(Boolean).join(', ') || 'todos'

    console.log(`📢 Broadcast admin: categoria=${categoria}, segmento=[${segmentoDesc}], titulo="${titulo}"`)

    // ── Obtener usuarios según filtros ────────────────────────────────────────
    const usuariosResult = await db.pool.query(
      `SELECT DISTINCT nuusuid FROM nuusuari WHERE ${whereClause}`,
      params
    )
    const todosUsuarios = usuariosResult.rows.map(r => r.nuusuid)

    const stats = {
      usuarios: todosUsuarios.length,
      push_enviados: 0,
      in_app_creadas: 0,
      omitidos_pref: 0,
      errores: 0,
    }

    for (const nuusuid of todosUsuarios) {
      try {
        // Verificar preferencias del usuario para esta categoría
        const prefResult = await db.pool.query(
          'SELECT push, in_app FROM nu_notif_prefs WHERE nuusuid = $1 AND categoria = $2',
          [nuusuid, categoria]
        )
        // Sin fila = valores por defecto (todo habilitado)
        const pref = prefResult.rows.length > 0
          ? { push: prefResult.rows[0].push, in_app: prefResult.rows[0].in_app }
          : { push: true, in_app: true }

        if (!pref.push && !pref.in_app) {
          stats.omitidos_pref++
          continue
        }

        // Crear notificación in_app si corresponde
        if (pref.in_app) {
          await db.pool.query(
            `INSERT INTO notifications (nuusuid, tipo, titulo, mensaje, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [nuusuid, 'general', titulo.trim(), mensaje.trim(),
              JSON.stringify({
                categoria,
                broadcast: true,
                segmento: segmentoDesc,
                filtros,
                origen: 'interna',
                canal: 'admin_broadcast',
                source: 'admin_broadcast',
              })]
          )
          stats.in_app_creadas++
        }

        // Enviar push si corresponde (filtrar por plataforma si se especificó)
        if (pref.push) {
          const plataformaFiltro = filtros.plataforma === 'ios' || filtros.plataforma === 'android'
            ? filtros.plataforma : null
          const tokensResult = plataformaFiltro
            ? await db.pool.query(
                'SELECT push_token FROM push_tokens WHERE nuusuid = $1 AND activo = TRUE AND plataforma = $2',
                [nuusuid, plataformaFiltro]
              )
            : await db.pool.query(
                'SELECT push_token FROM push_tokens WHERE nuusuid = $1 AND activo = TRUE',
                [nuusuid]
              )
          for (const tokenRow of tokensResult.rows) {
            try {
              await sendPushNotification(
                tokenRow.push_token,
                titulo.trim(),
                mensaje.trim(),
                { categoria, broadcast: true }
              )
              stats.push_enviados++
            } catch (pushErr) {
              console.error(`❌ Push error (broadcast) token ${tokenRow.push_token}:`, pushErr.message)
              stats.errores++
            }
          }
        }
      } catch (userErr) {
        console.error(`❌ Error procesando broadcast para ${nuusuid}:`, userErr.message)
        stats.errores++
      }
    }

    console.log(`✅ Broadcast completado:`, stats)
    return res.status(200).json({ success: true, stats, segmento: segmentoDesc, filtros })
  } catch (error) {
    console.error('❌ Error en broadcast:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message })
  }
})

// ============================================================================
// HISTORIAL DE NOTIFICACIONES — GESTIÓN ADMIN (Semana 30)
// ============================================================================

const AdminNotificationsListQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number).pipe(z.number().int().positive()),
  limit: z.string().optional().default('25').transform(Number).pipe(z.number().int().positive().max(100)),
  orderBy: z.enum(['fecha_creacion', 'leida', 'tipo', 'titulo']).optional().default('fecha_creacion'),
  orderDir: z.enum(['asc', 'desc']).optional().default('desc'),
  q: z.string().optional().transform((v) => (v ? v.trim() : '')),
  nuusuid: z.string().optional().transform((v) => (v ? v.trim() : '')),
  tipo: z.string().optional().transform((v) => (v ? v.trim() : '')),
  origen: z.string().optional().transform((v) => (v ? v.trim().toLowerCase() : '')),
  leida: z.string().optional().transform((val) => {
    if (val === undefined || val === '') return undefined
    return val === 'true' || val === '1'
  }),
  fecha_desde: z.string().optional().refine((v) => !v || !Number.isNaN(Date.parse(v)), { message: 'fecha_desde debe ser fecha ISO válida' }),
  fecha_hasta: z.string().optional().refine((v) => !v || !Number.isNaN(Date.parse(v)), { message: 'fecha_hasta debe ser fecha ISO válida' }),
})

/**
 * GET /admin/notifications/list
 *
 * Lista de notificaciones de TODOS los usuarios con filtros avanzados.
 * Solo accesible para administradores backend.
 *
 * Query params:
 *   page        — número de página (default 1)
 *   limit       — resultados por página (default 25, max 100)
 *   orderBy     — campo de orden: fecha_creacion | leida | tipo | titulo
 *   orderDir    — asc | desc
 *   q           — búsqueda por email, nombre o nroAfiliado del usuario
 *   nuusuid     — filtrar por ID exacto de usuario
 *   tipo        — filtrar por tipo (info, warning, success, error, general, noticias, sistema)
 *   leida       — true|false — filtrar por estado de lectura
 *   fecha_desde — fecha ISO inicio del rango
 *   fecha_hasta — fecha ISO fin del rango
 *
 * Respuesta:
 *   { data[], pagination, stats }
 */
app.get('/admin/notifications/list', requireAuth, requireAdmin, requirePermission('notificaciones'), validateQuery(AdminNotificationsListQuerySchema), async (req, res) => {
  try {
    const { page, limit, orderBy, orderDir, q, nuusuid, tipo, origen, leida, fecha_desde, fecha_hasta } = req.query
    const offset = (page - 1) * limit

    // Columnas de ordenamiento permitidas (evitar SQL injection)
    const allowedOrderBy = {
      fecha_creacion: 'n.fecha_creacion',
      leida: 'n.leida',
      tipo: 'n.tipo',
      titulo: 'n.titulo',
    }
    const orderCol = allowedOrderBy[orderBy] || 'n.fecha_creacion'
    const orderDirSafe = orderDir === 'asc' ? 'ASC' : 'DESC'

    const conditions = []
    const params = []
    let pIdx = 1

    // Filtro por nuusuid exacto
    if (nuusuid) {
      conditions.push(`n.nuusuid = $${pIdx++}`)
      params.push(nuusuid)
    }

    // Búsqueda full-text por email, nombre o nroAfiliado del usuario
    if (q) {
      const qLike = `%${q.toLowerCase()}%`
      conditions.push(`(
        LOWER(COALESCE(u.nuusumail, '')) LIKE $${pIdx}
        OR LOWER(COALESCE(u.nuusuapell, '')) LIKE $${pIdx}
        OR LOWER(COALESCE(u.nuusunroaf, '')) LIKE $${pIdx}
        OR LOWER(COALESCE(u.nuusuafili, '')) LIKE $${pIdx}
      )`)
      params.push(qLike)
      pIdx++
    }

    // Filtro por tipo
    if (tipo) {
      conditions.push(`n.tipo = $${pIdx++}`)
      params.push(tipo)
    }

    // Filtro por origen (interna|externa)
    if (origen) {
      if (origen === 'externa') {
        conditions.push(`(
          LOWER(COALESCE(n.metadata->>'origen', '')) = 'externa'
          OR LOWER(COALESCE(n.metadata->>'ws', '')) = 'ws_notificacion'
        )`)
      } else if (origen === 'interna') {
        conditions.push(`(
          LOWER(COALESCE(n.metadata->>'origen', '')) = 'interna'
          OR (
            COALESCE(n.metadata->>'origen', '') = ''
            AND LOWER(COALESCE(n.metadata->>'ws', '')) <> 'ws_notificacion'
          )
        )`)
      }
    }

    // Filtro leida
    if (leida !== undefined) {
      if (leida) {
        conditions.push(`n.leida = TRUE`)
      } else {
        conditions.push(`n.leida = FALSE`)
      }
    }

    // Rango de fechas
    if (fecha_desde) {
      conditions.push(`n.fecha_creacion >= $${pIdx++}`)
      params.push(new Date(fecha_desde).toISOString())
    }
    if (fecha_hasta) {
      const hastaFin = new Date(fecha_hasta)
      hastaFin.setUTCHours(23, 59, 59, 999)
      conditions.push(`n.fecha_creacion <= $${pIdx++}`)
      params.push(hastaFin.toISOString())
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Query principal con JOIN a nuusuari para datos del usuario
    const dataQuery = `
      SELECT
        n.id,
        n.nuusuid,
        n.tipo,
        n.titulo,
        n.mensaje,
        n.leida,
        n.fecha_leida,
        n.fecha_creacion,
        n.metadata,
        CASE
          WHEN LOWER(COALESCE(n.metadata->>'origen', '')) IN ('interna', 'externa') THEN LOWER(n.metadata->>'origen')
          WHEN LOWER(COALESCE(n.metadata->>'ws', '')) = 'ws_notificacion' THEN 'externa'
          ELSE 'interna'
        END AS origen,
        COALESCE(
          NULLIF(n.metadata->>'canal', ''),
          NULLIF(n.metadata->>'source', ''),
          NULLIF(n.metadata->>'ws', ''),
          CASE WHEN COALESCE(n.metadata->>'broadcast', '') = 'true' THEN 'admin_broadcast' ELSE 'app_interna' END
        ) AS canal,
        COALESCE(u.nuusumail, '') AS usuario_email,
        COALESCE(u.nuusuapell, '') AS usuario_nombre,
        COALESCE(u.nuusunroaf, '') AS usuario_nroafiliado,
        COALESCE(u.nuusuafili, '') AS usuario_afiliadoid
      FROM notifications n
      LEFT JOIN nuusuari u ON n.nuusuid = u.nuusuid
      ${whereClause}
      ORDER BY ${orderCol} ${orderDirSafe}
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM notifications n
      LEFT JOIN nuusuari u ON n.nuusuid = u.nuusuid
      ${whereClause}
    `

    // Stats de contexto
    const statsQuery = `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE n.leida = FALSE) AS no_leidas,
        COUNT(*) FILTER (WHERE n.leida = TRUE) AS leidas,
        COUNT(DISTINCT n.nuusuid) AS usuarios_distintos
      FROM notifications n
      LEFT JOIN nuusuari u ON n.nuusuid = u.nuusuid
      ${whereClause}
    `

    const [dataResult, countResult, statsResult] = await Promise.all([
      db.pool.query(dataQuery, [...params, limit, offset]),
      db.pool.query(countQuery, params),
      db.pool.query(statsQuery, params),
    ])

    const total = parseInt(countResult.rows[0]?.total || 0, 10)
    const statsRow = statsResult.rows[0] || {}

    const rows = dataResult.rows.map((row) => ({
      ...sanitizeNotificationRow(row),
      leida: Boolean(row.leida),
      metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    }))

    return res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      stats: {
        total: parseInt(statsRow.total || 0, 10),
        noLeidas: parseInt(statsRow.no_leidas || 0, 10),
        leidas: parseInt(statsRow.leidas || 0, 10),
        usuariosDistintos: parseInt(statsRow.usuarios_distintos || 0, 10),
      },
      filters: { q: q || null, nuusuid: nuusuid || null, tipo: tipo || null, origen: origen || null, leida, fecha_desde: fecha_desde || null, fecha_hasta: fecha_hasta || null },
    })
  } catch (error) {
    console.error('❌ Error en /admin/notifications/list:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message })
  }
})

/**
 * GET /admin/notifications/stats
 *
 * Estadísticas generales del sistema de notificaciones.
 */
app.get('/admin/notifications/stats', requireAuth, requireAdmin, requirePermission('notificaciones'), async (req, res) => {
  try {
    const result = await db.pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE leida = FALSE) AS no_leidas,
        COUNT(*) FILTER (WHERE leida = TRUE) AS leidas,
        COUNT(DISTINCT nuusuid) AS usuarios_con_notificaciones,
        COUNT(*) FILTER (WHERE tipo = 'info') AS tipo_info,
        COUNT(*) FILTER (WHERE tipo = 'warning') AS tipo_warning,
        COUNT(*) FILTER (WHERE tipo = 'success') AS tipo_success,
        COUNT(*) FILTER (WHERE tipo = 'error') AS tipo_error,
        COUNT(*) FILTER (WHERE tipo NOT IN ('info','warning','success','error')) AS tipo_otros,
        COUNT(*) FILTER (WHERE fecha_creacion >= NOW() - INTERVAL '24 hours') AS ultimas_24h,
        COUNT(*) FILTER (WHERE fecha_creacion >= NOW() - INTERVAL '7 days') AS ultimos_7d
      FROM notifications
    `)

    const row = result.rows[0] || {}
    return res.json({
      total: parseInt(row.total || 0, 10),
      noLeidas: parseInt(row.no_leidas || 0, 10),
      leidas: parseInt(row.leidas || 0, 10),
      usuariosConNotificaciones: parseInt(row.usuarios_con_notificaciones || 0, 10),
      porTipo: {
        info: parseInt(row.tipo_info || 0, 10),
        warning: parseInt(row.tipo_warning || 0, 10),
        success: parseInt(row.tipo_success || 0, 10),
        error: parseInt(row.tipo_error || 0, 10),
        otros: parseInt(row.tipo_otros || 0, 10),
      },
      actividad: {
        ultimas24h: parseInt(row.ultimas_24h || 0, 10),
        ultimos7d: parseInt(row.ultimos_7d || 0, 10),
      },
    })
  } catch (error) {
    console.error('❌ Error en /admin/notifications/stats:', error)
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message })
  }
})

/**
 * WS_USUARIO_ACTIVO
 * POST /api/ws/WS_USUARIO_ACTIVO
 *
 * Valida usuario y contraseña vía GAM OAuth2. Si se provee IdAfiliado,
 * verifica que el GUID del usuario coincida con nuusuafili en nuusuari.
 *
 * SDT_WSValidaUsuario (request):
 *   WSUsuario   (char 40)  — login GAM del usuario (email)
 *   WSPassword  (char 50)  — contraseña GAM
 *   IdAfiliado  (char 40)  — AfiliadoId del beneficiario (opcional)
 *
 * Respuesta:
 *   WSUsuario, WSPassword, IdAfiliado (mirror del request)
 *   Respuesta[]:
 *     RespuestaCodigo      — "000" OK | "50"-"54" estado/asociación | "010" params | "099" interno
 *     RespuestaDescripcion — descripción legible
 *
 * Códigos de respuesta:
 *   "000" Usuario Activo (credenciales correctas, afiliado asociado si se informó)
 *   "50"  El usuario se encuentra Bloqueado
 *   "51"  El usuario se encuentra Inactivo (isDeleted)
 *   "52"  El usuario se encuentra Inactivo (IsEnabledInRepository=false)
 *   "53"  El usuario no se encuentra asociado al Beneficiario !
 *   "54"  No se encontró el usuario !
 *   "010" Error de validación de parámetros
 *   "099" Error interno
 */
app.get('/api/ws/WS_USUARIO_ACTIVO', (req, res) => {
  const acceptHeader = req.get('Accept') || ''
  const responseFormat = (acceptHeader.includes('yaml') || acceptHeader.includes('x-yaml')) ? 'yaml' : 'json'

  const payload = {
    error: 'METHOD_NOT_ALLOWED',
    message: 'Este endpoint requiere POST. Usar POST /api/ws/WS_USUARIO_ACTIVO',
    allowed: ['POST'],
  }
  res.set('Allow', 'POST')

  if (responseFormat === 'yaml') {
    return res.status(405).set('Content-Type', 'application/yaml').send(yaml.dump(payload))
  }
  return res.status(405).json(payload)
})

app.post('/api/ws/WS_USUARIO_ACTIVO', requireAuth, async (req, res) => {
  const acceptHeader = req.get('Accept') || ''
  const responseFormat = (acceptHeader.includes('yaml') || acceptHeader.includes('x-yaml')) ? 'yaml' : 'json'

  const sendResponse = (statusCode, data) => {
    if (responseFormat === 'yaml') {
      return res.status(statusCode).set('Content-Type', 'application/yaml').send(yaml.dump(data))
    }
    return res.status(statusCode).json(data)
  }

  const safeString = (v) => (v === null || v === undefined) ? '' : String(v)
  const trimStr   = (v) => safeString(v).trim()
  const isBlank   = (v) => trimStr(v) === ''

  const getField = (obj, name) => {
    if (!obj || typeof obj !== 'object') return undefined
    const key = Object.keys(obj).find(k => k.toLowerCase() === name.toLowerCase())
    return key ? obj[key] : undefined
  }

  const input      = req.body || {}
  const wsUsuario  = trimStr(getField(input, 'WSUsuario'))
  const wsPassword = trimStr(getField(input, 'WSPassword'))
  const idAfiliado = trimStr(getField(input, 'IdAfiliado'))

  // Construye el SDT de respuesta — Respuesta es un array (puede tener múltiples ítems)
  const buildSdt = (respuestaItems) => ({
    WSUsuario:  wsUsuario,
    WSPassword: wsPassword,
    IdAfiliado: idAfiliado,
    Respuesta:  (Array.isArray(respuestaItems) ? respuestaItems : [respuestaItems]).map(item => ({
      RespuestaCodigo:      safeString(item.RespuestaCodigo),
      RespuestaDescripcion: safeString(item.RespuestaDescripcion).slice(0, 150),
    })),
  })

  const ok  = (desc = 'Usuario Activo') => buildSdt([{ RespuestaCodigo: '000', RespuestaDescripcion: desc }])
  const err = (code, desc)              => buildSdt([{ RespuestaCodigo: String(code), RespuestaDescripcion: desc }])

  // ===== VALIDACIONES DE PARÁMETROS =====
  if (isBlank(wsUsuario))         return sendResponse(400, err('010', 'WSUsuario es requerido'))
  if (wsUsuario.length > 40)      return sendResponse(400, err('010', 'WSUsuario no puede exceder 40 caracteres'))
  if (isBlank(wsPassword))        return sendResponse(400, err('010', 'WSPassword es requerido'))
  if (wsPassword.length > 50)     return sendResponse(400, err('010', 'WSPassword no puede exceder 50 caracteres'))
  if (idAfiliado.length > 40)     return sendResponse(400, err('010', 'IdAfiliado no puede exceder 40 caracteres'))

  try {
    // ── 1) Autenticar vía GAM OAuth2 ──────────────────────────────────────────
    let loginResult
    try {
      loginResult = await gamService.loginGAM(wsUsuario, wsPassword)
    } catch (gamErr) {
      // Login fallido — mapear errores GAM al SDT Respuesta[]
      // GAM puede devolver error como string ("error":"invalid_client")
      // o como objeto ("error":{"code":"236","message":"..."})
      const details  = gamErr.details || {}
      const detailsError = details.error  // puede ser string u objeto
      const errObj = (typeof detailsError === 'object' && detailsError !== null) ? detailsError : null
      const gamErrVal = gamErr.error      // también puede ser string u objeto

      // Extraer código GAM: buscar en error.code (objeto) o en campos planos
      const gamCode = safeString(
        (errObj && errObj.code)       ? errObj.code :
        details.gam_code              ? details.gam_code :
        details.error_code            ? details.error_code :
        details.code                  ? details.code :
        ''
      ).trim()

      // Extraer descripción legible: preferir mensaje del objeto anidado
      const rawDesc =
        (errObj && errObj.message)                     ? errObj.message :
        typeof detailsError === 'string' && detailsError ? detailsError :
        details.error_description                      ? details.error_description :
        (typeof gamErrVal === 'object' && gamErrVal?.message) ? gamErrVal.message :
        typeof gamErrVal === 'string' && gamErrVal     ? gamErrVal :
        'Error de autenticación'
      const errorDesc = safeString(rawDesc)
      const errorStr  = errorDesc.toLowerCase()
      const lowerDesc = errorStr

      console.log(`ℹ️  WS_USUARIO_ACTIVO: login GAM fallido [${wsUsuario}] code=${gamCode} error=${errorStr.slice(0,100)}`)

      const respuesta = []

      if (gamCode === '7' || lowerDesc.includes('bloqueado') || lowerDesc.includes('blocked')) {
        respuesta.push({ RespuestaCodigo: '50', RespuestaDescripcion: 'El usuario se encuentra Bloqueado' })
      } else if (lowerDesc.includes('eliminado') || lowerDesc.includes('deleted')) {
        respuesta.push({ RespuestaCodigo: '51', RespuestaDescripcion: 'El usuario se encuentra Inactivo' })
      } else if (lowerDesc.includes('inactivo') || lowerDesc.includes('deshabilitado') || lowerDesc.includes('disabled') || lowerDesc.includes('inactive')) {
        respuesta.push({ RespuestaCodigo: '52', RespuestaDescripcion: 'El usuario se encuentra Inactivo' })
      } else {
        // Para cualquier otro error (credenciales incorrectas, usuario no existe, etc.)
        // se devuelve el código y descripción que retorna GAM directamente
        respuesta.push({
          RespuestaCodigo:      gamCode || safeString(gamErr.statusCode || ''),
          RespuestaDescripcion: errorDesc.trim(),
        })
      }

      return sendResponse(200, buildSdt(respuesta))
    }

    // ── 2) Login exitoso — obtener GUID del usuario ───────────────────────────
    let guid = loginResult.user_id
    if (!guid || guid === 'undefined' || guid === 'null') {
      try {
        const userInfo = await gamService.getUserInfo(loginResult.access_token)
        guid = userInfo.GUID || userInfo.guid || userInfo.Id || userInfo.id
      } catch (uiErr) {
        console.warn(`⚠️  WS_USUARIO_ACTIVO: no se pudo obtener GUID via userinfo [${wsUsuario}]:`, uiErr.message)
      }
    }

    // ── 3) Si no se informó IdAfiliado, solo se valida la credencial ──────────
    if (isBlank(idAfiliado)) {
      console.log(`✅ WS_USUARIO_ACTIVO: credenciales válidas (sin IdAfiliado) [${wsUsuario}]`)
      return sendResponse(200, ok())
    }

    // ── 4) Verificar asociación GUID ↔ nuusuafili en nuusuari ─────────────────
    if (!guid) {
      console.error(`❌ WS_USUARIO_ACTIVO: GUID no disponible tras login [${wsUsuario}]`)
      return sendResponse(200, buildSdt([{ RespuestaCodigo: '54', RespuestaDescripcion: 'No se encontró el usuario !' }]))
    }

    const userRes = await db.pool.query(
      `SELECT TRIM(nuusuafili) AS nuusuafili
         FROM nuusuari
        WHERE TRIM(nuusuid) = $1
        LIMIT 1`,
      [String(guid).trim()]
    )

    if (!userRes.rows.length) {
      console.log(`ℹ️  WS_USUARIO_ACTIVO: GUID no encontrado en BD [${guid}]`)
      return sendResponse(200, buildSdt([{ RespuestaCodigo: '54', RespuestaDescripcion: 'No se encontró el usuario !' }]))
    }

    const nuusuafili = (userRes.rows[0].nuusuafili || '').trim()
    if (nuusuafili === idAfiliado.trim()) {
      console.log(`✅ WS_USUARIO_ACTIVO: válido y activo [guid=${guid}] [afili=${nuusuafili}]`)
      return sendResponse(200, ok())
    }

    console.log(`ℹ️  WS_USUARIO_ACTIVO: afiliado mismatch ` +
      `nuusuafili=[${nuusuafili}] idAfiliado=[${idAfiliado}]`)
    return sendResponse(200, buildSdt([{
      RespuestaCodigo:      '53',
      RespuestaDescripcion: 'El usuario no se encuentra asociado al Beneficiario !',
    }]))

  } catch (error) {
    console.error('❌ Error en WS_USUARIO_ACTIVO:', error)
    return sendResponse(500, err('099', `Error interno: ${error.message}`))
  }
})

/**
 * WS_VALIDAR_AFILIADO
 * POST /api/ws/WS_VALIDAR_AFILIADO
 *
 * Devuelve el estado del afiliado a partir de su NUUsuAfiliadoID (nuusuafili).
 * Replica la lógica GeneXus: busca en nuusuari por nuusuafili + bajafechaHora vacía,
 * luego verifica estado del usuario en GAM (IsActive, isDeleted, IsEnabledInRepository).
 *
 * SDT_WSEstadoAfiliado (request):
 *   NUUsuAfiliadoID (varchar 40) — nuusuafili del afiliado
 *
 * Response (mirror + EstadoAfiliado):
 *   NUUsuAfiliadoID (varchar 40) — mirror del request
 *   EstadoAfiliado  (char 1)
 *     "E" → Existente       (encontrado en BD + activo en GAM)
 *     "I" → Inexistente     (no encontrado, dado de baja, o inactivo en GAM)
 *     "D" → Inactivo        (definido en tipo; GAM: isDeleted o !IsEnabledInRepository)
 *     "H" → Habilitado      (definido en tipo; reservado)
 * Nota: parámetro vacío o inválido retorna HTTP 400 con EstadoAfiliado="I"
 */
app.get('/api/ws/WS_VALIDAR_AFILIADO', (req, res) => {
  const accept = req.get('Accept') || ''
  const fmt = (accept.includes('yaml') || accept.includes('x-yaml')) ? 'yaml' : 'json'
  const payload = {
    error: 'METHOD_NOT_ALLOWED',
    message: 'Este endpoint requiere POST. Usar POST /api/ws/WS_VALIDAR_AFILIADO',
    allowed: ['POST'],
  }
  res.set('Allow', 'POST')
  if (fmt === 'yaml') return res.status(405).set('Content-Type', 'application/yaml').send(yaml.dump(payload))
  return res.status(405).json(payload)
})

app.post('/api/ws/WS_VALIDAR_AFILIADO', requireAuth, async (req, res) => {
  const accept = req.get('Accept') || ''
  const fmt = (accept.includes('yaml') || accept.includes('x-yaml')) ? 'yaml' : 'json'

  const sendResp = (status, data) => {
    if (fmt === 'yaml') return res.status(status).set('Content-Type', 'application/yaml').send(yaml.dump(data))
    return res.status(status).json(data)
  }

  const safeStr = (v) => (v === null || v === undefined) ? '' : String(v)
  const trimStr = (v) => safeStr(v).trim()
  const getField = (obj, name) => {
    if (!obj || typeof obj !== 'object') return undefined
    const key = Object.keys(obj).find(k => k.toLowerCase() === name.toLowerCase())
    return key ? obj[key] : undefined
  }

  const input          = req.body || {}
  const nuUsuAfiliadoId = trimStr(getField(input, 'NUUsuAfiliadoID'))

  const buildSdt = (estado) => ({
    NUUsuAfiliadoID: nuUsuAfiliadoId,
    EstadoAfiliado:  safeStr(estado).slice(0, 1),
  })

  // ===== VALIDACIONES =====
  if (!nuUsuAfiliadoId)            return sendResp(400, buildSdt('I'))
  if (nuUsuAfiliadoId.length > 40) return sendResp(400, buildSdt('I'))

  // Default: Inexistente (igual que GeneXus: EstadoAfiliado = d_NUEstadoAfiliado.Inexistente)
  try {
    // 1) Buscar en nuusuari por nuusuafili con bajafechahora vacía
    //    Replica: For Each Where NUUsuAfiliadoID = ? Where NUUsuBajaFechaHora.IsEmpty()
    const userRes = await db.pool.query(
      `SELECT nuusuid
         FROM nuusuari
        WHERE TRIM(nuusuafili) = TRIM($1)
          AND (nuusubajaf IS NULL OR nuusubajaf::text = '' OR EXTRACT(YEAR FROM nuusubajaf) <= 1)
        LIMIT 1`,
      [nuUsuAfiliadoId]
    )

    if (!userRes.rows.length) {
      console.log(`ℹ️  WS_VALIDAR_AFILIADO: nuusuafili no encontrado o baja [${nuUsuAfiliadoId}]`)
      return sendResp(200, buildSdt('I'))
    }

    const guid = (userRes.rows[0].nuusuid || '').trim()

    // 2) Sub 'Estado': GAMUser.Load(GUID) → verificar IsActive AND !isDeleted AND IsEnabledInRepository
    const gamState = await gamService.getGAMUserStateByGUID(guid)

    if (gamState.available) {
      // GAM respondió: verificar los 3 flags
      const activo = gamState.isActive === true &&
                     gamState.isDeleted === false &&
                     gamState.isEnabledInRepository === true
      if (activo) {
        console.log(`✅ WS_VALIDAR_AFILIADO: existente y activo en GAM [${nuUsuAfiliadoId}] guid=${guid}`)
        return sendResp(200, buildSdt('E'))
      }
      // GAM dice inactivo/bloqueado
      console.log(`ℹ️  WS_VALIDAR_AFILIADO: usuario inactivo en GAM [${guid}]`, gamState)
      return sendResp(200, buildSdt('I'))
    }

    // GAM no disponible: el usuario existe en BD sin baja → asumir Existente
    console.log(`⚠️  WS_VALIDAR_AFILIADO: GAM no disponible, fallback a BD [${nuUsuAfiliadoId}] guid=${guid}`)
    return sendResp(200, buildSdt('E'))

  } catch (error) {
    console.error('❌ Error en WS_VALIDAR_AFILIADO:', error)
    return sendResp(500, buildSdt('I'))
  }
})

/**
 * WS_TOKEN_TELECONSULTA
 * POST /api/ws/WS_TOKEN_TELECONSULTA
 *
 * Genera un token de 6 caracteres para teleconsulta asociado a un NroAfiliado.
 * El token se renueva automáticamente al vencer (timeout configurable en nusispar:
 *   CREDENCIAL.TimeoutTokenTeleconsulta — minutos, default 30).
 *
 * SDT_TokenTeleConsWS (request):
 *   NroAfiliado (varchar 20) — nroAfiliado / nroaf del usuario
 *
 * SDT_TokenTeleConsWS_RESP (response):
 *   token     (char 6)    — token alfanumérico de 6 caracteres (mayúsculas + dígitos)
 *   fechaHora (datetime)  — ISO 8601 de generación del token actual
 */

// Cache en memoria: key=NroAfiliado, value={token, generatedAt, expiresAt}
const _tokenTeleConsultaCache = new Map()

async function getTeleConsultaTimeoutMinutes() {
  try {
    const r = await db.pool.query(
      "SELECT nusisvalpa FROM nusispar WHERE UPPER(nusisgrupa)='CREDENCIAL' AND UPPER(nusistippa)='TIMEOUTTOKENTELE' LIMIT 1"
    )
    if (r.rows.length && r.rows[0].nusisvalpa) {
      const v = parseInt(r.rows[0].nusisvalpa, 10)
      if (Number.isFinite(v) && v > 0) return v
    }
  } catch (_) { /* usa default */ }
  return 30 // 30 minutos por defecto
}

function generateTeleConsultaToken() {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin 0,O,I,1 para evitar confusión visual
  let token = ''
  for (let i = 0; i < 6; i++) {
    token += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return token
}

app.get('/api/ws/WS_TOKEN_TELECONSULTA', (req, res) => {
  const accept = req.get('Accept') || ''
  const fmt = (accept.includes('yaml') || accept.includes('x-yaml')) ? 'yaml' : 'json'
  const payload = {
    error: 'METHOD_NOT_ALLOWED',
    message: 'Este endpoint requiere POST. Usar POST /api/ws/WS_TOKEN_TELECONSULTA',
    allowed: ['POST'],
  }
  res.set('Allow', 'POST')
  if (fmt === 'yaml') return res.status(405).set('Content-Type', 'application/yaml').send(yaml.dump(payload))
  return res.status(405).json(payload)
})

app.post('/api/ws/WS_TOKEN_TELECONSULTA', requireAuth, async (req, res) => {
  const accept = req.get('Accept') || ''
  const fmt = (accept.includes('yaml') || accept.includes('x-yaml')) ? 'yaml' : 'json'

  const sendResp = (status, data) => {
    if (fmt === 'yaml') return res.status(status).set('Content-Type', 'application/yaml').send(yaml.dump(data))
    return res.status(status).json(data)
  }

  const safeStr  = (v) => (v === null || v === undefined) ? '' : String(v)
  const trimStr  = (v) => safeStr(v).trim()
  const getField = (obj, name) => {
    if (!obj || typeof obj !== 'object') return undefined
    const key = Object.keys(obj).find(k => k.toLowerCase() === name.toLowerCase())
    return key ? obj[key] : undefined
  }

  const input      = req.body || {}
  const nroAfiliado = trimStr(getField(input, 'NroAfiliado'))

  const buildError = (msg) => ({ error: 'VALIDATION_ERROR', message: msg })

  // ===== VALIDACIONES =====
  if (!nroAfiliado)            return sendResp(400, buildError('NroAfiliado es requerido'))
  if (nroAfiliado.length > 20) return sendResp(400, buildError('NroAfiliado no puede exceder 20 caracteres'))

  try {
    // 1) Verificar que el NroAfiliado existe en la BD (crcreden.crcrenroaf)
    const credRes = await db.pool.query(
      'SELECT crcreid FROM crcreden WHERE TRIM(crcrenroaf) = TRIM($1) LIMIT 1',
      [nroAfiliado]
    )

    if (!credRes.rows.length) {
      console.log(`ℹ️  WS_TOKEN_TELECONSULTA: NroAfiliado no encontrado [${nroAfiliado}]`)
      return sendResp(404, buildError(`NroAfiliado no encontrado: ${nroAfiliado}`))
    }

    // 2) Obtener timeout configurado
    const timeoutMinutes = await getTeleConsultaTimeoutMinutes()
    const now = new Date()

    // 3) Reutilizar token vigente si existe
    const cached = _tokenTeleConsultaCache.get(nroAfiliado)
    if (cached && cached.expiresAt > now) {
      console.log(`♻️  WS_TOKEN_TELECONSULTA: token vigente reutilizado [${nroAfiliado}] expira=${cached.expiresAt.toISOString()}`)
      return sendResp(200, {
        token:     cached.token,
        fechaHora: cached.generatedAt.toISOString(),
      })
    }

    // 4) Generar nuevo token
    const token       = generateTeleConsultaToken()
    const generatedAt = new Date()
    const expiresAt   = new Date(generatedAt.getTime() + timeoutMinutes * 60 * 1000)

    _tokenTeleConsultaCache.set(nroAfiliado, { token, generatedAt, expiresAt })

    console.log(`✅ WS_TOKEN_TELECONSULTA: token generado [${nroAfiliado}] token=${token} expira=${expiresAt.toISOString()}`)

    return sendResp(200, {
      token:     token,
      fechaHora: generatedAt.toISOString(),
    })

  } catch (error) {
    console.error('❌ Error en WS_TOKEN_TELECONSULTA:', error)
    return sendResp(500, { error: 'INTERNAL_ERROR', message: error.message })
  }
})

// ============================================================================
// WS_AUTORIZACION
// POST /api/ws/WS_AUTORIZACION
//
// Callback de GeneXus/SIA: recibe el resultado de una solicitud de autorización
// y actualiza/persiste los campos en sia_autorizaciones.
//
// Replica lógica GeneXus:
//   &AUSolAutorizacion.Load(AUSolicID)  → busca por AUSolIdExt
//   Si encontrado: actualiza campos con las reglas de AUSolAutNumero
//   Si NO encontrado: persiste de todas formas (extensión Node.js)
//
// Regla AUSolAutNumero (GeneXus):
//   Solo se calcula cuando estado ≠ CON y (estado = AUT o AUD) y AUSolAutNumero no vacío:
//     AUSolAutDCodigo.PadLeft(5,'0') + "-" + AUSolAutNumero.PadLeft(12,'0')
//   En cualquier otro caso NO se modifica el valor existente.
//   OJO: el SetEmpty() está comentado en GeneXus para no borrar el nro.
//
// d_AUSolEstado (enum):
//   ENV = Enviado | AUD = Auditoria | AUT = Autorizado
//   REC = Rechazado | PEN = Pendiente | CON = Consumido
//
// SDT entrada: SDT_AUSolic_WS (17 campos)
// SDT salida : Messages Collection { Id, Type (MessageTypes), Description }
// ============================================================================

app.get('/api/ws/WS_AUTORIZACION', (req, res) => {
  const accept = req.headers.accept || ''
  const fmt    = (accept.includes('yaml') || accept.includes('x-yaml')) ? 'yaml' : 'json'
  const body   = {
    error:   'METHOD_NOT_ALLOWED',
    message: 'Este endpoint requiere POST. Usar POST /api/ws/WS_AUTORIZACION',
    allowed: ['POST']
  }
  res.status(405).set('Allow', 'POST')
  if (fmt === 'yaml') return res.set('Content-Type', 'application/yaml').send(yaml.dump(body))
  return res.json(body)
})

app.post('/api/ws/WS_AUTORIZACION', requireAuth, async (req, res) => {
  const accept = req.headers.accept || ''
  const fmt    = (accept.includes('yaml') || accept.includes('x-yaml')) ? 'yaml' : 'json'

  function sendResp (status, body) {
    if (fmt === 'yaml') return res.status(status).set('Content-Type', 'application/yaml').send(yaml.dump(body))
    return res.status(status).json(body)
  }
  function makeMessages (id, type, description) {
    return { Messages: [{ Id: String(id), Type: type, Description: description }] }
  }

  try {
    const {
      AUSolIdExt,
      AUSolEstado,
      AUSolAutDCodigo,
      AUSolAutNumero,
      AUSolAutCodGra,
      AUSolAutMar,
      AUSolAudMar,
      AUSolAutEstado,
      AUSolFecVto,
      AUSolRechazoDef,
      AUSolAutNroAfiliado,
      AUSolAutNomAfi,
      AUSolAutProv,
      AUSolAutRazPro,
      AUSolAutSuc,
      AUSolEntidadId,
      AUSolTexto
    } = req.body || {}

    // --- Validaciones de longitud y formato ---
    const errors = []

    if (!AUSolIdExt || String(AUSolIdExt).trim() === '') {
      errors.push({ Id: 'VAL_001', Type: 'ERROR', Description: 'AUSolIdExt es requerido' })
    } else if (String(AUSolIdExt).length > 40) {
      errors.push({ Id: 'VAL_002', Type: 'ERROR', Description: 'AUSolIdExt supera 40 caracteres' })
    }

    if (AUSolEstado         && String(AUSolEstado).length        > 3)  errors.push({ Id: 'VAL_003', Type: 'ERROR', Description: 'AUSolEstado supera 3 caracteres' })
    if (AUSolAutMar         && String(AUSolAutMar).length        > 3)  errors.push({ Id: 'VAL_004', Type: 'ERROR', Description: 'AUSolAutMar supera 3 caracteres' })
    if (AUSolAudMar         && String(AUSolAudMar).length        > 3)  errors.push({ Id: 'VAL_005', Type: 'ERROR', Description: 'AUSolAudMar supera 3 caracteres' })
    if (AUSolAutEstado      && String(AUSolAutEstado).length      > 20) errors.push({ Id: 'VAL_006', Type: 'ERROR', Description: 'AUSolAutEstado supera 20 caracteres' })
    if (AUSolAutNroAfiliado && String(AUSolAutNroAfiliado).length > 20) errors.push({ Id: 'VAL_007', Type: 'ERROR', Description: 'AUSolAutNroAfiliado supera 20 caracteres' })
    if (AUSolAutNomAfi      && String(AUSolAutNomAfi).length      > 50) errors.push({ Id: 'VAL_008', Type: 'ERROR', Description: 'AUSolAutNomAfi supera 50 caracteres' })
    if (AUSolAutRazPro      && String(AUSolAutRazPro).length      > 35) errors.push({ Id: 'VAL_009', Type: 'ERROR', Description: 'AUSolAutRazPro supera 35 caracteres' })
    if (AUSolEntidadId      && String(AUSolEntidadId).length      > 30) errors.push({ Id: 'VAL_010', Type: 'ERROR', Description: 'AUSolEntidadId supera 30 caracteres' })

    if (AUSolRechazoDef != null && AUSolRechazoDef !== '') {
      if (!['S','N'].includes(String(AUSolRechazoDef).trim().toUpperCase())) {
        errors.push({ Id: 'VAL_011', Type: 'ERROR', Description: 'AUSolRechazoDef debe ser S o N' })
      }
    }

    // Validaciones numéricas
    const numChecks = [
      { field: 'AUSolAutDCodigo', val: AUSolAutDCodigo, max: 99999,        id: 'VAL_012' },
      { field: 'AUSolAutNumero',  val: AUSolAutNumero,  max: 999999999999, id: 'VAL_013' },
      { field: 'AUSolAutCodGra',  val: AUSolAutCodGra,  max: 99,           id: 'VAL_014' },
      { field: 'AUSolAutProv',    val: AUSolAutProv,    max: 999999,       id: 'VAL_015' },
      { field: 'AUSolAutSuc',     val: AUSolAutSuc,     max: 9999,         id: 'VAL_016' }
    ]
    for (const { field, val, max, id } of numChecks) {
      if (val != null && val !== '') {
        const n = Number(val)
        if (isNaN(n) || n < 0 || n > max) {
          errors.push({ Id: id, Type: 'ERROR', Description: `${field} debe ser numerico entre 0 y ${max}` })
        }
      }
    }

    if (errors.length > 0) {
      console.log(`⚠️  WS_AUTORIZACION: ${errors.length} errores de validacion para AUSolIdExt=[${AUSolIdExt}]`)
      return sendResp(400, { Messages: errors })
    }

    // --- Normalización ---
    const idExt      = String(AUSolIdExt).trim()
    const estado     = AUSolEstado ? String(AUSolEstado).trim() : ''
    const rechazoDef = AUSolRechazoDef ? String(AUSolRechazoDef).trim().toUpperCase() : null
    const fecVto     = AUSolFecVto     ? String(AUSolFecVto)    : null
    const toNum      = v => (v != null && v !== '') ? Number(v) : null

    // --- Regla AUSolAutNumero (replica GeneXus) ---
    // Solo se formatea cuando: estado ≠ CON AND (AUT o AUD) AND AUSolAutNumero no vacío
    // Formato: AUSolAutDCodigo.PadLeft(5,'0') + "-" + AUSolAutNumero.PadLeft(12,'0')
    // En cualquier otro caso el campo existente NO se modifica (SetEmpty comentado en GX)
    const autNumRaw  = (AUSolAutNumero  != null && AUSolAutNumero  !== '') ? String(AUSolAutNumero).trim()  : ''
    const dcodigoRaw = (AUSolAutDCodigo != null && AUSolAutDCodigo !== '') ? String(AUSolAutDCodigo).trim() : ''
    const shouldFormatAutNumero = (
      estado !== 'CON' &&
      (estado === 'AUT' || estado === 'AUD') &&
      autNumRaw !== ''
    )
    const formattedAutNumero = shouldFormatAutNumero
      ? dcodigoRaw.padStart(5, '0') + '-' + autNumRaw.padStart(12, '0')
      : null
    // Para INSERT: si hay formato usar ese, si no guardar el valor raw
    const autNumeroParaInsert = formattedAutNumero ?? (autNumRaw !== '' ? autNumRaw : null)

    // --- Persistencia en sia_autorizaciones (UPSERT por AUSolIdExt) ---
    // AUSolEntID      ← AUSolEntidadId  (alias GeneXus: AUSolEntID)
    // AUSolEntNombre  ← AUSolAutRazPro  (alias GeneXus: AUSolEntNombre)
    // AUSolFecVenc    ← AUSolFecVto     (alias GeneXus: AUSolFecVencimiento)
    let persisted = false
    try {
      await db.pool.query(`
        INSERT INTO sia_autorizaciones (
          ausol_id_ext, ausol_estado, ausol_aut_d_codigo,
          ausol_aut_numero, ausol_aut_cod_gra, ausol_aut_mar,
          ausol_aud_mar, ausol_aut_estado, ausol_fec_vto,
          ausol_rechazo_def, ausol_aut_nro_afiliado, ausol_aut_nom_afi,
          ausol_aut_prov, ausol_aut_raz_pro, ausol_aut_suc,
          ausol_entidad_id, ausol_texto, recibido_en
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,
          $9::date,$10,$11,$12,$13,$14,$15,$16,$17,NOW()
        )
        ON CONFLICT (ausol_id_ext) DO UPDATE SET
          ausol_estado           = EXCLUDED.ausol_estado,
          ausol_aut_d_codigo     = EXCLUDED.ausol_aut_d_codigo,
          ausol_aut_numero       = CASE
                                     WHEN $18 THEN $19
                                     ELSE sia_autorizaciones.ausol_aut_numero
                                   END,
          ausol_aut_cod_gra      = EXCLUDED.ausol_aut_cod_gra,
          ausol_aut_mar          = EXCLUDED.ausol_aut_mar,
          ausol_aud_mar          = EXCLUDED.ausol_aud_mar,
          ausol_aut_estado       = EXCLUDED.ausol_aut_estado,
          ausol_fec_vto          = EXCLUDED.ausol_fec_vto,
          ausol_rechazo_def      = EXCLUDED.ausol_rechazo_def,
          ausol_aut_nro_afiliado = EXCLUDED.ausol_aut_nro_afiliado,
          ausol_aut_nom_afi      = EXCLUDED.ausol_aut_nom_afi,
          ausol_aut_prov         = EXCLUDED.ausol_aut_prov,
          ausol_aut_raz_pro      = EXCLUDED.ausol_aut_raz_pro,
          ausol_aut_suc          = EXCLUDED.ausol_aut_suc,
          ausol_entidad_id       = EXCLUDED.ausol_entidad_id,
          ausol_texto            = EXCLUDED.ausol_texto,
          recibido_en            = NOW()
      `, [
        idExt,                                           // $1
        estado     || null,                              // $2  AUSolEstado
        toNum(AUSolAutDCodigo),                          // $3
        autNumeroParaInsert,                             // $4  AUSolAutNumero (INSERT)
        toNum(AUSolAutCodGra),                           // $5
        AUSolAutMar    || null,                          // $6
        AUSolAudMar    || null,                          // $7
        AUSolAutEstado || null,                          // $8
        fecVto,                                         // $9  AUSolFecVencimiento
        rechazoDef,                                     // $10 AUSolRechDefinitivo (S/N)
        AUSolAutNroAfiliado ? String(AUSolAutNroAfiliado).trim() : null, // $11
        AUSolAutNomAfi      ? String(AUSolAutNomAfi).trim()      : null, // $12
        toNum(AUSolAutProv),                             // $13
        AUSolAutRazPro || null,                          // $14 AUSolEntNombre
        toNum(AUSolAutSuc),                              // $15
        AUSolEntidadId || null,                          // $16 AUSolEntID
        AUSolTexto     || null,                          // $17
        shouldFormatAutNumero,                           // $18 CASE flag para UPDATE
        formattedAutNumero                               // $19 valor formateado para UPDATE
      ])
      persisted = true
      const autLog = shouldFormatAutNumero ? ` autNumero=${formattedAutNumero}` : ''
      console.log(`✅ WS_AUTORIZACION: persistida [${idExt}] estado=${estado || '-'} rechazoDef=${rechazoDef || '-'}${autLog}`)
    } catch (dbErr) {
      if (dbErr.code === '42P01') {
        // Tabla no existe aún — callback siempre debe responder OK
        console.warn(`⚠️  WS_AUTORIZACION: tabla sia_autorizaciones no existe. Ejecutar db/create_sia_autorizaciones.sql`)
      } else {
        console.error('⚠️  WS_AUTORIZACION: error DB (no fatal):', dbErr.message)
      }
    }

    const desc = persisted
      ? `Autorizacion ${idExt} recibida y registrada correctamente`
      : `Autorizacion ${idExt} recibida (persistencia omitida, verificar tabla sia_autorizaciones)`

    return sendResp(200, makeMessages('WS_AUTORIZACION_OK', 'SUCCESS', desc))

  } catch (error) {
    console.error('❌ Error en WS_AUTORIZACION:', error)
    return sendResp(500, makeMessages('WS_AUTORIZACION_ERR', 'ERROR', `Error interno: ${error.message}`))
  }
})

// ============================================================================
// NOTICIAS / NOVEDADES — administradas desde el panel y consumidas por la app
// ============================================================================

// Endpoint público: lista noticias activas y vigentes para la app mobile
app.get('/noticias', async (req, res) => {
  try {
    const now = new Date().toISOString()
    const result = await db.pool.query(`
      SELECT id, titulo, contenido, imagen_url, tipo, orden, fecha_inicio, fecha_fin, created_at
      FROM app_noticias
      WHERE activa = TRUE
        AND (fecha_inicio IS NULL OR fecha_inicio <= $1)
        AND (fecha_fin   IS NULL OR fecha_fin   >= $1)
      ORDER BY orden ASC, created_at DESC
    `, [now])
    res.json({ success: true, noticias: result.rows })
  } catch (err) {
    console.error('❌ GET /noticias:', err.message)
    res.status(500).json({ success: false, error: 'Error obteniendo noticias' })
  }
})

// Admin: listar todas (incluso inactivas)
app.get('/admin/noticias', requireAuth, requireAdmin, requirePermission('salud'), async (req, res) => {
  try {
    const result = await db.pool.query(
      `SELECT * FROM app_noticias ORDER BY orden ASC, created_at DESC`
    )
    res.json({ success: true, noticias: result.rows })
  } catch (err) {
    console.error('❌ GET /admin/noticias:', err.message)
    res.status(500).json({ success: false, error: 'Error obteniendo noticias' })
  }
})

// Admin: crear noticia (con imagen opcional)
app.post('/admin/noticias', requireAuth, requireAdmin, requirePermission('salud'), uploadNoticias.single('imagen'), validateBody(AdminNoticiaCreateBodySchema), async (req, res) => {
  try {
    const { titulo, contenido, tipo, activa, orden, fecha_inicio, fecha_fin } = req.body

    let imagen_url = null
    if (req.file) {
      imagen_url = `/uploads/noticias/${req.file.filename}`
    }

    const tipoFinal = imagen_url && !contenido ? 'imagen'
                    : imagen_url && contenido   ? 'mixta'
                    : 'texto'

    const result = await db.pool.query(`
      INSERT INTO app_noticias (titulo, contenido, imagen_url, tipo, activa, orden, fecha_inicio, fecha_fin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      titulo.trim(),
      contenido ? contenido.trim() : null,
      imagen_url,
      tipo || tipoFinal,
      activa !== 'false' && activa !== false,
      parseInt(orden || 0),
      fecha_inicio || null,
      fecha_fin || null,
    ])

    res.json({ success: true, noticia: result.rows[0] })
  } catch (err) {
    console.error('❌ POST /admin/noticias:', err.message)
    res.status(500).json({ success: false, error: 'Error creando noticia' })
  }
})

// Admin: actualizar noticia (imagen opcional — si se sube, reemplaza la anterior)
app.put('/admin/noticias/:id', requireAuth, requireAdmin, requirePermission('salud'), validateParams(AdminNoticiaIdParamsSchema), uploadNoticias.single('imagen'), validateBody(AdminNoticiaUpdateBodySchema), async (req, res) => {
  try {
    const { id } = req.params
    const { titulo, contenido, tipo, activa, orden, fecha_inicio, fecha_fin, eliminar_imagen } = req.body

    const existing = await db.pool.query('SELECT * FROM app_noticias WHERE id = $1', [id])
    if (!existing.rows.length) return res.status(404).json({ success: false, error: 'Noticia no encontrada' })
    const prev = existing.rows[0]

    let imagen_url = prev.imagen_url
    if (req.file) {
      imagen_url = `/uploads/noticias/${req.file.filename}`
    } else if (eliminar_imagen === 'true' || eliminar_imagen === true) {
      imagen_url = null
    }

    const tipoFinal = imagen_url && !contenido ? 'imagen'
                    : imagen_url && contenido   ? 'mixta'
                    : 'texto'

    const result = await db.pool.query(`
      UPDATE app_noticias SET
        titulo       = $1,
        contenido    = $2,
        imagen_url   = $3,
        tipo         = $4,
        activa       = $5,
        orden        = $6,
        fecha_inicio = $7,
        fecha_fin    = $8,
        updated_at   = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      (titulo || prev.titulo).trim(),
      contenido !== undefined ? (contenido ? contenido.trim() : null) : prev.contenido,
      imagen_url,
      tipo || tipoFinal,
      activa !== undefined ? (activa !== 'false' && activa !== false) : prev.activa,
      parseInt(orden !== undefined ? orden : prev.orden),
      fecha_inicio !== undefined ? (fecha_inicio || null) : prev.fecha_inicio,
      fecha_fin    !== undefined ? (fecha_fin    || null) : prev.fecha_fin,
      id,
    ])

    res.json({ success: true, noticia: result.rows[0] })
  } catch (err) {
    console.error('❌ PUT /admin/noticias/:id:', err.message)
    res.status(500).json({ success: false, error: 'Error actualizando noticia' })
  }
})

// Admin: eliminar noticia
app.delete('/admin/noticias/:id', requireAuth, requireAdmin, requirePermission('salud'), async (req, res) => {
  try {
    const { id } = req.params
    const result = await db.pool.query('DELETE FROM app_noticias WHERE id = $1 RETURNING id', [id])
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Noticia no encontrada' })
    res.json({ success: true, id: result.rows[0].id })
  } catch (err) {
    console.error('❌ DELETE /admin/noticias/:id:', err.message)
    res.status(500).json({ success: false, error: 'Error eliminando noticia' })
  }
})

// Admin: toggle activa/inactiva rápido
app.patch('/admin/noticias/:id/toggle', requireAuth, requireAdmin, validateParams(AdminNoticiaIdParamsSchema), async (req, res) => {
  try {
    const { id } = req.params
    const result = await db.pool.query(
      `UPDATE app_noticias SET activa = NOT activa, updated_at = NOW() WHERE id = $1 RETURNING id, activa`,
      [id]
    )
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Noticia no encontrada' })
    res.json({ success: true, id: result.rows[0].id, activa: result.rows[0].activa })
  } catch (err) {
    console.error('❌ PATCH /admin/noticias/:id/toggle:', err.message)
    res.status(500).json({ success: false, error: 'Error actualizando noticia' })
  }
})

// ============================================================================
// FIN NOTICIAS
// ============================================================================

// ============================================================================
// UI admin para historial de atención (desconocimientos + calificaciones)
app.get('/admin/historial-atencion-ui', requireAuth, requireAdmin, requirePermission('sia'), (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  res.set('Surrogate-Control', 'no-store')
  res.sendFile(path.join(__dirname, 'public', 'admin-historial-atencion.html'))
})

// PLANES — Imágenes de credencial por plan
// ============================================================================

// UI admin para planes
app.get('/admin/planes-ui', requireAuth, requireAdmin, requirePermission('credenciales'), (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  res.set('Surrogate-Control', 'no-store')
  res.sendFile(path.join(__dirname, 'public', 'admin-planes.html'))
})

// GET /planes — público, devuelve planes con imagen_url
app.get('/planes', async (req, res) => {
  try {
    const result = await db.pool.query(
      `SELECT TRIM(nuplaid) AS id,
              TRIM(COALESCE(nupladescr,'')) AS descripcion,
              nuplim_gxi AS imagen_url
       FROM nuplan
       ORDER BY TRIM(nuplaid)`
    )
    res.json({ success: true, planes: result.rows })
  } catch (err) {
    console.error('❌ GET /planes:', err.message)
    res.status(500).json({ success: false, error: 'Error obteniendo planes' })
  }
})

// GET /admin/planes — admin, igual pero con más detalle
app.get('/admin/planes', requireAuth, requireAdmin, requirePermission('credenciales'), async (req, res) => {
  try {
    const result = await db.pool.query(
      `SELECT TRIM(nuplaid) AS id,
              TRIM(COALESCE(nupladescr,'')) AS descripcion,
              nuplim_gxi AS imagen_url,
              nuplimfech AS fecha_img
       FROM nuplan
       ORDER BY TRIM(nuplaid)`
    )
    res.json({ success: true, planes: result.rows })
  } catch (err) {
    console.error('❌ GET /admin/planes:', err.message)
    res.status(500).json({ success: false, error: 'Error obteniendo planes' })
  }
})

// GET /admin/credenciales-layout - Obtener layout general o efectivo por plan
app.get('/admin/credenciales-layout', requireAuth, requireAdmin, async (req, res) => {
  try {
    const scope = String(req.query.scope || 'GENERAL').toUpperCase()
    const planId = String(req.query.planId || '').trim()

    if (!['GENERAL', 'PLAN'].includes(scope)) {
      return sendLegacyValidationError(res, 'scope inválido. Use GENERAL o PLAN', 'scope')
    }
    if (scope === 'PLAN' && !planId) {
      return sendLegacyValidationError(res, 'planId es requerido para scope PLAN', 'planId')
    }

    const layout = await getCredencialLayoutForPlan(scope === 'PLAN' ? planId : '')
    const planes = await db.pool.query(
      `SELECT TRIM(nuplaid) AS id,
              TRIM(COALESCE(nupladescr,'')) AS descripcion,
              nuplim_gxi AS imagen_url,
              nuplimfech AS fecha_img
         FROM nuplan
        ORDER BY TRIM(nuplaid)`
    )

    res.json({
      success: true,
      scope,
      planId: scope === 'PLAN' ? planId : null,
      source: scope === 'PLAN' ? layout.source : 'GENERAL',
      config: scope === 'PLAN' ? layout.effectiveConfig : layout.generalConfig,
      generalConfig: layout.generalConfig,
      planes: planes.rows,
    })
  } catch (err) {
    console.error('❌ GET /admin/credenciales-layout:', err.message)
    res.status(500).json({ success: false, error: 'Error obteniendo layout de credencial' })
  }
})

// PUT /admin/credenciales-layout/general - Guardar layout general
app.put('/admin/credenciales-layout/general', requireAuth, requireAdmin, validateBody(AdminCredencialLayoutGeneralBodySchema), async (req, res) => {
  try {
    const normalized = normalizeCredencialLayoutConfig(req.body?.config)
    await ensureCredencialLayoutTable()

    const actor = String(req.session?.email || req.session?.username || '').trim() || null

    await db.pool.query(
      `INSERT INTO app_credencial_layout (scope_type, plan_id, config_json, updated_by, updated_at)
       VALUES ('GENERAL', NULL, $1::jsonb, $2, NOW())
       ON CONFLICT (scope_type, plan_id)
       DO UPDATE SET config_json = EXCLUDED.config_json, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [JSON.stringify(normalized), actor]
    )

    await writeAdminAuditLog({
      req,
      entity: 'credencial_layout',
      action: 'UPDATE_GENERAL',
      summary: 'Actualización de layout general de credencial',
      after: normalized,
    })

    res.json({ success: true, scope: 'GENERAL', config: normalized })
  } catch (err) {
    console.error('❌ PUT /admin/credenciales-layout/general:', err.message)
    res.status(500).json({ success: false, error: 'Error guardando layout general' })
  }
})

// PUT /admin/credenciales-layout/plan/:id - Guardar override de layout por plan
app.put('/admin/credenciales-layout/plan/:id', requireAuth, requireAdmin, validateParams(AdminPlanIdParamsSchema), validateBody(AdminCredencialLayoutPlanBodySchema), async (req, res) => {
  try {
    const planId = String(req.params.id || '').trim()
    if (!planId) return sendLegacyValidationError(res, 'ID de plan requerido', 'id')

    const planExists = await db.pool.query('SELECT 1 FROM nuplan WHERE TRIM(nuplaid) = TRIM($1) LIMIT 1', [planId])
    if (!planExists.rows.length) {
      return res.status(404).json({ success: false, error: `Plan ${planId} no encontrado` })
    }

    const normalized = normalizeCredencialLayoutConfig(req.body?.config)
    await ensureCredencialLayoutTable()
    const actor = String(req.session?.email || req.session?.username || '').trim() || null

    await db.pool.query(
      `INSERT INTO app_credencial_layout (scope_type, plan_id, config_json, updated_by, updated_at)
       VALUES ('PLAN', $1, $2::jsonb, $3, NOW())
       ON CONFLICT (scope_type, plan_id)
       DO UPDATE SET config_json = EXCLUDED.config_json, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [planId, JSON.stringify(normalized), actor]
    )

    await writeAdminAuditLog({
      req,
      entity: 'credencial_layout',
      action: 'UPDATE_PLAN',
      entityId: planId,
      summary: `Actualización de layout de credencial para plan ${planId}`,
      after: normalized,
    })

    res.json({ success: true, scope: 'PLAN', planId, config: normalized })
  } catch (err) {
    console.error('❌ PUT /admin/credenciales-layout/plan/:id:', err.message)
    res.status(500).json({ success: false, error: 'Error guardando layout por plan' })
  }
})

// DELETE /admin/credenciales-layout/plan/:id - Eliminar override y volver a general
app.delete('/admin/credenciales-layout/plan/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const planId = String(req.params.id || '').trim()
    if (!planId) return sendLegacyValidationError(res, 'ID de plan requerido', 'id')

    await ensureCredencialLayoutTable()
    await db.pool.query(
      `DELETE FROM app_credencial_layout WHERE scope_type = 'PLAN' AND TRIM(COALESCE(plan_id, '')) = TRIM($1)`,
      [planId]
    )

    await writeAdminAuditLog({
      req,
      entity: 'credencial_layout',
      action: 'DELETE_PLAN_OVERRIDE',
      entityId: planId,
      summary: `Se eliminó override de layout para plan ${planId}`,
    })

    res.json({ success: true, planId })
  } catch (err) {
    console.error('❌ DELETE /admin/credenciales-layout/plan/:id:', err.message)
    res.status(500).json({ success: false, error: 'Error eliminando override de plan' })
  }
})

// PUT /admin/planes/:id/imagen — subir imagen para un plan
app.put('/admin/planes/:id/imagen', requireAuth, requireAdmin, requirePermission('credenciales'), validateParams(AdminPlanIdParamsSchema), (req, res, next) => {
  uploadPlanes.single('imagen')(req, res, (err) => {
    if (err) return sendLegacyValidationError(res, err.message, 'imagen')
    next()
  })
}, validateBody(AdminPlanImagenBodySchema), async (req, res) => {
  const planId = (req.params.id || '').trim()
  if (!planId) return sendLegacyValidationError(res, 'ID de plan requerido', 'id')

  try {
    let imagenUrl = null

    if (req.file) {
      // Imagen subida como archivo
      imagenUrl = `/uploads/planes/${req.file.filename}`
    } else if (req.body.imagen_url) {
      // URL externa provista en el body
      imagenUrl = req.body.imagen_url.trim()
    } else {
      return sendLegacyValidationError(res, 'Se requiere imagen (archivo o URL)', 'imagen_url')
    }

    const result = await db.pool.query(
      `UPDATE nuplan SET nuplim_gxi = $1, nuplimfech = NOW()
       WHERE TRIM(nuplaid) = TRIM($2)
       RETURNING TRIM(nuplaid) AS id, nuplim_gxi AS imagen_url`,
      [imagenUrl, planId]
    )

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: `Plan "${planId}" no encontrado` })
    }

    res.json({ success: true, plan: result.rows[0] })
  } catch (err) {
    console.error('❌ PUT /admin/planes/:id/imagen:', err.message)
    res.status(500).json({ success: false, error: 'Error actualizando imagen del plan' })
  }
})

// DELETE /admin/planes/:id/imagen — quitar imagen de un plan
app.delete('/admin/planes/:id/imagen', requireAuth, requireAdmin, requirePermission('credenciales'), async (req, res) => {
  const planId = (req.params.id || '').trim()
  if (!planId) return sendLegacyValidationError(res, 'ID de plan requerido', 'id')

  try {
    // Recuperar URL actual para borrar el archivo físico
    const current = await db.pool.query(
      `SELECT nuplim_gxi FROM nuplan WHERE TRIM(nuplaid) = TRIM($1)`, [planId]
    )
    if (!current.rows.length) return res.status(404).json({ success: false, error: 'Plan no encontrado' })

    const oldUrl = current.rows[0].nuplim_gxi
    if (oldUrl && oldUrl.startsWith('/uploads/planes/')) {
      const filePath = getUploadAbsolutePathFromUrl(oldUrl)
      if (filePath) {
        require('fs').unlink(filePath, () => {}) // ignora si el archivo no existe
      }
    }

    await db.pool.query(
      `UPDATE nuplan SET nuplim_gxi = NULL, nuplimfech = NOW() WHERE TRIM(nuplaid) = TRIM($1)`,
      [planId]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('❌ DELETE /admin/planes/:id/imagen:', err.message)
    res.status(500).json({ success: false, error: 'Error eliminando imagen del plan' })
  }
})

// ============================================================================
// FIN PLANES
// ============================================================================

// ============================================================================
// DESCONOCIMIENTO DE PRÁCTICAS
// ============================================================================

// POST /desconocimientos — Registrar desconocimiento de una práctica
app.post('/desconocimientos', requireAuth, async (req, res) => {
  const { nuusuid } = req.session || {}
  if (!nuusuid) return res.status(401).json({ success: false, error: 'No autenticado' })

  const {
    afiliado_id,
    atencion_id,
    nro_delegacion,
    nro_autorizacion,
    prestador_nombre,
    practica_detalle,
    motivo = 'no_reconozco',
    descripcion,
  } = req.body || {}

  if (!afiliado_id || !atencion_id) {
    return sendLegacyValidationError(res, 'afiliado_id y atencion_id son requeridos', 'afiliado_id')
  }

  const motivosValidos = ['no_reconozco', 'incorrecto', 'duplicado', 'otro']
  if (!motivosValidos.includes(motivo)) {
    return sendLegacyValidationError(res, `motivo inválido. Use: ${motivosValidos.join(', ')}`, 'motivo')
  }

  try {
    const result = await db.pool.query(
      `INSERT INTO app_desconocimientos
         (nuusuid, afiliado_id, atencion_id, nro_delegacion, nro_autorizacion,
          prestador_nombre, practica_detalle, motivo, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, estado, created_at`,
      [
        nuusuid, afiliado_id, atencion_id,
        nro_delegacion || null, nro_autorizacion || null,
        prestador_nombre || null,
        practica_detalle ? JSON.stringify(practica_detalle) : null,
        motivo, descripcion || null,
      ]
    )
    res.status(201).json({ success: true, desconocimiento: result.rows[0] })
  } catch (err) {
    console.error('❌ POST /desconocimientos:', err.message)
    res.status(500).json({ success: false, error: 'Error registrando desconocimiento' })
  }
})

// GET /desconocimientos — Listar desconocimientos del usuario autenticado
app.get('/desconocimientos', requireAuth, async (req, res) => {
  const { nuusuid } = req.session || {}
  if (!nuusuid) return res.status(401).json({ success: false, error: 'No autenticado' })

  try {
    const result = await db.pool.query(
      `SELECT id, afiliado_id, atencion_id, prestador_nombre, motivo, descripcion, estado, created_at
       FROM app_desconocimientos
       WHERE nuusuid = $1
       ORDER BY created_at DESC`,
      [nuusuid]
    )
    res.json({ success: true, desconocimientos: result.rows })
  } catch (err) {
    console.error('❌ GET /desconocimientos:', err.message)
    res.status(500).json({ success: false, error: 'Error obteniendo desconocimientos' })
  }
})

// ============================================================================
// FIN DESCONOCIMIENTO DE PRÁCTICAS
// ============================================================================

// ============================================================================
// CALIFICACIONES DE ATENCIÓN
// ============================================================================

// POST /calificaciones — Calificar una atención (1-5 estrellas)
app.post('/calificaciones', requireAuth, async (req, res) => {
  const { nuusuid } = req.session || {}
  if (!nuusuid) return res.status(401).json({ success: false, error: 'No autenticado' })

  const { afiliado_id, atencion_id, entidad_id, entidad_nombre, puntuacion, comentario } = req.body || {}

  if (!afiliado_id || !atencion_id) {
    return sendLegacyValidationError(res, 'afiliado_id y atencion_id son requeridos', 'afiliado_id')
  }

  const pts = parseInt(puntuacion, 10)
  if (isNaN(pts) || pts < 1 || pts > 5) {
    return sendLegacyValidationError(res, 'puntuacion debe ser un número entre 1 y 5', 'puntuacion')
  }

  try {
    const result = await db.pool.query(
      `INSERT INTO app_calificaciones
         (nuusuid, afiliado_id, atencion_id, entidad_id, entidad_nombre, puntuacion, comentario)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (nuusuid, atencion_id)
       DO UPDATE SET puntuacion=$6, comentario=$7, entidad_nombre=$5, updated_at=NOW()
       RETURNING id, puntuacion, created_at, updated_at`,
      [nuusuid, afiliado_id, atencion_id, entidad_id || null, entidad_nombre || null, pts, comentario || null]
    )
    res.status(201).json({ success: true, calificacion: result.rows[0] })
  } catch (err) {
    console.error('❌ POST /calificaciones:', err.message)
    res.status(500).json({ success: false, error: 'Error registrando calificación' })
  }
})

// GET /calificaciones — Listar calificaciones del usuario autenticado
app.get('/calificaciones', requireAuth, async (req, res) => {
  const { nuusuid } = req.session || {}
  if (!nuusuid) return res.status(401).json({ success: false, error: 'No autenticado' })

  try {
    const result = await db.pool.query(
      `SELECT id, afiliado_id, atencion_id, entidad_nombre, puntuacion, comentario, created_at
       FROM app_calificaciones
       WHERE nuusuid = $1
       ORDER BY created_at DESC`,
      [nuusuid]
    )
    res.json({ success: true, calificaciones: result.rows })
  } catch (err) {
    console.error('❌ GET /calificaciones:', err.message)
    res.status(500).json({ success: false, error: 'Error obteniendo calificaciones' })
  }
})

// GET /calificaciones/:atencionId — Obtener calificación específica
app.get('/calificaciones/:atencionId', requireAuth, async (req, res) => {
  const { nuusuid } = req.session || {}
  if (!nuusuid) return res.status(401).json({ success: false, error: 'No autenticado' })

  try {
    const result = await db.pool.query(
      `SELECT id, puntuacion, comentario, created_at
       FROM app_calificaciones
       WHERE nuusuid = $1 AND atencion_id = $2`,
      [nuusuid, req.params.atencionId]
    )
    res.json({ success: true, calificacion: result.rows[0] || null })
  } catch (err) {
    console.error('❌ GET /calificaciones/:id:', err.message)
    res.status(500).json({ success: false, error: 'Error obteniendo calificación' })
  }
})

// ============================================================================
// ADMIN — DESCONOCIMIENTOS / CALIFICACIONES
// ============================================================================

// GET /admin/desconocimientos — Listado admin con filtros
app.get('/admin/desconocimientos', requireAuth, requireAdmin, validateQuery(AdminDesconocimientosQuerySchema), async (req, res) => {
  try {
    const { estado, q, page, limit } = req.query
    const offset = (page - 1) * limit

    const where = []
    const params = []

    if (estado) {
      params.push(estado)
      where.push(`LOWER(d.estado) = $${params.length}`)
    }

    if (q) {
      params.push(`%${q}%`)
      where.push(`(
        LOWER(COALESCE(u.nuusumail, '')) LIKE $${params.length}
        OR LOWER(COALESCE(u.nuusuapell, '')) LIKE $${params.length}
        OR LOWER(COALESCE(d.afiliado_id, '')) LIKE $${params.length}
        OR LOWER(COALESCE(d.atencion_id, '')) LIKE $${params.length}
        OR LOWER(COALESCE(d.prestador_nombre, '')) LIKE $${params.length}
      )`)
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const totalParams = [...params]
    const totalResult = await db.pool.query(
      `SELECT COUNT(*)::int AS total
       FROM app_desconocimientos d
       LEFT JOIN nuusuari u ON u.nuusuid = d.nuusuid
       ${whereClause}`,
      totalParams
    )

    const dataParams = [...params, limit, offset]
    const rowsResult = await db.pool.query(
      `SELECT
         d.id,
         d.nuusuid,
         d.afiliado_id,
         d.atencion_id,
         d.nro_delegacion,
         d.nro_autorizacion,
         d.prestador_nombre,
         d.motivo,
         d.descripcion,
         d.estado,
         d.created_at,
         d.updated_at,
         u.nuusumail AS usuario_email,
         u.nuusuapell AS usuario_nombre
       FROM app_desconocimientos d
       LEFT JOIN nuusuari u ON u.nuusuid = d.nuusuid
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    )

    return res.json({
      success: true,
      items: rowsResult.rows,
      pagination: {
        page,
        limit,
        total: totalResult.rows[0]?.total || 0,
      },
    })
  } catch (error) {
    console.error('❌ GET /admin/desconocimientos:', error.message)
    return res.status(500).json({ success: false, error: 'Error obteniendo desconocimientos (admin)' })
  }
})

// PATCH /admin/desconocimientos/:id/estado — Cambiar estado de gestión
app.patch('/admin/desconocimientos/:id/estado', requireAuth, requireAdmin, validateParams(AdminDesconocimientoEstadoParamsSchema), validateBody(AdminDesconocimientoEstadoBodySchema), async (req, res) => {
  const id = req.params.id
  const estado = req.body.estado

  try {
    const prevResult = await db.pool.query(
      `SELECT id, estado, nuusuid, afiliado_id, atencion_id
       FROM app_desconocimientos
       WHERE id = $1`,
      [id]
    )

    if (!prevResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Desconocimiento no encontrado' })
    }

    const prev = prevResult.rows[0]

    const updResult = await db.pool.query(
      `UPDATE app_desconocimientos
       SET estado = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, estado, updated_at`,
      [id, estado]
    )

    await writeAdminAuditLog({
      req,
      entity: 'desconocimiento',
      entityId: String(id),
      action: 'update_estado',
      summary: `Desconocimiento #${id} cambiado a estado ${estado}`,
      before: {
        id: prev.id,
        estado: prev.estado,
        nuusuid: prev.nuusuid,
        afiliado_id: prev.afiliado_id,
        atencion_id: prev.atencion_id,
      },
      after: {
        id,
        estado,
      },
      meta: {
        endpoint: 'PATCH /admin/desconocimientos/:id/estado',
      },
    })

    return res.json({ success: true, item: updResult.rows[0] })
  } catch (error) {
    console.error('❌ PATCH /admin/desconocimientos/:id/estado:', error.message)
    return res.status(500).json({ success: false, error: 'Error actualizando estado del desconocimiento' })
  }
})

// GET /admin/calificaciones — Listado admin con filtros
app.get('/admin/calificaciones', requireAuth, requireAdmin, validateQuery(AdminCalificacionesQuerySchema), async (req, res) => {
  try {
    const { puntuacion, q, page, limit } = req.query
    const offset = (page - 1) * limit

    const where = []
    const params = []

    if (puntuacion !== null) {
      params.push(puntuacion)
      where.push(`c.puntuacion = $${params.length}`)
    }

    if (q) {
      params.push(`%${q}%`)
      where.push(`(
        LOWER(COALESCE(u.nuusumail, '')) LIKE $${params.length}
        OR LOWER(COALESCE(u.nuusuapell, '')) LIKE $${params.length}
        OR LOWER(COALESCE(c.afiliado_id, '')) LIKE $${params.length}
        OR LOWER(COALESCE(c.atencion_id, '')) LIKE $${params.length}
        OR LOWER(COALESCE(c.entidad_nombre, '')) LIKE $${params.length}
      )`)
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const totalResult = await db.pool.query(
      `SELECT COUNT(*)::int AS total
       FROM app_calificaciones c
       LEFT JOIN nuusuari u ON u.nuusuid = c.nuusuid
       ${whereClause}`,
      params
    )

    const dataParams = [...params, limit, offset]
    const rowsResult = await db.pool.query(
      `SELECT
         c.id,
         c.nuusuid,
         c.afiliado_id,
         c.atencion_id,
         c.entidad_id,
         c.entidad_nombre,
         c.puntuacion,
         c.comentario,
         c.created_at,
         c.updated_at,
         u.nuusumail AS usuario_email,
         u.nuusuapell AS usuario_nombre
       FROM app_calificaciones c
       LEFT JOIN nuusuari u ON u.nuusuid = c.nuusuid
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    )

    return res.json({
      success: true,
      items: rowsResult.rows,
      pagination: {
        page,
        limit,
        total: totalResult.rows[0]?.total || 0,
      },
    })
  } catch (error) {
    console.error('❌ GET /admin/calificaciones:', error.message)
    return res.status(500).json({ success: false, error: 'Error obteniendo calificaciones (admin)' })
  }
})

// GET /admin/calificaciones/resumen — Métricas globales para paneles
app.get('/admin/calificaciones/resumen', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await db.pool.query(
      `SELECT
         COUNT(*)::int AS total,
         ROUND(AVG(puntuacion)::numeric, 2) AS promedio,
         SUM(CASE WHEN puntuacion = 1 THEN 1 ELSE 0 END)::int AS estrellas_1,
         SUM(CASE WHEN puntuacion = 2 THEN 1 ELSE 0 END)::int AS estrellas_2,
         SUM(CASE WHEN puntuacion = 3 THEN 1 ELSE 0 END)::int AS estrellas_3,
         SUM(CASE WHEN puntuacion = 4 THEN 1 ELSE 0 END)::int AS estrellas_4,
         SUM(CASE WHEN puntuacion = 5 THEN 1 ELSE 0 END)::int AS estrellas_5
       FROM app_calificaciones`
    )

    return res.json({ success: true, resumen: result.rows[0] || {} })
  } catch (error) {
    console.error('❌ GET /admin/calificaciones/resumen:', error.message)
    return res.status(500).json({ success: false, error: 'Error obteniendo resumen de calificaciones' })
  }
})

// ============================================================================
// FIN ADMIN — DESCONOCIMIENTOS / CALIFICACIONES
// ============================================================================

// ============================================================================
// FIN CALIFICACIONES DE ATENCIÓN
// ============================================================================

// ===== INICIAR SERVIDOR =====
// ═══════════════════════════════════════════════════════════════
// Seed: asegurar que los admin backend existan en nuusuari+nuusuauth
// ═══════════════════════════════════════════════════════════════
const DEFAULT_ADMIN_PASSWORD = 'admin123'

async function ensureGamOptionalParameter() {
  const grupo = 'SEGURIDAD_APP'
  const tipo = 'HabilitarGAM'
  const defaultValue = 'S'

  try {
    const existing = await parametrosRepository.findOne(grupo, tipo)
    if (existing) {
      return
    }

    await parametrosRepository.create(grupo, tipo, defaultValue)
    await recargarParametros()
    console.log(`✅ Parámetro inicial creado: ${grupo}.${tipo}=${defaultValue}`)
  } catch (error) {
    console.warn(`⚠️  No se pudo asegurar parámetro ${grupo}.${tipo}:`, error.message)
  }
}

async function seedBackendAdmins() {
  try {
    const adminEmails = await getBackendAdminEmails()
    if (!adminEmails.length) {
      console.log('⚠️  No hay admin emails configurados en nusispar')
      return
    }

    let created = 0
    for (const email of adminEmails) {
      // Buscar si ya existe en nuusuari
      const existing = await db.pool.query(
        "SELECT nuusuid FROM nuusuari WHERE LOWER(TRIM(nuusumail)) = $1 LIMIT 1",
        [email]
      )
      if (existing.rows.length > 0) continue

      // Crear usuario admin en BD
      const nombre = email.split('@')[0].toUpperCase()
      const passwordHash = hashPassword(DEFAULT_ADMIN_PASSWORD)

      const client = await db.pool.connect()
      try {
        await client.query('BEGIN')

        const insert = await client.query(`
          INSERT INTO nuusuari (
            nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo,
            nuusuapell, nuusuestit, nuusutelef, nuusumail,
            nuusubajaf, nuusunivel
          ) VALUES (
            '', NULL, NOW(), '', NULL,
            $1, NULL, '', $2,
            '0001-01-01'::timestamp, 0
          ) RETURNING nuusuid
        `, [nombre, email])

        const nuusuid = insert.rows[0].nuusuid

        await client.query(`
          INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
          VALUES ($1, $2, NOW(), NOW())
        `, [nuusuid, passwordHash])

        await client.query('COMMIT')
        created++
        console.log(`🔐 Admin seed: creado ${email} (nuusuid: ${nuusuid}) con contraseña por defecto`)
      } catch (dbErr) {
        await client.query('ROLLBACK')
        console.error(`⚠️  Error creando admin ${email}:`, dbErr.message)
      } finally {
        client.release()
      }
    }

    if (created > 0) {
      console.log(`✅ Seed admins: ${created} usuario(s) admin creados en BD`)
    } else {
      console.log('✅ Seed admins: todos los admins ya existen en BD')
    }
  } catch (error) {
    console.error('⚠️  Error en seedBackendAdmins:', error.message)
  }
}

async function startServer() {
  // Cargar parámetros de configuración antes de iniciar
  console.log('📊 Cargando parámetros de configuración...')
  await cargarParametros()
  await ensureGamOptionalParameter()
  await validarParametrosRequeridos()

  // Seed: crear admin users en BD si no existen
  console.log('🔐 Verificando admin users en BD...')
  await seedBackendAdmins()
  
  // Iniciar servidor primero para evitar que un fallo en SOAP cierre el proceso
  const server = app.listen(PORT, '0.0.0.0', async () => {
    const wsdlUrl = await getWsdlUrl()
    console.log(`✅ Backend escuchando en http://0.0.0.0:${PORT}`)
    console.log(`📡 WSDL: ${wsdlUrl}`)
    console.log('📋 Endpoints disponibles:')
    console.log('   POST /register → Registrar usuario nuevo')
    console.log('   POST /auth/login → Login')
    console.log('   POST /auth/recover-password → Recuperar contraseña')
    console.log('   GET  /auth/me → Datos del usuario autenticado')
    console.log('   GET  /buscar-cuil?dni=X&sexo=M → Buscar CUIL')
    console.log('   GET  /credencial → Datos de credencial del afiliado')
    console.log('   GET  /credenciales → Lista credenciales grupo familiar')
    console.log('   GET  /dashboard, /tramites, /transactions, etc.')
    console.log('   --- Servicios SIA ---')
    console.log('   POST /sia/solicitudes → REC_SOLICITUDES_APP')
    console.log('   POST /sia/autorizacion-imprimir → AUTORIZACION_IMPRIMIR')
    console.log('   POST /sia/prestaciones → REC_PRESTACIONES_APP')
    console.log('   POST /sia/pago-coseguro → PAGO_COSEGURO_APP')
    console.log('   GET  /sia/coseguros-pendientes → COSEGUROS_PENDIENTES_APP')
    console.log('   POST /sia/enrolamientos → ENROLAMIENTOS')
    console.log('   GET  /sia/historial-atencion → HISTORIAL_ATENCION_APP')
    console.log('   GET  /sia/detalle-consumo → AUDETALLE_CONSUMO_APP')
    console.log('   --- Dispositivos ---')
    console.log('   POST /devices/register → Registrar/actualizar dispositivo')
    console.log('   GET  /devices → Listar dispositivos activos')
    console.log('   DELETE /devices/:id → Desactivar dispositivo')
    console.log('   --- Notificaciones ---')
    console.log('   GET  /notifications → Listar notificaciones (paginado + filtros)')
    console.log('   GET  /notifications/unread-count → Contar no leídas')
    console.log('   PUT  /notifications/:id/mark-read → Marcar como leída')
    console.log('   POST /notifications/mark-all-read → Marcar TODAS como leídas')
    console.log('   --- WS Externos (GeneXus) ---')
    console.log('   POST /api/ws/WS_NOTIFICACION       → Enviar notificacion a afiliado(s)')
    console.log('   POST /api/ws/WS_USUARIO_ACTIVO     → Validar usuario, contrasena e IdAfiliado')
    console.log('   POST /api/ws/WS_VALIDAR_AFILIADO   → Estado afiliado (E=activo, I=inactivo, N=no encontrado) por CrCreId')
    console.log('   POST /api/ws/WS_TOKEN_TELECONSULTA → Token 6 chars para teleconsulta')
    console.log('   POST /api/ws/WS_AUTORIZACION       → Callback resultado autorizacion SIA')
    console.log('⚙️  Sistema de parámetros: Configuración interna activa')
    // Inicializar SOAP de forma diferida y no bloqueante
    initSoapClient().catch(e => {
      console.error('❌ Error diferido en initSoapClient:', e && e.stack || e)
    })
    // Inicializar cliente SOAP SIA también de forma diferida
    initSoapClientSIA().catch(e => {
      console.error('❌ Error diferido en initSoapClientSIA:', e && e.stack || e)
    })
  })
  
  // Event listeners del servidor HTTP
  server.on('error', (err) => {
    console.error('❌ Error en servidor HTTP:', err)
  })
  
  server.on('clientError', (err, socket) => {
    console.error('❌ Error de cliente HTTP:', err.message)
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
  })
  
  server.on('connection', (socket) => {
    console.log('🔌 Nueva conexión HTTP')
  })
  
  // Recargar parámetros periódicamente (cada 5 minutos)
  setInterval(async () => {
    try {
      await cargarParametros()
    } catch (error) {
      console.error('Error recargando parámetros:', error)
    }
  }, 300000) // 5 minutos
}

// Manejadores globales para diagnosticar cierres inesperados y evitar caída inmediata
process.on('uncaughtException', err => {
  console.error('🛑 uncaughtException:', err && err.stack || err)
})
process.on('unhandledRejection', err => {
  console.error('🛑 unhandledRejection:', err && (err.stack || err))
})

function intentarInicio(reintento = 0) {
  startServer().catch(err => {
    console.error('Error al iniciar servidor:', err && err.stack || err)
    if (reintento < 3) {
      const esperaMs = 2000 * (reintento + 1)
      console.log(`⏳ Reintentando inicio en ${esperaMs}ms (intento ${reintento + 2}/4)`) 
      setTimeout(() => intentarInicio(reintento + 1), esperaMs)
    } else {
      console.log('❌ No se pudo iniciar tras múltiples intentos. Continuando en modo diagnóstico sin SOAP.')
      try {
        // Iniciar servidor mínimo sin SOAP para poder verificar /health
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`🩺 Servidor diagnóstico escuchando en http://0.0.0.0:${PORT}`)
        })
      } catch (e2) {
        console.error('Fallo también el servidor diagnóstico:', e2 && e2.stack || e2)
      }
    }
  })
}

// Manejador de errores - debe estar DESPUÉS de todas las rutas
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('❌ Error parseando JSON:', err.message)
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Solicitud inválida',
      context: 'body',
      issues: [
        {
          path: '',
          code: 'invalid_json',
          message: 'JSON mal formateado en la solicitud'
        }
      ]
    })
  }
  console.error('❌ Error no manejado:', err)
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Error interno del servidor'
  })
})


app.get('/admin/support/timeline', requireAuth, requireAdmin, validateQuery(SupportTimelineQuerySchema), async (req, res) => {
  try {
    const { q, limit = 30 } = req.query

    const user = await userRepository.findPublicById(q) || await userRepository.findPublicByUsername(q)
    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'No se encontró un usuario para la búsqueda indicada.',
        q,
      })
    }

    const backendAdminEmails = await getBackendAdminEmails()
    const backendAdminSet = new Set(backendAdminEmails.map((email) => normalizeEmail(email)))
    const normalizedEmail = normalizeEmail(user.nuusumail)
    const sessionsForUser = collectSessionsForUser(user.nuusuid)

    const credsResult = await db.pool.query(
      `SELECT COUNT(*)::int AS total
       FROM crcredus
       WHERE nuusuid = $1`,
      [user.nuusuid]
    )

    const auditResult = await db.pool.query(
      `SELECT id, entity, action, payload, created_at
       FROM audit_logs
       WHERE COALESCE(payload->>'targetId', '') = $1
          OR LOWER(COALESCE(payload->'before'->>'email', '')) = $2
          OR LOWER(COALESCE(payload->'after'->>'email', '')) = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [user.nuusuid, normalizedEmail || '', limit]
    )

    const timeline = [
      ...sessionsForUser.map((session) => ({
        source: 'session',
        when: session.lastActivityAt || session.lastRefreshedAt || session.createdAt || null,
        title: `Sesión ${session.platform || 'sin plataforma'} ${session.deviceId ? `· ${session.deviceId}` : ''}`.trim(),
        summary: session.hasRefreshToken ? 'Sesión activa con refresh token' : 'Sesión activa',
        entity: 'session',
        action: 'ACTIVE',
        data: session,
      })),
      ...auditResult.rows.map((row) => ({
        source: 'audit',
        when: row.created_at,
        title: row.payload?.summary || `${row.entity || 'evento'} ${row.action || ''}`.trim(),
        summary: row.payload?.summary || null,
        entity: row.entity,
        action: row.action,
        actor: row.payload?.actor || null,
        data: {
          id: row.id,
          request: row.payload?.request || null,
          before: row.payload?.before || null,
          after: row.payload?.after || null,
          meta: row.payload?.meta || null,
        },
      })),
    ].sort((a, b) => String(b.when || '').localeCompare(String(a.when || '')))

    res.json({
      success: true,
      user: {
        nuusuid: user.nuusuid,
        email: user.nuusumail,
        nombre: user.nuusuapell,
        afiliadoId: user.nuusuafili,
        desactivado: isUserDeactivated(user),
        isBackendAdmin: backendAdminSet.has(normalizeEmail(user.nuusumail)),
      },
      stats: {
        activeSessions: sessionsForUser.length,
        credenciales: credsResult.rows[0]?.total || 0,
        auditEvents: auditResult.rows.length,
        totalTimelineItems: timeline.length,
      },
      sessions: sessionsForUser,
      auditEvents: auditResult.rows.map((row) => ({
        id: row.id,
        entity: row.entity,
        action: row.action,
        summary: row.payload?.summary || null,
        actor: row.payload?.actor || null,
        createdAt: row.created_at,
        before: row.payload?.before || null,
        after: row.payload?.after || null,
        meta: row.payload?.meta || null,
      })),
      timeline,
    })
  } catch (error) {
    console.error('❌ Error construyendo bitácora de soporte:', error)
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    })
  }
})
intentarInicio()

// Instrumentación de salida y heartbeat para rastrear cierre inesperado
process.on('beforeExit', code => {
  console.log('⚠️  beforeExit code=', code)
})
process.on('exit', code => {
  console.log('🏁 exit code=', code)
})
setInterval(() => {
  try {
    process.stdout.write('.')
  } catch {}
}, 30000)


