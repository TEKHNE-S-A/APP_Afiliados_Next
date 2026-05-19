const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGeoStatus() {
  try {
    console.log('\n🔍 Verificando estado REAL de geocodificación en BD...\n');

    // Contar por rubroId y estado de geocodificación
    const stats = await prisma.$queryRaw`
      SELECT 
        c.carubid,
        r.carubdescr,
        COUNT(*) as total,
        COUNT(CASE WHEN d.caendlat IS NOT NULL THEN 1 END) as con_coords,
        COUNT(CASE WHEN d.caendpenge = 'N' THEN 1 END) as pendientes,
        COUNT(CASE WHEN d.caendpenge = 'S' THEN 1 END) as procesados
      FROM caendire d
      INNER JOIN cacartil c ON d.caentid = c.caentid
      LEFT JOIN carubro r ON c.carubid = r.carubid
      WHERE d.caendirecc IS NOT NULL
        AND d.caendirecc != ''
      GROUP BY c.carubid, r.carubdescr
      ORDER BY total DESC
    `;

    console.log('📊 Estado por rubro:\n');
    stats.forEach(s => {
      const porcentaje = ((parseInt(s.con_coords) / parseInt(s.total)) * 100).toFixed(1);
      console.log(`${s.carubdescr?.trim() || 'Sin rubro'} (${s.carubid}):`);
      console.log(`   Total: ${s.total}`);
      console.log(`   Con coordenadas: ${s.con_coords} (${porcentaje}%)`);
      console.log(`   Pendientes: ${s.pendientes}`);
      console.log(`   Procesados: ${s.procesados}\n`);
    });

    // Verificar últimas 5 geocodificaciones
    console.log('📍 Últimas 5 direcciones geocodificadas:\n');
    const ultimas = await prisma.$queryRaw`
      SELECT 
        e.caentapeno,
        d.caendirecc,
        d.caendlat,
        d.caendlng,
        d.caendgeoup,
        c.carubid
      FROM caendire d
      INNER JOIN caentida e ON d.caentid = e.caentid
      INNER JOIN cacartil c ON d.caentid = c.caentid
      WHERE d.caendlat IS NOT NULL
      ORDER BY d.caendgeoup DESC NULLS LAST
      LIMIT 5
    `;

    if (ultimas.length === 0) {
      console.log('   ⚠️  NO hay registros geocodificados aún');
    } else {
      ultimas.forEach((u, i) => {
        console.log(`${i + 1}. ${u.caentapeno}`);
        console.log(`   Coords: (${u.caendlat}, ${u.caendlng})`);
        console.log(`   Fecha: ${u.caendgeoup || 'Sin fecha'}`);
        console.log(`   Rubro: ${u.carubid}\n`);
      });
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkGeoStatus();
