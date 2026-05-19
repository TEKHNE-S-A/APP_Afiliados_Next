const db = require('./db/connection');

async function deleteUsersWithoutGAM() {
  const client = await db.pool.connect();
  
  try {
    console.log('🔍 Analizando usuarios en la base de datos...\n');
    
    // Verificar estado actual
    const statsQuery = await client.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE nuusuid !~ '^[0-9]+$') AS con_gam,
        COUNT(*) FILTER (WHERE nuusuid ~ '^[0-9]+$') AS sin_gam
      FROM nuusuari
    `);
    
    const stats = statsQuery.rows[0];
    console.log('=== ESTADO ACTUAL ===');
    console.log(`Total usuarios: ${stats.total}`);
    console.log(`Con GAM ID: ${stats.con_gam}`);
    console.log(`Sin GAM ID (a eliminar): ${stats.sin_gam}\n`);
    
    if (parseInt(stats.sin_gam) === 0) {
      console.log('✅ No hay usuarios sin GAM ID para eliminar');
      return;
    }
    
    // Listar usuarios a eliminar
    console.log('=== USUARIOS A ELIMINAR ===');
    const usersToDelete = await client.query(`
      SELECT nuusuid, nuusumail, nuusuapell
      FROM nuusuari
      WHERE nuusuid ~ '^[0-9]+$'
      ORDER BY nuusumail
    `);
    
    usersToDelete.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nuusumail} - ${user.nuusuapell} (ID: ${user.nuusuid})`);
    });
    
    console.log('\n⚠️  ADVERTENCIA: Esta operación eliminará permanentemente estos usuarios');
    console.log('⚠️  Presiona Ctrl+C en los próximos 5 segundos para cancelar...\n');
    
    // Esperar 5 segundos
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🗑️  Eliminando usuarios sin GAM ID...\n');
    
    // Iniciar transacción
    await client.query('BEGIN');
    
    try {
      // Eliminar registros relacionados primero
      console.log('1️⃣  Eliminando credenciales relacionadas (por CUIL)...');
      const deleteCreds = await client.query(`
        DELETE FROM crcreden
        WHERE crcrenroaf IN (
          SELECT nuusunroaf FROM nuusuari 
          WHERE nuusuid ~ '^[0-9]+$'
        )
      `);
      console.log(`   ✅ ${deleteCreds.rowCount} credenciales eliminadas`);
      
      console.log('2️⃣  Eliminando registros de autenticación...');
      const deleteAuth = await client.query(`
        DELETE FROM nuusuauth
        WHERE nuusuid IN (
          SELECT nuusuid FROM nuusuari 
          WHERE nuusuid ~ '^[0-9]+$'
        )
      `);
      console.log(`   ✅ ${deleteAuth.rowCount} registros de autenticación eliminados`);
      
      console.log('3️⃣  Eliminando auditoría relacionada...');
      const deleteAudit = await client.query(`
        DELETE FROM auditoria_usuarios
        WHERE nuusuid IN (
          SELECT nuusuid FROM nuusuari 
          WHERE nuusuid ~ '^[0-9]+$'
        )
      `);
      console.log(`   ✅ ${deleteAudit.rowCount} registros de auditoría eliminados`);
      
      console.log('4️⃣  Eliminando usuarios...');
      const deleteUsers = await client.query(`
        DELETE FROM nuusuari
        WHERE nuusuid ~ '^[0-9]+$'
      `);
      console.log(`   ✅ ${deleteUsers.rowCount} usuarios eliminados`);
      
      // Confirmar transacción
      await client.query('COMMIT');
      console.log('\n✅ TRANSACCIÓN COMPLETADA EXITOSAMENTE\n');
      
    } catch (error) {
      // Revertir en caso de error
      await client.query('ROLLBACK');
      console.error('❌ Error durante eliminación, transacción revertida');
      throw error;
    }
    
    // Verificar estado final
    const finalStats = await client.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE nuusuid !~ '^[0-9]+$') AS con_gam,
        COUNT(*) FILTER (WHERE nuusuid ~ '^[0-9]+$') AS sin_gam
      FROM nuusuari
    `);
    
    const final = finalStats.rows[0];
    console.log('=== ESTADO FINAL ===');
    console.log(`Total usuarios: ${final.total}`);
    console.log(`Con GAM ID: ${final.con_gam}`);
    console.log(`Sin GAM ID: ${final.sin_gam}\n`);
    
    console.log('✅ Proceso completado correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

deleteUsersWithoutGAM().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
