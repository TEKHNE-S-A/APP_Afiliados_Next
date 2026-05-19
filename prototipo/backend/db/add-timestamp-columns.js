const { getPrisma } = require('./prismaClient');

(async () => {
  const prisma = getPrisma();
  
  console.log('\n🔧 Agregando columnas timestamp...\n');
  
  // caendgeoup
  try {
    await prisma.$executeRaw`ALTER TABLE caendire ADD COLUMN caendgeoup TIMESTAMP`;
    console.log('✅ caendgeoup agregada');
  } catch (e) {
    console.log('⚠️  caendgeoup ya existe');
  }
  
  // caendupdated
  try {
    await prisma.$executeRaw`ALTER TABLE caendire ADD COLUMN caendupdated TIMESTAMP`;
    console.log('✅ caendupdated agregada');
  } catch (e) {
    console.log('⚠️  caendupdated ya existe');
  }
  
  console.log('\n✅ Listo!\n');
  await prisma.$disconnect();
})();
