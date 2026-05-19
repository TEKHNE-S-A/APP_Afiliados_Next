/**
 * Test SOAP directo para AfiliadoId de alfredofalletto@gmail.com
 * Consulta APPDATOSCREDENCIALES y muestra respuesta completa
 */

const axios = require('axios')
const xml2js = require('xml2js')

async function testSoapDirect() {
  const afiliadoId = '000082018000000000001000082018'
  
  console.log('═══════════════════════════════════════════════════════')
  console.log('TEST SOAP DIRECTO: APPDATOSCREDENCIALES')
  console.log('═══════════════════════════════════════════════════════\n')
  console.log('AfiliadoId:', afiliadoId)
  console.log('Service:   ', 'APPDATOSCREDENCIALES')
  console.log('SOAP URL:  ', 'http://tkqa.tekhne.com.ar:8700/PRODUCTO_BE_ABE_TK_QA/com.tekhne.abe_ws/BE_WS.Execute')
  console.log('')
  
  try {
    // 1. Construir SOAP envelope
    const parametros = {
      AfiliadoId: afiliadoId,
      CredencialDatos: []
    }
    
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Execute xmlns="com.tekhne.beneficiarios">
      <Servicio>APPDATOSCREDENCIALES</Servicio>
      <Parametros>${JSON.stringify(parametros)}</Parametros>
    </Execute>
  </soap:Body>
</soap:Envelope>`

    console.log('📤 SOAP Request:')
    console.log('───────────────────────────────────────────────────────')
    console.log(soapEnvelope)
    console.log('───────────────────────────────────────────────────────\n')
    
    // 2. Llamar SOAP
    console.log('🌐 Enviando request a SOAP...\n')
    
    const response = await axios.post(
      'http://tkqa.tekhne.com.ar:8700/PRODUCTO_BE_ABE_TK_QA/com.tekhne.abe_ws/BE_WS.Execute',
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'com.tekhne.beneficiariosBE_WS.Execute',
          'USUARIO': 'admin',
          'PASSWORD': 'admin123'
        },
        timeout: 30000
      }
    )
    
    console.log('✅ Response recibido (status:', response.status, ')\n')
    
    // 3. Parsear XML
    const parser = new xml2js.Parser({ explicitArray: false, trim: true })
    const result = await parser.parseStringPromise(response.data)
    
    const executeResponse = result['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ExecuteResponse']
    
    console.log('📦 SOAP Response Completo:')
    console.log('═══════════════════════════════════════════════════════')
    console.log(JSON.stringify(executeResponse, null, 2))
    console.log('═══════════════════════════════════════════════════════\n')
    
    // 4. Analizar resultado
    const beResult = executeResponse?.BE_WSResult
    const resultado = beResult?.Resultado
    const mensajes = beResult?.Mensajes
    
    console.log('📊 ANÁLISIS:')
    console.log('───────────────────────────────────────────────────────')
    
    if (mensajes) {
      console.log('📨 Mensajes SOAP:')
      let mensajesArray = []
      try {
        mensajesArray = JSON.parse(mensajes)
      } catch {
        mensajesArray = [mensajes]
      }
      mensajesArray.forEach((msg, i) => {
        console.log(`   ${i + 1}. Type: ${msg.Type || 'N/A'}, Description: ${msg.Description || msg}`)
      })
      console.log('')
    }
    
    if (resultado) {
      let credenciales = []
      if (typeof resultado === 'string') {
        try {
          credenciales = JSON.parse(resultado)
        } catch (e) {
          console.log('❌ Error parseando Resultado como JSON:', e.message)
          console.log('   Resultado raw:', resultado)
        }
      } else if (Array.isArray(resultado)) {
        credenciales = resultado
      }
      
      console.log('🎫 Credenciales encontradas:', credenciales.length)
      
      if (credenciales.length > 0) {
        console.log('\n📋 CREDENCIALES:')
        credenciales.forEach((cred, i) => {
          console.log(`\n   ── Credencial ${i + 1} ──`)
          console.log('   AfiliadoId:    ', cred.AfiliadoId)
          console.log('   Nro. Afiliado: ', cred.NumeroDeAfiliado || cred.NroAfiliado)
          console.log('   Nombre:        ', cred.ApellidoNombre)
          console.log('   CUIL:          ', cred.Cuil)
          console.log('   Documento:     ', cred.Documento)
          console.log('   Sexo:          ', cred.Sexo)
          console.log('   Parentesco:    ', cred.Parentesco || 'N/A')
          console.log('   Vencimiento:   ', cred.FechaVencimiento || 'N/A')
        })
      } else {
        console.log('\n⚠️  SOAP no devolvió credenciales')
        console.log('    Posibles causas:')
        console.log('    • AfiliadoId no existe en el padrón')
        console.log('    • Afiliado dado de baja')
        console.log('    • Sin cobertura activa')
        console.log('    • Cambio de número de afiliado')
      }
    } else {
      console.log('❌ No hay campo "Resultado" en la respuesta SOAP')
    }
    
    console.log('\n═══════════════════════════════════════════════════════\n')
    
  } catch (error) {
    console.error('❌ ERROR:', error.message)
    if (error.response) {
      console.error('   Status:', error.response.status)
      console.error('   Data:', error.response.data)
    } else {
      console.error('   Stack:', error.stack)
    }
  }
}

testSoapDirect()
