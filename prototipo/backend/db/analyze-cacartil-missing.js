const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeMissingCacartil() {
  console.log('\n🔍 Analizando por qué cacartil no se cargó...\n');

  // 1. Verificar entidades en caentida
  const entidades = await prisma.caentida.findMany({
    select: {
      caentid: true,
      caentapeno: true,
      carubid: true,
      caespid: true
    }
  });

  console.log(`📊 Total entidades en caentida: ${entidades.length}`);

  // 2. Clasificar entidades
  const sinRubro = entidades.filter(e => !e.carubid || e.carubid.trim() === '');
  const sinEsp = entidades.filter(e => !e.caespid || e.caespid.trim() === '');
  const sinAmbos = entidades.filter(e => 
    (!e.carubid || e.carubid.trim() === '') && 
    (!e.caespid || e.caespid.trim() === '')
  );

  console.log(`❌ Sin rubro: ${sinRubro.length}`);
  console.log(`❌ Sin especialidad: ${sinEsp.length}`);
  console.log(`💊 Sin rubro NI especialidad (farmacias): ${sinAmbos.length}\n`);

  // 3. Verificar cacartil
  const cacartilCount = await prisma.cacartil.count();
  console.log(`📋 Registros en cacartil: ${cacartilCount}\n`);

  // 4. Verificar rubros y especialidades disponibles
  const rubros = await prisma.carubro.count();
  const especialidades = await prisma.caespeci.count();
  console.log(`📚 Rubros disponibles: ${rubros}`);
  console.log(`📚 Especialidades disponibles: ${especialidades}\n`);

  // 5. Mostrar primeras 5 entidades
  console.log('📝 Primeras 5 entidades:');
  entidades.slice(0, 5).forEach(e => {
    const rubro = e.carubid?.trim() || 'NULL';
    const esp = e.caespid?.trim() || 'NULL';
    console.log(`   ${e.caentid.trim()} - ${e.caentapeno.trim().substring(0, 30)}`);
    console.log(`      Rubro: ${rubro}, Especialidad: ${esp}`);
  });

  // 6. Diagnóstico
  console.log('\n🩺 DIAGNÓSTICO:');
  if (cacartilCount === 0 && entidades.length > 0) {
    console.log('   ❌ PROBLEMA: Entidades importadas pero cacartil vacía');
    if (sinAmbos.length === entidades.length) {
      console.log('   💊 CAUSA: Todas son farmacias (sin rubro/especialidad)');
      console.log('   🔧 SOLUCIÓN: ETL no guardó en cacartil porque falta procesarRubroFarmacia()');
    } else {
      console.log('   ⚠️  CAUSA: ETL no está guardando NINGUNA entidad en cacartil');
    }
  }

  await prisma.$disconnect();
}

analyzeMissingCacartil().catch(console.error);
