const path = require('path');
const db = require(path.join(__dirname, 'db', 'connection'));

async function checkAuth() {
  const email = 'ppinetta@gmail.com';
  
  // 1. Buscar usuario
  const userResult = await db.query(
    'SELECT nuusuid FROM nuusuari WHERE nuusumail = $1',
    [email]
  );
  
  if (userResult.rows.length === 0) {
    console.log('Usuario no encontrado');
    process.exit(1);
  }
  
  const nuusuidRaw = userResult.rows[0].nuusuid;
  console.log('nuusuid RAW (con espacios):', `[${nuusuidRaw}]`);
  console.log('nuusuid LENGTH:', nuusuidRaw.length);
  console.log('nuusuid TRIMMED:', `[${nuusuidRaw.trim()}]`);
  
  // 2. Buscar en nuusuauth SIN trim
  const auth1 = await db.query(
    'SELECT * FROM nuusuauth WHERE nuusuid = $1',
    [nuusuidRaw]
  );
  console.log('\nCon nuusuid RAW (espacios):', auth1.rows.length, 'registros');
  
  // 3. Buscar en nuusuauth CON trim
  const auth2 = await db.query(
    'SELECT * FROM nuusuauth WHERE nuusuid = $1',
    [nuusuidRaw.trim()]
  );
  console.log('Con nuusuid TRIMMED:', auth2.rows.length, 'registros');
  
  // 4. Listar todos los nuusuid en nuusuauth
  const all = await db.query(
    "SELECT nuusuid, LENGTH(nuusuid) as len FROM nuusuauth WHERE nuusuid LIKE 'ad0325d3%'"
  );
  console.log('\nTodos los nuusuid que empiezan con ad0325d3:');
  all.rows.forEach(r => {
    console.log(`  [${r.nuusuid}] - Length: ${r.len}`);
  });
  
  process.exit(0);
}

checkAuth().catch(console.error);
