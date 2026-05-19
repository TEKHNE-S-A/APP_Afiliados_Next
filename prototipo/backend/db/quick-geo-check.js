const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickCheck() {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN caendlat IS NOT NULL THEN 1 END) as geocodificados,
        COUNT(CASE WHEN caendpenge = 'N' THEN 1 END) as pendientes
      FROM caendire
      WHERE caendirecc IS NOT NULL
        AND caendirecc != ''
    `;

    const r = result[0];
    console.log('\n📊 ESTADO ACTUAL BD:');
    console.log(`   Total direcciones: ${r.total}`);
    console.log(`   Geocodificadas: ${r.geocodificados}`);
    console.log(`   Pendientes: ${r.pendientes}\n`);

    const porcentaje = ((parseInt(r.geocodificados) / parseInt(r.total)) * 100).toFixed(1);
    console.log(`   Progreso: ${porcentaje}%\n`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickCheck();
