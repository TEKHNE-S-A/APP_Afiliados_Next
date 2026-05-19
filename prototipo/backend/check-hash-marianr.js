// Verifica hash de marianr@tekhne.com.ar y lo compara con hash universal de testing
const db = require('./db/connection')

const HASH_UNIVERSAL = 'b14d7c6d5de07e9ccde32778d3ec576d:a63157dee33c815fed355fd5bc1b704712e8e0b52388d062637e510e4d4b7e68b2f00608af0453874a2d13b9d15e629603ee389f4feca9d4428269780b5cbd96'

;(async () => {
  try {
    const result = await db.pool.query(
      `SELECT u.nuusuid, a.nuusupass
       FROM nuusuari u
       LEFT JOIN nuusuauth a ON u.nuusuid = a.nuusuid
       WHERE u.nuusumail = $1`,
      ['marianr@tekhne.com.ar']
    )

    if (result.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }

    const user = result.rows[0]
    console.log('\n🔍 Usuario:', 'marianr@tekhne.com.ar')
    console.log('   nuusuid:', user.nuusuid)
    console.log('   nuusupass:', user.nuusupass ? `${user.nuusupass.substring(0, 50)}...` : 'NULL')

    if (!user.nuusupass) {
      console.log('\n❌ NO tiene contraseña en nuusuauth')
      console.log('   Insertando hash universal de testing...')
      await db.pool.query(
        'INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) VALUES ($1, $2, NOW(), NOW())',
        [user.nuusuid, HASH_UNIVERSAL]
      )
      console.log('✅ Hash insertado - contraseña: 123456')
      process.exit(0)
    }

    if (user.nuusupass === HASH_UNIVERSAL) {
      console.log('✅ Hash universal ya está configurado')
      console.log('   Contraseña: 123456')
      process.exit(0)
    }

    console.log('\n⚠️  Hash diferente al universal')
    console.log('   Actualizando a hash universal...')
    await db.pool.query(
      'UPDATE nuusuauth SET nuusupass = $1, nuusuultm = NOW() WHERE nuusuid = $2',
      [HASH_UNIVERSAL, user.nuusuid]
    )
    console.log('✅ Hash actualizado - contraseña: 123456')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
