const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar la última entidad creada (TEST NUEVO PRESTADOR...)
  const entidad = await prisma.caentida.findFirst({
    where: {
      caentapeno: { contains: 'TEST NUEVO PRESTADOR' }
    },
    orderBy: { caentid: 'desc' }
  });

  if (!entidad) {
    console.log('❌ No se encontró la entidad TEST NUEVO PRESTADOR');
    return;
  }

  console.log('\n✅ Entidad encontrada:');
  console.log('   - ID:', entidad.caentid);
  console.log('   - Nombre:', entidad.caentapeno.trim());
  console.log('   - Estado:', entidad.caentmarca);

  // Buscar dirección
  const direccion = await prisma.caendire.findFirst({
    where: { caentid: entidad.caentid }
  });

  console.log('\n📍 Dirección:');
  if (direccion) {
    console.log('   ✅ Existe dirección');
    console.log('   - ID:', direccion.caendid);
    console.log('   - Localidad:', direccion.nulocid.trim());
    console.log('   - Dirección:', direccion.caendirecc.trim());
  } else {
    console.log('   ❌ NO existe dirección');
  }

  // Buscar cartilla
  const cartilla = await prisma.cacartil.findFirst({
    where: { caentid: entidad.caentid }
  });

  console.log('\n🏥 Cartilla:');
  if (cartilla) {
    console.log('   ✅ Existe cartilla');
    console.log('   - ID:', cartilla.cacarid);
    console.log('   - Rubro:', cartilla.carubid.trim());
    console.log('   - Especialidad:', cartilla.caespid.trim());
  } else {
    console.log('   ❌ NO existe cartilla');
  }
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
