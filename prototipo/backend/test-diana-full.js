// Test completo para diana76ar@gmail.com
const axios = require('axios')

;(async () => {
  try {
    console.log('\n=== Test de notificaciones para diana76ar@gmail.com ===\n')
    
    // 1. Login
    console.log('1. Login...')
    const loginResponse = await axios.post('http://localhost:3000/auth/login', {
      username: 'diana76ar@gmail.com',
      password: '123456'
    })
    
    const token = loginResponse.data.token
    console.log('✅ Login exitoso')
    console.log(`   Token: ${token.substring(0, 30)}...`)
    console.log(`   Usuario: ${loginResponse.data.user.email}`)
    
    // 2. GET /notifications
    console.log('\n2. Obtener notificaciones...')
    const notifResponse = await axios.get('http://localhost:3000/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const notifications = notifResponse.data
    console.log(`✅ Notificaciones obtenidas: ${notifications.length}`)
    
    if (notifications.length > 0) {
      notifications.forEach((n, i) => {
        console.log(`\n   ${i + 1}. ${n.titulo}`)
        console.log(`      Tipo: ${n.tipo}`)
        console.log(`      Leída: ${n.leida ? 'SÍ' : 'NO'}`)
        console.log(`      Fecha: ${new Date(n.fecha_creacion).toLocaleString('es-AR')}`)
      })
    }
    
    console.log('\n✅ Test completado exitosamente')
    console.log('\n📱 Ahora puedes ver las notificaciones en la app:')
    console.log('   1. Abre la app mobile (npx expo start)')
    console.log('   2. Login con diana76ar@gmail.com / 123456')
    console.log('   3. Ve a la pestaña Notificaciones')
    console.log(`   4. Verás ${notifications.filter(n => !n.leida).length} notificación(es) no leída(s)`)
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.response) {
      console.error('   Status:', error.response.status)
      console.error('   Data:', error.response.data)
    }
    process.exit(1)
  }
})()
