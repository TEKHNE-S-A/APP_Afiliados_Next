/**
 * Script de prueba para validar el nuevo flujo de login con validación SOAP
 */

const http = require('http')

async function testLogin(email, password, testName) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`TEST: ${testName}`)
  console.log(`${'='.repeat(80)}`)
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
  
  const loginData = JSON.stringify({ username: email, password })

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  }

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          console.log(`\nStatus: ${res.statusCode}`)
          console.log(`Response:`)
          console.log(JSON.stringify(response, null, 2))
          
          if (res.statusCode === 200) {
            console.log(`\n✅ LOGIN EXITOSO`)
            if (response.credenciales) {
              console.log(`   Credenciales: ${response.credenciales.length}`)
            }
          } else if (res.statusCode === 403) {
            console.log(`\n⚠️  AFILIACIÓN NO VIGENTE (esperado)`)
            console.log(`   Code: ${response.code}`)
            console.log(`   Message: ${response.message}`)
          } else {
            console.log(`\n❌ ERROR: ${response.error}`)
          }
          
          resolve(response)
        } catch (e) {
          console.log(`\nRaw response: ${data}`)
          resolve(data)
        }
      })
    })
    
    req.on('error', reject)
    req.write(loginData)
    req.end()
  })
}

async function runTests() {
  console.log('🧪 TESTS DE VALIDACIÓN SOAP EN LOGIN\n')
  
  // Test 1: Usuario con credenciales válidas (marianr@tekhne.com.ar)
  await testLogin(
    'marianr@tekhne.com.ar',
    '123456',
    'Usuario con credenciales SOAP válidas'
  )
  
  await new Promise(r => setTimeout(r, 2000))
  
  // Test 2: Usuario sin credenciales en SOAP (ppinetta@gmail.com)
  await testLogin(
    'ppinetta@gmail.com',
    'ppinetta26',
    'Usuario SIN credenciales en SOAP (debe rechazar)'
  )
  
  console.log(`\n${'='.repeat(80)}`)
  console.log('TESTS COMPLETADOS')
  console.log(`${'='.repeat(80)}\n`)
}

runTests().catch(console.error)
