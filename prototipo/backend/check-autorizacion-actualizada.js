const db = require('./db/connection');

(async () => {
  try {
    const ausolicid = '276b6ba2-5764-46f1-ae9d-4f4a1b086149';
    const result = await db.pool.query(`
      SELECT ausolicid, ausoldescr, ausolestad, ausolautnu, ausolextid
      FROM ausolici
      WHERE ausolicid = $1
    `, [ausolicid]);
    
    console.log('📊 Registro en BD actualizado:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    await db.pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
