// Verifica IDs de autorizaciones para marianr@tekhne.com.ar
const db = require('./db/connection')

;(async () => {
  try {
    const user = await db.pool.query(
      'SELECT nuusuid FROM nuusuari WHERE nuusumail = $1',
      ['marianr@tekhne.com.ar']
    )
    
    if (user.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }
    
    const nuusuid = user.rows[0].nuusuid
    
    const auths = await db.pool.query(
      'SELECT ausolicid, ausoldescr, ausolestad, ausolautnu, ausolfecal FROM ausolici WHERE nuusuid = $1 ORDER BY ausolfecal DESC',
      [nuusuid]
    )
    
    console.log(`\n📋 Autorizaciones de marianr@tekhne.com.ar (${auths.rows.length}):\n`)
    
    auths.rows.forEach((auth, i) => {
      console.log(`${i+1}. ${auth.ausoldescr}`)
      console.log(`   ID: ${auth.ausolicid}`)
      console.log(`   Estado: ${auth.ausolestad}`)
      console.log(`   Nro Auth: ${auth.ausolautnu || 'N/A'}`)
      console.log(`   Fecha: ${auth.ausolfecal}`)
      console.log()
    })
    
    console.log('ℹ️  Nota: Las autorizaciones de prueba tienen UUID locales')
    console.log('   El servicio SIA NO las reconocerá porque no fueron creadas a través de SIA')
    console.log('   Respuesta esperada: AUSolId=0 (no encontrado)')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
