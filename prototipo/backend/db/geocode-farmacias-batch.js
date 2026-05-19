const geocodingService = require('../services/geocodingService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n🚀 Iniciando geocodificación de farmacias...');
    console.log('⚠️  Este proceso puede tardar 30-40 minutos');
    console.log('📡 Usando Google Maps Geocoding API\n');

    console.log('🌍 Geocodificando SOLO las FARMACIAS (rubroId=000000008)...\n');

    // Contar farmacias pendientes
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as pendientes
      FROM caendire d
      INNER JOIN cacartil c ON d.caentid = c.caentid
      WHERE c.carubid = '000000008'
        AND d.caendpenge = 'N'
        AND d.caendirecc IS NOT NULL
        AND d.caendirecc != ''
    `;

    const totalPendientes = parseInt(countResult[0].pendientes);
    console.log(`📊 Farmacias pendientes: ${totalPendientes}\n`);

    if (totalPendientes === 0) {
      console.log('✅ No hay farmacias pendientes de geocodificar');
      return;
    }

    let totalSuccess = 0;
    let totalErrors = 0;
    let batch = 1;
    const startTime = Date.now();

    // Procesar en lotes de 50
    while (totalSuccess + totalErrors < totalPendientes) {
      console.log(`\n🔄 Procesando batch ${batch}/~${Math.ceil(totalPendientes/50)}...`);
      
      const result = await geocodingService.processBatchGeocoding(50);

      if (result.processed === 0) {
        console.log('\n⚠️  No se procesaron más direcciones');
        break;
      }

      totalSuccess += result.success;
      totalErrors += result.errors;

      const progress = Math.min(100, ((totalSuccess + totalErrors) / totalPendientes * 100)).toFixed(1);
      console.log(`   ✅ Exitosas: ${result.success}`);
      console.log(`   ❌ Errores: ${result.errors}`);
      console.log(`   📊 Progreso total: ${totalSuccess + totalErrors}/${totalPendientes} (${progress}%)`);

      batch++;

      // Pausa de 1 segundo entre batches
      if (totalSuccess + totalErrors < totalPendientes) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN FINAL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ✅ Total exitosas: ${totalSuccess}`);
    console.log(`   ❌ Total errores: ${totalErrors}`);
    console.log(`   📍 Total procesadas: ${totalSuccess + totalErrors}`);
    console.log(`   ⏱️  Tiempo: ${minutes}m ${seconds}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verificar farmacias con coordenadas
    const finalStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN d.caendlat IS NOT NULL THEN 1 END) as con_coords
      FROM caendire d
      INNER JOIN cacartil c ON d.caentid = c.caentid
      WHERE c.carubid = '000000008'
    `;

    const porcentaje = ((parseInt(finalStats[0].con_coords) / parseInt(finalStats[0].total)) * 100).toFixed(1);
    
    console.log('📍 Estado final de FARMACIAS:');
    console.log(`   Total farmacias: ${finalStats[0].total}`);
    console.log(`   Con coordenadas: ${finalStats[0].con_coords} (${porcentaje}%)\n`);

    if (porcentaje >= 95) {
      console.log('🎉 ¡Geocodificación completada exitosamente!');
      console.log('📱 Las farmacias ahora deberían aparecer en la app móvil.\n');
    } else {
      console.log('⚠️  Algunas farmacias no pudieron geocodificarse.');
      console.log('   Esto puede deberse a direcciones inválidas o sin localidad.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
