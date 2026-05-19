// Migrar hj@gmail.com a ID numérico legacy
const db = require('./db/connection')
const crypto = require('crypto')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

;(async () => {
  try {
    // 1. Obtener datos actuales
    const userResult = await db.pool.query(
      `SELECT u.*, a.nuusupass 
       FROM nuusuari u 
       LEFT JOIN nuusuauth a ON u.nuusuid = a.nuusuid 
       WHERE u.nuusumail = $1`,
      ['hj@gmail.com']
    )
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }
    
    const oldUser = userResult.rows[0]
    console.log(`Usuario actual: ${oldUser.nuusuid} (${oldUser.nuusumail})`)
    
    // 2. Generar nuevo ID numérico
    const newId = String(Date.now()).slice(-20).padStart(36, '0')
    console.log(`Nuevo ID legacy: ${newId}`)
    
    // 3. Ejecutar migración
    const client = await db.pool.connect()
    try {
      await client.query('BEGIN')
      
      // Copiar notificaciones a temp
      await client.query(
        `CREATE TEMP TABLE temp_notif AS 
         SELECT * FROM notifications WHERE nuusuid = $1`,
        [oldUser.nuusuid]
      )
      console.log('✅ Notificaciones copiadas a temp')
      
      // Eliminar registros antiguos (CASCADE eliminará nuusuauth automáticamente)
      await client.query('DELETE FROM notifications WHERE nuusuid = $1', [oldUser.nuusuid])
      await client.query('DELETE FROM nuusuari WHERE nuusuid = $1', [oldUser.nuusuid])
      console.log('✅ Registros antiguos eliminados')
      
      // Insertar nuevo usuario
      await client.query(
        `INSERT INTO nuusuari (
          nuusuid, nuusumail, nuusuapell, nuusunroaf, 
          nuusuafili, nuplaid, nuusuestit, nuusufecha
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          newId,
          oldUser.nuusumail,
          oldUser.nuusuapell,
          oldUser.nuusunroaf,
          oldUser.nuusuafili,
          oldUser.nuplaid,
          oldUser.nuusuestit,
          oldUser.nuusufecha || new Date()
        ]
      )
      console.log('✅ Nuevo usuario insertado')
      
      // Insertar contraseña
      const hashedPassword = oldUser.nuusupass || hashPassword('12345678')
      await client.query(
        `INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
         VALUES ($1, $2, NOW(), NOW())`,
        [newId, hashedPassword]
      )
      console.log('✅ Contraseña migrada')
      
      // Restaurar notificaciones
      await client.query(
        `INSERT INTO notifications (nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, metadata)
         SELECT $1, tipo, titulo, mensaje, leida, fecha_creacion, metadata
         FROM temp_notif`,
        [newId]
      )
      console.log('✅ Notificaciones restauradas')
      
      await client.query('COMMIT')
      console.log('\n✅ Migración completada exitosamente')
      console.log(`   Nuevo ID: ${newId}`)
      console.log(`   Email: hj@gmail.com`)
      console.log(`   Contraseña: 12345678`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
})()
