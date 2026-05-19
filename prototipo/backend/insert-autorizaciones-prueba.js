// Inserta autorizaciones de prueba para marianr@tekhne.com.ar
const db = require('./db/connection')
const { v4: uuidv4 } = require('uuid')

;(async () => {
  try {
    // Obtener nuusuid del usuario
    const user = await db.pool.query(
      'SELECT nuusuid, nuusuafili FROM nuusuari WHERE nuusumail = $1',
      ['marianr@tekhne.com.ar']
    )
    
    if (user.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }
    
    const nuusuid = user.rows[0].nuusuid
    const afiliadoId = user.rows[0].nuusuafili
    
    console.log('👤 Usuario:', 'marianr@tekhne.com.ar')
    console.log('   nuusuid:', nuusuid)
    console.log('   AfiliadoId:', afiliadoId)
    
    // Crear 3 autorizaciones de prueba
    const autorizaciones = [
      {
        descripcion: 'CONSULTA MÉDICA - Clínica General',
        tipo: 'P',
        estado: 'AUT',
        autNumero: 'AUT-2024-001234',
        cantidad: 1,
        profesional: 'Dr. García Juan'
      },
      {
        descripcion: 'ANÁLISIS DE LABORATORIO',
        tipo: 'P',
        estado: 'PEN',
        autNumero: null,
        cantidad: 1,
        profesional: 'Lab. Central'
      },
      {
        descripcion: 'ECOGRAFÍA ABDOMINAL',
        tipo: 'S',
        estado: 'AUT',
        autNumero: 'AUT-2024-001256',
        cantidad: 1,
        profesional: 'Dr. Martínez Luis'
      }
    ]
    
    console.log('\n📝 Insertando autorizaciones de prueba...')
    
    for (const auth of autorizaciones) {
      const ausolicid = uuidv4()
      
      await db.pool.query(
        `INSERT INTO ausolici (
          ausolicid, nuusuid, ausoldescr, ausoltipo, ausolestad,
          ausolautnu, ausolcantp, ausolpsoco, ausolfecal, ausolfecor,
          ausoltexto
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9)`,
        [
          ausolicid,
          nuusuid,
          auth.descripcion,
          auth.tipo,
          auth.estado,
          auth.autNumero,
          auth.cantidad,
          auth.profesional,
          auth.descripcion
        ]
      )
      
      console.log(`   ✅ ${auth.descripcion} (${auth.estado})`)
    }
    
    console.log('\n✅ Autorizaciones de prueba creadas exitosamente')
    console.log('   Ahora puedes hacer login en la app y verás 3 autorizaciones en "Mis Autorizaciones"')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
