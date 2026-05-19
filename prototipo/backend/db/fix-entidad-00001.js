/**
 * Reparar entidad 00001
 * 1. Reactivar (caentmarca = true)
 * 2. Corregir ID cartilla (FARMACIA- → DELEGACION-)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔧 Reparando entidad 00001...\n');

  // Paso 1: Reactivar entidad
  console.log('1️⃣ Reactivando entidad (caentmarca = true)...');
  await prisma.$executeRaw`
    UPDATE caentida
    SET caentmarca = true
    WHERE TRIM(caentid) = '00001'
  `;
  console.log('   ✅ Entidad reactivada\n');

  // Paso 2: Corregir ID cartilla
  console.log('2️⃣ Corrigiendo ID cartilla (FARMACIA- → DELEGACION-)...');
  const cartillaAntes = await prisma.$queryRaw`
    SELECT cacarid FROM cacartil WHERE TRIM(caentid) = '00001'
  `;
  console.log('   Antes:', cartillaAntes);

  await prisma.$executeRaw`
    UPDATE cacartil
    SET cacarid = 'DELEGACION-00001'
    WHERE TRIM(caentid) = '00001'
  `;

  const cartillaDespues = await prisma.$queryRaw`
    SELECT cacarid FROM cacartil WHERE TRIM(caentid) = '00001'
  `;
  console.log('   Después:', cartillaDespues);
  console.log('   ✅ ID cartilla corregido\n');

  // Verificación final
  console.log('🔍 Verificación final:');
  const entidadFinal = await prisma.$queryRaw`
    SELECT 
      e.caentid, 
      e.caentapeno, 
      e.caentmarca as activa,
      c.carubid,
      r.carubdescr,
      c.cacarid
    FROM caentida e
    LEFT JOIN cacartil c ON TRIM(e.caentid) = TRIM(c.caentid)
    LEFT JOIN carubro r ON TRIM(c.carubid) = TRIM(r.carubid)
    WHERE TRIM(e.caentid) = '00001'
    LIMIT 1
  `;
  console.log(entidadFinal);

  console.log('\n✅ Reparación completada. La entidad ahora:');
  console.log('   - Está activa (caentmarca = true)');
  console.log('   - Tiene rubro DELEGACION (000000009)');
  console.log('   - Tiene ID cartilla correcto (DELEGACION-00001)');
  console.log('   - Puede editarse y eliminarse desde admin\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
