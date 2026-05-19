const db = require('./db/connection');

(async () => {
  try {
    const result = await db.pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'crcreden' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Columnas de tabla crcreden:');
    result.rows.forEach(r => console.log('  - ' + r.column_name));
    
    await db.pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
