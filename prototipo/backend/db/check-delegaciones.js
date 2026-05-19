/**
 * Script verificación: Contar delegaciones en BD
 * 
 * Verifica cuántas entidades tienen rubroId='000000009' (DELEGACION)
 * 
 * Uso:
 *   node backend/db/check-delegaciones.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDelegaciones() {
  try {
    console.log('🏢 Verificando delegaciones en BD...\n');

    // Verificar rubro DELEGACIONES
    const rubro = await prisma.carubro.findUnique({
      where: { carubid: '000000009'.padEnd(30, ' ') }
    });

    if (!rubro) {
      console.log('❌ Rubro DELEGACIONES no existe en tabla carubro');
      console.log('   Ejecutar primero: node backend/db/insert-rubro-delegaciones.js\n');
      return;
    }

    console.log(`✅ Rubro encontrado: ${rubro.carubid.trim()} | ${rubro.carubdescr}\n`);

    // Contar entidades con rubroId='000000009' en cacartil
    const countQuery = `
      SELECT COUNT(DISTINCT e.caentid) as total
      FROM caentida e
      WHERE EXISTS (
        SELECT 1 FROM cacartil c 
        WHERE c.caentid = e.caentid 
        AND TRIM(c.carubid) = '000000009'
      )
    `;

    const result = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT e.caentid) as total
      FROM caentida e
      WHERE EXISTS (
        SELECT 1 FROM cacartil c 
        WHERE c.caentid = e.caentid 
        AND TRIM(c.carubid) = '000000009'
      )
    `;

    const total = parseInt(result[0].total);

    console.log(`📊 Delegaciones en BD: ${total}`);

    if (total === 0) {
      console.log('\n⚠️  No hay delegaciones registradas');
      console.log('   Incorporación manual vía admin panel:');
      console.log('   http://localhost:3000/admin/cartilla\n');
    } else {
      // Listar delegaciones
      const delegaciones = await prisma.$queryRaw`
        SELECT 
          e.caentid,
          e.caentapeno as nombre,
          e.caentweb as web,
          d.caendirecc as direccion,
          d.caendlat as lat,
          d.caendlng as lng,
          d.caendgeost as geo_status
        FROM caentida e
        INNER JOIN cacartil c ON c.caentid = e.caentid
        LEFT JOIN caendire d ON d.caentid = e.caentid AND d.caendprin = 'S'
        WHERE TRIM(c.carubid) = '000000009'
        ORDER BY e.caentapeno
        LIMIT 10
      `;

      console.log(`\n📋 Primeras ${Math.min(total, 10)} delegaciones:\n`);
      delegaciones.forEach((d, idx) => {
        console.log(`   ${idx + 1}. ${d.caentid.trim()} | ${d.nombre}`);
        if (d.direccion) console.log(`      Dirección: ${d.direccion}`);
        if (d.lat && d.lng) console.log(`      Coordenadas: ${d.lat}, ${d.lng} (${d.geo_status})`);
        console.log('');
      });
    }

    console.log('✅ Verificación completa\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkDelegaciones();
