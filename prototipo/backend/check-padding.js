const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const r = await p.$queryRaw`
    SELECT caendid, length(caendid) as len 
    FROM caendire 
    LIMIT 1
  `;
  
  console.log(JSON.stringify(r[0]));
  console.log('Padded ID:', '|' + r[0].caendid + '|');
  console.log('Length:', r[0].len);
  
  await p.$disconnect();
})();
