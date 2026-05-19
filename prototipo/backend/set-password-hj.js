// Configurar contraseña 123456 para hj@gmail.com
const crypto = require('crypto')
const db = require('./db/connection')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

;(async () => {
  try {
    // Buscar usuario
    const userResult = await db.pool.query(
      'SELECT nuusuid, nuusumail FROM nuusuari WHERE nuusumail = $1',
      ['hj@gmail.com']
    )
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }
    
    const user = userResult.rows[0]
    console.log(`✅ Usuario encontrado: ${user.nuusuid}`)
    
    // Verificar si ya tiene contraseña
    const authResult = await db.pool.query(
      'SELECT nuusuid FROM nuusuauth WHERE nuusuid = $1',
      [user.nuusuid]
    )
    
    if (authResult.rows.length > 0) {
      console.log('⚠️  El usuario ya tiene contraseña, actualizando...')
      const hashedPassword = hashPassword('12345678')
      await db.pool.query(
        'UPDATE nuusuauth SET nuusupass = $1, nuusuultm = NOW() WHERE nuusuid = $2',
        [hashedPassword, user.nuusuid]
      )
      console.log('✅ Contraseña actualizada a: 12345678')
    } else {
      console.log('Creando nueva contraseña...')
      const hashedPassword = hashPassword('12345678')
      await db.pool.query(
        'INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) VALUES ($1, $2, NOW(), NOW())',
        [user.nuusuid, hashedPassword]
      )
      console.log('✅ Contraseña creada: 12345678')
    }
    
    console.log('\n📋 Ahora puedes hacer login en la app con:')
    console.log(`   Email: hj@gmail.com`)
    console.log(`   Contraseña: 12345678`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
