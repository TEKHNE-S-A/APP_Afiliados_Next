const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function truncate() {
  console.log('\n🗑️  Truncando tablas de cartilla...\n');
  
  try {
    console.log('   📋 Limpiando caentele (teléfonos)...');
    await prisma.$executeRaw`TRUNCATE TABLE caentele CASCADE`;
    
    console.log('   📋 Limpiando caendire (direcciones)...');
    await prisma.$executeRaw`TRUNCATE TABLE caendire CASCADE`;
    
    console.log('   📋 Limpiando cacartil (cartillas)...');
    await prisma.$executeRaw`TRUNCATE TABLE cacartil CASCADE`;
    
    console.log('   📋 Limpiando caentida (entidades)...');
    await prisma.$executeRaw`TRUNCATE TABLE caentida CASCADE`;
    
    console.log('   📋 Limpiando caespeci (especialidades)...');
    await prisma.$executeRaw`TRUNCATE TABLE caespeci CASCADE`;
    
    console.log('   📋 Limpiando carubro (rubros)...');
    await prisma.$executeRaw`TRUNCATE TABLE carubro CASCADE`;
    
    console.log('   📋 Limpiando nulocali (localidades)...');
    await prisma.$executeRaw`TRUNCATE TABLE nulocali CASCADE`;
    
    console.log('   📋 Limpiando nuprovin (provincias)...');
    await prisma.$executeRaw`TRUNCATE TABLE nuprovin CASCADE`;
    
    console.log('   📋 Limpiando nupais (países)...');
    await prisma.$executeRaw`TRUNCATE TABLE nupais CASCADE`;
    
    console.log('\n✅ Todas las tablas de cartilla han sido limpiadas\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

truncate();
