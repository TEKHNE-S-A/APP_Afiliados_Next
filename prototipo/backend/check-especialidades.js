const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEspecialidades() {
  const rubros = await prisma.carubro.findMany({ take: 5 });
  
  console.log('\n📋 Rubros y sus especialidades:\n');
  
  for (const rubro of rubros) {
    const especialidades = await prisma.caespeci.findMany({
      where: { carubid: rubro.carubid }
    });
    
    console.log(`Rubro: ${rubro.carubid.trim()} - ${rubro.carubdescr.trim()}`);
    if (especialidades.length > 0) {
      especialidades.forEach(e => {
        console.log(`   ↳ ${e.caespid.trim()} - ${e.caespdescr.trim()}`);
      });
    } else {
      console.log('   ↳ (Sin especialidades)');
    }
    console.log('');
  }
  
  await prisma.$disconnect();
}

checkEspecialidades();
