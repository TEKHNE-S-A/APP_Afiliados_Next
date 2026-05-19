/**
 * Listar usuarios actuales y su estado de migración
 */
const path = require('path');
const db = require(path.join(__dirname, 'db', 'connection'));

async function listUsers() {
  console.log('📋 Listado de Usuarios - Estado Migración LEGACY → GAM\n');
  
  try {
    const result = await db.query(`
      SELECT 
        nuusuid,
        nuusumail,
        nuusuapell,
        nuusuafili,
        nuusubajaf,
        CASE 
          WHEN nuusuid ~ '^[0-9]+$' THEN 'LEGACY'
          ELSE 'GAM'
        END as tipo,
        CASE 
          WHEN nuusubajaf IS NULL OR EXTRACT(YEAR FROM nuusubajaf) < 1900 THEN 'ACTIVO'
          ELSE 'INACTIVO'
        END as estado
      FROM nuusuari
      WHERE nuusumail IS NOT NULL AND nuusumail != ''
      ORDER BY tipo DESC, nuusumail
    `);
    
    console.log(`Total usuarios: ${result.rows.length}\n`);
    
    const legacy = result.rows.filter(u => u.tipo === 'LEGACY');
    const gam = result.rows.filter(u => u.tipo === 'GAM');
    const activos = result.rows.filter(u => u.estado === 'ACTIVO');
    
    console.log('📊 RESUMEN:');
    console.log(`   LEGACY (numéricos):  ${legacy.length}`);
    console.log(`   GAM (UUIDs):         ${gam.length}`);
    console.log(`   Activos:             ${activos.length}`);
    console.log(`   Inactivos:           ${result.rows.length - activos.length}\n`);
    
    if (legacy.length > 0) {
      console.log('🔄 USUARIOS LEGACY (pendientes de migración):');
      console.log('─'.repeat(100));
      legacy.forEach(u => {
        const estado = u.estado === 'ACTIVO' ? '✅' : '❌';
        const nuusuidDisplay = u.nuusuid.length > 10 ? '...' + u.nuusuid.slice(-10) : u.nuusuid;
        console.log(`${estado} ${u.nuusumail.padEnd(30)} | ${nuusuidDisplay.padEnd(15)} | ${u.nuusuapell || 'Sin nombre'}`);
      });
      console.log('─'.repeat(100));
      console.log(`\n💡 Estos ${legacy.length} usuarios se migrarán automáticamente en su próximo login\n`);
    }
    
    if (gam.length > 0) {
      console.log('✅ USUARIOS YA MIGRADOS A GAM:');
      console.log('─'.repeat(100));
      gam.forEach(u => {
        const estado = u.estado === 'ACTIVO' ? '✅' : '❌';
        const guidShort = u.nuusuid.substring(0, 8) + '...';
        console.log(`${estado} ${u.nuusumail.padEnd(30)} | ${guidShort.padEnd(15)} | ${u.nuusuapell || 'Sin nombre'}`);
      });
      console.log('─'.repeat(100));
    }
    
    console.log('\n📝 PRÓXIMO PASO:');
    console.log('   Para probar migración automática, ejecuta login con cualquier usuario LEGACY:');
    console.log('   node test-login-user.js <email> <password>\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listUsers();
