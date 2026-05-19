const { Pool } = require('pg')
const https = require('https')
const http = require('http')

const pool = new Pool({ host: '127.0.0.1', port: 5432, database: 'app_afiliados_genexus', user: 'postgres', password: '12345678' })

async function checkUrl(label, urlStr) {
  return new Promise(resolve => {
    const mod = urlStr.startsWith('https') ? https : http
    const req = mod.get(urlStr, { timeout: 6000, rejectUnauthorized: false }, res => {
      resolve(`${label}: HTTP ${res.statusCode}`)
    })
    req.on('error', e => resolve(`${label}: ERROR - ${e.message}`))
    req.on('timeout', () => { req.destroy(); resolve(`${label}: TIMEOUT`) })
  })
}

async function main() {
  // 1) Leer parámetros BD
  console.log('\n===== PARÁMETROS SOAP EN nusispar =====')
  const r = await pool.query(`
    SELECT nusisgrupa, nusistippa, nusisvalpa
    FROM nusispar
    WHERE nusisgrupa IN ('WSBENEFTK','WSSIATK')
    ORDER BY nusisgrupa, nusistippa
  `)
  const params = {}
  r.rows.forEach(row => {
    const grp = row.nusisgrupa.trim()
    const key = row.nusistippa.trim()
    const val = (row.nusisvalpa || '').trim()
    if (!params[grp]) params[grp] = {}
    params[grp][key] = val
    console.log(grp.padEnd(12), key.padEnd(20), val)
  })

  // 2) Construir URLs
  console.log('\n===== URLs CONSTRUIDAS =====')
  for (const grp of ['WSBENEFTK', 'WSSIATK']) {
    const p = params[grp] || {}
    const secVal  = (p.Secure || '0')
    const secure  = secVal === '1' || secVal.toUpperCase() === 'S'
    const proto   = secure ? 'https' : 'http'
    const host    = (p.Host || '').replace(/\/$/, '')
    const port    = p.Port || ''
    const base    = (p.BaseUrl || '').replace(/^\//, '')
    const svc     = p.Servicio || ''
    const url     = `${proto}://${host}:${port}/${base}${svc}?WSDL`
    console.log(`[${grp}] ${url}`)
    console.log(`        User=${p.User || '-'}`)
  }

  // 3) Probar conectividad
  console.log('\n===== CONECTIVIDAD =====')
  const checks = []
  for (const grp of ['WSBENEFTK', 'WSSIATK']) {
    const p = params[grp] || {}
    const secVal = (p.Secure || '0')
    const secure = secVal === '1' || secVal.toUpperCase() === 'S'
    const proto  = secure ? 'https' : 'http'
    const host   = (p.Host || '').replace(/\/$/, '')
    const port   = p.Port || ''
    const base   = (p.BaseUrl || '').replace(/^\//, '')
    const svc    = p.Servicio || ''
    const url    = `${proto}://${host}:${port}/${base}${svc}?WSDL`
    checks.push(checkUrl(grp, url))
  }
  // También probar GAM
  checks.push(checkUrl('GAM /oauth/token', 'https://test17.osep.gob.ar/APP_OSEP_TEST/oauth/access_token'))
  checks.push(checkUrl('GAM /oauth/userinfo', 'https://test17.osep.gob.ar/APP_OSEP_TEST/oauth/userinfo'))

  const results = await Promise.all(checks)
  results.forEach(r => console.log(r))

  await pool.end()
}

main().catch(e => { console.error(e.message); pool.end() })
