// Setear/actualizar contraseña local (legacy) en nuusuauth por email
// Uso:
//   node set-user-password.js --email user@dominio.com --password 12345678

const crypto = require('crypto')
const db = require('./db/connection')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(String(password), salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--email') args.email = argv[++i]
    else if (a === '--password') args.password = argv[++i]
  }
  return args
}

;(async () => {
  try {
    const { email, password } = parseArgs(process.argv)

    if (!email || !password) {
      console.log('Uso: node set-user-password.js --email user@dominio.com --password 12345678')
      process.exit(1)
    }

    const userResult = await db.pool.query(
      `SELECT nuusuid, nuusumail,
              CASE WHEN nuusuid ~ '^[0-9]+$' THEN false ELSE true END AS es_usuario_gam
       FROM nuusuari
       WHERE LOWER(nuusumail) = LOWER($1)
       LIMIT 1`,
      [String(email)]
    )

    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado en nuusuari:', email)
      process.exit(1)
    }

    const user = userResult.rows[0]
    console.log(`✅ Usuario encontrado: nuusuid=${user.nuusuid} email=${user.nuusumail}`)
    if (user.es_usuario_gam) {
      console.log('ℹ️  Nota: el usuario es GAM (nuusuid no numérico). Este script solo afecta la tabla legacy nuusuauth.')
    }

    const hashedPassword = hashPassword(password)

    const authResult = await db.pool.query(
      'SELECT nuusuid FROM nuusuauth WHERE nuusuid = $1',
      [user.nuusuid]
    )

    if (authResult.rows.length > 0) {
      await db.pool.query(
        'UPDATE nuusuauth SET nuusupass = $1, nuusuultm = NOW() WHERE nuusuid = $2',
        [hashedPassword, user.nuusuid]
      )
      console.log('✅ Contraseña actualizada (nuusuauth).')
    } else {
      await db.pool.query(
        'INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) VALUES ($1, $2, NOW(), NOW())',
        [user.nuusuid, hashedPassword]
      )
      console.log('✅ Contraseña creada (nuusuauth).')
    }

    console.log(`\n📋 Credenciales (local/legacy):`)
    console.log(`   Email: ${user.nuusumail}`)
    console.log(`   Password: ${password}`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error && error.message ? error.message : String(error))
    process.exit(1)
  }
})()
