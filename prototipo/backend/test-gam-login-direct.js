const gamService = require('./gamService')

async function testGAMLogin() {
  console.log('🧪 Probando gamService.loginGAM()...\n')
  
  try {
    const result = await gamService.loginGAM('marianr@tekhne.com.ar', '12345678')
    
    console.log('✅ Resultado GAM Login:')
    console.log(JSON.stringify(result, null, 2))
    
    if (result.success && result.access_token) {
      console.log('\n✅ Token obtenido:', result.access_token.substring(0, 50) + '...')
      console.log('✅ UserID:', result.user_id)
    } else {
      console.log('\n❌ No se obtuvo token')
      console.log('Success:', result.success)
      console.log('Access token presente:', !!result.access_token)
    }
    
  } catch (error) {
    console.error('❌ Error en gamService.loginGAM():')
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    process.exit(0)
  }
}

testGAMLogin()
