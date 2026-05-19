require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n=== SCHEMA DE CAENTELE ===\n');
  
  // Obtener columnas
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'caentele'
    ORDER BY ordinal_position
  `;
  
  console.log('Columnas:');
  cols.forEach(col => {
    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
    const maxLen = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
    console.log(`  ${col.column_name.padEnd(20)} ${col.data_type}${maxLen.padEnd(10)} ${nullable}`);
  });
  
  // Obtener PK
  const pk = await prisma.$queryRaw`
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'caentele'::regclass AND i.indisprimary
    ORDER BY array_position(i.indkey, a.attnum)
  `;
  
  console.log('\nPrimary Key:');
  console.log('  ' + pk.map(p => p.attname).join(', '));
  
  await prisma.$disconnect();
})();
