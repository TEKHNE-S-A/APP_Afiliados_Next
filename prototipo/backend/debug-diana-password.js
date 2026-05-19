// Debug contraseña de diana
const db = require('./db/connection')
const crypto = require('crypto')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':')
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === testHash
}

;(async () => {
  try {
    const result = await db.pool.query(
      `SELECT a.nuusupass
       FROM nuusuari u
       JOIN nuusuauth a ON u.nuusuid = a.nuusuid
       WHERE u.nuusumail = $1`,
      ['diana76ar@gmail.com']
    )
    
    if (result.rows.length === 0) {
      console.log('❌ No se encontró contraseña')
      process.exit(1)
    }
    
    const storedHash = result.rows[0].nuusupass
    console.log('\n🔐 Hash almacenado:')
    console.log(`   ${storedHash.substring(0, 50)}...`)
    
    console.log('\n✅ Verificando contraseña "123456":')
    const isValid = verifyPassword('123456', storedHash)
    console.log(`   Resultado: ${isValid ? 'VÁLIDA ✅' : 'INVÁLIDA ❌'}`)
    
    if (!isValid) {
      console.log('\n⚠️  La contraseña almacenada NO coincide con "123456"')
      console.log('   Probando con hash universal de testing...')
      
      const universalHash = 'b14d7c6d5de07e9ccde32778d3ec576d:a63157dee33c815fed355fd5bc1b704712e8e0b52388d062637e510e4d4b7e68b2f00608af0453874a2d13b9d15e629603ee389f4feca9d4428269780b5cbd96'
      
      await db.pool.query(
        'UPDATE nuusuauth SET nuusupass = $1 WHERE nuusuid = (SELECT nuusuid FROM nuusuari WHERE nuusumail = $2)',
        [universalHash, 'diana76ar@gmail.com']
      )
      
      console.log('✅ Hash universal aplicado')
      console.log('   Contraseña: 123456')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
