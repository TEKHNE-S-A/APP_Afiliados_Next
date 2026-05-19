/**
 * Test: Verificar filtro de entidades activas/inactivas
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log('\n🧪 TEST: Filtro entidades activas/inactivas\n');

  // 1. Ver estado de entidad 00001
  console.log('1️⃣ Estado actual entidad 00001:');
  const entidad00001 = await prisma.$queryRaw`
    SELECT caentid, caentapeno, caentmarca
    FROM caentida
    WHERE TRIM(caentid) = '00001'
  `;
  console.log(entidad00001);
  console.log('');

  // 2. Contar todas las entidades
  console.log('2️⃣ Conteo total:');
  const total = await prisma.$queryRaw`
    SELECT 
      COUNT(*) FILTER (WHERE caentmarca = true) as activas,
      COUNT(*) FILTER (WHERE caentmarca = false) as inactivas,
      COUNT(*) as total
    FROM caentida
  `;
  console.log(total);
  console.log('');

  // 3. Listar 5 entidades activas
  console.log('3️⃣ Primeras 5 entidades ACTIVAS (caentmarca = true):');
  const activas = await prisma.$queryRaw`
    SELECT caentid, caentapeno, caentmarca
    FROM caentida
    WHERE caentmarca = true
    ORDER BY caentid
    LIMIT 5
  `;
  console.log(activas);
  console.log('');

  // 4. Listar 5 entidades inactivas
  console.log('4️⃣ Primeras 5 entidades INACTIVAS (caentmarca = false):');
  const inactivas = await prisma.$queryRaw`
    SELECT caentid, caentapeno, caentmarca
    FROM caentida
    WHERE caentmarca = false
    ORDER BY caentid
    LIMIT 5
  `;
  console.log(inactivas);
  console.log('');

  // 5. Test usando el repository
  console.log('5️⃣ Usando cartillaRepository.listEntidades() con includeInactivas=false:');
  const cartillaRepository = require('./repositories/cartillaRepository');
  
  const resultadoSinInactivas = await cartillaRepository.listEntidades({
    page: 1,
    limit: 10,
    includeInactivas: false
  });
  
  console.log(`Total encontradas: ${resultadoSinInactivas.pagination.total}`);
  console.log('Entidades:', resultadoSinInactivas.data.map(e => ({
    id: e.caentid.trim(),
    nombre: e.caentapeno.trim().substring(0, 30),
    activa: e.caentmarca
  })));
  console.log('');

  console.log('6️⃣ Usando cartillaRepository.listEntidades() con includeInactivas=true:');
  const resultadoConInactivas = await cartillaRepository.listEntidades({
    page: 1,
    limit: 10,
    includeInactivas: true
  });
  
  console.log(`Total encontradas: ${resultadoConInactivas.pagination.total}`);
  console.log('Entidades:', resultadoConInactivas.data.map(e => ({
    id: e.caentid.trim(),
    nombre: e.caentapeno.trim().substring(0, 30),
    activa: e.caentmarca
  })));
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
