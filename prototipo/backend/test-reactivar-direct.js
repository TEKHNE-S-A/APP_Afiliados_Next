const db = require('./db/connection');

async function test() {
  try {
    // Primero verificar el estado
    console.log('1️⃣  Estado actual del usuario:');
    const check1 = await db.query(`
      SELECT nuusuid, nuusumail, nuusubajaf
      FROM nuusuari
      WHERE nuusuid = $1
    `, ['0000000000000000000000000000000000000001']);
    console.log(check1.rows[0]);
    console.log('');
    
    // Reactivar
    console.log('2️⃣  Llamando reactivar_usuario:');
    const result = await db.query(`
      SELECT * FROM reactivar_usuario($1, $2)
    `, ['0000000000000000000000000000000000000001', 'admin']);
    console.log('Resultado:', result.rows[0]);
    console.log('');
    
    // Verificar de nuevo
    console.log('3️⃣  Estado después de reactivar:');
    const check2 = await db.query(`
      SELECT nuusuid, nuusumail, nuusubajaf
      FROM nuusuari
      WHERE nuusuid = $1
    `, ['0000000000000000000000000000000000000001']);
    console.log(check2.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();
