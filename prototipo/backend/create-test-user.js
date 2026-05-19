// Script para crear usuario de prueba con contraseña conocida
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'app_afiliados_genexus',
  user: 'postgres',
  password: '12345678',
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function createTestUser() {
  try {
    console.log('\n========================================');
    console.log('CREAR USUARIO DE PRUEBA');
    console.log('========================================\n');

    const testEmail = 'test@prueba.com';
    const testPassword = '123456';

    // 1. Verificar si ya existe
    console.log('1. Verificando si el usuario ya existe...');
    const existing = await pool.query(
      `SELECT nuusuid FROM nuusuari WHERE nuusumail = $1`,
      [testEmail]
    );

    let nuusuid;
    if (existing.rows.length > 0) {
      nuusuid = existing.rows[0].nuusuid;
      console.log(`[OK] Usuario ya existe: ${nuusuid}`);
    } else {
      // 2. Crear usuario en nuusuari
      console.log('2. Creando usuario en nuusuari...');
      const insertUser = await pool.query(
        `INSERT INTO nuusuari (nuusuid, nuusumail, nuusuapell, nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo, nuusuestit, nuusutelef, nuusubille, nuusuidbil, nuusumailf, nuusuacept, nuusuqrbil, nuusuultno, nuusunivel, nuusubajaf)
         VALUES (uuid_generate_v4()::text, $1, $2, $3, $4, NOW(), $5, 'M', 'S', '', 'N', '', NOW(), 'S', '', 0, 0, '0001-01-01')
         RETURNING nuusuid`,
        [testEmail, 'Usuario Prueba', '000000000000000000000000000001', '000000000000000000000000000001', '000000001']
      );
      nuusuid = insertUser.rows[0].nuusuid;
      console.log(`[OK] Usuario creado: ${nuusuid}`);
    }

    // 3. Crear/actualizar contraseña
    console.log('3. Configurando contraseña...');
    const hashedPassword = hashPassword(testPassword);
    
    const authExists = await pool.query(
      `SELECT nuusuid FROM nuusuauth WHERE nuusuid = $1`,
      [nuusuid]
    );

    if (authExists.rows.length > 0) {
      await pool.query(
        `UPDATE nuusuauth SET nuusupass = $1, nuusuultm = NOW() WHERE nuusuid = $2`,
        [hashedPassword, nuusuid]
      );
      console.log('[OK] Contraseña actualizada');
    } else {
      await pool.query(
        `INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
         VALUES ($1, $2, NOW(), NOW())`,
        [nuusuid, hashedPassword]
      );
      console.log('[OK] Contraseña creada');
    }

    console.log('\n========================================');
    console.log('USUARIO DE PRUEBA CONFIGURADO:');
    console.log('========================================');
    console.log(`Email:    ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    console.log(`ID:       ${nuusuid}`);
    console.log('========================================\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.log(`\n[ERROR] ${error.message}`);
    console.log(error.stack);
    await pool.end();
    process.exit(1);
  }
}

createTestUser();
