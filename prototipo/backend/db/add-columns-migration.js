const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: '12345678',
  database: 'app_afiliados_genexus'
});

async function addColumns() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔧 Agregando columnas caentmatri y caentobs a caentida...\n');
    
    // Agregar caentmatri
    await client.query(`
      ALTER TABLE caentida 
      ADD COLUMN IF NOT EXISTS caentmatri VARCHAR(100) NULL
    `);
    console.log('✅ Columna caentmatri agregada');
    
    // Agregar caentobs
    await client.query(`
      ALTER TABLE caentida 
      ADD COLUMN IF NOT EXISTS caentobs TEXT NULL
    `);
    console.log('✅ Columna caentobs agregada');
    
    // Verificar
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'caentida'
      AND column_name IN ('caentmatri', 'caentobs')
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columnas agregadas:');
    result.rows.forEach(row => {
      const maxLen = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      console.log(`   - ${row.column_name} ${row.data_type}${maxLen} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n✅ Migración completada exitosamente\n');
    
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addColumns();
