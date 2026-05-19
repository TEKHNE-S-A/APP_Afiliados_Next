/**
 * Script de reparación masiva
 * Encuentra usuarios GAM en nuusuari que NO tienen entrada en nuusuauth
 * y crea las entradas faltantes con contraseña por defecto
 */

const db = require('./db/connection')
const crypto = require('crypto')

const DEFAULT_PASSWORD = '123456' // Password por defecto para usuarios reparados

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

async function repairMissingNuusuauth() {
  console.log('🔧 REPARACIÓN MASIVA DE NUUSUAUTH FALTANTES\n')
  console.log('====================================================')
  console.log(`Password por defecto: ${DEFAULT_PASSWORD}`)
  console.log('====================================================\n')

  try {
    // 1️⃣ Buscar usuarios GAM sin entrada en nuusuauth
    console.log('🔍 Buscando usuarios sin nuusuauth...')
    const missingAuthResult = await db.query(`
      SELECT 
        u.nuusuid,
        u.nuusumail,
        u.nuusuapell,
        u.nuusunroaf,
        CASE 
          WHEN u.nuusuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
          THEN 'GAM (GUID)'
          WHEN u.nuusuid ~ '^[0-9]+$' 
          THEN 'LEGACY (numérico)'
          ELSE 'DESCONOCIDO'
        END as tipo_nuusuid
      FROM nuusuari u
      LEFT JOIN nuusuauth a ON u.nuusuid = a.nuusuid
      WHERE a.nuusuid IS NULL
        AND (u.nuusubajaf IS NULL OR EXTRACT(YEAR FROM u.nuusubajaf) <= 1900)  -- Solo usuarios activos (incluye fechas inválidas)
      ORDER BY u.nuusufecha DESC
    `)

    const missingUsers = missingAuthResult.rows
    console.log(`\n📊 Encontrados: ${missingUsers.length} usuarios sin nuusuauth\n`)

    if (missingUsers.length === 0) {
      console.log('✅ No hay usuarios que reparar')
      return { repaired: 0, errors: 0 }
    }

    // Mostrar preview
    console.log('Usuarios a reparar:')
    console.log('─'.repeat(80))
    missingUsers.forEach((u, idx) => {
      const guid = u.nuusuid.trim()
      console.log(`${idx + 1}. ${u.nuusumail || u.nuusunroaf}`)
      console.log(`   nuusuid: ${guid}`)
      console.log(`   Tipo: ${u.tipo_nuusuid}`)
      console.log(`   Nombre: ${u.nuusuapell || 'N/A'}`)
      console.log('')
    })

    // Confirmar ejecución
    if (process.argv.includes('--dry-run')) {
      console.log('🏃 DRY RUN - No se aplicarán cambios')
      return { repaired: 0, errors: 0, dryRun: true }
    }

    console.log('⚠️  Iniciando reparación...\n')

    // 2️⃣ Crear entradas en nuusuauth
    let repaired = 0
    let errors = 0
    const passwordHash = hashPassword(DEFAULT_PASSWORD)

    for (const user of missingUsers) {
      const nuusuid = user.nuusuid // NO trim - preservar 40 chars para FK
      const email = user.nuusumail || user.nuusunroaf
      
      try {
        await db.query(
          `INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
           VALUES ($1, $2, NOW(), NOW())`,
          [nuusuid, passwordHash]
        )
        
        repaired++
        console.log(`✅ ${repaired}/${missingUsers.length} - ${email}`)
      } catch (error) {
        errors++
        console.error(`❌ Error reparando ${email}:`, error.message)
      }
    }

    // 3️⃣ Resumen
    console.log('\n' + '='.repeat(80))
    console.log('RESUMEN DE REPARACIÓN')
    console.log('='.repeat(80))
    console.log(`✅ Reparados exitosamente: ${repaired}`)
    console.log(`❌ Errores: ${errors}`)
    console.log(`📊 Total procesados: ${missingUsers.length}`)
    console.log(`🔑 Password asignado: ${DEFAULT_PASSWORD}`)
    console.log('='.repeat(80))

    return { repaired, errors, total: missingUsers.length }

  } catch (error) {
    console.error('❌ Error fatal:', error)
    throw error
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run')
  
  if (isDryRun) {
    console.log('🏃 MODO DRY RUN - Solo mostrar usuarios afectados\n')
  }

  repairMissingNuusuauth()
    .then((result) => {
      if (result.dryRun) {
        console.log('\n✅ Dry run completado')
        console.log('   Para ejecutar la reparación, ejecute sin --dry-run')
      } else {
        console.log('\n✅ Reparación completada')
      }
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Error fatal:', error.message)
      process.exit(1)
    })
}

module.exports = { repairMissingNuusuauth }
