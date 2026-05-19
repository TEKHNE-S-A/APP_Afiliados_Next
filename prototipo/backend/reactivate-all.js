const db = require('./db/connection');

async function reactivateAll() {
  try {
    console.log('🔧 Reactivando todos los usuarios...\n');
    
    const result = await db.query(`
      UPDATE nuusuari
      SET nuusubajaf = NULL
      WHERE nuusubajaf IS NOT NULL
    `);
    
    console.log(`✅ Reactivados: ${result.rowCount} usuarios`);
    
    // Verificar
    const check = await db.query(`
      SELECT COUNT(*) AS activos
      FROM nuusuari
      WHERE nuusubajaf IS NULL
    `);
    
    console.log(`✅ Total usuarios activos: ${check.rows[0].activos}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

reactivateAll();
