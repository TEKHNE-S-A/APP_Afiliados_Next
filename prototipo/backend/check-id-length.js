const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const entidad = await prisma.caentida.findFirst({
    where: { caentapeno: { contains: 'TEST NUEVO' } }
  });
  
  if (entidad) {
    console.log('ID length:', entidad.caentid.length);
    console.log('ID value:', JSON.stringify(entidad.caentid));
    console.log('ID repr:', entidad.caentid);
    
    // Buscar direccion con este ID
    const dir = await prisma.caendire.findFirst({
      where: { caentid: entidad.caentid }
    });
    console.log('\nDirección encontrada con findFirst:', dir ? 'SÍ' : 'NO');
    
    // Buscar con queryRaw
    const dirs = await prisma.$queryRaw`SELECT * FROM caendire WHERE caentid = ${entidad.caentid}`;
    console.log('Direcciones con queryRaw:', dirs.length);
  }
}

main().finally(() => prisma.$disconnect());
