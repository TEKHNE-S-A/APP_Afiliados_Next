/**
 * Fix crcredus.nuusuid para consistencia con migración GAM
 * Actualiza de BPCHAR(40) a VARCHAR(100) para soportar UserID de GAM
 */

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345678',
  database: process.env.DB_NAME || 'app_afiliados_genexus'
})

async function fixCrcredusNuusuid() {
  const client = await pool.connect()
  
  try {
    console.log('Aplicando fix a crcredus.nuusuid...')
    
    // Verificar estado actual
    const checkBefore = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'crcredus' 
      AND column_name = 'nuusuid'
    `)
    
    console.log('\nEstado ANTES:')
    console.log(checkBefore.rows[0])
    
    // Aplicar fix
    await client.query('BEGIN')
    
    await client.query(`
      ALTER TABLE crcredus ALTER COLUMN nuusuid TYPE VARCHAR(100)
    `)
    
    await client.query(`
      COMMENT ON COLUMN crcredus.nuusuid IS 'FK a nuusuari.nuusuid - soporta UserID de GAM (VARCHAR 100)'
    `)
    
    await client.query('COMMIT')
    
    // Verificar resultado final
    const checkAfter = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'crcredus' 
      AND column_name = 'nuusuid'
    `)
    
    console.log('\nEstado DESPUES:')
    console.log(checkAfter.rows[0])
    
    console.log('\n[OK] Fix aplicado exitosamente')
    console.log('  - crcredus.nuusuid: BPCHAR(40) -> VARCHAR(100)')
    console.log('  - Consistencia con nuusuari.nuusuid mantenida')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[ERROR] Error durante la migración:', error.message)
    throw error
  } finally {
    client.release()
  }
}

// Ejecutar
fixCrcredusNuusuid()
  .then(() => {
    console.log('\nMigración completada')
    process.exit(0)
  })
  .catch(error => {
    console.error('\nMigración fallida:', error)
    process.exit(1)
  })
