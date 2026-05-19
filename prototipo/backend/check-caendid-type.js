const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Tipo de dato
  const info = await prisma.$queryRaw`
    SELECT data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'caendire' AND column_name = 'caendid'
  `;
  console.log('Tipo caendid:', info[0]);
  
  // Sample
  const sample = await prisma.$queryRaw`
    SELECT caendid 
    FROM caendire 
    LIMIT 1
  `;
  console.log('Sample caendid:', sample[0].caendid);
  console.log('Tipo JavaScript:', typeof sample[0].caendid);
  console.log('Length:', sample[0].caendid.length);
  
  await prisma.$disconnect();
})();
