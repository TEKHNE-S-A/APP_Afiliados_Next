/**
 * Eliminar registros de nuusuauth creados por el script de reparación
 */

const db = require('./db/connection')

// Los 9 usuarios que fueron reparados
const usersToDelete = [
  'franb@gmail.com',
  'albertodahbar1@gmail.com',
  'alfredofalletto@gmail.com',
  'ppinetta2012@gmail.com',
  'marianofu10@gmail.com',
  'rubenpennise@gmail.com',
  'patricio.pinetta@tekhne.com.ar',
  'alvaro.santillan@tekhne.com.ar',
  'rubenpennise@hotmail.com'
]

async function deleteTempNuusuauth() {
  console.log('🗑️  ELIMINANDO REGISTROS DE NUUSUAUTH\n')
  console.log('====================================================')
  console.log(`Usuarios a eliminar: ${usersToDelete.length}`)
  console.log('====================================================\n')

  try {
    let deleted = 0
    let errors = 0

    for (const email of usersToDelete) {
      try {
        // Buscar nuusuid del usuario
        const userResult = await db.query(
          'SELECT nuusuid FROM nuusuari WHERE nuusumail = $1',
          [email]
        )

        if (userResult.rows.length === 0) {
          console.log(`⚠️  Usuario no encontrado en nuusuari: ${email}`)
          continue
        }

        const nuusuid = userResult.rows[0].nuusuid

        // Eliminar de nuusuauth
        const deleteResult = await db.query(
          'DELETE FROM nuusuauth WHERE nuusuid = $1',
          [nuusuid]
        )

        if (deleteResult.rowCount > 0) {
          deleted++
          console.log(`✅ ${deleted}/${usersToDelete.length} - ${email}`)
        } else {
          console.log(`⚠️  No había registro en nuusuauth: ${email}`)
        }
      } catch (error) {
        errors++
        console.error(`❌ Error eliminando ${email}:`, error.message)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('RESUMEN')
    console.log('='.repeat(80))
    console.log(`✅ Eliminados: ${deleted}`)
    console.log(`❌ Errores: ${errors}`)
    console.log('='.repeat(80))

    return { deleted, errors }

  } catch (error) {
    console.error('❌ Error fatal:', error)
    throw error
  }
}

// Ejecutar
if (require.main === module) {
  deleteTempNuusuauth()
    .then(() => {
      console.log('\n✅ Operación completada')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Error fatal:', error.message)
      process.exit(1)
    })
}

module.exports = { deleteTempNuusuauth }
