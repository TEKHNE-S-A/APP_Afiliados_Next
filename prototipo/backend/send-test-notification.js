// Enviar notificación de prueba a hj@gmail.com
const db = require('./db/connection')

;(async () => {
  try {
    // Buscar usuario hj@gmail.com
    const userResult = await db.pool.query(
      'SELECT nuusuid, nuusumail FROM nuusuari WHERE nuusumail = $1',
      ['hj@gmail.com']
    )
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario hj@gmail.com no encontrado')
      process.exit(1)
    }
    
    const user = userResult.rows[0]
    console.log(`✅ Usuario encontrado: ${user.nuusuid}`)
    
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
    
    console.log('✅ Notificación de prueba enviada exitosamente')
    
    // Verificar
    const notifResult = await db.pool.query(
      'SELECT id, titulo, mensaje, fecha_creacion FROM notifications WHERE nuusuid = $1 ORDER BY fecha_creacion DESC LIMIT 1',
      [user.nuusuid]
    )
    
    const notif = notifResult.rows[0]
    console.log('\n📬 Última notificación:')
    console.log(`   ID: ${notif.id}`)
    console.log(`   Título: ${notif.titulo}`)
    console.log(`   Mensaje: ${notif.mensaje}`)
    console.log(`   Fecha: ${notif.fecha_creacion}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
