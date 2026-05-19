const db = require('./db/connection');

(async () => {
  const client = await db.pool.connect();
  try {
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'nuusuari' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas tabla nuusuari:');
    cols.rows.forEach(c => {
      console.log(`  ${c.column_name}: ${c.data_type}`);
    });
  } finally {
    client.release();
    process.exit(0);
  }
})();
