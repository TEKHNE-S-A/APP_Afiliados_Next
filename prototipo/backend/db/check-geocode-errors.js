/**
 * Análisis de errores de geocodificación
 * Ejecutar: node check-geocode-errors.js
 * 
 * Muestra direcciones con errores de geocodificación y sus mensajes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ANÁLISIS DE ERRORES DE GEOCODIFICACIÓN');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Contar errores por tipo
    const errorStats = await prisma.$queryRaw`
      SELECT 
        caendgeoerr,
        COUNT(*)::int as count
      FROM caendire
      WHERE caendgeost = 'E'
      GROUP BY caendgeoerr
      ORDER BY count DESC
    `;

    if (!errorStats || errorStats.length === 0) {
      console.log('✅ No hay errores de geocodificación registrados.\n');
      return;
    }

    console.log('📊 Distribución de errores:\n');
    errorStats.forEach(stat => {
      console.log(`   ${stat.count} direcciones: ${stat.caendgeoerr}`);
    });
    console.log();

    // Mostrar muestra de direcciones con error
    console.log('📝 Muestra de direcciones con error (primeras 10):\n');
    const errorSample = await prisma.$queryRaw`
      SELECT 
        e.caentapeno,
        d.caendirecc,
        l.nulocdescr as localidad,
        p.nuprodescr as provincia,
        d.caendgeoerr,
        d.caendgeoup
      FROM caendire d
      INNER JOIN caentida e ON d.caentid = e.caentid
      LEFT JOIN nulocali l ON d.nulocid = l.nulocid
      LEFT JOIN nuprovin p ON l.nuproid = p.nuproid
      WHERE d.caendgeost = 'E'
      ORDER BY d.caendgeoup DESC
      LIMIT 10
    `;

    errorSample.forEach((record, idx) => {
      console.log(`   ${idx + 1}. ${record.caentapeno}`);
      console.log(`      Dirección: ${record.caendirecc}`);
      console.log(`      Localidad: ${record.localidad || 'N/A'}`);
      console.log(`      Provincia: ${record.provincia || 'N/A'}`);
      console.log(`      Error: ${record.caendgeoerr}`);
      console.log(`      Último intento: ${record.caendgeoup || 'N/A'}\n`);
    });

    // Sugerencias
    console.log('💡 Sugerencias de solución:\n');
    console.log('   1. ZERO_RESULTS: Verificar ortografía de direcciones');
    console.log('   2. Error de red/Timeout: Reintentar con geocode-batch-process.js');
    console.log('   3. OVER_QUERY_LIMIT: Esperar y reintentar más tarde');
    console.log('   4. INVALID_REQUEST: Corregir formato de dirección en BD\n');

  } catch (error) {
    console.error('\n❌ Error durante el análisis:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
