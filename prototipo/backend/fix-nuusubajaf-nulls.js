const db = require('./db/connection');

async function fixNulls() {
  try {
    console.log('🔧 Limpiando valores antiguos de nuusubajaf...\n');
    
    // Actualizar todos los nuusubajaf que tengan fecha '0001-01-01' a NULL (usuarios activos)
    const result = await db.query(`
      UPDATE nuusuari
      SET nuusubajaf = NULL
      WHERE nuusubajaf = '0001-01-01 00:00:00'
         OR nuusubajaf < '1900-01-01'
    `);
    
    console.log(`✅ Actualizado: ${result.rowCount} usuarios marcados como ACTIVOS (nuusubajaf = NULL)`);
    
    // Verificar estado final
    const check = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE nuusubajaf IS NULL) AS activos,
        COUNT(*) FILTER (WHERE nuusubajaf IS NOT NULL) AS desactivados,
        COUNT(*) AS total
      FROM nuusuari
    `);
    
    console.log('\n=== Estado Final ===');
    console.log(`Total: ${check.rows[0].total}`);
    console.log(`Activos: ${check.rows[0].activos}`);
    console.log(`Desactivados: ${check.rows[0].desactivados}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixNulls();
