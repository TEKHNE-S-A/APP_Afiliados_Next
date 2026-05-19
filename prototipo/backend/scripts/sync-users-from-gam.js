/**
 * Script de sincronización automática de usuarios desde GAM a BD local
 * 
 * Propósito: Preparar la base de datos para la migración masiva garantizando que
 * todos los usuarios GAM estén sincronizados correctamente.
 * 
 * Flujo:
 * 1. Verificar en GAM (autenticación OAuth2)
 * 2. Consultar/sincronizar nuusuari (GET /oauth/userinfo → GUID → UPDATE)
 * 3. Construir resto de datos (credenciales si tiene AfiliadoId)
 * 
 * Nota: Este script requiere que el backend esté ejecutándose en localhost:3000
 * 
 * Uso:
 *   node scripts/sync-users-from-gam.js
 *   node scripts/sync-users-from-gam.js --email=user@example.com  # solo un usuario
 *   node scripts/sync-users-from-gam.js --dry-run  # simular sin cambios
 */

const path = require('path');
const db = require(path.join(__dirname, '..', 'db', 'connection'));
const http = require('http');
const https = require('https');
const crypto = require('crypto');

// Parse argumentos
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  acc[key.replace('--', '')] = value || true;
  return acc;
}, {});

const DRY_RUN = args['dry-run'] || false;
const SINGLE_EMAIL = args['email'] || null;
const SKIP_CREDS = args['skip-credentials'] || false;
const BACKEND_URL = args['backend-url'] || 'http://localhost:3000';

// Funciones auxiliares para llamadas HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            // Extraer mensaje de error del objeto JSON
            let errorMsg = parsed.error?.message || parsed.message || parsed.error || JSON.stringify(parsed);
            let errorCode = parsed.error?.code || parsed.code || null;
            
            const error = new Error(`HTTP ${res.statusCode}: ${errorMsg}`);
            error.statusCode = res.statusCode;
            error.code = errorCode;
            error.body = parsed;
            reject(error);
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ raw: data });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function checkBackendHealth() {
  try {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    return response.status === 'ok';
  } catch (e) {
    return false;
  }
}

