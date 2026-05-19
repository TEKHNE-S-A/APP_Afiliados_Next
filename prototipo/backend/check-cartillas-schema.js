require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const tables = ['carubro', 'caespeci', 'cacartil', 'caentida', 'caendire', 'caentele'];
  
  for (const table of tables) {
    console.log(`\n=== ${table.toUpperCase()} ===`);
    const cols = await prisma.$queryRaw`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = ${table}
      ORDER BY ordinal_position
    `;
    cols.forEach(c => {
      const maxLen = c.character_maximum_length ? `(${c.character_maximum_length})` : '';
      console.log(`  ${c.column_name.padEnd(20)} ${c.data_type}${maxLen}`);
    });
  }
  
  await prisma.$disconnect();
})();
