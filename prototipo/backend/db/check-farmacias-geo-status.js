const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFarmaciasGeoStatus() {
  try {
    // Verificar estado de direcciones de farmacias
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN d.caendpenge = 'N' THEN 1 END) as pendientes,
        COUNT(CASE WHEN d.caendpenge = 'S' THEN 1 END) as procesadas,
        COUNT(CASE WHEN d.caendlat IS NOT NULL THEN 1 END) as con_lat,
        COUNT(CASE WHEN d.caendgeost = 'S' THEN 1 END) as exitosas,
        COUNT(CASE WHEN d.caendgeost = 'E' THEN 1 END) as errores
      FROM caendire d
      INNER JOIN cacartil c ON d.caentid = c.caentid
      WHERE c.carubid = ${'000000008'.padEnd(30)}
    `;

    console.log('\n📊 Estado de direcciones de FARMACIAS:');
    console.log(`   Total direcciones: ${stats[0].total}`);
    console.log(`   Pendientes (caendpenge='N'): ${stats[0].pendientes}`);
    console.log(`   Procesadas (caendpenge='S'): ${stats[0].procesadas}`);
    console.log(`   Con coordenadas: ${stats[0].con_lat}`);
    console.log(`   Exitosas (caendgeost='S'): ${stats[0].exitosas}`);
    console.log(`   Errores (caendgeost='E'): ${stats[0].errores}`);

    // Mostrar algunas direcciones pendientes
    const pendientes = await prisma.$queryRaw`
      SELECT 
        d.caentid,
        d.caendid,
        d.caendirecc,
        d.caendpenge,
        d.caendgeost,
        e.caentapeno
      FROM caendire d
      INNER JOIN cacartil c ON d.caentid = c.caentid
      INNER JOIN caentida e ON d.caentid = e.caentid
      WHERE c.carubid = ${'000000008'.padEnd(30)}
        AND d.caendpenge = 'N'
      LIMIT 5
    `;

    console.log('\n📋 Ejemplos de direcciones pendientes:');
    pendientes.forEach((d, i) => {
      console.log(`\n${i + 1}. ${d.caentapeno?.trim()}`);
      console.log(`   ID: ${d.caentid.trim()}`);
      console.log(`   Dirección: ${d.caendirecc?.trim()}`);
      console.log(`   caendpenge: ${d.caendpenge}`);
      console.log(`   caendgeost: ${d.caendgeost}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFarmaciasGeoStatus();
