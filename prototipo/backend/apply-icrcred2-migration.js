/**
 * Aplicar migración: Hacer DEFERRABLE icrcred2
 */
const path = require('path');
const fs = require('fs');
const db = require(path.join(__dirname, 'db', 'connection'));

async function applyMigration() {
  console.log('📋 Aplicando migración: icrcred2 DEFERRABLE\n');
  
  const sqlFile = path.join(__dirname, 'db', 'make-icrcred2-deferrable.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  
  try {
    console.log('🔨 Ejecutando SQL...');
    await db.query(sql);
    console.log('✅ Migración aplicada exitosamente\n');
    
    // Verificar
    console.log('🔍 Verificando constraints de crcredus...\n');
    const check = await db.query(`
      SELECT 
        tc.constraint_name,
        pg_get_constraintdef(c.oid, true) as constraint_def
      FROM information_schema.table_constraints tc
      JOIN pg_constraint c ON c.conname = tc.constraint_name
      WHERE tc.table_name = 'crcredus'
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.constraint_name
    `);
    
    console.log('Constraints de crcredus:');
    check.rows.forEach(row => {
      const isDeferrable = row.constraint_def.includes('DEFERRABLE');
      const icon = isDeferrable ? '✅' : '❌';
      console.log(`  ${icon} ${row.constraint_name}`);
      console.log(`     ${row.constraint_def}\n`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
