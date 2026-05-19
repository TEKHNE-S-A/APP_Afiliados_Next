// Test completo de notificaciones para hj@gmail.com
const axios = require('axios')
const db = require('./db/connection')

;(async () => {
  try {
    console.log('\n=== 1. Verificar usuario en BD ===')
    
    // Buscar usuario
    const userResult = await db.pool.query(
      'SELECT nuusuid, nuusumail, nuusuapell FROM nuusuari WHERE nuusumail = $1',
      ['hj@gmail.com']
    )
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario hj@gmail.com no encontrado')
      process.exit(1)
    }
    
    const user = userResult.rows[0]
    console.log(`✅ Usuario encontrado:`)
    console.log(`   ID: ${user.nuusuid}`)
    console.log(`   Email: ${user.nuusumail}`)
    console.log(`   Apellido: ${user.nuusuapell}`)
    
    // Verificar notificaciones en BD
    console.log('\n=== 2. Verificar notificaciones en BD ===')
    const notifBD = await db.pool.query(
      `SELECT id, tipo, titulo, LEFT(mensaje, 50) as mensaje, leida, fecha_creacion 
       FROM notifications 
       WHERE nuusuid = $1 
       ORDER BY fecha_creacion DESC`,
      [user.nuusuid]
    )
    
    console.log(`Total en BD: ${notifBD.rows.length}`)
    notifBD.rows.forEach((n, i) => {
      console.log(`\n${i + 1}. ${n.titulo}`)
      console.log(`   Leída: ${n.leida}`)
      console.log(`   Fecha: ${n.fecha_creacion}`)
    })
    
    // Test login
    console.log('\n=== 3. Test login ===')
    const loginResponse = await axios.post('http://localhost:3000/auth/login', {
      username: 'hj@gmail.com',
      password: '12345678'
    })
    
    const token = loginResponse.data.token
    console.log('✅ Login exitoso')
    console.log(`Token: ${token.substring(0, 20)}...`)
    
    // Test GET /notifications
    console.log('\n=== 4. Test GET /notifications ===')
    const notifResponse = await axios.get('http://localhost:3000/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const notifications = notifResponse.data
    console.log(`\n✅ Notificaciones recibidas del API: ${notifications.length}`)
    
    if (notifications.length > 0) {
      notifications.forEach((n, i) => {
        console.log(`\n${i + 1}. ${n.titulo}`)
        console.log(`   Tipo: ${n.tipo}`)
        console.log(`   Mensaje: ${n.mensaje.substring(0, 60)}...`)
        console.log(`   Leída: ${n.leida}`)
        console.log(`   Fecha: ${n.fecha_creacion}`)
      })
    } else {
      console.log('⚠️  No se recibieron notificaciones del API')
      console.log('   Verificar que el usuario tiene el token correcto')
    }
    
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
