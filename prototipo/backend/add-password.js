// Script para agregar contraseña a usuario existente
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

async function addPassword() {
  try {
    console.log('\n======================================== ');
    console.log('AGREGAR CONTRASEÑA A USUARIO EXISTENTE');
    console.log('========================================\n');

    const testEmail = 'nuevo@test.com';
    const testPassword = '123456';

    // 1. Buscar usuario
    console.log('1. Buscando usuario...');
    const user = await pool.query(
      `SELECT nuusuid FROM nuusuari WHERE nuusumail = $1`,
      [testEmail]
    );

    if (user.rows.length === 0) {
      console.log('[ERROR] Usuario no encontrado');
      process.exit(1);
    }

    const nuusuid = user.rows[0].nuusuid;
    console.log(`[OK] Usuario encontrado: ${nuusuid}`);

    // 2. Crear/actualizar contraseña
    console.log('2. Configurando contraseña...');
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
    console.log('USUARIO CONFIGURADO:');
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

addPassword();
