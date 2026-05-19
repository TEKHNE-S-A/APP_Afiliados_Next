const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  const cols = await prisma.$queryRaw`
    SELECT column_name, is_nullable, data_type, character_maximum_length, column_default
    FROM information_schema.columns 
    WHERE table_name='cacartil' 
    ORDER BY ordinal_position
  `;
  
  console.log('📋 Schema tabla cacartil:\n');
  cols.forEach(col => {
    const nullable = col.is_nullable === 'YES' ? '✅ NULL' : '❌ NOT NULL';
    const len = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
    const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
    console.log(`   ${col.column_name.padEnd(15)} ${col.data_type}${len.padEnd(10)} ${nullable}${def}`);
  });
  
  await prisma.$disconnect();
}

checkSchema();
