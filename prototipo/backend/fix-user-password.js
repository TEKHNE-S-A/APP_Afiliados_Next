/**
 * Script para reparar usuario migrado sin contraseña en nuusuauth
 * Uso: node fix-user-password.js <email> <password>
 */

const path = require('path');
const crypto = require('crypto');
const db = require(path.join(__dirname, 'db', 'connection'));

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('❌ Uso: node fix-user-password.js <email> <password>');
  console.error('   Ejemplo: node fix-user-password.js ppinetta@gmail.com ppinetta26');
  process.exit(1);
}

// Función de hash idéntica a la del backend
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function fixUserPassword() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║        REPARAR CONTRASEÑA DE USUARIO MIGRADO A GAM            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log(`📧 Email:    ${email}`);
  console.log(`🔑 Password: ${'*'.repeat(password.length)}\n`);
  
  try {
    // 1. Obtener usuario de nuusuari
    console.log('1️⃣  Buscando usuario en nuusuari...');
    const userResult = await db.query(
      'SELECT nuusuid, nuusumail, nuusuapell, nuusuafili FROM nuusuari WHERE nuusumail = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.error(`❌ Usuario no encontrado: ${email}`);
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    const nuusuid = user.nuusuid; // NO hacer trim() - mantener espacios para FK
    const nuusuidDisplay = user.nuusuid.trim(); // Solo para mostrar
    
    console.log(`   ✅ Usuario encontrado:`);
    console.log(`      nuusuid: ${nuusuidDisplay}`);
    console.log(`      Nombre:  ${user.nuusuapell ? user.nuusuapell.trim() : 'N/A'}`);
    console.log(`      AfiliadoId: ${user.nuusuafili ? user.nuusuafili.trim() : 'N/A'}\n`);
    
    // 2. Verificar si ya existe en nuusuauth
    console.log('2️⃣  Verificando nuusuauth...');
    const authResult = await db.query(
      'SELECT nuusuid FROM nuusuauth WHERE nuusuid = $1',
      [nuusuid]
    );
    
    if (authResult.rows.length > 0) {
      console.log('   ⚠️  Ya existe registro en nuusuauth');
      console.log('   Actualizando contraseña...');
      
      const hashedPassword = hashPassword(password);
      await db.query(
        'UPDATE nuusuauth SET nuusupass = $1, nuusuultm = NOW() WHERE nuusuid = $2',
        [hashedPassword, nuusuid]
      );
      
      console.log('   ✅ Contraseña actualizada\n');
    } else {
      console.log('   ℹ️  No existe registro, creando nuevo...');
      
      const hashedPassword = hashPassword(password);
      await db.query(
        `INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) 
         VALUES ($1, $2, NOW(), NOW())`,
        [nuusuid, hashedPassword]
      );
      
      console.log('   ✅ Registro creado en nuusuauth\n');
    }
    
    // 3. Verificación final
    console.log('3️⃣  Verificación final...');
    const verifyResult = await db.query(
      'SELECT nuusuid, nuusucrea, nuusuultm FROM nuusuauth WHERE nuusuid = $1',
      [nuusuid]
    );
    
    if (verifyResult.rows.length > 0) {
      const auth = verifyResult.rows[0];
      console.log('   ✅ Verificación exitosa:');
      console.log(`      nuusuid:  ${auth.nuusuid.trim()}`);
      console.log(`      Creado:   ${new Date(auth.nuusucrea).toLocaleString('es-AR')}`);
      console.log(`      Modificado: ${new Date(auth.nuusuultm).toLocaleString('es-AR')}\n`);
    } else {
      console.error('   ❌ Error: No se pudo verificar el registro\n');
      process.exit(1);
    }
    
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ REPARACIÓN COMPLETADA                    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log('📝 Próximos pasos:');
    console.log('   1. Hacer login en la app con las credenciales:');
    console.log(`      Email:    ${email}`);
    console.log(`      Password: ${password}`);
    console.log('   2. El login sincronizará automáticamente las credenciales desde SOAP');
    console.log('   3. Verificar que el login funcione correctamente\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixUserPassword();
