const fs = require('fs');
const db = require('./db/connection');

async function applyMigration() {
  const client = await db.pool.connect();
  
  try {
    console.log('📋 Aplicando migración GAM...\n');
    
    // Leer el archivo SQL
    const sql = fs.readFileSync('./db/migrate_gam_integration.sql', 'utf8');
    
    // Ejecutar la migración
    await client.query(sql);
    
    console.log('\n✅ Migración aplicada exitosamente\n');
    
    // Verificar los cambios
    console.log('📊 Verificando cambios...\n');
    
    // 1. Verificar tipo de columna nuusuid
    const colInfo = await client.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'nuusuari' 
      AND column_name IN ('nuusuid', 'nuusugamtok', 'nuusugamexp', 'nuusugamrefresh')
      ORDER BY column_name
    `);
    
    console.log('Columnas actualizadas en nuusuari:');
    colInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
    });
    
    // 2. Verificar vista creada
    const viewExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'v_usuarios_tipo'
      ) as exists
    `);
    console.log(`\nVista v_usuarios_tipo: ${viewExists.rows[0].exists ? '✅ Creada' : '❌ No encontrada'}`);
    
    // 3. Verificar función creada
    const funcExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'limpiar_tokens_gam_expirados'
      ) as exists
    `);
    console.log(`Función limpiar_tokens_gam_expirados(): ${funcExists.rows[0].exists ? '✅ Creada' : '❌ No encontrada'}`);
    
    // 4. Verificar migración registrada
    const migration = await client.query(`
      SELECT version, applied_at, description 
      FROM schema_migrations 
      WHERE version = '20251216_gam_integration'
    `);
    
    if (migration.rows.length > 0) {
      console.log(`\n✅ Migración registrada:`);
      console.log(`   Version: ${migration.rows[0].version}`);
      console.log(`   Aplicada: ${migration.rows[0].applied_at}`);
      console.log(`   Descripción: ${migration.rows[0].description}`);
    }
    
    // 5. Contar usuarios por tipo
    const userTypes = await client.query(`
      SELECT tipo_autenticacion, COUNT(*) as cantidad
      FROM v_usuarios_tipo
      GROUP BY tipo_autenticacion
      ORDER BY cantidad DESC
    `);
    
    console.log(`\n📊 Usuarios por tipo de autenticación:`);
    userTypes.rows.forEach(row => {
      console.log(`   ${row.tipo_autenticacion}: ${row.cantidad}`);
    });
    
    console.log('\n✅ Verificación completa - Base de datos lista para GAM\n');
    
  } catch (error) {
    console.error('\n❌ Error aplicando migración:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

applyMigration();
