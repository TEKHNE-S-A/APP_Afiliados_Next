// Verificar diana76ar@gmail.com
const db = require('./db/connection')
const crypto = require('crypto')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

;(async () => {
  try {
    const result = await db.pool.query(
      `SELECT u.nuusuid, u.nuusumail, u.nuusuapell, a.nuusupass
       FROM nuusuari u
       LEFT JOIN nuusuauth a ON u.nuusuid = a.nuusuid
       WHERE u.nuusumail = $1`,
      ['diana76ar@gmail.com']
    )
    
    if (result.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }
    
    const user = result.rows[0]
    console.log('\n👤 Usuario diana76ar@gmail.com:')
    console.log(`   ID: ${user.nuusuid}`)
    console.log(`   Tipo: ${/^\d+$/.test(user.nuusuid) ? 'LEGACY (numérico)' : 'GAM (UUID)'}`)
    console.log(`   Apellido: ${user.nuusuapell}`)
    console.log(`   Tiene contraseña: ${user.nuusupass ? 'SÍ' : 'NO'}`)
    
    if (!user.nuusupass) {
      console.log('\n⚠️  Creando contraseña 123456...')
      const hashedPassword = hashPassword('123456')
      await db.pool.query(
        'INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) VALUES ($1, $2, NOW(), NOW())',
        [user.nuusuid, hashedPassword]
      )
      console.log('✅ Contraseña creada')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
