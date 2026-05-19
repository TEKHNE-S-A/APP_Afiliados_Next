const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyFarmacias() {
  try {
    console.log('\n📊 Verificación final de farmacias:\n');

    // Stats generales
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN d.caendlat IS NOT NULL AND d.caendlng IS NOT NULL THEN 1 END) as con_coords,
        COUNT(CASE WHEN d.caendpenge = 'N' THEN 1 END) as pendientes,
        COUNT(CASE WHEN d.caendpenge = 'S' THEN 1 END) as procesadas
      FROM caendire d
      INNER JOIN cacartil c ON d.caentid = c.caentid
      WHERE c.carubid = ${'000000008'.padEnd(30)}
    `;

    const stat = stats[0];
    const porcentaje = ((parseInt(stat.con_coords) / parseInt(stat.total)) * 100).toFixed(1);

    console.log('ESTADO GENERAL:');
    console.log(`  Total farmacias: ${stat.total}`);
    console.log(`  Con coordenadas: ${stat.con_coords} (${porcentaje}%)`);
    console.log(`  Procesadas: ${stat.procesadas}`);
    console.log(`  Pendientes: ${stat.pendientes}`);

    // Muestra últimas 10 procesadas
    const ultimas = await prisma.$queryRaw`
      SELECT 
        e.caentapeno,
        d.caendirecc,
        l.nulocdescr,
        d.caendlat,
        d.caendlng,
        d.caendgeost,
        d.caendgeoup
      FROM caendire d
      INNER JOIN cacartil c ON d.caentid = c.caentid
      INNER JOIN caentida e ON d.caentid = e.caentid
      LEFT JOIN nulocali l ON d.nulocid = l.nulocid
      WHERE c.carubid = ${'000000008'.padEnd(30)}
        AND d.caendlat IS NOT NULL
      ORDER BY d.caendgeoup DESC
      LIMIT 10
    `;

    console.log('\n📍 Últimas 10 farmacias geocodificadas:');
    ultimas.forEach((f, i) => {
      console.log(`\n${i + 1}. ${f.caentapeno}`);
      console.log(`   📍 ${f.caendirecc}`);
      console.log(`   🌎 ${f.nulocdescr?.trim() || 'Sin localidad'}`);
      console.log(`   📐 Coords: (${f.caendlat}, ${f.caendlng})`);
      console.log(`   ✅ Estado: ${f.caendgeost}`);
    });

    console.log('\n✅ Verificación completada!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFarmacias();
