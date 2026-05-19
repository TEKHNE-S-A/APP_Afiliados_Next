const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkForeignKeys() {
  const fks = await prisma.$queryRaw`
    SELECT 
      tc.constraint_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name, 
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu 
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu 
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name='cacartil' 
      AND tc.constraint_type='FOREIGN KEY'
  `;
  
  console.log('📋 Foreign Keys tabla cacartil:\n');
  fks.forEach(fk => {
    console.log(`   ${fk.constraint_name}:`);
    console.log(`      ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}\n`);
  });
  
  await prisma.$disconnect();
}

checkForeignKeys();
