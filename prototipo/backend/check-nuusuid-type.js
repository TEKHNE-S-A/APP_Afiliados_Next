const db = require('./db/connection');

(async () => {
  try {
    const res = await db.pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'nuusuari' AND column_name = 'nuusuid'
    `);
    console.log('Columna nuusuid:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
})();
