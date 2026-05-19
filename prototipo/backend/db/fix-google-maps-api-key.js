const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixGoogleMapsApiKey() {
  try {
    // Obtener la API Key real de MAPA (legacy)
    const mapaApiKey = await prisma.nusispar.findFirst({
      where: {
        nusisgrupa: 'MAPA',
        nusistippa: 'API Key'
      }
    });

    if (!mapaApiKey || !mapaApiKey.nusisvalpa) {
      console.log('❌ No se encontró API Key en configuración MAPA');
      return;
    }

    const realApiKey = mapaApiKey.nusisvalpa;
    console.log(`\n🔑 API Key encontrada en MAPA: ${realApiKey.substring(0, 20)}...`);

    // Actualizar GOOGLE_MAPS.ApiKey
    await prisma.nusispar.update({
      where: {
        nusisgrupa_nusistippa: {
          nusisgrupa: 'GOOGLE_MAPS',
          nusistippa: 'ApiKey'
        }
      },
      data: {
        nusisvalpa: realApiKey
      }
    });

    console.log('✅ API Key actualizada en GOOGLE_MAPS.ApiKey');

    // Verificar
    const updated = await prisma.nusispar.findFirst({
      where: {
        nusisgrupa: 'GOOGLE_MAPS',
        nusistippa: 'ApiKey'
      }
    });

    console.log(`\n✓ Verificación: ${updated.nusisvalpa.substring(0, 20)}...`);
    console.log('\n🎉 Configuración corregida. Ahora el servicio de geocodificación debería funcionar.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGoogleMapsApiKey();
