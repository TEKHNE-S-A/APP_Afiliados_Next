const db = require('./db/connection');

async function checkAudit() {
  try {
    const result = await db.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'auditoria_usuarios'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== Estructura de auditoria_usuarios ===\n');
    result.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}${col.character_maximum_length ? '('+col.character_maximum_length+')' : ''}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAudit();
