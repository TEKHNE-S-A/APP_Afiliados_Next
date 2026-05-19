const db = require('./db/connection');

(async () => {
  try {
    const email = 'marianr@tekhne.com.ar';
    
    // Verificar datos en nuusuari
    console.log('📊 Verificando usuario en nuusuari...');
    const userResult = await db.pool.query(`
      SELECT nuusuid, nuusumail, nuusuafili, nuusuapell, nuusuestit
      FROM nuusuari
      WHERE nuusumail = $1
    `, [email]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado en nuusuari');
      await db.pool.end();
      return;
    }
    
    console.log('\n✅ Usuario encontrado:');
    console.log(JSON.stringify(userResult.rows[0], null, 2));
    
    const nuusuid = userResult.rows[0].nuusuid;
    
    // Verificar credenciales del grupo familiar
    console.log('\n📊 Verificando credenciales en crcreden...');
    const credsResult = await db.pool.query(`
      SELECT crcreapeno, crcrecuil, crcreparen, crcreafili
      FROM crcreden
      WHERE nuusuid = $1
      ORDER BY crcreparen
    `, [nuusuid]);
    
    console.log(`\n✅ ${credsResult.rows.length} credenciales encontradas:`);
    credsResult.rows.forEach((cred, idx) => {
      console.log(`\n${idx + 1}. ${cred.crcreapeno}`);
      console.log(`   CUIL: ${cred.crcrecuil}`);
      console.log(`   Parentesco: ${cred.crcreparen}`);
      console.log(`   AfiliadoId: ${cred.crcreafili}`);
    });
    
    await db.pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
