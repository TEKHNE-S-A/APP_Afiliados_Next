const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return salt + ':' + hash;
}

const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'app_afiliados_genexus',
  user: 'postgres',
  password: 'admin'
});

async function setupAdmin() {
  const email = 'admin@test.local';
  const password = 'admin123';
  const nombre = 'ADMIN TEST';
  
  try {
    // 1. Verificar si ya existe
    const existing = await pool.query(
      'SELECT nuusuid FROM nuusuari WHERE LOWER(TRIM(nuusumail)) = \',
      [email.toLowerCase()]
    );
    
    if (existing.rows.length > 0) {
      console.log('OK: Usuario ya existe (nuusuid: ' + existing.rows[0].nuusuid + ')');
      
      // Actualizar contraseÃ±a en nuusuauth
      const passwordHash = hashPassword(password);
      await pool.query(
        'INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) VALUES (\, \, NOW(), NOW()) ON CONFLICT (nuusuid) DO UPDATE SET nuusupass = \, nuusuultm = NOW()',
        [existing.rows[0].nuusuid, passwordHash]
      );
      console.log('OK: ContraseÃ±a actualizada');
      
    } else {
      // 2. Crear usuario en nuusuari
      const passwordHash = hashPassword(password);
      
      const insert = await pool.query(\
        INSERT INTO nuusuari (
          nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo,
          nuusuapell, nuusuestit, nuusutelef, nuusumail,
          nuusubille, nuusuidbil, nuusumailf, nuusuacept,
          nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel
        ) VALUES (
          '', NULL, NOW(), '', NULL,
          \, NULL, '', \,
          'N', '', NOW(), 'S',
          '', 0, '0001-01-01'::timestamp, 0
        ) RETURNING nuusuid
      \, [nombre, email]);
      
      const nuusuid = insert.rows[0].nuusuid;
      
      // 3. Crear contraseÃ±a en nuusuauth
      await pool.query(
        'INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) VALUES (\, \, NOW(), NOW())',
        [nuusuid, passwordHash]
      );
      
      console.log('OK: Usuario creado (nuusuid: ' + nuusuid + ')');
    }
    
    // 4. Agregar a lista de admins en nusispar
    const paramCheck = await pool.query(
      'SELECT nusisvalpa FROM nusispar WHERE nusisgrupa = \ AND nusistippa = \',
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
          'UPDATE nusispar SET nusisvalpa = \ WHERE nusisgrupa = \ AND nusistippa = \',
          [newValue, 'SEGURIDAD_APP', 'BackendAdminEmails']
        );
      } else {
        await pool.query(
          'INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr) VALUES (\, \, \, \)',
          ['SEGURIDAD_APP', 'BackendAdminEmails', newValue, 'Emails de administradores del backend']
        );
      }
      console.log('OK: Agregado a lista de admins');
    } else {
      console.log('OK: Ya estÃ¡ en lista de admins');
    }
    
    await pool.end();
    console.log('DONE');
    
  } catch (error) {
    console.error('ERROR: ' + error.message);
    await pool.end();
    process.exit(1);
  }
}

setupAdmin();
