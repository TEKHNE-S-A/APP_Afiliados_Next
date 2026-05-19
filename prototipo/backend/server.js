// Backend demo sin dependencias externas — solo Node.js core
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 3000
const demoUser = {
  id: 1,
  username: 'demo',
  name: 'Usuario Demo',
  email: 'demo@example.com',
}

// Datos de la credencial del afiliado
const credencialAfiliado = {
  numeroAfiliado: '123456789',
  nombre: 'Juan Carlos',
  apellido: 'González',
  dni: '35.123.456',
  fechaNacimiento: '1985-03-15',
  parentesco: 'Titular',
  plan: 'Premium Plus',
  vigenciaDesde: '2024-01-01',
  imagenFondo: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=400&fit=crop', // Imagen de fondo
  fotoPerfil: 'https://ui-avatars.com/api/?name=Juan+Gonzalez&size=200&background=2196f3&color=fff'
}

const tokenStore = new Map()
const sharedCredentials = new Map() // token -> { credencial, expiresAt }

// Configuración persistente de endpoints
const CONFIG_PATH = path.join(__dirname, 'config.json')
let appConfig = {
  beneficiariesEndpoint: '',
  siaEndpoint: '',
  gamEndpoint: '',
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
      appConfig = Object.assign(appConfig, JSON.parse(raw))
    } else {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(appConfig, null, 2), 'utf8')
    }
  } catch (err) {
    console.error('Error cargando config:', err)
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(appConfig, null, 2), 'utf8')
  } catch (err) {
    console.error('Error guardando config:', err)
  }
}

loadConfig()
// Helper: enviar JSON con CORS
function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  })
  res.end(JSON.stringify(data))
}

// Helper: parsear body JSON
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : null)
      } catch (err) {
        reject(err)
      }
    })
  })
}

