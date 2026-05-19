const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGoogleMapsConfig() {
  try {
    const params = await prisma.nusispar.findMany({
      where: {
        nusisgrupa: 'GOOGLE_MAPS'
      }
    });

    console.log('\n🗺️  Configuración GOOGLE_MAPS:\n');
    if (params.length === 0) {
      console.log('   ❌ No hay parámetros GOOGLE_MAPS configurados');
    } else {
      params.forEach(p => {
        console.log(`   ${p.nusistippa}: ${p.nusisvalpa === 'AIzaSyAPR9I0L68KH-FHLAp0TwO0HzPLY9iXWLo' ? '****[API KEY PRESENTE]****' : p.nusisvalpa}`);
      });
    }

    // También verificar parámetros MAPA (legacy)
    const mapaParams = await prisma.nusispar.findMany({
      where: {
        nusisgrupa: 'MAPA'
      }
    });

    if (mapaParams.length > 0) {
      console.log('\n🗺️  Configuración MAPA (legacy):\n');
      mapaParams.forEach(p => {
        const val = p.nusisvalpa;
        const displayVal = p.nusistippa.includes('Key') || p.nusistippa.includes('API') 
          ? `****[${val?.substring(0, 20)}...]****`
          : val;
        console.log(`   ${p.nusistippa}: ${displayVal}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGoogleMapsConfig();
