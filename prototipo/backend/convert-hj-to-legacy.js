// Convertir usuario hj@gmail.com a formato legacy (nuusuid numérico)
// para que use autenticación local en lugar de GAM
const db = require('./db/connection')

;(async () => {
  try {
    // Verificar usuario actual
    const currentResult = await db.pool.query(
      'SELECT nuusuid, nuusumail FROM nuusuari WHERE nuusumail = $1',
      ['hj@gmail.com']
    )
    
    if (currentResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }
    
    const currentUser = currentResult.rows[0]
    console.log(`Usuario actual:`)
    console.log(`  ID: ${currentUser.nuusuid}`)
    console.log(`  Tipo: ${/^\d+$/.test(currentUser.nuusuid) ? 'LEGACY' : 'GAM (UUID)'}`)
    
    // Generar nuevo ID numérico único (formato legacy)
    const newId = String(Date.now()).slice(-20).padStart(36, '0')
    console.log(`\nNuevo ID legacy: ${newId}`)
    
    // Actualizar en transacción
    const client = await db.pool.connect()
    try {
      await client.query('BEGIN')
      
      // Deshabilitar constraints temporalmente
      await client.query('SET CONSTRAINTS ALL DEFERRED')
      
      // Actualizar nuusuari
      await client.query(
        'UPDATE nuusuari SET nuusuid = $1 WHERE nuusuid = $2',
        [newId, currentUser.nuusuid]
      )
      console.log('✅ nuusuari actualizado')
      
      // Actualizar nuusuauth
      await client.query(
        'UPDATE nuusuauth SET nuusuid = $1 WHERE nuusuid = $2',
        [newId, currentUser.nuusuid]
      )
      console.log('✅ nuusuauth actualizado')
      
      // Actualizar notifications
      await client.query(
        'UPDATE notifications SET nuusuid = $1 WHERE nuusuid = $2',
        [newId, currentUser.nuusuid]
      )
      console.log('✅ notifications actualizado')
      
      await client.query('COMMIT')
      console.log('\n✅ Usuario convertido exitosamente a formato legacy')
      console.log('   Ahora usará autenticación local (no GAM)')
      console.log(`   Nuevo ID: ${newId}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
})()
