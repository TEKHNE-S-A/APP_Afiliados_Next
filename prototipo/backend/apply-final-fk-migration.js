/**
 * Aplicar migración FINAL: Hacer DEFERRABLE TODAS las FKs a nuusuari
 */
const path = require('path');
const fs = require('fs');
const db = require(path.join(__dirname, 'db', 'connection'));

async function applyFinalMigration() {
  console.log('📋 Aplicando migración FINAL: Todas las FKs DEFERRABLE\n');
  
  const sqlFile = path.join(__dirname, 'db', 'make-all-fks-deferrable-final.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  
  try {
    console.log('🔨 Ejecutando SQL...');
    await db.query(sql);
    console.log('✅ Migración aplicada exitosamente\n');
    
    // Verificar
    console.log('🔍 Estado final de TODAS las FKs a nuusuari.nuusuid:\n');
    const check = await db.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        CASE 
          WHEN pg_get_constraintdef(c.oid, true) LIKE '%DEFERRABLE%' THEN '✅ DEFERRABLE'
          ELSE '❌ NO DEFERRABLE'
        END as status
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN pg_constraint c ON c.conname = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'nuusuari'
        AND ccu.column_name = 'nuusuid'
      ORDER BY tc.table_name, tc.constraint_name
    `);
    
    check.rows.forEach(row => {
      console.log(`${row.status} ${row.table_name}.${row.constraint_name}`);
    });
    
    const nonDeferrable = check.rows.filter(r => r.status.includes('❌'));
    if (nonDeferrable.length > 0) {
      console.log(`\n⚠️  Aún hay ${nonDeferrable.length} FKs NO DEFERRABLE`);
    } else {
      console.log('\n🎉 ¡TODAS las FKs son DEFERRABLE! Ready for GAM sync.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyFinalMigration();
