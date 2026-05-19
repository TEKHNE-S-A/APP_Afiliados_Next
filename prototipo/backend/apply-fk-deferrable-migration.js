/**
 * Aplicar migración: Hacer FKs DEFERRABLE para sync GAM
 */
const path = require('path');
const fs = require('fs');
const db = require(path.join(__dirname, 'db', 'connection'));

async function applyMigration() {
  console.log('📋 Aplicando migración: FKs DEFERRABLE para sync GAM\n');
  
  const sqlFile = path.join(__dirname, 'db', 'make-fk-deferrable-for-gam-sync.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  
  try {
    // Ejecutar el SQL
    console.log('🔨 Ejecutando SQL...');
    const result = await db.query(sql);
    console.log('✅ Migración aplicada exitosamente\n');
    
    // Verificar constraints
    console.log('🔍 Verificando constraints...\n');
    const check = await db.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        pg_get_constraintdef(c.oid, true) as constraint_def
      FROM information_schema.table_constraints tc
      JOIN pg_constraint c ON c.conname = tc.constraint_name
      WHERE tc.table_name IN ('nuusuauth', 'crcredus')
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name LIKE '%nuusuid%'
      ORDER BY tc.table_name
    `);
    
    console.log('Constraints actualizadas:');
    check.rows.forEach(row => {
      console.log(`  📌 ${row.table_name}.${row.constraint_name}`);
      console.log(`     ${row.constraint_def}\n`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error aplicando migración:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
