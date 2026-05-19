/**
 * Revertir usuario de GAM a LEGACY (solo para testing)
 * Útil para probar la migración automática repetidamente
 */
const path = require('path');
const db = require(path.join(__dirname, 'db', 'connection'));

const email = process.argv[2] || 'nuevo@test.com';
const legacyId = '0000000000000000000000000000000000000023';

async function revertToLegacy() {
  console.log('🔄 Revirtiendo usuario a LEGACY ID (solo testing)\n');
  console.log(`Email: ${email}`);
  console.log(`Legacy ID: ${legacyId}\n`);
  
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    await client.query('SET CONSTRAINTS ALL DEFERRED');
    
    // 1. Actualizar nuusuauth
    const auth = await client.query(
      'UPDATE nuusuauth SET nuusuid = $1 WHERE LOWER(nuusuid) IN (SELECT LOWER(nuusuid) FROM nuusuari WHERE nuusumail = $2) RETURNING *',
      [legacyId, email]
    );
    console.log(`✅ nuusuauth: ${auth.rowCount} fila(s)`);
    
    // 2. Actualizar crcredus
    const credus = await client.query(
      'UPDATE crcredus SET nuusuid = $1 WHERE nuusuid IN (SELECT nuusuid FROM nuusuari WHERE nuusumail = $2) RETURNING *',
      [legacyId, email]
    );
    console.log(`✅ crcredus: ${credus.rowCount} fila(s)`);
    
    // 3. Actualizar notifications
    const notifs = await client.query(
      'UPDATE notifications SET nuusuid = $1 WHERE nuusuid IN (SELECT nuusuid FROM nuusuari WHERE nuusumail = $2) RETURNING *',
      [legacyId, email]
    );
    console.log(`✅ notifications: ${notifs.rowCount} fila(s)`);
    
    // 4. Actualizar push_tokens
    const tokens = await client.query(
      'UPDATE push_tokens SET nuusuid = $1 WHERE nuusuid IN (SELECT nuusuid FROM nuusuari WHERE nuusumail = $2) RETURNING *',
      [legacyId, email]
    );
    console.log(`✅ push_tokens: ${tokens.rowCount} fila(s)`);
    
    // 5. Actualizar nuusuari
    const user = await client.query(
      'UPDATE nuusuari SET nuusuid = $1 WHERE nuusumail = $2 RETURNING nuusuid, nuusumail',
      [legacyId, email]
    );
    
    if (user.rowCount === 0) {
      throw new Error(`Usuario ${email} no encontrado`);
    }
    
    console.log(`✅ nuusuari: ${user.rowCount} fila(s)`);
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Usuario revertido a LEGACY exitosamente');
    console.log(`\nAhora puedes probar la migración automática con:`);
    console.log(`  cd backend/scripts`);
    console.log(`  .\test-auto-migration.ps1`);
    console.log(`\nO ejecutar login GAM manual:`);
    console.log(`  POST /gam/login con {username: "${email}", password: "12345678"}`);
    
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

console.log('⚠️  ADVERTENCIA: Este script es SOLO para testing');
console.log('   Revierte un usuario GAM a LEGACY ID\n');

setTimeout(() => {
  revertToLegacy();
}, 1000);
