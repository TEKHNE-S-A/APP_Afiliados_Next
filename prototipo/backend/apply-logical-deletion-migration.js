const fs = require('fs');
const db = require('./db/connection');

async function applyLogicalDeletionMigration() {
  const client = await db.pool.connect();
  
  try {
    console.log('📋 Aplicando migración Eliminación Lógica...\n');
    
    const sql = fs.readFileSync('./db/migrate_logical_deletion.sql', 'utf8');
    await client.query(sql);
    
    console.log('\n✅ Migración aplicada exitosamente\n');
    
    // Verificar columnas agregadas
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'nuusuari' 
      AND column_name IN ('nuusuactiv', 'nuusufecde', 'nuusumotde')
      ORDER BY column_name
    `);
    
    console.log('📋 Columnas agregadas:');
    cols.rows.forEach(c => {
      console.log(`  - ${c.column_name}: ${c.data_type}`);
    });
    
    // Verificar funciones
    const funcs = await client.query(`
      SELECT proname 
      FROM pg_proc 
      WHERE proname IN ('desactivar_usuario', 'reactivar_usuario', 'estadisticas_usuarios')
      ORDER BY proname
    `);
    
    console.log('\n📋 Funciones creadas:');
    funcs.rows.forEach(f => {
      console.log(`  ✅ ${f.proname}()`);
    });
    
    // Verificar vista
    const views = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name IN ('v_usuarios_tipo', 'v_usuarios_activos')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Vistas actualizadas:');
    views.rows.forEach(v => {
      console.log(`  ✅ ${v.table_name}`);
    });
    
    // Estadísticas de usuarios
    const stats = await client.query('SELECT * FROM estadisticas_usuarios()');
    
    console.log('\n📊 Estadísticas de usuarios:');
    console.log(`  Total usuarios: ${stats.rows[0].total_usuarios}`);
    console.log(`  Activos: ${stats.rows[0].usuarios_activos}`);
    console.log(`  Desactivados: ${stats.rows[0].usuarios_desactivados}`);
    console.log(`  GAM: ${stats.rows[0].usuarios_gam}`);
    console.log(`  Local: ${stats.rows[0].usuarios_local}`);
    
    // Verificar tabla de auditoría
    const auditTable = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'auditoria_usuarios'
      ) as exists
    `);
    
    console.log(`\n📋 Tabla auditoría: ${auditTable.rows[0].exists ? '✅ Creada' : '❌ No encontrada'}`);
    
    console.log('\n✅ Base de datos lista para eliminación lógica de usuarios\n');
    
  } catch (error) {
    console.error('\n❌ Error aplicando migración:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

applyLogicalDeletionMigration();
