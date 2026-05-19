const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const CONFIG_PATH = path.join(__dirname, 'config.json')
let db = null
try {
  db = require('./db/connection')
} catch (e) {
  db = null
}

// Cache local para el parámetro TimeoutTokenCredencial (grupo CREDENCIAL)
let cachedTimeout = null
let cachedTimeoutAt = 0
const CACHE_TTL_MS = 60 * 1000 // 1 minuto

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    }
  } catch (err) {
    console.error('tokenService: error cargando config', err)
  }
  return {}
}

async function getTimeoutMinutes() {
  const now = Date.now()
  if (cachedTimeout !== null && (now - cachedTimeoutAt) < CACHE_TTL_MS) {
    return cachedTimeout
  }

  try {
    if (db && db.query) {
      const res = await db.query(
        `SELECT nusisvalpa FROM nusispar WHERE nusisgrupa = $1 AND nusistippa = $2 LIMIT 1`,
        ['CREDENCIAL', 'TimeoutTokenCredencial']
      )
      if (res && res.rows && res.rows.length > 0) {
        const v = Number(res.rows[0].nusisvalpa)
        if (!isNaN(v) && v > 0) {
          cachedTimeout = Math.max(1, Math.floor(v))
          cachedTimeoutAt = now
          return cachedTimeout
        }
      }
    }
  } catch (err) {
    console.warn('tokenService: error leyendo nusispar CREDENCIAL, fallback a config.json', err.message)
  }

  const cfg = loadConfig()
  const v = Number(cfg.TimeoutTokenCredencial)
  const final = (!v || isNaN(v) || v <= 0) ? 10 : Math.max(1, Math.floor(v))
  cachedTimeout = final
  cachedTimeoutAt = now
  return final
}

/**
 * Genera token con padding a 3 dígitos (ej. '005')
 */
async function generateTokenFor(afiliadoId, now = new Date()) {
  const timeoutMinutes = await getTimeoutMinutes()
  const bucketMs = timeoutMinutes * 60 * 1000
  const epoch = now.getTime()
  const bucket = Math.floor(epoch / bucketMs)

  const payload = `${afiliadoId}:${bucket}`
  const hash = crypto.createHash('sha256').update(payload).digest()
  const intVal = hash.readUInt32BE(0)
  const tokenNum = intVal % 1000 // 0..999
  // Padding a 3 dígitos
  return String(tokenNum).padStart(3, '0')
}

async function attachTokensToCredenciales(afiliadoId, credencialesArray, now = new Date()) {
  const timeoutMinutes = await getTimeoutMinutes()
  const generatedAt = now.toISOString()
  // Usar el límite real del bucket (no now+timeout) para que coincida con el endpoint /credencial/token-valido
  const bucketMs = timeoutMinutes * 60 * 1000
  const bucketActual = Math.floor(now.getTime() / bucketMs)
  const expiresAt = new Date((bucketActual + 1) * bucketMs).toISOString()

  if (!Array.isArray(credencialesArray)) return credencialesArray

  for (const c of credencialesArray) {
    c.tokenTemporal = await generateTokenFor(afiliadoId, now)
    c.tokenTemporalGeneradoEn = generatedAt
    c.tokenTemporalVenceEn = expiresAt
  }

  return credencialesArray
}

module.exports = {
  getTimeoutMinutes,
  generateTokenFor,
  attachTokensToCredenciales,
}
