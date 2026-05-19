const db = require('./db/connection');

async function checkState() {
  try {
    const result = await db.query(`
      SELECT 
        nuusuid,
        nuusumail,
        nuusuapell,
        nuusubajaf,
        CASE 
          WHEN nuusubajaf IS NULL THEN 'ACTIVO'
          WHEN nuusubajaf IS NOT NULL THEN 'DESACTIVADO'
        END AS estado
      FROM nuusuari
      ORDER BY nuusumail
    `);
    
    console.log('\n=== Estado de usuarios (nuusubajaf) ===\n');
    console.log('Total usuarios:', result.rows.length);
    
    result.rows.forEach(user => {
      console.log(`\nEmail: ${user.nuusumail}`);
      console.log(`Nombre: ${user.nuusuapell}`);
      console.log(`Estado: ${user.estado}`);
      console.log(`nuusubajaf: ${user.nuusubajaf || 'NULL (activo)'}`);
    });
    
    const activos = result.rows.filter(u => u.nuusubajaf === null).length;
    const desactivados = result.rows.filter(u => u.nuusubajaf !== null).length;
    
    console.log(`\n=== Resumen ===`);
    console.log(`Activos: ${activos}`);
    console.log(`Desactivados: ${desactivados}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkState();
