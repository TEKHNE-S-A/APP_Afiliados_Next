/**
 * Migrar todos los usuarios LEGACY a GAM mediante login
 * Este script hace login con cada usuario para activar la migración automática
 */
const http = require('http');
const path = require('path');
const db = require(path.join(__dirname, 'db', 'connection'));

// Usuarios LEGACY conocidos con sus contraseñas
const legacyUsers = [
  { email: 'admin@osep.gob.ar', password: 'admin123' },
  { email: 'admin@test.local', password: 'admin123' },
  { email: 'nuevo1@test.com', password: '12345678' },
  { email: 'superadmin@osep.gob.ar', password: 'admin123' },
  { email: 'ybañez@gmail.com', password: '12345678' }
];

let totalSuccess = 0;
let totalFailed = 0;
let totalSkipped = 0;

function loginUser(email, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: email,
      password: password
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/gam/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200) {
            resolve({
              success: true,
              email,
              migration: response.migration,
              user: response.user
            });
          } else {
            resolve({
              success: false,
              email,
              error: response.error || response.message || 'Error desconocido',
              statusCode: res.statusCode
            });
          }
        } catch (e) {
          reject({
            success: false,
            email,
            error: 'Error parseando respuesta: ' + e.message
          });
        }
      });
    });

    req.on('error', (e) => {
      reject({
        success: false,
        email,
        error: 'Error de conexión: ' + e.message
      });
    });

    req.write(postData);
    req.end();
  });
}

async function checkIfLegacy(email) {
  const result = await db.query(
    `SELECT nuusuid, 
            CASE WHEN nuusuid ~ '^[0-9]+$' THEN 'LEGACY' ELSE 'GAM' END as tipo
     FROM nuusuari 
     WHERE nuusumail = $1`,
    [email]
  );
  
  if (result.rows.length === 0) {
    return { exists: false };
  }
  
  return {
    exists: true,
    nuusuid: result.rows[0].nuusuid,
    isLegacy: result.rows[0].tipo === 'LEGACY'
  };
}

async function migrateAllUsers() {
  console.log('🚀 Migración Masiva LEGACY → GAM');
  console.log('═'.repeat(70));
  console.log(`📋 Usuarios a procesar: ${legacyUsers.length}\n`);

  for (let i = 0; i < legacyUsers.length; i++) {
    const { email, password } = legacyUsers[i];
    const num = i + 1;
    
    console.log(`\n[${'='.repeat(Math.floor(num / legacyUsers.length * 60))}${'-'.repeat(60 - Math.floor(num / legacyUsers.length * 60))}] ${num}/${legacyUsers.length}`);
    console.log(`📧 Procesando: ${email}`);
    
    try {
      // Verificar si es LEGACY
      const check = await checkIfLegacy(email);
      
      if (!check.exists) {
        console.log(`   ⚠️  Usuario no existe en BD - SALTADO`);
        totalSkipped++;
        continue;
      }
      
      if (!check.isLegacy) {
        console.log(`   ℹ️  Ya está en GAM (${check.nuusuid.substring(0, 8)}...) - SALTADO`);
        totalSkipped++;
        continue;
      }
      
      console.log(`   🔄 LEGACY detectado (${check.nuusuid.substring(check.nuusuid.length - 10)})`);
      console.log(`   🔐 Ejecutando login para activar migración...`);
      
      // Hacer login para activar migración automática
      const result = await loginUser(email, password);
      
      if (result.success) {
        if (result.migration) {
          const newGuid = result.migration.newNuusuid || 'N/A';
          const guidShort = newGuid !== 'N/A' ? newGuid.substring(0, 8) + '...' : newGuid;
          console.log(`   ✅ MIGRADO: ${result.migration.oldNuusuid} → ${guidShort}`);
          if (result.migration.tablesUpdated) {
            console.log(`   📊 Tablas: ${result.migration.tablesUpdated.join(', ')}`);
          }
          totalSuccess++;
        } else {
          console.log(`   ℹ️  Login exitoso (ya estaba migrado)`);
          totalSkipped++;
        }
      } else {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : JSON.stringify(result.error);
        console.log(`   ❌ ERROR (${result.statusCode || 'N/A'}): ${errorMsg}`);
        totalFailed++;
      }
      
      // Pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      const errorMsg = error.error || error.message || JSON.stringify(error);
      console.log(`   ❌ EXCEPCIÓN: ${errorMsg}`);
      totalFailed++;
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 RESUMEN FINAL:');
  console.log(`   ✅ Migrados exitosamente: ${totalSuccess}`);
  console.log(`   ⏭️  Saltados (ya GAM):     ${totalSkipped}`);
  console.log(`   ❌ Fallidos:              ${totalFailed}`);
  console.log(`   📋 Total procesados:      ${legacyUsers.length}`);
  console.log('═'.repeat(70));
  
  if (totalSuccess > 0) {
    console.log('\n🎉 ¡Migración masiva completada!');
    console.log('\nVerifica el resultado con:');
    console.log('   node list-users-migration-status.js\n');
  }
  
  process.exit(totalFailed > 0 ? 1 : 0);
}

migrateAllUsers();
