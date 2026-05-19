const db = require('./db/connection')

async function testDirectInsert() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('TEST: Inserción directa en crcredus')
  console.log('═══════════════════════════════════════════════════════\n')

  try {
    // 1. Obtener datos del usuario
    const userResult = await db.query(
      'SELECT nuusuid, LENGTH(nuusuid) as len, nuusumail, nuusuafili FROM nuusuari WHERE nuusumail = $1',
      ['alfredofalletto@gmail.com']
    )
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }
    
    const user = userResult.rows[0]
    console.log('📋 Usuario encontrado:')
    console.log('   Email:      ', user.nuusumail)
    console.log('   UUID:       ', user.nuusuid)
    console.log('   UUID Length:', user.len)
    console.log('   AfiliadoId: ', user.nuusuafili)
    console.log('')
    
    // 2. Test: Insertar en crcredus usando el mismo GUID
    console.log('🧪 Test 1: INSERT directo en crcredus')
    console.log('   Usando nuusuid del resultado de query anterior')
    
    try {
      await db.query(
        `INSERT INTO crcredus (nuusuid, crcreid, crcrepropi)
         VALUES ($1, $2, $3)`,
        [user.nuusuid, user.nuusuafili, 'S']
      )
      console.log('   ✅ INSERT exitoso!')
      
      // Verificar que se insertó
      const checkResult = await db.query(
        'SELECT COUNT(*) as count FROM crcredus WHERE nuusuid = $1',
        [user.nuusuid]
      )
      console.log(`   📊 Registros en crcredus: ${checkResult.rows[0].count}`)
      
      // Limpiar test
      await db.query(
        'DELETE FROM crcredus WHERE nuusuid = $1 AND crcreid = $2',
        [user.nuusuid, user.nuusuafili]
      )
      console.log('   🧹 Limpieza completada')
      
    } catch (insertError) {
      console.log('   ❌ ERROR al insertar:', insertError.message)
      console.log('   Code:', insertError.code)
      console.log('   Detail:', insertError.detail)
    }
    
    console.log('')
    
    // 3. Test: Insertar usando GUID sin padding
    console.log('🧪 Test 2: INSERT con GUID sin padding (36 chars)')
    const guidSinPadding = user.nuusuid.trim()
    console.log('   GUID trimmed:', guidSinPadding)
    console.log('   Length:', guidSinPadding.length)
    
    try {
      await db.query(
        `INSERT INTO crcredus (nuusuid, crcreid, crcrepropi)
         VALUES ($1, $2, $3)`,
        [guidSinPadding, user.nuusuafili, 'S']
      )
      console.log('   ✅ INSERT exitoso con GUID trimmed!')
      
      // Limpiar
      await db.query(
        'DELETE FROM crcredus WHERE nuusuid = $1 AND crcreid = $2',
        [guidSinPadding, user.nuusuafili]
      )
      console.log('   🧹 Limpieza completada')
      
    } catch (insertError) {
      console.log('   ❌ ERROR al insertar:', insertError.message)
      console.log('   Code:', insertError.code)
      console.log('   Constraint:', insertError.constraint)
    }    console.log('')
    
    // 4. Comparar GUIDs
    console.log('🔍 Comparación de GUIDs:')
    const compareResult = await db.query(
      `SELECT 
        nuusuid = $1 as match_con_padding,
        nuusuid = $2 as match_sin_padding,
        LENGTH(nuusuid) as len_db,
        LENGTH($1::text) as len_con_padding,
        LENGTH($2::text) as len_sin_padding
      FROM nuusuari 
      WHERE nuusumail = $3`,
      [user.nuusuid, guidSinPadding, user.nuusumail]
    )
    console.log('   Resultados:', compareResult.rows[0])
    
    console.log('\n═══════════════════════════════════════════════════════\n')
    
  } catch (error) {
    console.error('❌ ERROR:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    process.exit(0)
  }
}

testDirectInsert()
