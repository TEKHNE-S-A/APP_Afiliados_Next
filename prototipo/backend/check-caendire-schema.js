require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'caendire'
    ORDER BY ordinal_position
  `;
  
  console.log(JSON.stringify(cols, null, 2));
  await prisma.$disconnect();
})();
