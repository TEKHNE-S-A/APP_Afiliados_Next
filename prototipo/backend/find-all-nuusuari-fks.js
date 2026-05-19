/**
 * Encontrar TODAS las FKs que apuntan a nuusuari.nuusuid
 */
const path = require('path');
const db = require(path.join(__dirname, 'db', 'connection'));

async function findAllFKs() {
  console.log('🔍 Buscando TODAS las FKs que apuntan a nuusuari.nuusuid\n');
  
  try {
    const result = await db.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        pg_get_constraintdef(c.oid, true) as constraint_def,
        CASE 
          WHEN pg_get_constraintdef(c.oid, true) LIKE '%DEFERRABLE%' THEN true
          ELSE false
        END as is_deferrable
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN pg_constraint c ON c.conname = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'nuusuari'
        AND ccu.column_name = 'nuusuid'
      ORDER BY is_deferrable, tc.table_name, tc.constraint_name
    `);
    
    console.log(`Total FKs a nuusuari.nuusuid: ${result.rows.length}\n`);
    
    const needsUpdate = result.rows.filter(r => !r.is_deferrable);
    const alreadyDefer = result.rows.filter(r => r.is_deferrable);
    
    if (alreadyDefer.length > 0) {
      console.log(`✅ Ya DEFERRABLE (${alreadyDefer.length}):`);
      alreadyDefer.forEach(row => {
        console.log(`   ${row.table_name}.${row.constraint_name}`);
      });
      console.log('');
    }
    
    if (needsUpdate.length > 0) {
      console.log(`❌ NECESITAN ser DEFERRABLE (${needsUpdate.length}):`);
      needsUpdate.forEach(row => {
        console.log(`   ${row.table_name}.${row.constraint_name} [${row.column_name}]`);
      });
      console.log('\n📋 SQL para hacerlas DEFERRABLE:\n');
      
      needsUpdate.forEach(row => {
        console.log(`-- ${row.table_name}.${row.constraint_name}`);
        console.log(`ALTER TABLE ${row.table_name} DROP CONSTRAINT IF EXISTS ${row.constraint_name};`);
        console.log(`ALTER TABLE ${row.table_name} ADD CONSTRAINT ${row.constraint_name}`);
        console.log(`  FOREIGN KEY (${row.column_name}) REFERENCES nuusuari(nuusuid)`);
        console.log(`  ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;`);
        console.log('');
      });
    } else {
      console.log('✅ ¡Todas las FKs ya son DEFERRABLE!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findAllFKs();
