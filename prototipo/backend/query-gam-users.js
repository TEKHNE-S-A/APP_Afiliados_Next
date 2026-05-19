// Verificar credenciales alternativas para SIA SOAP
const { Pool } = require('pg')
const crypto = require('crypto')
const http = require('http')

const pool = new Pool({ host: '127.0.0.1', port: 5432, user: 'postgres', password: '12345678', database: 'QA5' })

function sha512b64 (str) {
  return crypto.createHash('sha512').update(str, 'utf8').digest('base64')
}

// Llama directamente a SIA SOAP con credenciales RAW - usa WSDL correcto del backend
function callSIADirect (usuario, password) {
  return new Promise((resolve) => {
    // Usar la misma URL que usa el backend
    const jsonParams = JSON.stringify('')
    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="com.tekhne.sia">
  <soapenv:Header/>
  <soapenv:Body>
    <com:SIA_WS.Execute>
      <com:Servicio>REC_PRESTACIONES_APP</com:Servicio>
      <com:Parametros></com:Parametros>
    </com:SIA_WS.Execute>
  </soapenv:Body>
</soapenv:Envelope>`

    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/SIA_17U3JavaWebPostgreSQL/servlet/com.tekhne.asia_ws',
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
        'Content-Length': Buffer.byteLength(soapBody),
        'USUARIO': usuario,
        'PASSWORD': password
      }
    }, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => resolve({ status: res.statusCode, body: d }))
    })
    req.setTimeout(10000, () => { req.destroy(); resolve({ status: 'TIMEOUT', body: '' }) })
    req.on('error', e => resolve({ status: 'ERROR', body: e.message }))
    req.write(soapBody)
    req.end()
  })
}

function extractResult (body) {
  const resultadoMatch = body.match(/<Resultado>(.*?)<\/Resultado>/s)
  const mensajesMatch = body.match(/<Mensajes>(.*?)<\/Mensajes>/s)
  const faultMatch = body.match(/<faultstring>(.*?)<\/faultstring>/s)
  const executeRespMatch = body.match(/<SIA_WS\.ExecuteResponse[^>]*>(.*?)<\/SIA_WS\.ExecuteResponse>/s)
  if (resultadoMatch) return '✅ Resultado: ' + resultadoMatch[1].substring(0, 400)
  if (mensajesMatch) return '⚠️ Mensajes: ' + mensajesMatch[1].substring(0, 400)
  if (faultMatch) return '❌ Fault: ' + faultMatch[1].substring(0, 400)
  if (executeRespMatch) return '📋 ExecuteResponse: ' + executeRespMatch[1].substring(0, 400)
  return body.substring(0, 600)
}

async function main () {
  const client = await pool.connect()
  try {
    // 1. Verificar hash de mariar/ignacio11
    console.log('\n=== Verificar credenciales mariar/ignacio11 ===')
    const mariarR = await client.query(`SELECT TRIM(username) as u, TRIM(userpwd) as pwd FROM gam."User" WHERE TRIM(username) = 'mariar'`)
    if (mariarR.rowCount > 0) {
      const stored = mariarR.rows[0].pwd
      const hash = sha512b64('ignacio11')
      console.log('mariar stored hash:', stored.substring(0, 30) + '...')
      console.log('SHA512("ignacio11"):  ', hash.substring(0, 30) + '...')
      console.log('Match:', stored === hash)
    }

    // 2. Verificar hash de admin/admin123 actual
    console.log('\n=== Verificar hash admin/admin123 en BD ===')
    const adminR = await client.query(`SELECT TRIM(userpwd) as pwd FROM gam."User" WHERE TRIM(username) = 'admin' AND usernamespace LIKE 'PRODUCTO_GAM%'`)
    if (adminR.rowCount > 0) {
      const stored = adminR.rows[0].pwd
      const hash = sha512b64('admin123')
      console.log('admin stored hash:', stored.substring(0, 30) + '...')
      console.log('SHA512("admin123"):  ', hash.substring(0, 30) + '...')
      console.log('Match:', stored === hash)
    }

  } catch (err) {
    console.error('DB ERROR:', err.message)
  } finally {
    client.release()
    await pool.end()
  }

  const tests = [
    ['admin', 'admin123'],
    ['gamadmin', 'gamadmin'],
    ['', ''],
    ['mariar', 'ignacio11'],
    ['admin', '']
  ]

  for (const [u, p] of tests) {
    console.log(`\n=== SOAP test: "${u}" / "${p}" ===`)
    const r = await callSIADirect(u, p)
    console.log('Status:', r.status, '|', extractResult(r.body))
  }
}

main()
