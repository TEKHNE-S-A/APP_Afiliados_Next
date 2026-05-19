// Verificar usuario hj@gmail.com y su contraseña
const db = require('./db/connection')

;(async () => {
  try {
    // Buscar usuario
    const userResult = await db.pool.query(
      `SELECT u.nuusuid, u.nuusumail, u.nuusuapell, u.nuusunroaf,
              a.nuusupass
       FROM nuusuari u
       LEFT JOIN nuusuauth a ON u.nuusuid = a.nuusuid
       WHERE u.nuusumail = $1`,
      ['hj@gmail.com']
    )
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }
    
    const user = userResult.rows[0]
    console.log('\n👤 Usuario hj@gmail.com:')
    console.log(`   ID: ${user.nuusuid}`)
    console.log(`   Email: ${user.nuusumail}`)
    console.log(`   Apellido: ${user.nuusuapell}`)
    console.log(`   NroAfiliado/DNI: ${user.nuusunroaf}`)
    console.log(`   Tiene contraseña: ${user.nuusupass ? 'SÍ' : 'NO'}`)
    
    // Contar notificaciones
    const notifResult = await db.pool.query(
      'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE NOT leida) as no_leidas FROM notifications WHERE nuusuid = $1',
      [user.nuusuid]
    )
    
    const stats = notifResult.rows[0]
    console.log(`\n📬 Notificaciones:`)
    console.log(`   Total: ${stats.total}`)
    console.log(`   No leídas: ${stats.no_leidas}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
