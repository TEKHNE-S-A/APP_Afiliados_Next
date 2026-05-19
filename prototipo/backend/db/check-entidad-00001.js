/**
 * Verificar datos de entidad 00001
 * Chequea caentida, cacartil, caendire
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Verificando entidad 00001...\n');

  // 1. Datos en caentida
  const entidad = await prisma.$queryRaw`
    SELECT caentid, caentapeno, caentweb, caentmarca
    FROM caentida
    WHERE TRIM(caentid) = '00001'
  `;
  console.log('📋 Datos caentida:', entidad);

  // 2. Datos en cacartil (rubros/especialidades)
  const cartillas = await prisma.$queryRaw`
    SELECT c.caentid, c.carubid, r.carubdescr, c.caespid, e.caespdescr
    FROM cacartil c
    LEFT JOIN carubro r ON TRIM(c.carubid) = TRIM(r.carubid)
    LEFT JOIN caespeci e ON TRIM(c.caespid) = TRIM(e.caespid)
    WHERE TRIM(c.caentid) = '00001'
  `;
  console.log('\n📋 Datos cacartil:', cartillas);

  // 3. Datos en caendire (direcciones)
  const direcciones = await prisma.$queryRaw`
    SELECT caentid, caendid, caendirecc, caendlat, caendlng
    FROM caendire
    WHERE TRIM(caentid) = '00001'
  `;
  console.log('\n📋 Datos caendire:', direcciones);

  // 4. Verificar con el repository
  console.log('\n🔧 Intentando cargar con repository...');
  const { getEntidadById } = require('../repositories/cartillaRepository');
  
  try {
    const entidadRepo = await getEntidadById('00001');
    console.log('✅ Repository devolvió:', JSON.stringify(entidadRepo, null, 2));
  } catch (err) {
    console.error('❌ Error en repository:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
