const { pool } = require('./db/connection');

async function applyMigration() {
  try {
    console.log('🔧 Aplicando migración: agregar columna nuusugamrefresh');
    
    // Verificar si la columna ya existe
    const checkResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'nuusuari' AND column_name = 'nuusugamrefresh'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('⚠️  La columna nuusugamrefresh ya existe');
      process.exit(0);
    }
    
    // Agregar columna
    await pool.query(`
      ALTER TABLE nuusuari 
      ADD COLUMN nuusugamrefresh VARCHAR(500)
    `);
    
    // Agregar comentario
    await pool.query(`
      COMMENT ON COLUMN nuusuari.nuusugamrefresh IS 'Refresh token de GAM OAuth2 para renovar access_token automáticamente'
    `);
    
    console.log('✅ Columna nuusugamrefresh agregada exitosamente');
    
    // Verificar
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'nuusuari' AND column_name = 'nuusugamrefresh'
    `);
    
    console.log('✅ Verificación:', verifyResult.rows[0]);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error aplicando migración:', error.message);
    process.exit(1);
  }
}

applyMigration();
