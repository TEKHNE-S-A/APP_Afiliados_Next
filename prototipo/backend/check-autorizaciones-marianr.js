// Verifica autorizaciones de marianr@tekhne.com.ar
const db = require('./db/connection')

;(async () => {
  try {
    const user = await db.pool.query(
      'SELECT nuusuid, nuusumail, nuusuafili FROM nuusuari WHERE nuusumail = $1',
      ['marianr@tekhne.com.ar']
    )
    
    if (user.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }
    
    const nuusuid = user.rows[0].nuusuid
    console.log('\n👤 Usuario:', user.rows[0].nuusumail)
    console.log('   nuusuid:', nuusuid)
    console.log('   AfiliadoId:', user.rows[0].nuusuafili)
    
    const auths = await db.pool.query(
      'SELECT COUNT(*) as total FROM ausolici WHERE nuusuid = $1',
      [nuusuid]
    )
    
    console.log('\n📋 Autorizaciones en BD local (ausolici):', auths.rows[0].total)
    
    if (auths.rows[0].total > 0) {
      const sample = await db.pool.query(
        'SELECT ausolicid, ausoldescr, ausoltipo, ausolestad, ausolfecal FROM ausolici WHERE nuusuid = $1 ORDER BY ausolfecal DESC LIMIT 5',
        [nuusuid]
      )
      
      console.log('\n📄 Últimas 5 autorizaciones:')
      sample.rows.forEach((s, i) => {
        console.log(`   ${i+1}. ID: ${s.ausolicid}`)
        console.log(`      Descripción: ${s.ausoldescr || 'N/A'}`)
        console.log(`      Tipo: ${s.ausoltipo} | Estado: ${s.ausolestad}`)
        console.log(`      Fecha: ${s.ausolfecal}`)
      })
    } else {
      console.log('\n⚠️  Este usuario NO tiene autorizaciones guardadas en BD local')
      console.log('   Las autorizaciones deben crearse desde la app o existir en el sistema SIA')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
