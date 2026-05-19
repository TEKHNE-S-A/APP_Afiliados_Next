// Setup Admin User - Crear admin@test.local en BD
// Ejecutar: node setup-admin-user.js

const crypto = require('crypto');
const { Pool } = require('pg');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'app_afiliados_genexus',
  user: 'postgres',
  password: '12345678'
});

async function setupAdmin() {
  const email = 'admin@test.local';
  const password = 'admin123';
  const nombre = 'ADMIN TEST';
  
  console.log('\n=====================================');
  console.log('  SETUP USUARIO ADMIN BACKEND');
  console.log('=====================================\n');
  
  try {
    // 1. Verificar si ya existe
    console.log('1. Verificando si usuario existe...');
    const existing = await pool.query(
      'SELECT nuusuid FROM nuusuari WHERE LOWER(TRIM(nuusumail)) = $1',
      [email.toLowerCase()]
    );
    
    let nuusuid;
    
    if (existing.rows.length > 0) {
      console.log('   ✅ Usuario ya existe');
      nuusuid = existing.rows[0].nuusuid;
      console.log(`   ID: ${nuusuid}\n`);
      
      // Actualizar contraseña
      const passwordHash = hashPassword(password);
      await pool.query(
        `INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) 
         VALUES ($1, $2, NOW(), NOW()) 
         ON CONFLICT (nuusuid) DO UPDATE SET nuusupass = $2, nuusuultm = NOW()`,
        [nuusuid, passwordHash]
      );
      console.log('2. Contraseña actualizada ✅\n');
      
    } else {
      console.log('   ⚠️  Usuario NO existe, creando...\n');
      
      // 2. Crear usuario en nuusuari
      console.log('2. Creando usuario en BD...');
      const passwordHash = hashPassword(password);
      
      const insert = await pool.query(`
        INSERT INTO nuusuari (
          nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo,
          nuusuapell, nuusuestit, nuusutelef, nuusumail,
          nuusubille, nuusuidbil, nuusumailf, nuusuacept,
          nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel
        ) VALUES (
          '', NULL, NOW(), '', NULL,
          $1, NULL, '', $2,
          'N', '', NOW(), 'S',
          '', 0, '0001-01-01'::timestamp, 0
        ) RETURNING nuusuid
      `, [nombre, email]);
      
      nuusuid = insert.rows[0].nuusuid;
      console.log(`   ✅ Usuario creado (ID: ${nuusuid})\n`);
      
      // 3. Crear contraseña en nuusuauth
      await pool.query(
        'INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) VALUES ($1, $2, NOW(), NOW())',
        [nuusuid, passwordHash]
      );
      console.log('3. Contraseña guardada ✅\n');
    }
    
    // 4. Agregar a lista de admins en nusispar
    console.log('4. Configurando como admin en nusispar...');
    const paramCheck = await pool.query(
      'SELECT nusisvalpa FROM nusispar WHERE nusisgrupa = $1 AND nusistippa = $2',
      ['SEGURIDAD_APP', 'BackendAdminEmails']
    );
    
    let currentAdmins = [];
    if (paramCheck.rows.length > 0) {
      currentAdmins = paramCheck.rows[0].nusisvalpa
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(e => e);
    }
    
    if (!currentAdmins.includes(email.toLowerCase())) {
      currentAdmins.push(email.toLowerCase());
      const newValue = currentAdmins.join(', ');
      
      if (paramCheck.rows.length > 0) {
        await pool.query(
          'UPDATE nusispar SET nusisvalpa = $1 WHERE nusisgrupa = $2 AND nusistippa = $3',
          [newValue, 'SEGURIDAD_APP', 'BackendAdminEmails']
        );
      } else {
        await pool.query(
          'INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr) VALUES ($1, $2, $3, $4)',
          ['SEGURIDAD_APP', 'BackendAdminEmails', newValue, 'Emails de administradores del backend']
        );
      }
      console.log('   ✅ Agregado a lista de admins\n');
    } else {
      console.log('   ✅ Ya está en lista de admins\n');
    }
    
    console.log('=====================================');
    console.log('  ✅ SETUP COMPLETADO');
    console.log('=====================================');
    console.log('\nCredenciales:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  nuusuid:  ${nuusuid}`);
    console.log('');
    
    await pool.end();
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await pool.end();
    process.exit(1);
  }
}

setupAdmin();
