const db = require('./db/connection');

(async () => {
  try {
    const ausolicid = '2b22a123-2fcd-44a0-83ce-0456bdf136b5';
    
    const result = await db.pool.query(`
      SELECT ausolicid, ausoldescr, ausolestad, ausolautnu, ausolextid, nuusuid
      FROM ausolici
      WHERE ausolicid = $1
    `, [ausolicid]);
    
    if (result.rows.length === 0) {
      console.log('❌ Autorización NO encontrada en BD local');
      await db.pool.end();
      return;
    }
    
    console.log('📊 Autorización en BD local:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    await db.pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
