const { PrismaClient } = require('@prisma/client');
const geocodingService = require('../services/geocodingService');

const prisma = new PrismaClient();

async function geocodifyAllFarmacias() {
  try {
    console.log('\n🌍 Geocodificando TODAS las farmacias pendientes...\n');

    // Contar pendientes
    const stats = await prisma.$queryRaw`
      SELECT COUNT(*) as pendientes
      FROM caendire d
      INNER JOIN cacartil c ON d.caentid = c.caentid
      WHERE c.carubid = ${'000000008'.padEnd(30)}
        AND d.caendpenge = 'N'
    `;

    const totalPendientes = parseInt(stats[0].pendientes);
    console.log(`📊 Farmacias pendientes: ${totalPendientes}\n`);

    if (totalPendientes === 0) {
      console.log('✅ No hay farmacias pendientes de geocodificar');
      return;
    }

    let totalSuccess = 0;
    let totalErrors = 0;
    let batch = 1;

    // Procesar en lotes de 50
    while (true) {
      console.log(`\n🔄 Procesando batch ${batch}...`);
      
      const result = await geocodingService.processBatchGeocoding(50);

      if (result.processed === 0) {
        console.log('\n✅ Todas las farmacias han sido procesadas');
        break;
      }

      totalSuccess += result.success;
      totalErrors += result.errors;

      console.log(`   ✅ Exitosas: ${result.success}`);
      console.log(`   ❌ Errores: ${result.errors}`);

      batch++;

      // Pequeña pausa entre batches para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n\n📊 RESUMEN FINAL:');
    console.log(`   Total exitosas: ${totalSuccess}`);
    console.log(`   Total errores: ${totalErrors}`);
    console.log(`   Total procesadas: ${totalSuccess + totalErrors}`);

    // Verificar cuántas farmacias tienen coordenadas ahora
    const finalStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN d.caendlat IS NOT NULL THEN 1 END) as con_coords
      FROM caendire d
      INNER JOIN cacartil c ON d.caentid = c.caentid
      WHERE c.carubid = ${'000000008'.padEnd(30)}
    `;

    const porcentaje = ((parseInt(finalStats[0].con_coords) / parseInt(finalStats[0].total)) * 100).toFixed(1);
    
    console.log(`\n📍 Estado final:`);
    console.log(`   Total farmacias: ${finalStats[0].total}`);
    console.log(`   Con coordenadas: ${finalStats[0].con_coords} (${porcentaje}%)`);

    console.log('\n🎉 Geocodificación completada!');
    console.log('📱 Ahora las farmacias deberían aparecer en la app móvil.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

geocodifyAllFarmacias();
