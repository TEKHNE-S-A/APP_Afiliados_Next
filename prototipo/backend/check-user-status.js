/**
 * Verificar estado de un usuario específico
 * Uso: node check-user-status.js <email>
 */
const path = require('path');
const db = require(path.join(__dirname, 'db', 'connection'));

const email = process.argv[2];

if (!email) {
  console.error('❌ Uso: node check-user-status.js <email>');
  process.exit(1);
}

async function checkUserStatus() {
  console.log(`🔍 Verificando estado de: ${email}\n`);
  
  try {
    // Verificar en nuusuari
    const userResult = await db.query(
      `SELECT 
        nuusuid,
        nuusumail,
        nuusuapell,
        nuusuafili,
        nuusubajaf,
        nuusugamtok,
        nuusugamexp,
        CASE 
          WHEN nuusuid ~ '^[0-9]+$' THEN 'LEGACY'
          ELSE 'GAM'
        END as tipo
      FROM nuusuari
      WHERE nuusumail = $1`,
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario NO encontrado en nuusuari\n');
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    console.log('📋 NUUSUARI:');
    console.log(`   nuusuid:    ${user.nuusuid}`);
    console.log(`   Tipo:       ${user.tipo} ${user.tipo === 'LEGACY' ? '⚠️' : '✅'}`);
    console.log(`   Email:      ${user.nuusumail}`);
    console.log(`   Nombre:     ${user.nuusuapell || 'N/A'}`);
    console.log(`   AfiliadoId: ${user.nuusuafili || 'N/A'}`);
    console.log(`   GAM Token:  ${user.nuusugamtok ? 'Sí' : 'No'}`);
    console.log(`   GAM Exp:    ${user.nuusugamexp || 'N/A'}`);
    console.log(`   Bajaf:      ${user.nuusubajaf || 'NULL'}\n`);
    
    // Verificar en nuusuauth
    const authResult = await db.query(
      'SELECT nuusuid, nuusupass, nuusucrea, nuusuultm FROM nuusuauth WHERE nuusuid = $1',
      [user.nuusuid]
    );
    
    console.log('🔐 NUUSUAUTH:');
    if (authResult.rows.length > 0) {
      const auth = authResult.rows[0];
      console.log(`   ✅ Existe (nuusuid: ${auth.nuusuid})`);
      console.log(`   Password: ${auth.nuusupass ? 'Configurada' : 'NULL'}`);
      console.log(`   Creada:   ${auth.nuusucrea}`);
      console.log(`   Última:   ${auth.nuusuultm || 'N/A'}\n`);
    } else {
      console.log(`   ❌ NO existe registro\n`);
    }
    
    // Verificar en crcredus
    const credusResult = await db.query(
      'SELECT nuusuid, crcreid FROM crcredus WHERE nuusuid = $1',
      [user.nuusuid]
    );
    
    console.log('👥 CRCREDUS:');
    if (credusResult.rows.length > 0) {
      console.log(`   ✅ ${credusResult.rows.length} credenciales vinculadas`);
      credusResult.rows.forEach((c, i) => {
        console.log(`      ${i + 1}. crcreid: ${c.crcreid}`);
      });
      console.log('');
    } else {
      console.log(`   ❌ NO hay credenciales vinculadas\n`);
    }
    
    // Verificar en notifications
    const notifResult = await db.query(
      'SELECT COUNT(*) as total FROM notifications WHERE nuusuid = $1',
      [user.nuusuid]
    );
    
    console.log('🔔 NOTIFICATIONS:');
    console.log(`   Total: ${notifResult.rows[0].total}\n`);
    
    // Verificar en push_tokens
    const tokenResult = await db.query(
      'SELECT COUNT(*) as total FROM push_tokens WHERE nuusuid = $1',
      [user.nuusuid]
    );
    
    console.log('📱 PUSH_TOKENS:');
    console.log(`   Total: ${tokenResult.rows[0].total}\n`);
    
    // Resumen
    console.log('═'.repeat(60));
    if (user.tipo === 'LEGACY') {
      console.log('⚠️  USUARIO AÚN EN ESTADO LEGACY');
      console.log('   → La migración automática NO se ejecutó');
      console.log('   → Revisar logs del backend para ver el error\n');
    } else {
      console.log('✅ USUARIO YA MIGRADO A GAM');
      console.log('   → Migración exitosa\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUserStatus();
