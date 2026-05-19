const { getPrisma } = require('./prismaClient');

(async () => {
  const prisma = getPrisma();
  
  const cols = await prisma.$queryRaw`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='nulocali' 
    ORDER BY ordinal_position
  `;
  
  console.log('\nColumnas de nulocali:');
  cols.forEach(c => console.log(`  - ${c.column_name}`));
  console.log('');
  
  await prisma.$disconnect();
})();
