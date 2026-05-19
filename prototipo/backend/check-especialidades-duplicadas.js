const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Analizando especialidades...\n');
  
  // Obtener todas las especialidades
  const especialidades = await prisma.caespeci.findMany({
    orderBy: { caespdescr: 'asc' }
  });
  
  console.log(`Total especialidades en BD: ${especialidades.length}\n`);
  
  // Agrupar por caespid para ver duplicados
  const porId = {};
  especialidades.forEach(e => {
    const id = e.caespid.trim();
    if (!porId[id]) {
      porId[id] = [];
    }
    porId[id].push({
      carubid: e.carubid.trim(),
      descripcion: e.caespdescr.trim()
    });
  });
  
  console.log('Especialidades con múltiples rubros:\n');
  let duplicados = 0;
  Object.keys(porId).forEach(id => {
    if (porId[id].length > 1) {
      duplicados++;
      console.log(`  ${id} - ${porId[id][0].descripcion}`);
      porId[id].forEach(item => {
        console.log(`    → Rubro: ${item.carubid}`);
      });
    }
  });
  
  console.log(`\n📊 Total especialidades con múltiples rubros: ${duplicados}`);
  
  // Ver especialidades únicas por descripción
  const porDescripcion = {};
  especialidades.forEach(e => {
    const desc = e.caespdescr.trim();
    if (!porDescripcion[desc]) {
      porDescripcion[desc] = 0;
    }
    porDescripcion[desc]++;
  });
  
  console.log('\n📋 Especialidades por descripción:');
  Object.keys(porDescripcion).sort().forEach(desc => {
    if (porDescripcion[desc] > 1) {
      console.log(`  ${desc}: ${porDescripcion[desc]} veces`);
    }
  });
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