const server = http.createServer(async (req, res) => {
  const { method, url, headers } = req
  console.log(`${method} ${url}`)

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    })
    return res.end()
  }

  try {
    // Servir página HTML en la raíz
    if (method === 'GET' && (url === '/' || url === '/index.html')) {
      const htmlPath = path.join(__dirname, 'public', 'index.html')
      try {
        const html = fs.readFileSync(htmlPath, 'utf8')
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        return res.end(html)
      } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        return res.end('Panel de pruebas no encontrado')
      }
    }

    // GET /health
    if (method === 'GET' && url === '/health') {
      return sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() })
    }

    // POST /auth/login
    if (method === 'POST' && url === '/auth/login') {
      const body = await parseBody(req)
      const { username, password } = body || {}
      if (username === 'demo' && password === 'demo123') {
        const token = Buffer.from(`${username}:${Date.now()}`).toString('base64')
        tokenStore.set(token, demoUser)
        return sendJson(res, 200, { token, user: demoUser })
      }
      return sendJson(res, 401, { message: 'Credenciales inválidas' })
    }

    // GET /auth/me
    if (method === 'GET' && url === '/auth/me') {
      const auth = headers.authorization || ''
      const match = auth.match(/^Bearer (.+)$/)
      if (match) {
        const token = match[1]
        const user = tokenStore.get(token)
        if (user) {
          return sendJson(res, 200, { user })
        }
      }
      return sendJson(res, 401, { message: 'No autorizado' })
    }

    // GET /transactions
    if (method === 'GET' && url === '/transactions') {
      return sendJson(res, 200, {
        data: [
          { id: 't1', amount: -1200, currency: 'ARS', date: '2025-11-20', description: 'Pago factura' },
          { id: 't2', amount: 5000, currency: 'ARS', date: '2025-11-22', description: 'Recibo' },
        ],
      })
    }

    // GET /notifications
    if (method === 'GET' && url === '/notifications') {
      return sendJson(res, 200, {
        data: [
          { id: 'n1', title: 'Bienvenido', body: 'Gracias por usar la app', date: '2025-11-25' },
        ],
      })
    }

    // GET /profile
    if (method === 'GET' && url === '/profile') {
      return sendJson(res, 200, { profile: demoUser })
    }

    // GET /tramites
    if (method === 'GET' && url === '/tramites') {
      const tramites = [
        { id: 'tr1', tipo: 'Alta familiar', estado: 'En proceso', fecha: '2025-11-20', descripcion: 'Solicitud de alta para cónyuge' },
        { id: 'tr2', tipo: 'Cambio de plan', estado: 'Completado', fecha: '2025-11-15', descripcion: 'Upgrade a plan premium' },
        { id: 'tr3', tipo: 'Reintegro', estado: 'Pendiente', fecha: '2025-11-25', descripcion: 'Reintegro consulta odontológica' },
      ]
      return sendJson(res, 200, { data: tramites })
    }

    // POST /tramites
    if (method === 'POST' && url === '/tramites') {
      const body = await parseBody(req)
      const newTramite = {
        id: `tr${Date.now()}`,
        ...body,
        estado: 'Pendiente',
        fecha: new Date().toISOString().split('T')[0],
      }
      return sendJson(res, 201, { tramite: newTramite, message: 'Trámite creado exitosamente' })
    }

    // GET /dashboard
    if (method === 'GET' && url === '/dashboard') {
      const dashboard = {
        saldo: -1250.50,
        plan: 'Premium Plus',
        estado: 'Activo',
        proximoTurno: '2025-12-05 10:30',
        tramitesPendientes: 1,
        notificacionesNoLeidas: 2,
      }
      return sendJson(res, 200, { data: dashboard })
    }

    // GET /credencial - Credencial digital del afiliado
        if (method === 'GET' && url === '/credencial') {
          try {
            // token temporal por afiliado: se lee el parámetro TimeoutTokenCredencial
            const tokenService = require('./tokenService')
            // Usamos demoUser.id como identificador interno del afiliado en este demo
            const afiliadoId = demoUser.id || demoUser.idNumber || demoUser.username || 'demo'
            // Si queremos simular grupo familiar, convertimos a array con un solo elemento
            const credArray = [Object.assign({}, credencialAfiliado)]
            // attachTokensToCredenciales ahora es async
            await tokenService.attachTokensToCredenciales(afiliadoId, credArray)
            // Devolver la primera credencial (titular) con token pegado
            return sendJson(res, 200, { data: credArray[0] })
          } catch (err) {
            console.error('Error generando token temporal:', err)
            return sendJson(res, 200, { data: credencialAfiliado })
          }
        }

    // POST /credencial/compartir - Generar token temporal para compartir credencial
    if (method === 'POST' && url === '/credencial/compartir') {
      const body = await parseBody(req)
      const { duracion } = body || {} // duracion en minutos
      const duracionMinutos = duracion || 60 // por defecto 60 minutos
      
      const shareToken = Buffer.from(`share:${Date.now()}:${Math.random()}`).toString('base64')
      const expiresAt = Date.now() + (duracionMinutos * 60 * 1000)
      
      sharedCredentials.set(shareToken, {
        credencial: credencialAfiliado,
        expiresAt
      })
      
      return sendJson(res, 200, {
        shareToken,
        shareUrl: `http://localhost:3000/credencial/shared/${shareToken}`,
        expiresAt: new Date(expiresAt).toISOString(),
        duracionMinutos
      })
    }

    // GET /credencial/shared/:token - Ver credencial compartida
    if (method === 'GET' && url.startsWith('/credencial/shared/')) {
      const shareToken = url.split('/credencial/shared/')[1]
      const shared = sharedCredentials.get(shareToken)
      
      if (!shared) {
        return sendJson(res, 404, { message: 'Credencial compartida no encontrada' })
      }
      
      if (Date.now() > shared.expiresAt) {
        sharedCredentials.delete(shareToken)
        return sendJson(res, 410, { message: 'Credencial compartida expirada' })
      }
      
      return sendJson(res, 200, {
        data: shared.credencial,
        expiresAt: new Date(shared.expiresAt).toISOString()
      })
    }

    // GET /config - obtener configuración de endpoints
    if (method === 'GET' && url === '/config') {
      return sendJson(res, 200, { config: appConfig })
    }

    // PUT /config - actualizar configuración (body: { beneficiariesEndpoint, siaEndpoint, gamEndpoint })
    if ((method === 'PUT' || method === 'POST') && url === '/config') {
      const body = await parseBody(req)
      if (!body) return sendJson(res, 400, { message: 'Body requerido' })
      const allowed = ['beneficiariesEndpoint', 'siaEndpoint', 'gamEndpoint']
      let changed = false
      allowed.forEach(k => {
        if (body[k] !== undefined) {
          appConfig[k] = body[k]
          changed = true
        }
      })
      if (changed) saveConfig()
      return sendJson(res, 200, { config: appConfig })
    }

    // Helper: probar endpoint remoto
    const httpLib = require('http')
    const httpsLib = require('https')
    function testEndpoint(targetUrl, timeoutMs = 5000) {
      return new Promise((resolve) => {
        try {
          const parsed = new URL(targetUrl)
          const lib = parsed.protocol === 'https:' ? httpsLib : httpLib
          const reqOptions = {
            method: 'GET',
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + (parsed.search || ''),
            timeout: timeoutMs,
            headers: { 'User-Agent': 'APP_Afiliados-Backend/1.0' },
          }

          const r = lib.request(reqOptions, (resp) => {
            let data = ''
            resp.on('data', (chunk) => { data += chunk })
            resp.on('end', () => {
              resolve({ ok: true, status: resp.statusCode, body: data })
            })
          })
          r.on('error', (err) => resolve({ ok: false, error: String(err) }))
          r.on('timeout', () => { r.destroy(); resolve({ ok: false, error: 'timeout' }) })
          r.end()
        } catch (err) {
          resolve({ ok: false, error: String(err) })
        }
      })
    }

    // POST /config/test - probar un endpoint (body: { key: 'beneficiaries'|'sia'|'gam' } OR { url })
    if (method === 'POST' && url === '/config/test') {
      const body = await parseBody(req)
      if (!body) return sendJson(res, 400, { message: 'Body requerido' })
      let target = null
      if (body.url) target = body.url
      else if (body.key) {
        const map = { beneficiaries: 'beneficiariesEndpoint', sia: 'siaEndpoint', gam: 'gamEndpoint' }
        const k = map[body.key]
        if (k) target = appConfig[k]
      }
      if (!target) return sendJson(res, 400, { message: 'No se encontró URL objetivo' })
      const result = await testEndpoint(target)
      return sendJson(res, 200, { target, result })
    }

    // GET /config/test/:key - probar un endpoint por key
    if (method === 'GET' && url.startsWith('/config/test/')) {
      const key = url.split('/config/test/')[1]
      const map = { beneficiaries: 'beneficiariesEndpoint', sia: 'siaEndpoint', gam: 'gamEndpoint' }
      const k = map[key]
      if (!k) return sendJson(res, 400, { message: 'Key inválida' })
      const target = appConfig[k]
      if (!target) return sendJson(res, 400, { message: 'Endpoint no configurado' })
      const result = await testEndpoint(target)
      return sendJson(res, 200, { key, target, result })
    }

    // 404
    sendJson(res, 404, { message: 'Endpoint no encontrado' })
  } catch (err) {
    console.error('Error:', err)
    sendJson(res, 500, { message: 'Error del servidor', error: String(err) })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend escuchando en http://0.0.0.0:${PORT}`)
  console.log(`   POST /auth/login → { username: 'demo', password: 'demo123' }`)
  console.log(`   GET  /auth/me (Authorization: Bearer <token>)`)
  console.log(`   GET  /health`)
  console.log(`   GET  /transactions`)
  console.log(`   GET  /notifications`)
  console.log(`   GET  /profile`)
  console.log(`   GET  /tramites`)
  console.log(`   POST /tramites`)
  console.log(`   GET  /dashboard`)
  console.log(`   GET  /credencial`)
  console.log(`   GET  /config           -> Obtener configuración de endpoints`)
  console.log(`   PUT  /config           -> Actualizar configuración (body JSON)`)
  console.log(`   POST /config/test      -> Probar endpoint (body: { key|'url' })`)
  console.log(`   GET  /config/test/:key -> Probar endpoint por key (beneficiaries|sia|gam)`)
})

process.on('SIGINT', () => {
  console.log('\n👋 Cerrando servidor...')
  server.close(() => process.exit(0))
})
