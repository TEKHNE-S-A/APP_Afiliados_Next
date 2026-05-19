const db = require('./db/connection')

async function checkGuidLength() {
  try {
    const result = await db.query(
      `SELECT 
        nuusuid, 
        LENGTH(nuusuid) as len, 
        nuusumail,
        CASE 
          WHEN LENGTH(nuusuid) = 36 THEN 'GUID sin padding'
          WHEN LENGTH(nuusuid) = 40 THEN 'GUID con padding (OK)'
          ELSE 'Longitud inesperada'
        END as estado
      FROM nuusuari 
      WHERE nuusumail = $1`,
      ['alfredofalletto@gmail.com']
    )
    
    if (result.rows.length === 0) {
      console.log('❌ Usuario no encontrado')
      process.exit(1)
    }
    
    const user = result.rows[0]
    console.log('════════════════════════════════════════════')
    console.log('VERIFICACIÓN LONGITUD GUID')
    console.log('════════════════════════════════════════════')
    console.log('Email:     ', user.nuusumail)
    console.log('UUID:      ', user.nuusuid)
    console.log('Longitud:  ', user.len)
    console.log('Estado:    ', user.estado)
    console.log('')
    
    // Verificar si existe en crcredus
    const credusCheck = await db.query(
      'SELECT COUNT(*) as count FROM crcredus WHERE nuusuid = $1',
      [user.nuusuid]
    )
    console.log('Registros en crcredus:', credusCheck.rows[0].count)
    
    // Verificar constraint FK
    const fkCheck = await db.query(
      `SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'crcredus'
        AND kcu.column_name = 'nuusuid'`
    )
    
    console.log('\nFK Constraint crcredus:')
    console.log('  ', fkCheck.rows[0])
    
    process.exit(0)
  } catch (error) {
    console.error('❌ ERROR:', error.message)
    process.exit(1)
  }
}

checkGuidLength()
