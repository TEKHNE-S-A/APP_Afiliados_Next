/**
 * Listar columnas de tabla nuusuari
 */
const path = require('path');
const db = require(path.join(__dirname, 'db', 'connection'));

async function listColumns() {
  try {
    const result = await db.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'nuusuari' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columnas de tabla NUUSUARI:\n');
    result.rows.forEach((col, i) => {
      const type = col.character_maximum_length 
        ? `${col.data_type}(${col.character_maximum_length})`
        : col.data_type;
      console.log(`   ${(i + 1).toString().padStart(2)}. ${col.column_name.padEnd(20)} → ${type}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listColumns();
