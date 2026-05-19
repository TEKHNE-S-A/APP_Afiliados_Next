const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:12345678@127.0.0.1:5432/app_afiliados_genexus' 
});

(async () => {
  try {
    const tables = ['nupais', 'nuprovin', 'nulocali'];
    
    for (const table of tables) {
      console.log(`\n=== ${table.toUpperCase()} ===`);
      const result = await pool.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [table]);
      
      result.rows.forEach(row => {
        const len = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
        console.log(`  ${row.column_name.padEnd(15)} ${row.data_type}${len}`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
})();
