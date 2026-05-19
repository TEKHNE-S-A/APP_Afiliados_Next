/**
 * Script de procesamiento batch completo de geocodificación
 * Ejecutar: node geocode-batch-process.js
 * 
 * Procesa todas las direcciones pendientes en la tabla caendire
 * con reporte de progreso en tiempo real
 */

const { processAllPending, getStats } = require('../services/geocodingBatchService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  GEOCODIFICACIÓN BATCH - Google Maps API');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Estadísticas iniciales
    console.log('📊 Estado inicial:');
    const initialStats = await getStats();
    console.log(`   Total direcciones: ${initialStats.total}`);
    console.log(`   Geocodificadas exitosas: ${initialStats.geocoded_success}`);
    console.log(`   Con errores: ${initialStats.geocoded_error}`);
    console.log(`   Pendientes: ${initialStats.pending}\n`);

    if (initialStats.pending === 0) {
      console.log('✅ No hay direcciones pendientes. Proceso finalizado.');
      return;
    }

    // Confirmar antes de procesar
    console.log('⚠️  Se procesarán ' + initialStats.pending + ' direcciones.');
    console.log('⚠️  Esto puede tomar varios minutos dependiendo de la cantidad.\n');
    console.log('⏱️  Rate limit configurado: 10 requests/segundo');
    console.log('🔄 Reintentos automáticos: hasta 3 intentos por dirección\n');

    const startTime = Date.now();

    // Procesar con batch de 50 direcciones
    const result = await processAllPending(50, (progress) => {
      // Callback de progreso - ya logueado en el servicio
    });

    const endTime = Date.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(1);
    const durationMinutes = (durationSeconds / 60).toFixed(1);

    // Estadísticas finales
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  RESUMEN FINAL');
    console.log('═══════════════════════════════════════════════════════════\n');

    const finalStats = await getStats();
    console.log('📊 Estado final:');
    console.log(`   Total direcciones: ${finalStats.total}`);
    console.log(`   Geocodificadas exitosas: ${finalStats.geocoded_success}`);
    console.log(`   Con errores: ${finalStats.geocoded_error}`);
    console.log(`   Pendientes: ${finalStats.pending}\n`);

    console.log('⏱️  Tiempo de ejecución:');
    console.log(`   ${durationSeconds} segundos (${durationMinutes} minutos)\n`);

    console.log('✅ Procesados en esta ejecución:');
    console.log(`   Total: ${result.totalProcessed}`);
    console.log(`   Exitosos: ${result.totalSuccess} (${((result.totalSuccess / result.totalProcessed) * 100).toFixed(1)}%)`);
    console.log(`   Errores: ${result.totalErrors} (${((result.totalErrors / result.totalProcessed) * 100).toFixed(1)}%)\n`);

    if (finalStats.geocoded_error > 0) {
      console.log('💡 Sugerencia:');
      console.log('   Ejecuta check-geocode-errors.js para analizar los errores');
      console.log('   y considerar reintento manual o corrección de direcciones.\n');
    }

  } catch (error) {
    console.error('\n❌ Error durante el procesamiento:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
