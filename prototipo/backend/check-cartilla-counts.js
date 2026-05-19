const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const counts = {
    nupais: await prisma.nupais.count(),
    nuprovin: await prisma.nuprovin.count(),
    nulocali: await prisma.nulocali.count(),
    carubro: await prisma.carubro.count(),
    caespeci: await prisma.caespeci.count(),
    caentida: await prisma.caentida.count(),
    caendire: await prisma.caendire.count(),
    caentele: await prisma.caentele.count(),
    cacartil: await prisma.cacartil.count()
  };
  
  console.log('\n📊 Conteo de registros:\n');
  console.log('   Países:', counts.nupais);
  console.log('   Provincias:', counts.nuprovin);
  console.log('   Localidades:', counts.nulocali);
  console.log('   Rubros:', counts.carubro);
  console.log('   Especialidades:', counts.caespeci);
  console.log('   Entidades:', counts.caentida);
  console.log('   Direcciones:', counts.caendire);
  console.log('   Teléfonos:', counts.caentele);
  console.log('   Cartillas:', counts.cacartil);
  
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log('\n   TOTAL:', total);
  
  if (total === 0) {
    console.log('\n✅ Todas las tablas están vacías\n');
  } else {
    console.log('\n⚠️  Todavía hay registros en las tablas\n');
  }
  
  await prisma.$disconnect();
  process.exit(0);
}

check();
