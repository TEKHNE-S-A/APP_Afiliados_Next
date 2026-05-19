const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const caentid = '96085783180664                '; // 30 chars con padding

  console.log('🔍 Buscando entidad:', caentid);

  // Test queryRaw direcciones
  console.log('\n📍 Test queryRaw direcciones:');
  const direcciones = await prisma.$queryRaw`
    SELECT 
      d.*,
      l.nulocdescr,
      p.nuprodescr,
      p.nuproid
    FROM caendire d
    LEFT JOIN nulocali l ON d.nulocid = l.nulocid
    LEFT JOIN nuprovin p ON l.nuproid = p.nuproid
    WHERE d.caentid = ${caentid}
    ORDER BY d.caendirpri DESC, d.caendid
  `;
  console.log('   - Cantidad:', direcciones.length);
  if (direcciones.length > 0) {
    console.log('   - Primera dirección:', JSON.stringify(direcciones[0], null, 2));
  }

  // Test queryRaw cartillas
  console.log('\n🏥 Test queryRaw cartillas:');
  const cartillas = await prisma.$queryRaw`
    SELECT 
      c.cacarid,
      c.nuplaid,
      c.carubid,
      c.caespid,
      r.carubdescr,
      e.caespdescr
    FROM cacartil c
    LEFT JOIN carubro r ON c.carubid = r.carubid
    LEFT JOIN caespeci e ON c.caespid = e.caespid AND c.carubid = e.carubid
    WHERE c.caentid = ${caentid}
  `;
  console.log('   - Cantidad:', cartillas.length);
  if (cartillas.length > 0) {
    console.log('   - Primera cartilla:', JSON.stringify(cartillas[0], null, 2));
  }
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
