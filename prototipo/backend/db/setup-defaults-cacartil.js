/**
 * Setup valores por defecto para cacartil:
 * 1. Verificar primer plan en nuplan
 * 2. Crear especialidad GENERAL si no existe
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupDefaults() {
  console.log('🔧 Configurando valores por defecto para cacartil...\n');

  try {
    // 1. Verificar primer plan en nuplan
    const primerPlan = await prisma.nuplan.findFirst({
      orderBy: { nuplaid: 'asc' }
    });

    if (!primerPlan) {
      console.log('⚠️  No hay planes en tabla nuplan');
      console.log('   Crear al menos un plan antes de migrar farmacias\n');
      return;
    }

    console.log(`✅ Plan por defecto: ${primerPlan.nuplaid} - ${primerPlan.nupladescr || 'Sin descripción'}\n`);

    // 2. Verificar/crear especialidad GENERAL para rubro FARMACIA
    const rubroFarmacia = await prisma.carubro.findUnique({
      where: { carubid: '000000008' }
    });

    if (!rubroFarmacia) {
      console.log('❌ Rubro FARMACIA (000000008) no existe');
      console.log('   Ejecutar insert-rubro-farmacias.js primero\n');
      return;
    }

    // Buscar especialidad GENERAL
    const especialidadGeneral = await prisma.caespeci.findFirst({
      where: {
        carubid: '000000008',
        caespid: 'GENERAL                       ' // CHAR(30) con padding
      }
    });

    if (especialidadGeneral) {
      console.log('✅ Especialidad GENERAL ya existe\n');
    } else {
      // Crear especialidad GENERAL
      await prisma.caespeci.create({
        data: {
          caespid: 'GENERAL'.padEnd(30, ' '),
          carubid: '000000008',
          caespdescr: 'GENERAL'.padEnd(40, ' ')
        }
      });
      console.log('✅ Especialidad GENERAL creada exitosamente\n');
    }

    console.log('📋 Resumen valores por defecto:');
    console.log(`   Plan defecto: ${primerPlan.nuplaid.trim()}`);
    console.log(`   Especialidad defecto: GENERAL`);
    console.log(`   Rubro: 000000008 (FARMACIA)\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupDefaults()
  .then(() => {
    console.log('🎉 Setup completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
