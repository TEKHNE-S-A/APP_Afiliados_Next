const { getPrisma } = require('./prismaClient');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const prisma = getPrisma();
    
    console.log('\n🔧 MIGRACIÓN: Agregar columnas de geocodificación a caendire');
    console.log('===========================================================\n');
    
    // Leer script SQL
    const sqlPath = path.join(__dirname, 'add-geocoding-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir en statements individuales (separados por ;)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');
    
    console.log(`📋 Ejecutando ${statements.length} statements...\n`);
    
    // Ejecutar en transacción
    await prisma.$transaction(async (tx) => {
      for (const statement of statements) {
        if (statement.toLowerCase().startsWith('comment')) {
          // Los comentarios no se pueden ejecutar con $executeRawUnsafe
          continue;
        }
        
        if (statement.toLowerCase().startsWith('select')) {
          // Queries SELECT se imprimen
          const result = await tx.$queryRawUnsafe(statement);
          console.log('📊 Resultado:', JSON.stringify(result, null, 2));
        } else {
          // DDL statements
          await tx.$executeRawUnsafe(statement);
          const tipo = statement.split(' ')[0].toUpperCase();
          console.log(`✅ ${tipo} ejecutado`);
        }
      }
    });
    
    console.log('\n🎉 Migración completada exitosamente!\n');
    
    // Verificar columnas finales
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'caendire'
        AND column_name IN ('caendgeost', 'caendlat', 'caendlng', 'caendgeoerr')
      ORDER BY column_name
    `;
    
    console.log('📋 Columnas agregadas:');
    columns.forEach(col => {
      console.log(`  ✅ ${col.column_name} - ${col.data_type}`);
    });
    
    // Verificar estado inicial
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE caendgeost = 'S') AS success,
        COUNT(*) FILTER (WHERE caendgeost = 'N') AS pendiente,
        COUNT(*) FILTER (WHERE caendgeost = 'E') AS error,
        COUNT(*) AS total
      FROM caendire
    `;
    
    console.log('\n📊 Estado inicial:');
    console.log(`  Total direcciones: ${stats[0].total}`);
    console.log(`  Pendientes (N): ${stats[0].pendiente}`);
    console.log(`  Éxito (S): ${stats[0].success}`);
    console.log(`  Errores (E): ${stats[0].error}`);
    console.log('');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
