const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPendingAddresses() {
  try {
    console.log('\n🔍 Direcciones pendientes de geocodificación:\n');

    // Ver qué direcciones encuentra el servicio
    const direcciones = await prisma.$queryRaw`
      SELECT 
        d.caentid,
        d.caendid,
        d.caendirecc,
        d.nulocid,
        l.nulocdescr,
        p.nuprodescr,
        e.caentapeno,
        c.carubid,
        r.carubdescr
      FROM caendire d
      LEFT JOIN nulocali l ON d.nulocid = l.nulocid
      LEFT JOIN nuprovin p ON l.nuproid = p.nuproid
      LEFT JOIN caentida e ON d.caentid = e.caentid
      LEFT JOIN cacartil c ON d.caentid = c.caentid
      LEFT JOIN carubro r ON c.carubid = r.carubid
      WHERE d.caendpenge = 'N'
        AND d.caendirecc IS NOT NULL
        AND d.caendirecc != ''
      ORDER BY e.caentapeno
      LIMIT 20
    `;

    console.log(`Total direcciones pendientes (top 20): ${direcciones.length}\n`);

    direcciones.forEach((d, i) => {
      console.log(`${i + 1}. ${d.caentapeno || 'Sin nombre'}`);
      console.log(`   rubroId: ${d.carubid} - ${d.carubdescr?.trim() || 'Sin rubro'}`);
      console.log(`   Dirección: ${d.caendirecc}`);
      console.log(`   Localidad: ${d.nulocdescr?.trim() || 'Sin localidad'}`);
      console.log(`   Provincia: ${d.nuprodescr?.trim() || 'Sin provincia'}`);
      console.log('');
    });

    // Ver rubros pendientes
    const rubros = await prisma.$queryRaw`
      SELECT 
        c.carubid,
        r.carubdescr,
        COUNT(*) as count
      FROM caendire d
      INNER JOIN caentida e ON d.caentid = e.caentid
      INNER JOIN cacartil c ON d.caentid = c.caentid
      LEFT JOIN carubro r ON c.carubid = r.carubid
      WHERE d.caendpenge = 'N'
        AND d.caendirecc IS NOT NULL
      GROUP BY c.carubid, r.carubdescr
      ORDER BY count DESC
    `;

    console.log('\n📊 Distribución por rubro:');
    rubros.forEach(r => {
      console.log(`  ${r.carubid} - ${r.carubdescr?.trim() || 'Sin descripción'}: ${r.count} pendientes`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingAddresses();
