/**
 * Test login para alfredofalletto@gmail.com
 * Analiza la respuesta completa del backend
 */

const axios = require('axios')

async function testLoginAlfredo() {
  console.log('═════════════════════════════════════════════════════════')
  console.log('TEST LOGIN: alfredofalletto@gmail.com')
  console.log('═════════════════════════════════════════════════════════\n')

  try {
    console.log('🔐 Intentando login...')
    console.log('   Email: alfredofalletto@gmail.com')
    console.log('   Password: [testing with common password]')
    console.log('')

    const response = await axios.post('http://localhost:3000/auth/login', {
      username: 'alfredofalletto@gmail.com',
      password: '12345678'  // Contraseña real de GAM
    }, {
      timeout: 30000,
      validateStatus: () => true // Aceptar cualquier status code
    })

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('RESPUESTA DEL BACKEND:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n📊 Status Code:', response.status)
    console.log('\n📦 Response Data:')
    console.log(JSON.stringify(response.data, null, 2))
    console.log('')

    if (response.status === 403) {
      console.log('⚠️  LOGIN RECHAZADO (403)')
      console.log('   Código:', response.data.code)
      console.log('   Error:', response.data.error)
      console.log('   Mensaje:', response.data.message)
      if (response.data.details) {
        console.log('   Detalles:', response.data.details)
      }
      if (response.data.afiliadoId) {
        console.log('   AfiliadoId:', response.data.afiliadoId)
      }
    } else if (response.status === 401) {
      console.log('❌ CREDENCIALES INCORRECTAS (401)')
      console.log('   Mensaje:', response.data.message || response.data.error)
    } else if (response.status === 200) {
      console.log('✅ LOGIN EXITOSO (200)')
      console.log('   Token:', response.data.token ? 'Presente ✅' : 'Ausente ❌')
      console.log('   Usuario:', response.data.user ? 'Presente ✅' : 'Ausente ❌')
      console.log('   Credenciales:', response.data.credenciales ? `${response.data.credenciales.length} encontradas` : 'Ausentes')
    } else {
      console.log(`⚠️  STATUS CODE INESPERADO: ${response.status}`)
    }

    console.log('\n═════════════════════════════════════════════════════════\n')

  } catch (error) {
    console.error('❌ ERROR EJECUTANDO TEST:', error.message)
    if (error.response) {
      console.error('   Status:', error.response.status)
      console.error('   Data:', JSON.stringify(error.response.data, null, 2))
    } else {
      console.error('   Stack:', error.stack)
    }
  }
}

// Ejecutar
testLoginAlfredo()
