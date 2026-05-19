const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeFarmaciasStructure() {
  try {
    console.log('\n🔍 Analizando estructura de FARMACIAS...\n');

    // Ver qué tienen las farmacias en caentida
    const entidades = await prisma.caentida.findMany({
      where: {
        cacartil: {
          some: {
            carubid: '000000008'.padEnd(30)
          }
        }
      },
      take: 5,
      include: {
        caendire: true,
        cacartil: true
      }
    });

    console.log(`📦 Total farmacias encontradas en muestra: ${entidades.length}\n`);

    entidades.forEach((e, i) => {
      console.log(`\n${i + 1}. ${e.caentapeno?.trim()}`);
      console.log(`   ID: ${e.caentid.trim()}`);
      console.log(`   Direcciones (caendire): ${e.caendire?.length || 0}`);
      console.log(`   Cartillas (cacartil): ${e.cacartil?.length || 0}`);
      
      if (e.cacartil && e.cacartil.length > 0) {
        console.log(`   rubroId: ${e.cacartil[0].carubid.trim()}`);
        console.log(`   planId: ${e.cacartil[0].nuplaid.trim()}`);
      }
      
      if (e.caendire && e.caendire.length > 0) {
        const dir = e.caendire[0];
        console.log(`   Dirección: ${dir.caendirecc?.trim() || 'Sin dirección'}`);
        console.log(`   lat/lng: ${dir.caendlat}, ${dir.caendlng}`);
        console.log(`   caendpenge: ${dir.caendpenge}`);
      }
    });

    // Contar totales
    const totalCount = await prisma.caentida.count({
      where: {
        cacartil: {
          some: {
            carubid: '000000008'.padEnd(30)
          }
        }
      }
    });

    const conDireccion = await prisma.caentida.count({
      where: {
        cacartil: {
          some: {
            carubid: '000000008'.padEnd(30)
          }
        },
        caendire: {
          some: {}
        }
      }
    });

    console.log(`\n\n📊 RESUMEN:`);
    console.log(`   Total farmacias: ${totalCount}`);
    console.log(`   Con direcciones en caendire: ${conDireccion}`);
    console.log(`   Sin direcciones: ${totalCount - conDireccion}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeFarmaciasStructure();
