/**
 * Test query que usaría el módulo mobile de Farmacias
 * Simula: GET /api/cartilla?rubroId=000000008
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFarmaciasMobileQuery() {
  console.log('\n🧪 Test query módulo Farmacias mobile\n');

  try {
    // Query exacta que haría el endpoint /api/cartilla con rubroId=000000008
    const farmacias = await prisma.$queryRaw`
      SELECT 
        e.caentid,
        e.caentapeno AS nombre,
        e.carubid,
        e.caespid,
        r.carubdescr AS rubro_nombre,
        d.caendirecc AS direccion,
        d.caendlat AS lat,
        d.caendlng AS lng
      FROM caentida e
      LEFT JOIN carubro r ON TRIM(e.carubid) = TRIM(r.carubid)
      LEFT JOIN caendire d ON TRIM(e.caentid) = TRIM(d.caentid) AND d.caendirpri = 'S'
      WHERE TRIM(e.carubid) = '000000008'
      LIMIT 5
    `;

    console.log(`✅ Farmacias encontradas: ${farmacias.length}\n`);

    if (farmacias.length === 0) {
      console.log('⚠️  NO se encontraron farmacias con rubroId=000000008');
      console.log('   Verificando formato del campo carubid...\n');

      // Verificar formato exacto
      const sample = await prisma.$queryRaw`
        SELECT 
          caentid,
          caentapeno,
          carubid,
          LENGTH(carubid) AS carubid_length,
          TRIM(carubid) AS carubid_trimmed
        FROM caentida
        LIMIT 3
      `;

      console.log('📊 Muestra de datos:');
      sample.forEach((row, idx) => {
        console.log(`\n${idx + 1}. ${row.caentapeno}`);
        console.log(`   carubid: "${row.carubid}"`);
        console.log(`   Length: ${row.carubid_length}`);
        console.log(`   Trimmed: "${row.carubid_trimmed}"`);
      });

      console.log('\n💡 El campo carubid es CHAR(30), requiere TRIM() en queries');
    } else {
      farmacias.forEach((farmacia, idx) => {
        console.log(`${idx + 1}. ${farmacia.nombre.trim()}`);
        console.log(`   ID: ${farmacia.caentid.trim()}`);
        console.log(`   Rubro: ${farmacia.carubid?.trim() || 'NULL'} (${farmacia.rubro_nombre?.trim() || 'N/A'})`);
        console.log(`   Dirección: ${farmacia.direccion?.trim() || 'N/A'}`);
        console.log(`   Coords: ${farmacia.lat || 'N/A'}, ${farmacia.lng || 'N/A'}\n`);
      });

      console.log('✅ Query funcionando correctamente');
      console.log('💡 El módulo mobile debería mostrar estas farmacias');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
testFarmaciasMobileQuery().catch(console.error);
