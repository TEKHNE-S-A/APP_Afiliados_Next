const db = require('./db/connection');

async function changeDefault() {
  try {
    console.log('🔧 Cambiando DEFAULT de nuusubajaf a NULL...\n');
    
    await db.query(`
      ALTER TABLE nuusuari
      ALTER COLUMN nuusubajaf SET DEFAULT NULL
    `);
    
    console.log('✅ DEFAULT cambiado exitosamente');
    
    // Verificar
    const check = await db.query(`
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'nuusuari' AND column_name = 'nuusubajaf'
    `);
    
    console.log('\nConfiguración actual:');
    console.log(check.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

changeDefault();
