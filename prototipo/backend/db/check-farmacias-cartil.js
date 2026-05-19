/**
 * Script para verificar registros de FARMACIAS en tabla cacartil
 * Diagnóstico: ¿Las farmacias tienen rubroId='000000008' en cacartil?
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkFarmaciasCartil() {
  try {
    console.log('🔍 DIAGNÓSTICO: Farmacias en tabla cacartil\n')

    // 1. Verificar rubro FARMACIA existe
    const rubroFarmacia = await prisma.$queryRaw`
      SELECT TRIM(carubid) as id, carubdescr 
      FROM carubro 
      WHERE TRIM(carubid) = '000000008'
    `
    console.log('1️⃣  Rubro FARMACIA en carubro:', rubroFarmacia)

    // 2. Contar registros en cacartil con rubroId = '000000008'
    const countCartil = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT TRIM(caentid)) as total
      FROM cacartil
      WHERE TRIM(carubid) = '000000008'
    `
    console.log('\n2️⃣  Entidades en cacartil con rubroId=000000008:', countCartil)

    // 3. Listar primeras 10 entidades con rubroId='000000008'
    const entidadesFarmacias = await prisma.$queryRaw`
      SELECT 
        TRIM(c.caentid) as caentid,
        e.caentapeno,
        TRIM(c.carubid) as carubid,
        TRIM(c.caespid) as caespid
      FROM cacartil c
      JOIN caentida e ON c.caentid = e.caentid
      WHERE TRIM(c.carubid) = '000000008'
      LIMIT 10
    `
    console.log('\n3️⃣  Primeras 10 farmacias en cacartil:', entidadesFarmacias)

    // 4. Contar entidades SIN rubro ni especialidad (farmacias detectables)
    const sinRubroNiEsp = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT e.caentid) as total
      FROM caentida e
      WHERE NOT EXISTS (
        SELECT 1 FROM cacartil c 
        WHERE c.caentid = e.caentid
      )
    `
    console.log('\n4️⃣  Entidades SIN registro en cacartil (farmacias potenciales):', sinRubroNiEsp)

    // 5. Listar primeras 10 entidades sin rubro ni especialidad
    const entidadesSinCartil = await prisma.$queryRaw`
      SELECT 
        TRIM(e.caentid) as caentid,
        e.caentapeno,
        TRIM(d.caendirecc) as direccion,
        l.nulocalnombre
      FROM caentida e
      LEFT JOIN caendire d ON d.caentid = e.caentid
      LEFT JOIN nulocali l ON l.nulocid = d.nulocid
      WHERE NOT EXISTS (
        SELECT 1 FROM cacartil c 
        WHERE c.caentid = e.caentid
      )
      LIMIT 10
    `
    console.log('\n5️⃣  Primeras 10 entidades SIN cacartil:', entidadesSinCartil)

    // 6. CRÍTICO: Verificar si hay entidades en cacartil con rubroId o especialidadId NULOS
    const nullRubroEsp = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM cacartil
      WHERE TRIM(carubid) IS NULL OR TRIM(carubid) = ''
        OR TRIM(caespid) IS NULL OR TRIM(caespid) = ''
    `
    console.log('\n6️⃣  Registros en cacartil con rubroId/especialidadId NULOS:', nullRubroEsp)

    // 7. RESUMEN
    console.log('\n📊 RESUMEN:')
    console.log(`   - Farmacias en cacartil (rubroId=000000008): ${countCartil[0].total}`)
    console.log(`   - Entidades sin cacartil (potenciales farmacias): ${sinRubroNiEsp[0].total}`)
    console.log(`\n💡 CONCLUSIÓN:`)
    if (parseInt(countCartil[0].total) === 0) {
      console.log('   ❌ NO HAY FARMACIAS MARCADAS en cacartil')
      console.log('   ⚠️  PROBLEMA: El filtro rubroId en cartillaRepository NO funcionará')
      console.log('   ✅ SOLUCIÓN: Ejecutar migración retroactiva o cambiar lógica de filtro')
    } else {
      console.log(`   ✅ ${countCartil[0].total} farmacias correctamente marcadas`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkFarmaciasCartil()
