require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n=== SCHEMA DE CAENTIDA ===\n');
  
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'caentida'
    ORDER BY ordinal_position
  `;
  
  cols.forEach(col => {
    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
    const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
    const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
    console.log(`${col.column_name.padEnd(20)} ${col.data_type}${maxLen.padEnd(10)} ${nullable}${def}`);
  });
  
  await prisma.$disconnect();
})();
