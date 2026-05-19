const db = require('./db/connection');

(async () => {
  const client = await db.pool.connect();
  try {
    console.log('Verificando estado usuario marianr@tekhne.com.ar');
    const user = await client.query(`
      SELECT nuusuid, nuusumail, nuusuactiv, nuusufecde 
      FROM nuusuari 
      WHERE nuusumail = 'marianr@tekhne.com.ar'
    `);
    console.log('Estado:', user.rows[0]);
    
    if (user.rows[0].nuusuactiv === 'N') {
      console.log('\nReactivando usuario...');
      const result = await client.query('SELECT reactivar_usuario($1) as result', [user.rows[0].nuusuid]);
      console.log('Resultado reactivacion:', result.rows[0].result);
    } else {
      console.log('\nUsuario ya esta activo');
    }
  } finally {
    client.release();
    process.exit(0);
  }
})();
