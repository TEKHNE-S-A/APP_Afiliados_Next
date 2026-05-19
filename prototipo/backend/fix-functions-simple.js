// Fix funciones con versión simplificada
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'app_afiliados_genexus',
  user: 'postgres',
  password: '12345678'
});

async function fixFunctionsSimple() {
  console.log('🔧 Aplicando funciones simplificadas...\n');
  
  try {
    const sqlPath = path.join(__dirname, 'db', 'fix_functions_simple.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Ejecutando script SQL...');
    const result = await pool.query(sql);
    
    console.log('✅ Script ejecutado exitosamente\n');
    
    // Mostrar funciones resultantes
    if (result.rows && result.rows.length > 0) {
      console.log('📋 Funciones en la base de datos:');
      result.rows.forEach(row => {
        console.log(`   - ${row.function_name}(${row.arguments})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixFunctionsSimple();
