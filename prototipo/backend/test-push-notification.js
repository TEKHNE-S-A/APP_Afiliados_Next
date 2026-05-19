// Test push notification para diana76ar@gmail.com
const db = require('./db/connection')

;(async () => {
  try {
    // 1. Buscar usuario
    const userResult = await db.pool.query(
      'SELECT nuusuid, nuusumail FROM nuusuari WHERE nuusumail = $1',
      ['diana76ar@gmail.com']
    )
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }
    
    const user = userResult.rows[0]
    console.log(`✅ Usuario: ${user.nuusumail}`)
    console.log(`   ID: ${user.nuusuid}`)
    
    // 2. Verificar push tokens registrados
    const tokensResult = await db.pool.query(
      'SELECT push_token, plataforma, fecha_registro FROM push_tokens WHERE nuusuid = $1 AND activo = TRUE',
      [user.nuusuid]
    )
    
    console.log(`\n📱 Push tokens registrados: ${tokensResult.rows.length}`)
    tokensResult.rows.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.plataforma}: ${t.push_token.substring(0, 30)}...`)
      console.log(`      Registrado: ${t.fecha_registro}`)
    })
    
    if (tokensResult.rows.length === 0) {
      console.log('\n⚠️  No hay dispositivos registrados para push notifications')
      console.log('   Debes hacer login en la app móvil primero')
      process.exit(0)
    }
    
    // 3. Enviar push notification de prueba usando Expo API
    const pushToken = tokensResult.rows[0].push_token
    console.log(`\n📤 Enviando push notification...`)
    
    const message = {
      to: pushToken,
      sound: 'default',
      title: '🔔 Test Push Notification',
      body: 'Esta es una notificación push de prueba desde el backend',
      data: { test: true, timestamp: new Date().toISOString() }
    }
    
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })
    
    const result = await response.json()
    console.log('\n📬 Respuesta Expo Push:', JSON.stringify(result, null, 2))
    
    if (result.data && result.data[0] && result.data[0].status === 'ok') {
      console.log('\n✅ Push notification enviada exitosamente!')
      console.log('   Revisa tu dispositivo móvil')
    } else {
      console.log('\n❌ Error enviando push notification')
      console.log('   Detalles:', result)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
})()
