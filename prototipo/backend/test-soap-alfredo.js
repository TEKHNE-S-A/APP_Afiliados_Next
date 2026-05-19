/**
 * Test específico SOAP para usuario alfredofalletto@gmail.com
 * Verifica qué devuelve APPDATOSCREDENCIALES para su AfiliadoId
 */

const axios = require('axios')
const xml2js = require('xml2js')
const db = require('./db/connection')

// Función local para llamada SOAP (copiada de server-soap.js)
async function callSoapExecutePlain(servicio, parametros) {
  const soapUrl = 'http://tkqa.tekhne.com.ar:8700/PRODUCTO_BE_ABE_TK_QA/com.tekhne.abe_ws/BE_WS.Execute'
  
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Execute xmlns="com.tekhne.beneficiarios">
      <Servicio>${servicio}</Servicio>
      <Parametros>${JSON.stringify(parametros)}</Parametros>
    </Execute>
  </soap:Body>
</soap:Envelope>`

  const response = await axios.post(soapUrl, soapEnvelope, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'com.tekhne.beneficiariosBE_WS.Execute',
      'USUARIO': 'admin',
      'PASSWORD': 'admin123'
    },
    timeout: 30000
  })

  const parser = new xml2js.Parser({ explicitArray: false, trim: true })
  const result = await parser.parseStringPromise(response.data)
  
  const executeResponse = result['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ExecuteResponse']
  return executeResponse
}

async function testSoapAlfredo() {
  console.log('═════════════════════════════════════════════════════════')
  console.log('TEST SOAP: alfredofalletto@gmail.com')
  console.log('═════════════════════════════════════════════════════════\n')

  try {
    // Obtener datos del usuario de BD
    const userQuery = await db.query(
      'SELECT nuusuid, nuusumail, nuusuafili, nuusunroaf, nuusuapell FROM nuusuari WHERE nuusumail = $1',
      ['alfredofalletto@gmail.com']
    )

    if (userQuery.rows.length === 0) {
      console.log('❌ Usuario no encontrado en BD\n')
      process.exit(1)
    }

    const user = userQuery.rows[0]
    console.log('📄 Datos del usuario en BD:')
    console.log('   Email:        ', user.nuusumail)
    console.log('   UUID:         ', user.nuusuid)
    console.log('   AfiliadoId:   ', user.nuusuafili)
    console.log('   Nro Afiliado: ', user.nuusunroaf)
    console.log('   Nombre:       ', user.nuusuapell)
    console.log('')

    // Verificar nuusuauth
    const authQuery = await db.query(
      'SELECT nuusuid FROM nuusuauth WHERE nuusuid = $1',
      [user.nuusuid]
    )
    console.log('🔐 nuusuauth:    ', authQuery.rows.length > 0 ? '✅ Existe' : '❌ No existe')
    console.log('')

    // Llamada SOAP
    console.log('🌐 Llamando SOAP APPDATOSCREDENCIALES...')
    console.log('   AfiliadoId:', user.nuusuafili)
    console.log('')

    const soapResult = await callSoapExecutePlain('APPDATOSCREDENCIALES', {
      AfiliadoId: user.nuusuafili,
      CredencialDatos: []
    })

    console.log('📦 Respuesta SOAP completa:')
    console.log(JSON.stringify(soapResult, null, 2))
    console.log('')

    // Parsear resultado
    const resultado = soapResult?.BE_WSResult?.Resultado
    const mensajes = soapResult?.BE_WSResult?.Mensajes || []
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('ANÁLISIS DE RESPUESTA:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Mensajes de error/warning
    if (mensajes.length > 0) {
      console.log('\n📨 Mensajes SOAP:')
      mensajes.forEach((msg, i) => {
        console.log(`   ${i + 1}. ${msg.Description || msg}`)
      })
    }

    // Credenciales
    let credenciales = []
    if (typeof resultado === 'string') {
      try {
        credenciales = JSON.parse(resultado)
      } catch (e) {
        console.log('\n❌ Error parseando Resultado:', e.message)
      }
    } else if (Array.isArray(resultado)) {
      credenciales = resultado
    }

    console.log('\n🎫 Credenciales encontradas:', credenciales.length)
    
    if (credenciales.length > 0) {
      console.log('\n📋 Detalle de credenciales:')
      credenciales.forEach((cred, i) => {
        console.log(`\n   Credencial ${i + 1}:`)
        console.log('   ─────────────────────')
        console.log('   AfiliadoId:  ', cred.AfiliadoId)
        console.log('   Nro Afiliado:', cred.NroAfiliado)
        console.log('   Nombre:      ', cred.ApellidoNombre)
        console.log('   CUIL:        ', cred.Cuil)
        console.log('   Documento:   ', cred.Documento)
        console.log('   Sexo:        ', cred.Sexo)
        console.log('   Parentesco:  ', cred.Parentesco || 'N/A')
        console.log('   Vencimiento: ', cred.FechaVencimiento || 'N/A')
      })
    } else {
      console.log('\n⚠️  SOAP no devolvió credenciales para este AfiliadoId')
      console.log('    Esto puede deberse a:')
      console.log('    • Afiliado dado de baja')
      console.log('    • Afiliado sin cobertura activa')
      console.log('    • Cambio de número de afiliado')
      console.log('    • Error en base de datos de OSEP')
    }

    console.log('\n═════════════════════════════════════════════════════════\n')

  } catch (error) {
    console.error('❌ ERROR:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    process.exit(0)
  }
}

// Ejecutar
testSoapAlfredo()
