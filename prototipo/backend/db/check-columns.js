const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRaw`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'caentida' 
    ORDER BY ordinal_position
  `;
  
  console.log('Columnas caentida:');
  cols.forEach(c => console.log('  -', c.column_name));
}

main().finally(() => prisma.$disconnect());
