const db = require('./db/connection');

async function checkTables() {
  try {
    // Estructura de crcreden
    console.log('=== Tabla crcreden ===');
    const crcredenCols = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'crcreden'
      ORDER BY ordinal_position
    `);
    crcredenCols.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n=== Tabla nuusuauth ===');
    const nuusuauthCols = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'nuusuauth'
      ORDER BY ordinal_position
    `);
    nuusuauthCols.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n=== Tabla auditoria_usuarios ===');
    const auditCols = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'auditoria_usuarios'
      ORDER BY ordinal_position
    `);
    auditCols.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTables();
