const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEntidad() {
  try {
    console.log('\n=== VERIFICANDO ENTIDAD 0026690001 ===\n');
    
    // Buscar en cacartil
    const records = await prisma.cacartil.findMany({
      where: {
        caentid: { contains: '0026690001' }
      }
    });
    
    console.log(`Total registros en cacartil: ${records.length}\n`);
    
    records.forEach((r, i) => {
      console.log(`Registro ${i + 1}:`);
      console.log(`  Rubro: '${r.carubid.trim()}' (${r.carubid.length} chars)`);
      console.log(`  Especialidad: '${r.caespid.trim()}' (${r.caespid.length} chars)`);
      console.log('');
    });
    
    // Verificar query NOT EXISTS manualmente
    const testQuery = await prisma.$queryRaw`
      SELECT e.caentid, e.caentapeno,
             EXISTS (
               SELECT 1 FROM cacartil c 
               WHERE c.caentid = e.caentid 
               AND TRIM(c.carubid) = TRIM('000000008')
             ) as tiene_rubro_farmacia
      FROM caentida e
      WHERE TRIM(e.caentid) = TRIM('0026690001')
    `;
    
    console.log('Test NOT EXISTS:');
    console.log(testQuery);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEntidad();
