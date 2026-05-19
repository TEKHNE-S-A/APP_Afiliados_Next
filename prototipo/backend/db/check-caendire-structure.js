/**
 * Verificar estructura de columnas de geocodificación en caendire
 * y hacer un test UPDATE real
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStructure() {
  console.log('\n📋 Verificando estructura de caendire...\n');
  
  // 1. Verificar columnas
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'caendire'
      AND column_name IN ('caentid', 'caendid', 'caendlat', 'caendlng', 'caendgeost', 'caendgeoerr', 'caendpenge')
    ORDER BY column_name
  `;
  
  console.log('✅ Columnas relevantes:');
  columns.forEach(c => {
    console.log(`   ${c.column_name}: ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ''} ${c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
  });
  
  // 2. Obtener un registro pendiente
  console.log('\n📊 Obteniendo registro pendiente para test...\n');
  
  const [pendiente] = await prisma.$queryRaw`
    SELECT caentid, caendid, caendirecc, caendlat, caendlng, caendgeost, caendpenge
    FROM caendire
    WHERE caendirecc IS NOT NULL 
      AND caendirecc != ''
      AND caendpenge = 'N'
    LIMIT 1
  `;
  
  if (!pendiente) {
    console.log('❌ No hay registros pendientes para test');
    await prisma.$disconnect();
    return;
  }
  
  console.log('✅ Registro encontrado:');
  console.log(`   caentid: "${pendiente.caentid}" (length: ${pendiente.caentid.length})`);
  console.log(`   caendid: "${pendiente.caendid}" (length: ${pendiente.caendid.length})`);
  console.log(`   dirección: ${pendiente.caendirecc}`);
  console.log(`   lat actual: ${pendiente.caendlat}`);
  console.log(`   lng actual: ${pendiente.caendlng}`);
  console.log(`   estado: ${pendiente.caendgeost}`);
  console.log(`   pendiente: ${pendiente.caendpenge}`);
  
  // 3. Test UPDATE con valores de prueba
  console.log('\n🔧 Probando UPDATE con TRIM...\n');
  
  const testLat = -28.4652445;
  const testLng = -65.7699833;
  const testStatus = 'S';
  
  try {
    const affected = await prisma.$executeRaw`
      UPDATE caendire
      SET 
        caendlat = ${testLat},
        caendlng = ${testLng},
        caendgeost = ${testStatus},
        caendgeoerr = NULL,
        caendgeoup = CURRENT_TIMESTAMP,
        caendupdated = CURRENT_TIMESTAMP,
        caendpenge = 'S'
      WHERE TRIM(caentid) = TRIM(${pendiente.caentid})
        AND TRIM(caendid) = TRIM(${pendiente.caendid})
    `;
    
    console.log(`✅ UPDATE ejecutado: ${affected} fila(s) afectada(s)`);
    
    // Verificar el cambio
    const [updated] = await prisma.$queryRaw`
      SELECT caendlat, caendlng, caendgeost, caendpenge
      FROM caendire
      WHERE TRIM(caentid) = TRIM(${pendiente.caentid})
        AND TRIM(caendid) = TRIM(${pendiente.caendid})
    `;
    
    console.log('\n📊 Registro después del UPDATE:');
    console.log(`   lat: ${updated.caendlat}`);
    console.log(`   lng: ${updated.caendlng}`);
    console.log(`   estado: ${updated.caendgeost}`);
    console.log(`   pendiente: ${updated.caendpenge}`);
    
    if (affected > 0 && updated.caendlat !== null) {
      console.log('\n✅ ¡UPDATE FUNCIONA CORRECTAMENTE!');
    } else {
      console.log('\n❌ UPDATE no persistió los datos');
    }
    
  } catch (error) {
    console.error('❌ Error en UPDATE:', error.message);
  }
  
  await prisma.$disconnect();
}

checkStructure().catch(console.error);
