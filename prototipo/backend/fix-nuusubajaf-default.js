const db = require('./db/connection');

async function checkAndFix() {
  try {
    console.log('🔍 Verificando campo nuusubajaf...\n');
    
    // 1. Verificar default value
    const defaultCheck = await db.query(`
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'nuusuari' AND column_name = 'nuusubajaf'
    `);
    
    console.log('Configuración actual:');
    console.log(defaultCheck.rows[0]);
    console.log('');
    
    // 2. Ver usuarios con fecha incorrecta
    const usersCheck = await db.query(`
      SELECT nuusuid, nuusumail, nuusubajaf
      FROM nuusuari
      WHERE nuusubajaf < '1900-01-01' OR nuusubajaf IS NULL
      ORDER BY nuusumail
    `);
    
    console.log(`Usuarios encontrados: ${usersCheck.rows.length}`);
    usersCheck.rows.forEach(u => {
      console.log(`- ${u.nuusumail}: ${u.nuusubajaf || 'NULL'}`);
    });
    console.log('');
    
    // 3. Limpiar fechas incorrectas
    console.log('🔧 Limpiando fechas incorrectas (< 1900)...');
    const result = await db.query(`
      UPDATE nuusuari
      SET nuusubajaf = NULL
      WHERE nuusubajaf < '1900-01-01'
    `);
    
    console.log(`✅ ${result.rowCount} usuarios actualizados a NULL\n`);
    
    // 4. Verificar resultado
    const finalCheck = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE nuusubajaf IS NULL) as activos,
        COUNT(*) FILTER (WHERE nuusubajaf IS NOT NULL) as desactivados,
        COUNT(*) as total
      FROM nuusuari
    `);
    
    console.log('Estado final:');
    console.log(`Total: ${finalCheck.rows[0].total}`);
    console.log(`Activos (NULL): ${finalCheck.rows[0].activos}`);
    console.log(`Desactivados: ${finalCheck.rows[0].desactivados}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndFix();
