const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFarmacias() {
  try {
    console.log('🔍 Verificando farmacias en BD...\n');

    // Contar farmacias en cacartil con rubroId 000000008
    const rubroId = '000000008'.padEnd(30);
    const farmaciasCartilla = await prisma.cacartil.count({
      where: {
        carubid: rubroId
      }
    });

    console.log(`📊 Farmacias en cacartil (rubroId=${rubroId.trim()}): ${farmaciasCartilla}`);

    // Buscar primeras 5 farmacias para ver estructura
    const ejemplos = await prisma.cacartil.findMany({
      where: {
        carubid: rubroId
      },
      take: 5,
      include: {
        caentida: {
          include: {
            caendire: {
              take: 1
            }
          }
        }
      }
    });

    console.log('\n📋 Ejemplos de farmacias:');
    ejemplos.forEach((f, i) => {
      console.log(`\n${i + 1}. ${f.caentida?.caentapeno || 'Sin nombre'}`);
      console.log(`   ID: ${f.caentid.trim()}`);
      console.log(`   rubroId: ${f.carubid.trim()}`);
      if (f.caentida?.caendire?.[0]) {
        const dir = f.caentida.caendire[0];
        console.log(`   Dirección: ${dir.caendirecc?.trim() || 'Sin dirección'}`);
        console.log(`   Lat/Lng: ${dir.caendlat}, ${dir.caendlng}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFarmacias();
