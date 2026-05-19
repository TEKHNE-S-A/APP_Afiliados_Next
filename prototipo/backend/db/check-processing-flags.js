const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Verificando estado de procesamiento...\n');
  
  const result = await prisma.$queryRaw`
    SELECT 
      COUNT(*)::int as total,
      COUNT(CASE WHEN caendpenge = 'S' THEN 1 END)::int as procesadas,
      COUNT(CASE WHEN caendgeost IS NOT NULL THEN 1 END)::int as con_estado,
      COUNT(CASE WHEN caendlat IS NOT NULL THEN 1 END)::int as con_lat,
      COUNT(CASE WHEN caendlng IS NOT NULL THEN 1 END)::int as con_lng
    FROM caendire
  `;
  
  console.log('Estado flags procesamiento:');
  console.log('  Total registros:', result[0].total);
  console.log('  Marcadas como procesadas (caendpenge=S):', result[0].procesadas);
  console.log('  Con estado geocodificación (caendgeost):', result[0].con_estado);
  console.log('  Con latitud (caendlat):', result[0].con_lat);
  console.log('  Con longitud (caendlng):', result[0].con_lng);
  console.log('');
}

main().finally(() => prisma.$disconnect());
