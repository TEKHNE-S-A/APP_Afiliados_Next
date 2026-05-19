// Enviar notificación a diana76ar@gmail.com (usuario funcional)
const db = require('./db/connection')

;(async () => {
  try {
    // Buscar usuario diana76ar@gmail.com
    const userResult = await db.pool.query(
      'SELECT nuusuid, nuusumail, nuusuapell FROM nuusuari WHERE nuusumail = $1',
      ['diana76ar@gmail.com']
    )
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario diana76ar@gmail.com no encontrado')
      process.exit(1)
    }
    
    const user = userResult.rows[0]
    console.log(`✅ Usuario encontrado: ${user.nuusumail}`)
    console.log(`   ID: ${user.nuusuid}`)
    console.log(`   Apellido: ${user.nuusuapell}`)
    
    // Insertar notificación de prueba
    await db.pool.query(
      `INSERT INTO notifications (nuusuid, tipo, titulo, mensaje, metadata) 
      VALUES ($1, $2, $3, $4, $5)`,
      [
        user.nuusuid,
        'sistema',
        '🎉 Notificación de prueba',
        'Esta es una notificación de prueba generada automáticamente. ¡El sistema de notificaciones está funcionando correctamente!',
        JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      ]
    )
    
    console.log('✅ Notificación enviada exitosamente')
    
    // Contar notificaciones totales
    const countResult = await db.pool.query(
      'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE NOT leida) as no_leidas FROM notifications WHERE nuusuid = $1',
      [user.nuusuid]
    )
    
    const stats = countResult.rows[0]
    console.log(`\n📬 Estadísticas:`)
    console.log(`   Total notificaciones: ${stats.total}`)
    console.log(`   No leídas: ${stats.no_leidas}`)
    
    console.log(`\n📱 Para ver en la app:`)
    console.log(`   Email: diana76ar@gmail.com`)
    console.log(`   Contraseña: 123456`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
