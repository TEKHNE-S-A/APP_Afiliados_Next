// Resetear contraseña de diana76ar@gmail.com a 123456
const db = require('./db/connection')
const crypto = require('crypto')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

;(async () => {
  try {
    const userResult = await db.pool.query(
      'SELECT nuusuid FROM nuusuari WHERE nuusumail = $1',
      ['diana76ar@gmail.com']
    )
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }
    
    const nuusuid = userResult.rows[0].nuusuid
    const hashedPassword = hashPassword('123456')
    
    // Verificar si existe en nuusuauth
    const authResult = await db.pool.query(
      'SELECT nuusuid FROM nuusuauth WHERE nuusuid = $1',
      [nuusuid]
    )
    
    if (authResult.rows.length > 0) {
      // Actualizar
      await db.pool.query(
        'UPDATE nuusuauth SET nuusupass = $1, nuusuultm = NOW() WHERE nuusuid = $2',
        [hashedPassword, nuusuid]
      )
      console.log('✅ Contraseña actualizada a: 123456')
    } else {
      // Insertar
      await db.pool.query(
        'INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) VALUES ($1, $2, NOW(), NOW())',
        [nuusuid, hashedPassword]
      )
      console.log('✅ Contraseña creada: 123456')
    }
    
    console.log('\n📱 Credenciales:')
    console.log('   Email: diana76ar@gmail.com')
    console.log('   Contraseña: 123456')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
