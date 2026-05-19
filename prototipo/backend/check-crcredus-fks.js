/**
 * Verificar todas las FKs de crcredus
 */
const path = require('path');
const db = require(path.join(__dirname, 'db', 'connection'));

async function checkConstraints() {
  console.log('🔍 Verificando todas las FKs de crcredus\n');
  
  try {
    const result = await db.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        pg_get_constraintdef(c.oid, true) as constraint_def
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN pg_constraint c ON c.conname = tc.constraint_name
      WHERE tc.table_name = 'crcredus'
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.constraint_name
    `);
    
    console.log(`Total FKs encontradas: ${result.rows.length}\n`);
    
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.constraint_name}`);
      console.log(`   Column: ${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
      console.log(`   ${row.constraint_def}\n`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkConstraints();
