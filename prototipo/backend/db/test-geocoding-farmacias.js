const { PrismaClient } = require('@prisma/client');
const geocodingService = require('../services/geocodingService');

const prisma = new PrismaClient();

async function testGeocodingFarmacias() {
  try {
    console.log('\n🧪 Test de geocodificación de farmacias (5 registros)...\n');

    // Procesar solo 5 farmacias como prueba
    const result = await geocodingService.processBatchGeocoding(5);

    console.log('\n\n📊 RESULTADO:');
    console.log(`   Procesadas: ${result.processed}`);
    console.log(`   Exitosas: ${result.success}`);
    console.log(`   Errores: ${result.errors}`);
    console.log(`   Pendientes: ${result.pending}`);

    if (result.success > 0) {
      // Mostrar las farmacias geocodificadas
      const farmacias = await prisma.$queryRaw`
        SELECT 
          e.caentapeno,
          d.caendirecc,
          d.caendlat,
          d.caendlng,
          l.nulocdescr
        FROM caendire d
        INNER JOIN caentida e ON d.caentid = e.caentid
        INNER JOIN cacartil c ON d.caentid = c.caentid
        LEFT JOIN nulocali l ON d.nulocid = l.nulocid
        WHERE c.carubid = ${'000000008'.padEnd(30)}
          AND d.caendlat IS NOT NULL
        LIMIT 5
      `;

      console.log('\n✅ Farmacias geocodificadas:');
      farmacias.forEach((f, i) => {
        console.log(`\n${i + 1}. ${f.caentapeno?.trim()}`);
        console.log(`   ${f.caendirecc?.trim()}`);
        console.log(`   ${f.nulocdescr?.trim()}`);
        console.log(`   📍 ${f.caendlat}, ${f.caendlng}`);
      });
    }

    console.log('\n\n🎉 Test completado exitosamente!');
    console.log('📝 Puedes geocodificar el resto con: node backend/db/geocode-batch-farmacias.js');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testGeocodingFarmacias();
