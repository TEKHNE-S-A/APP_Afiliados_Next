/**
 * Script para sincronizar credenciales de un usuario manualmente
 * Útil cuando el login no sincronizó automáticamente
 */

const db = require('./db/connection')

async function syncUserCredentials(email) {
  let client
  try {
    // 1️⃣ Buscar usuario por email
    console.log(`\n🔍 Buscando usuario: ${email}`)
    const userResult = await db.query(
      'SELECT nuusuid, nuusumail, nuusuafili FROM nuusuari WHERE LOWER(nuusumail) = LOWER($1)',
      [email]
    )

    if (userResult.rows.length === 0) {
      throw new Error(`Usuario ${email} no encontrado en nuusuari`)
    }

    const user = userResult.rows[0]
    const nuusuid = user.nuusuid // NO trim - preservar 40 chars
    const afiliadoId = user.nuusuafili

    console.log(`✅ Usuario encontrado:`)
    console.log(`   nuusuid: ${nuusuid.trim()}`)
    console.log(`   nuusumail: ${user.nuusumail}`)
    console.log(`   nuusuafili: ${afiliadoId || 'NO DISPONIBLE'}`)

    if (!afiliadoId) {
      throw new Error('Usuario no tiene AfiliadoId - no se pueden sincronizar credenciales')
    }

    // 2️⃣ Importar y llamar a la función de sincronización del servidor
    console.log(`\n🚀 Sincronizando credenciales desde SOAP...`)
    
    // Necesitamos acceso a la función syncCredencialesGrupoFamiliar del servidor
    // Por ahora, vamos a hacer una petición HTTP al endpoint existente
    const http = require('http')
    
    // Primero hacer login para obtener token
    const loginData = JSON.stringify({
      username: email,
      password: 'ppinetta26' // Password conocido
    })

    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    }

    console.log(`\n🔐 Haciendo login para forzar sincronización...`)
    
    const loginResponse = await new Promise((resolve, reject) => {
      const req = http.request(loginOptions, (res) => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            resolve(data)
          }
        })
      })
      req.on('error', reject)
      req.write(loginData)
      req.end()
    })

    console.log(`\n✅ Respuesta del login:`)
    console.log(JSON.stringify(loginResponse, null, 2))

    if (loginResponse.credenciales && loginResponse.credenciales.length > 0) {
      console.log(`\n✅ Credenciales sincronizadas: ${loginResponse.credenciales.length}`)
      console.log(`\nCredenciales obtenidas:`)
      loginResponse.credenciales.forEach((c, idx) => {
        console.log(`  ${idx + 1}. ${c.crcreapeno} - ${c.crcrenroaf} (${c.crcrepropi === 'S' ? 'TITULAR' : 'FAMILIAR'})`)
      })
    } else {
      console.log(`\n⚠️  No se obtuvieron credenciales en el login`)
      if (loginResponse.sync) {
        console.log(`Sync stats:`, loginResponse.sync)
      }
      if (loginResponse.soapMensajes) {
        console.log(`SOAP mensajes:`, loginResponse.soapMensajes)
      }
    }

    // Verificar en BD
    console.log(`\n📊 Verificando en BD...`)
    const credCheck = await db.query(
      `SELECT COUNT(*) as total FROM crcredus WHERE nuusuid = $1`,
      [nuusuid]
    )
    console.log(`   Credenciales en crcredus: ${credCheck.rows[0].total}`)

  } catch (error) {
    console.error(`\n❌ Error:`, error.message)
    console.error(error.stack)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const email = process.argv[2]
  
  if (!email) {
    console.error('❌ Uso: node sync-credentials.js <email>')
    process.exit(1)
  }

  syncUserCredentials(email)
    .then(() => {
      console.log('\n✅ Script completado')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Error fatal:', error.message)
      process.exit(1)
    })
}

module.exports = { syncUserCredentials }
