// Verificar estructura tabla nuusuari
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'app_afiliados_genexus',
  user: 'postgres',
  password: '12345678'
});

async function checkTable() {
  try {
    console.log('📋 Verificando estructura de tabla nuusuari...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'nuusuari'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas de nuusuari:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`);
    });
    
    console.log('\n📋 Verificando usuario de prueba...\n');
    
    const user = await pool.query(`
      SELECT * FROM nuusuari 
      WHERE nuusuid = '0000000000000000000000000000000000000023'
    `);
    
    if (user.rows.length > 0) {
      console.log('Usuario encontrado:');
      console.log(JSON.stringify(user.rows[0], null, 2));
    } else {
      console.log('❌ Usuario no encontrado');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();
