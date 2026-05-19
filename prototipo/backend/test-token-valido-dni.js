const http = require('http');

function req(method, path, headers, body) {
  return new Promise((resolve) => {
    const opts = {
      hostname: '127.0.0.1', port: 3000, path, method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(d); } catch { parsed = d; }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    r.on('error', e => resolve({ status: 0, body: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function pass(label) { console.log(`  ✅ ${label}`); }
function fail(label, detail) { console.log(`  ❌ ${label}: ${detail}`); process.exitCode = 1; }

(async () => {
  console.log('\n=== Test Seguridad /credencial/token-valido-dni ===\n');

  // ── Login para obtener Bearer token ──────────────────────────────────────
  const lr = await req('POST', '/auth/login', {}, { username: 'rios@gmail.com', password: '12345678' });
  const token = lr.body?.token || lr.body?.access_token;

  if (!token) { fail('Login', JSON.stringify(lr.body)); process.exit(1); }
  pass('Login OK (token obtenido)');

  const auth = { Authorization: 'Bearer ' + token };

  // 1. Sin autenticación → 401
  let r = await req('GET', '/credencial/token-valido-dni?dni=12345678&token=000', {}, null);
  r.status === 401 ? pass('Sin auth → 401') : fail('Sin auth', `esperado 401, got ${r.status}`);

  // 2. DNI con letras → 400 BAD_REQUEST
  r = await req('GET', '/credencial/token-valido-dni?dni=ABCD&token=000', auth, null);
  r.status === 400 && r.body?.error === 'BAD_REQUEST' ? pass('DNI letras → 400') : fail('DNI letras', JSON.stringify(r.body));

  // 3. Token de 4 dígitos → 400
  r = await req('GET', '/credencial/token-valido-dni?dni=12345678&token=9999', auth, null);
  r.status === 400 ? pass('Token 4 dígitos → 400') : fail('Token 4 dígitos', JSON.stringify(r.body));

  // 4. Parámetros faltantes → 400
  r = await req('GET', '/credencial/token-valido-dni?token=123', auth, null);
  r.status === 400 ? pass('Sin dni → 400') : fail('Sin dni', JSON.stringify(r.body));

  // 5. DNI inexistente → valido:false (sin revelar 404)
  r = await req('GET', '/credencial/token-valido-dni?dni=00000001&token=000', auth, null);
  r.status === 200 && r.body?.valido === false ? pass('DNI no existe → valido:false (sin 404)') : fail('DNI no existe', JSON.stringify(r.body));

  // 6. Rate limit headers presentes
  r = await req('GET', '/credencial/token-valido-dni?dni=12345678&token=000', auth, null);
  r.headers['x-ratelimit-limit'] ? pass(`Rate limit headers presentes (limit=${r.headers['x-ratelimit-limit']})`) : fail('Rate limit headers', 'ausentes');

  // 7. Happy path real: consulta BD para obtener DNI y token real
  try {
    const db = require('./db/connection');
    const tokenService = require('./tokenService');

    // 7a. Obtener nuusuafili del usuario rios@gmail.com
    const uRes = await db.pool.query(
      "SELECT nuusuafili FROM nuusuari WHERE nuusumail = 'rios@gmail.com' LIMIT 1"
    );
    if (!uRes.rows.length) {
      console.log('  ⚠️  rios@gmail.com no encontrado en BD, saltando happy path');
    } else {
      const afiliadoId = String(uRes.rows[0].nuusuafili || '').trim();

      // 7b. Obtener crcredocum (DNI) desde crcreden donde crcreid = nuusuafili
      const cRes = await db.pool.query(
        'SELECT TRIM(crcredocum::text) AS crcredocum FROM crcreden WHERE TRIM(crcreid::text) = $1 LIMIT 1',
        [afiliadoId]
      );
      if (!cRes.rows.length) {
        console.log(`  ⚠️  Sin fila en crcreden para afiliadoId=${afiliadoId}, saltando happy path`);
      } else {
        const dniReal = String(cRes.rows[0].crcredocum || '').replace(/\D/g, '').replace(/^0+/, '');
        const tokenReal = await tokenService.generateTokenFor(afiliadoId, new Date());

        // 7c. Validación positiva
        r = await req('GET', `/credencial/token-valido-dni?dni=${dniReal}&token=${tokenReal}`, auth, null);
        r.body?.valido === true
          ? pass(`Happy path real: dni=${dniReal} token=${tokenReal} → valido:true`)
          : fail('Happy path real (valido)', JSON.stringify(r.body));

        // 7d. Validación negativa con mismo DNI real pero token incorrecto
        const tokenIncorrecto = tokenReal === '000' ? '001' : '000';
        r = await req('GET', `/credencial/token-valido-dni?dni=${dniReal}&token=${tokenIncorrecto}`, auth, null);
        r.body?.valido === false
          ? pass(`Happy path real: token incorrecto → valido:false`)
          : fail('Happy path real (invalido)', JSON.stringify(r.body));
      }
    }
  } catch (e) {
    console.log(`  ⚠️  Happy path real omitido (${e.message})`);
  }

  console.log('\n' + (process.exitCode ? '❌ ALGUNOS TESTS FALLARON' : '✅ TODOS LOS TESTS PASARON') + '\n');
})();
