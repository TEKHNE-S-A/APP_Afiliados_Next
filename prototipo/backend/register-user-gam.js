/**
 * Registra un usuario en el GAM local (con o sin registro previo en BD).
 * Uso: node register-user-gam.js [email] [password]
 * Ejemplo: node register-user-gam.js marianr@tekhne.com.ar 123456
 */
const db = require('./db/connection');
const gamService = require('./gamService');

const email    = process.argv[2] || 'marianr@tekhne.com.ar';
const password = process.argv[3] || '123456';

async function main() {
  console.log(`\n🔍 Buscando usuario en BD local: ${email}`);

  const r = await db.pool.query(
    `SELECT nuusuid, TRIM(nuusuapell) AS nuusuapell, TRIM(nuusumail) AS nuusumail,
            TRIM(nuusunroaf) AS nuusunroaf, TRIM(nuususexo) AS nuususexo,
            TRIM(nuusuafili) AS nuusuafili, nuusufecha
     FROM nuusuari
     WHERE LOWER(TRIM(nuusumail)) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  let userData;

  if (r.rows.length) {
    const u = r.rows[0];
    console.log('✅ Usuario encontrado en BD:');
    console.log(`   Nombre:     ${u.nuusuapell}`);
    console.log(`   Email:      ${u.nuusumail}`);
    console.log(`   NroAfil:    ${u.nuusunroaf}`);
    console.log(`   AfiliadoId: ${u.nuusuafili}`);

    const partes    = u.nuusuapell.split(',');
    const lastName  = (partes[0] || '').trim();
    const firstName = (partes[1] || lastName).trim();

    userData = {
      email,
      password,
      firstName,
      lastName,
      nroAfiliado:        u.nuusuafili || u.nuusunroaf,
      documento:          u.nuusunroaf,
      cuil:               u.nuusunroaf,
      sexo:               u.nuususexo || 'M',
      telefono:           '',
      titularNro:         '',
      fechaNacimiento:    u.nuusufecha ? u.nuusufecha.toISOString().split('T')[0] : '1980-01-01',
      canMiembrosFamiliar: 1
    };
  } else {
    console.log('ℹ️  No existe en BD local — usando datos de prueba para registro en GAM');
    userData = {
      email,
      password,
      firstName:          'Mariana',
      lastName:           'Rodriguez',
      nroAfiliado:        '000000072000000000001000000072',
      documento:          '20288787655',
      cuil:               '20288787655',
      sexo:               'F',
      telefono:           '',
      titularNro:         '',
      fechaNacimiento:    '1976-05-10',
      canMiembrosFamiliar: 7
    };
  }

  console.log(`\n📤 Registrando en GAM: ${gamService.GAM_BASE_URL}`);

  try {
    const result = await gamService.registerUserGAM(userData);
    console.log('\n✅ Registro GAM exitoso!');
    console.log('   userId (GUID):', result.userId);
    console.log('   message:', result.message);
    if (result.warning) console.log('   ⚠️  warning:', result.warning);

    // Actualizar nuusuid si ya existía en BD
    if (result.userId && r.rows.length) {
      console.log('\n💾 Actualizando nuusuid en BD local...');
      const u = r.rows[0];
      await db.pool.query(
        `UPDATE nuusuari SET nuusuid = $1 WHERE LOWER(TRIM(nuusumail)) = LOWER($2)`,
        [result.userId, email]
      );
      console.log(`✅ nuusuid: ${u.nuusuid.trim()} → ${result.userId}`);
    }

  } catch (err) {
    console.error('\n❌ Error al registrar en GAM:', err.message);
    if (err.details) console.error('   Detalles:', JSON.stringify(err.details, null, 2));
  }

  process.exit(0);
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
