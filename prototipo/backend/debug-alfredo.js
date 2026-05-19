/**
 * Test completo de debugging para alfredofalletto@gmail.com
 * Captura todos los logs y respuestas
 */

const axios = require('axios')
const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)

async function debugLoginAlfredo() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('DEBUG LOGIN: alfredofalletto@gmail.com')
  console.log('═══════════════════════════════════════════════════════\n')

  const email = 'alfredofalletto@gmail.com'
  const afiliadoIdBD = '000082018000000000001000082018'
  
  // Parsear componentes del AfiliadoId
  const titular = afiliadoIdBD.substring(0, 9)
  const organizacion = afiliadoIdBD.substring(9, 21)
  const familiar = afiliadoIdBD.substring(21, 30)
  
  console.log('📋 Datos del usuario:')
  console.log('   Email:      ', email)
  console.log('   AfiliadoId: ', afiliadoIdBD)
  console.log('')
  console.log('   Componentes:')
  console.log('   ├─ Titular:      ', titular, `(${parseInt(titular, 10)})`)
  console.log('   ├─ Organización: ', organizacion, `(${parseInt(organizacion, 10)})`)
  console.log('   └─ Familiar:     ', familiar, `(${parseInt(familiar, 10)})`)
  console.log('')
  
  // Analizar estructura
  if (familiar === '000000000') {
    console.log('⚠️  PROBLEMA DETECTADO: Familiar = 000000000')
    console.log('   SOAP suele interpretar esto como "vacío" y puede no devolver credenciales')
    console.log('   Solución: cambiar a 000000001 (o al número correcto del familiar)')
    console.log('')
  }
  
  if (organizacion === '000000000001') {
    console.log('⚠️  PROBLEMA POTENCIAL: Organización tiene padding extraño')
    console.log('   Organizacion:', organizacion, '→ debería ser formato más estándar')
    console.log('')
  }
  
  // Proponer alternativas
  console.log('💡 AfiliadoId alternativas a probar en SOAP:')
  const alternativas = [
    titular + organizacion + '000000001',  // Cambiar familiar a 1
    titular + '000000000001' + '000000000',  // Org mínima + sin familiar
    titular + '000000000001' + '000000001',   // Org mínima + familiar 1
  ]
  
  // Dedup
  const alternativasUnicas = [...new Set([afiliadoIdBD, ...alternativas])]
  alternativasUnicas.forEach((alt, i) => {
    const esSameOriginal = alt === afiliadoIdBD
    console.log(`   ${i + 1}. ${alt}${esSameOriginal ? ' (actual BD)' : ''}`)
  })
  console.log('')
  
  // Intentar login
  console.log('🔐 Intentando login con password 12345678...\n')
  
  try {
    const response = await axios.post('http://localhost:3000/auth/login', {
      username: email,
      password: '12345678'
    }, {
      timeout: 40000,
      validateStatus: () => true
    })
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('RESPUESTA LOGIN:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Status:', response.status)
    console.log('Data:', JSON.stringify(response.data, null, 2))
    console.log('')
    
    if (response.status === 403 && response.data.code === 'SIN_CREDENCIALES') {
      console.log('💔 LOGIN RECHAZADO: SOAP no devolvió credenciales')
      console.log('')
      console.log('🔍 DIAGNÓSTICO:')
      console.log('   1. GAM autenticó correctamente (password OK)')
      console.log('   2. SOAP consultado con AfiliadoId:', afiliadoIdBD)
      console.log('   3. SOAP devolvió array vacío de credenciales')
      console.log('')
      console.log('📝 POSIBLES CAUSAS:')
      console.log('   • AfiliadoId en BD está desactualizado/incorrecto')
      console.log('   • Formato de AfiliadoId no compatible con SOAP')
      console.log('   • Afiliado dado de baja en sistema OSEP')
      console.log('   • Problema con componente organización o familiar')
      console.log('')
      console.log('✅ SOLUCIÓN RECOMENDADA:')
      console.log('   1. Verificar en Genexus cuál es el AfiliadoId correcto actual')
      console.log('   2. Actualizar nuusuafili en BD:')
      console.log(`      UPDATE nuusuari SET nuusuafili = '[AfiliadoId_correcto]' WHERE nuusumail = '${email}';`)
      console.log('   3. Probar alguna de las alternativas sugeridas arriba')
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message)
    if (error.response) {
      console.error('   Status:', error.response.status)
      console.error('   Data:', JSON.stringify(error.response.data, null, 2))
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════\n')
}

debugLoginAlfredo()
