/**
 * Migración retroactiva: Poblar cacartil con farmacias existentes
 * 
 * CONTEXTO:
 * - Las 222 farmacias importadas tienen carubid='000000008' en caentida
 * - NO tienen registros en cacartil (tabla vacía)
 * - Admin panel usa getEntidadById() que consulta cacartil
 * - Resultado: modal "Ver Detalle" muestra "Sin rubro"
 * 
 * SOLUCIÓN:
 * - Crear registros en cacartil para todas las entidades con carubid='000000008'
 * - Mantener mismo criterio que prestadores (datos en cacartil)
 * - Permite que todas las funciones existentes funcionen sin modificaciones
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateFarmacias() {
  console.log('🔍 Buscando farmacias sin registro en cacartil...\n');

  try {
    // 1. Obtener primer plan de nuplan como plan por defecto
    const planDefecto = await prisma.nuplan.findFirst({
      orderBy: { nuplaid: 'asc' }
    });

    if (!planDefecto) {
      console.log('❌ No hay planes en tabla nuplan');
      console.log('   Crear al menos un plan antes de migrar farmacias\n');
      return;
    }

    console.log(`📋 Plan por defecto: ${planDefecto.nuplaid.trim()} - ${planDefecto.nupladescr || 'Sin descripción'}`);
    console.log(`📋 Especialidad por defecto: GENERAL\n`);

    // 2. Obtener todas las entidades con rubroId FARMACIA
    const farmacias = await prisma.caentida.findMany({
      where: {
        carubid: '000000008'
      },
      select: {
        caentid: true,
        caentapeno: true,
        carubid: true
      }
    });

    if (farmacias.length === 0) {
      console.log('✅ No hay farmacias para migrar.');
      return;
    }

    console.log(`📊 Farmacias encontradas: ${farmacias.length}\n`);

    // 2. Verificar cuáles YA tienen registro en cacartil
    const entidadesConCartilla = await prisma.cacartil.findMany({
      where: {
        caentid: {
          in: farmacias.map(f => f.caentid)
        }
      },
      select: {
        caentid: true
      }
    });

    const idsConCartilla = new Set(entidadesConCartilla.map(c => c.caentid));
    const farmaciasSinCartilla = farmacias.filter(f => !idsConCartilla.has(f.caentid));

    console.log(`✅ Con registro en cacartil: ${idsConCartilla.size}`);
    console.log(`⚠️  Sin registro en cacartil: ${farmaciasSinCartilla.length}\n`);

    if (farmaciasSinCartilla.length === 0) {
      console.log('✅ Todas las farmacias ya tienen registro en cacartil.');
      return;
    }

    // 3. Crear registros en cacartil para farmacias sin entrada
    console.log('🔄 Creando registros en cacartil...\n');
    let creados = 0;

    const planId = planDefecto.nuplaid; // Primer plan de nuplan
    const especialidadId = 'GENERAL'.padEnd(30, ' '); // Especialidad GENERAL

    for (const farmacia of farmaciasSinCartilla) {
      const cartillaId = `FARMACIA-${farmacia.caentid}`.substring(0, 36);
      
      try {
        // Usar plan por defecto y especialidad GENERAL
        await prisma.$executeRaw`
          INSERT INTO cacartil (cacarid, nuplaid, carubid, caespid, caentid)
          VALUES (${cartillaId}, ${planId}, '000000008', ${especialidadId}, ${farmacia.caentid})
        `;

        creados++;
        
        if (creados <= 5 || creados % 50 === 0) {
          console.log(`   ✅ ${creados}/${farmaciasSinCartilla.length} - ${farmacia.caentid.trim()} - ${farmacia.caentapeno}`);
        }
      } catch (error) {
        console.error(`   ❌ Error en ${farmacia.caentid.trim()}: ${error.message}`);
      }
    }

    console.log(`\n✅ Migración completada: ${creados} registros creados en cacartil\n`);

    // 4. Verificación final
    const cartillasFinales = await prisma.cacartil.count({
      where: {
        carubid: '000000008'
      }
    });

    console.log('📊 Verificación final:');
    console.log(`   Farmacias en caentida: ${farmacias.length}`);
    console.log(`   Farmacias en cacartil: ${cartillasFinales}`);
    
    if (cartillasFinales === farmacias.length) {
      console.log('\n✅ ÉXITO: Todas las farmacias tienen registro en cacartil');
    } else {
      console.log(`\n⚠️  ADVERTENCIA: Hay ${farmacias.length - cartillasFinales} farmacias sin registro`);
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrateFarmacias()
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
