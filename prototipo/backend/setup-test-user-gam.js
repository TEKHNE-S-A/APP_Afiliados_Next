/**
 * Crea un usuario de prueba en BD local + prueba WS_USUARIO_ACTIVO
 * Uso: node setup-test-user-gam.js
 */
const gamService = require('./gamService');
const db = require('./db/connection');
const crypto = require('crypto');
const http = require('http');

const email     = 'testuser_20260224@osep.test';
const password  = 'Test1234!';
const AFILIADO_ID = '000000072000000000001000000072';

async function main() {
  // 1. Login GAM + obtener GUID
  console.log('\n1️⃣  Login GAM...');
  const login = await gamService.loginGAM(email, password);
  console.log('   ✅ Login OK');

  const info = await gamService.getUserInfo(login.access_token);
  const guid = info.GUID || info.guid || info.Id || info.id;
  console.log('   GUID:', guid);
  console.log('   Nombre:', info.FirstName, info.LastName);

  if (!guid) throw new Error('GAM no devolvió GUID');

  // 2. Insertar/actualizar en nuusuari
  console.log('\n2️⃣  Guardando en BD local...');
  const exists = await db.pool.query(
    'SELECT nuusuid FROM nuusuari WHERE nuusuid = $1', [guid]
  );

  if (!exists.rows.length) {
    const now = new Date();
    await db.pool.query(
      `INSERT INTO nuusuari (
        nuusuid, nuusuafili, nuusufecha, nuusunroaf, nuususexo,
        nuusuapell, nuusuestit, nuusutelef, nuusumail,
        nuusubajaf, nuusunivel, nuusuactiv
      ) VALUES (
        $1, $2, $3, '99988877', 'M',
        'Test, Usuario', 'S', '', $4,
        '2099-12-31', 0, 'S'
      )`,
      [guid, AFILIADO_ID, now, email]
    );
    console.log('   ✅ Insertado en nuusuari');
  } else {
    console.log('   ℹ️  Ya existe en nuusuari, GUID:', guid);
  }

  // 3. Guardar contraseña hasheada en nuusuauth
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  await db.pool.query(
    `INSERT INTO nuusuauth (nuusuid, nuusupass)
     VALUES ($1, $2)
     ON CONFLICT (nuusuid) DO UPDATE SET nuusupass = $2`,
    [guid, `${salt}:${hash}`]
  );
  console.log('   ✅ Contraseña guardada en nuusuauth');

  // 4. Test WS_USUARIO_ACTIVO — sin IdAfiliado (solo valida credenciales)
  console.log('\n3️⃣  Test WS_USUARIO_ACTIVO (sin IdAfiliado)...');
  const r1 = await callWS({ WSUsuario: email, WSPassword: password, IdAfiliado: '' });
  console.log('   Código:', r1.Respuesta[0].RespuestaCodigo, '|', r1.Respuesta[0].RespuestaDescripcion);

  // 5. Test WS_USUARIO_ACTIVO — con IdAfiliado correcto
  console.log('\n4️⃣  Test WS_USUARIO_ACTIVO (con IdAfiliado correcto)...');
  const r2 = await callWS({ WSUsuario: email, WSPassword: password, IdAfiliado: AFILIADO_ID });
  console.log('   Código:', r2.Respuesta[0].RespuestaCodigo, '|', r2.Respuesta[0].RespuestaDescripcion);

  // 6. Test WS_USUARIO_ACTIVO — credenciales incorrectas
  console.log('\n5️⃣  Test WS_USUARIO_ACTIVO (password incorrecto)...');
  const r3 = await callWS({ WSUsuario: email, WSPassword: 'wrongpassword', IdAfiliado: '' });
  console.log('   Código:', r3.Respuesta[0].RespuestaCodigo, '|', r3.Respuesta[0].RespuestaDescripcion);

  console.log('\n✅ Todo listo. Usuario de prueba GAM:');
  console.log('   Email:    ', email);
  console.log('   Password: ', password);
  console.log('   GUID:     ', guid);
  console.log('   Afiliado: ', AFILIADO_ID);

  process.exit(0);
}

function callWS(body) {
  return new Promise((resolve, reject) => {
    const b64     = Buffer.from('admin@test.local:admin123').toString('base64');
    const bodyStr = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 3000,
      path: '/api/ws/WS_USUARIO_ACTIVO', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + b64,
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

main().catch(e => { console.error('\n❌ Error fatal:', e.message || e); process.exit(1); });