async function loginGAM(email, password) {
  try {
    const body = JSON.stringify({ username: email, password });
    const response = await makeRequest(`${BACKEND_URL}/gam/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      body
    });
    return response;
  } catch (e) {
    throw e;
  }
}

async function getUserInfoGAM(accessToken) {
  try {
    const response = await makeRequest(`${BACKEND_URL}/gam/userinfo`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response;
  } catch (e) {
    throw e;
  }
}

async function syncCredenciales(nuusuid, afiliadoId, token) {
  try {
    const body = JSON.stringify({ nuusuid, afiliadoId });
    const response = await makeRequest(`${BACKEND_URL}/credencial/sync-manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${token}`
      },
      body
    });
    return response;
  } catch (e) {
    throw e;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function syncSingleUser(user, stats) {
  const { nuusuid, nuusumail, nuusuafili, nuusuapell } = user;
  
  console.log(`\n🔄 Procesando usuario: ${nuusumail || nuusuid}`);
  console.log(`   nuusuid actual: ${nuusuid}`);
  console.log(`   tipo: ${/^\d+$/.test(nuusuid) ? 'LEGACY (numérico)' : 'GAM (UUID)'}`);
  
  try {
    // 1. Intentar login en GAM (con contraseña de prueba "123456")
    console.log(`   📡 Verificando en GAM (login)...`);
    let gamLogin = null;
    let gamGUID = null;
    let gamUserInfo = null;
    
    try {
      gamLogin = await loginGAM(nuusumail, '12345678');
      if (gamLogin && gamLogin.access_token) {
        console.log(`   ✅ Login GAM exitoso`);
        
        // 2. Obtener info completa de GAM
        console.log(`   📡 Obteniendo userinfo de GAM...`);
        gamUserInfo = await getUserInfoGAM(gamLogin.access_token);
        gamGUID = gamUserInfo.GUID || gamUserInfo.Id || gamUserInfo.user_id;
        
        if (gamGUID) {
          console.log(`   ✅ GUID obtenido: ${gamGUID}`);
        } else {
          console.log(`   ⚠️  No se pudo extraer GUID de la respuesta GAM`);
          console.log(`   📋 Respuesta GAM:`, JSON.stringify(gamUserInfo, null, 2));
        }
      }
    } catch (loginError) {
      // El error puede ser:
      // - Error 236: clientId/clientSecret incorrectos
      // - Error 11: usuario/contraseña incorrecta (usuario no existe en GAM)
      // - GAM not available
      const errorMsg = loginError.message || String(loginError);
      
      // Error 236 es crítico - credenciales de app incorrectas
      if (errorMsg.includes('236') || errorMsg.includes('aplicación cliente no encontrada') || errorMsg.includes('aplicación cliente no fue encontarda')) {
        console.log(`   ❌ Error GAM config (236): clientId/clientSecret incorrectos o app no registrada`);
        stats.errors++;
        return;
      }
      
      // Error 11 (usuario/contraseña incorrecta) - usuario no existe en GAM
      if (errorMsg.includes('11') || errorMsg.includes('incorrecta')) {
        console.log(`   ⏭️  Usuario no existe en GAM o contraseña desconocida (error 11)`);
        stats.skipped++;
        return;
      }
      
      // Otros errores (conexión, etc.)
      console.log(`   ⚠️  Error intentando login GAM: ${errorMsg}`);
      stats.errors++;
      return;
    }
    
    if (!gamGUID) {
      console.log(`   ❌ No se pudo extraer GUID de GAM`);
      stats.errors++;
      return;
    }
    
    // 3. Verificar si necesita actualización
    const isLegacyId = /^\d+$/.test(nuusuid);
    const needsUpdate = isLegacyId || nuusuid !== gamGUID;
    
    if (!needsUpdate) {
      console.log(`   ✅ Usuario ya tiene GUID correcto, sin cambios`);
      stats.unchanged++;
      
      // Sincronizar credenciales si aplica y no se pidió skip
      if (!SKIP_CREDS && nuusuafili && nuusuafili.length === 30) {
        console.log(`   🎫 Sincronizando credenciales (AfiliadoId: ${nuusuafili})...`);
        if (!DRY_RUN) {
          try {
            const syncResult = await syncCredenciales(nuusuid, nuusuafili, gamLogin.access_token);
            console.log(`   ✅ Credenciales sincronizadas: ${syncResult.credenciales?.length || 0} credenciales`);
          } catch (syncError) {
            console.log(`   ⚠️  Error sincronizando credenciales: ${syncError.message}`);
          }
        } else {
          console.log(`   🔍 [DRY-RUN] Se sincronizarían credenciales`);
        }
      }
      return;
    }
    
    // 4. Actualizar nuusuid con GUID de GAM
    console.log(`   🔄 Actualizando nuusuid: ${nuusuid} → ${gamGUID}`);
    
    if (DRY_RUN) {
      console.log(`   🔍 [DRY-RUN] Se actualizaría en BD pero modo simulación activo`);
      stats.toUpdate++;
      return;
    }
    
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Defer FK checks hasta el COMMIT (permite updates circulares)
      await client.query('SET CONSTRAINTS ALL DEFERRED');
      
      // ORDEN CRÍTICO: Actualizar primero las tablas que tienen FK, luego la tabla referenciada
      
      // 1. Actualizar nuusuauth si existe (tiene FK a nuusuari)
      const authCheck = await client.query(
        'SELECT 1 FROM nuusuauth WHERE nuusuid = $1',
        [nuusuid]
      );
      
      if (authCheck.rows.length > 0) {
        await client.query(
          'UPDATE nuusuauth SET nuusuid = $1 WHERE nuusuid = $2',
          [gamGUID, nuusuid]
        );
        console.log(`   ✅ Actualizado nuusuauth`);
      }
      
      // 2. Actualizar crcredus si existe (tiene FK a nuusuari)
      const credusCheck = await client.query(
        'SELECT COUNT(*) as cnt FROM crcredus WHERE nuusuid = $1',
        [nuusuid]
      );
      
      if (credusCheck.rows[0].cnt > 0) {
        await client.query(
          'UPDATE crcredus SET nuusuid = $1 WHERE nuusuid = $2',
          [gamGUID, nuusuid]
        );
        console.log(`   ✅ Actualizado crcredus (${credusCheck.rows[0].cnt} registros)`);
      }
      
      // 3. Actualizar notifications si existe (tiene FK a nuusuari)
      const notifsCheck = await client.query(
        'SELECT COUNT(*) as cnt FROM notifications WHERE nuusuid = $1',
        [nuusuid]
      );
      
      if (notifsCheck.rows[0].cnt > 0) {
        await client.query(
          'UPDATE notifications SET nuusuid = $1 WHERE nuusuid = $2',
          [gamGUID, nuusuid]
        );
        console.log(`   ✅ Actualizado notifications (${notifsCheck.rows[0].cnt} registros)`);
      }
      
      // 4. Actualizar push_tokens si existe (tiene FK a nuusuari)
      const tokensCheck = await client.query(
        'SELECT COUNT(*) as cnt FROM push_tokens WHERE nuusuid = $1',
        [nuusuid]
      );
      
      if (tokensCheck.rows[0].cnt > 0) {
        await client.query(
          'UPDATE push_tokens SET nuusuid = $1 WHERE nuusuid = $2',
          [gamGUID, nuusuid]
        );
        console.log(`   ✅ Actualizado push_tokens (${tokensCheck.rows[0].cnt} registros)`);
      }
      
      // 5. FINALMENTE actualizar nuusuari (tabla referenciada)
      await client.query(
        `UPDATE nuusuari 
         SET nuusuid = $1, 
             nuusugamtok = $2,
             nuusugamexp = NOW() + INTERVAL '1 hour'
         WHERE nuusuid = $3`,
        [gamGUID, gamLogin?.access_token || null, nuusuid]
      );
      console.log(`   ✅ Actualizado nuusuari`);
      
      await client.query('COMMIT');
      console.log(`   ✅ Usuario migrado exitosamente`);
      stats.updated++;
      
      // Sincronizar credenciales si aplica
      if (!SKIP_CREDS && nuusuafili && nuusuafili.length === 30) {
        console.log(`   🎫 Sincronizando credenciales (AfiliadoId: ${nuusuafili})...`);
        try {
          const syncResult = await syncCredenciales(gamGUID, nuusuafili, gamLogin.access_token);
          console.log(`   ✅ Credenciales sincronizadas: ${syncResult.credenciales?.length || 0} credenciales`);
        } catch (syncError) {
          console.log(`   ⚠️  Error sincronizando credenciales: ${syncError.message}`);
        }
      }
      
    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Error en transacción BD:`, dbError.message);
      stats.errors++;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error(`   ❌ Error procesando usuario:`, error.message);
    stats.errors++;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   Script de Sincronización Automática GAM → BD Local          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // Verificar que el backend esté corriendo
  console.log(`🔍 Verificando backend en ${BACKEND_URL}...`);
  const backendHealthy = await checkBackendHealth();
  
  if (!backendHealthy) {
    console.error(`\n❌ Error: El backend no está corriendo en ${BACKEND_URL}`);
    console.error(`\n💡 Inicia el backend con:`);
    console.error(`   cd backend`);
    console.error(`   node server-soap.js`);
    console.error(`\nO usa el script:`);
    console.error(`   .\\restart-backend.ps1\n`);
    process.exit(1);
  }
  
  console.log(`✅ Backend disponible\n`);
  
  if (DRY_RUN) {
    console.log('⚠️  MODO DRY-RUN: No se realizarán cambios en la base de datos\n');
  }
  
  if (SINGLE_EMAIL) {
    console.log(`📧 Modo usuario único: ${SINGLE_EMAIL}\n`);
  }
  
  if (SKIP_CREDS) {
    console.log('⏭️  Saltando sincronización de credenciales\n');
  }
  
  const stats = {
    total: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    errors: 0,
    toUpdate: 0
  };
  
  try {
    // Obtener usuarios a procesar
    let query;
    let params = [];
    
    if (SINGLE_EMAIL) {
      query = `
        SELECT nuusuid, nuusumail, nuusuafili, nuusuapell 
        FROM nuusuari 
        WHERE nuusumail = $1
      `;
      params = [SINGLE_EMAIL];
    } else {
      query = `
        SELECT nuusuid, nuusumail, nuusuafili, nuusuapell 
        FROM nuusuari 
        WHERE nuusumail IS NOT NULL 
          AND nuusumail != '' 
          AND (nuusubajaf IS NULL OR EXTRACT(YEAR FROM nuusubajaf) < 1900)
        ORDER BY nuusuid
      `;
    }
    
    const result = await db.query(query, params);
    stats.total = result.rows.length;
    
    console.log(`📊 Total de usuarios a procesar: ${stats.total}\n`);
    console.log('════════════════════════════════════════════════════════════════\n');
    
    // Procesar cada usuario
    for (const user of result.rows) {
      await syncSingleUser(user, stats);
    }
    
    // Resumen final
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('\n📊 RESUMEN DE SINCRONIZACIÓN:\n');
    console.log(`   Total procesados:  ${stats.total}`);
    console.log(`   ✅ Actualizados:    ${stats.updated}`);
    console.log(`   ⏭️  Sin cambios:     ${stats.unchanged}`);
    console.log(`   ⏭️  Saltados:        ${stats.skipped} (no existen en GAM)`);
    console.log(`   ❌ Errores:         ${stats.errors}`);
    if (DRY_RUN) {
      console.log(`   🔍 A actualizar:    ${stats.toUpdate} (cuando se ejecute sin --dry-run)`);
    }
    
    console.log('\n════════════════════════════════════════════════════════════════\n');
    
    if (DRY_RUN) {
      console.log('💡 Para ejecutar los cambios, ejecuta sin --dry-run\n');
    }
    
    if (stats.errors > 0) {
      console.log('⚠️  Se encontraron errores. Revisa los logs anteriores.\n');
    }
    
    if (stats.updated > 0 || stats.toUpdate > 0) {
      console.log('✅ Sincronización completada con éxito\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Ejecutar
main();
