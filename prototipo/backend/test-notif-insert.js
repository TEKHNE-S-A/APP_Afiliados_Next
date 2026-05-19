// Test rápido de notificaciones
const db = require('./db/connection')

;(async () => {
  try {
    const nuusuid = '0000000000000000000000000000000000000016' // diana76ar@gmail.com
    
    // Insertar notificación de prueba
    await db.pool.query(
      `INSERT INTO notifications (nuusuid, tipo, titulo, mensaje, metadata) 
      VALUES ($1, $2, $3, $4, $5)`,
      [nuusuid, 'sistema', 'Bienvenido al sistema', 'Tu cuenta ha sido activada correctamente', '{}']
    )
    
    console.log('✅ Notificación de prueba creada')
    
    // Listar notificaciones del usuario
    const result = await db.pool.query(
      'SELECT * FROM notifications WHERE nuusuid = $1 ORDER BY fecha_creacion DESC',
      [nuusuid]
    )
    
    console.log(`\n📬 Notificaciones para usuario 20120282388: ${result.rows.length}`)
    result.rows.forEach((n, idx) => {
      console.log(`\n${idx + 1}. ${n.titulo}`)
      console.log(`   ${n.mensaje}`)
      console.log(`   Leída: ${n.leida}`)
      console.log(`   Fecha: ${n.fecha_creacion}`)
    })
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
