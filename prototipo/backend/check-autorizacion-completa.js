// Verifica datos completos de la autorización específica
const db = require('./db/connection')

const ausolicid = '276b6ba2-5764-46f1-ae9d-4f4a1b086149'

;(async () => {
  try {
    const result = await db.pool.query(
      'SELECT * FROM ausolici WHERE ausolicid = $1',
      [ausolicid]
    )
    
    if (result.rows.length === 0) {
      console.log('❌ Autorización no encontrada')
      process.exit(1)
    }
    
    const auth = result.rows[0]
    
    console.log('\n📋 Datos completos de la autorización:\n')
    console.log('ID Local (ausolicid):', auth.ausolicid)
    console.log('ID SIA (ausolextid):', auth.ausolextid || 'N/A')
    console.log('Descripción:', auth.ausoldescr)
    console.log('Estado (ausolestad):', auth.ausolestad)
    console.log('N° Autorización (ausolautnu):', auth.ausolautnu || 'N/A')
    console.log('Tipo:', auth.ausoltipo)
    console.log('Cantidad:', auth.ausolcantp)
    console.log('Profesional:', auth.ausolpsoco || 'N/A')
    console.log('Fecha alta:', auth.ausolfecal)
    console.log('Fecha orden:', auth.ausolfecor)
    console.log('Prestación ID:', auth.autippreid || 'N/A')
    console.log('Texto:', auth.ausoltexto || 'N/A')
    console.log('\n')
    
    if (!auth.ausolextid || auth.ausolextid === '0') {
      console.log('⚠️  Esta autorización NO tiene ID de SIA (ausolextid)')
      console.log('   No se puede consultar en SIA para sincronizar estado/número')
      console.log('   Debe haber sido creada localmente sin pasar por SIA')
    } else {
      console.log('✅ Autorización tiene ID de SIA:', auth.ausolextid)
      console.log('   Se puede consultar en SIA usando REC_SOLICITUDES_APP')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
