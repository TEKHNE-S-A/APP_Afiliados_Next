/**
 * Verificar farmacias importadas - revisar si tienen rubroId asignado
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFarmaciasImportadas() {
  console.log('\n🔍 Verificando farmacias importadas...\n');

  try {
    // 1. Contar entidades SIN rubro (deberían ser farmacias auto-detectadas)
    const sinRubro = await prisma.caentida.count({
      where: {
        OR: [
          { carubid: null },
          { carubid: '' }
        ]
      }
    });

    console.log(`📊 Entidades SIN rubro asignado: ${sinRubro}`);

    // 2. Contar entidades CON rubroId='000000008' (FARMACIA)
    const conRubroFarmacia = await prisma.caentida.count({
      where: {
        carubid: {
          contains: '000000008'
        }
      }
    });

    console.log(`💊 Entidades con rubroId FARMACIA (000000008): ${conRubroFarmacia}`);

    // 3. Mostrar algunas entidades sin rubro para análisis
    if (sinRubro > 0) {
      console.log(`\n⚠️  Mostrando primeras 5 entidades SIN rubro:\n`);
      
      const entidadesSinRubro = await prisma.caentida.findMany({
        where: {
          OR: [
            { carubid: null },
            { carubid: '' }
          ]
        },
        take: 5,
        select: {
          caentid: true,
          caentapeno: true,
          carubid: true,
          caespid: true
        }
      });

      entidadesSinRubro.forEach((ent, idx) => {
        console.log(`${idx + 1}. ${ent.caentid.trim()} - ${ent.caentapeno.trim()}`);
        console.log(`   Rubro: ${ent.carubid || 'NULL'}`);
        console.log(`   Especialidad: ${ent.caespid || 'NULL'}`);
      });
    }

    // 4. Mostrar algunas entidades CON rubro farmacia
    if (conRubroFarmacia > 0) {
      console.log(`\n✅ Mostrando primeras 5 entidades CON rubroId FARMACIA:\n`);
      
      const entidadesConFarmacia = await prisma.caentida.findMany({
        where: {
          carubid: {
            contains: '000000008'
          }
        },
        take: 5,
        select: {
          caentid: true,
          caentapeno: true,
          carubid: true,
          caespid: true
        }
      });

      entidadesConFarmacia.forEach((ent, idx) => {
        console.log(`${idx + 1}. ${ent.caentid.trim()} - ${ent.caentapeno.trim()}`);
        console.log(`   Rubro: ${ent.carubid?.trim() || 'NULL'}`);
        console.log(`   Especialidad: ${ent.caespid || 'NULL'}`);
      });
    }

    // 5. Total de entidades
    const total = await prisma.caentida.count();
    console.log(`\n📋 Total de entidades en BD: ${total}`);

    // 6. Diagnóstico
    console.log(`\n💡 Diagnóstico:`);
    if (sinRubro > 0) {
      console.log(`   ⚠️  Hay ${sinRubro} entidades sin rubro asignado`);
      console.log(`   ❓ Posibles causas:`);
      console.log(`      1. La lógica de detección no se ejecutó durante la importación`);
      console.log(`      2. El archivo JSON tiene rubros/especialidades en todas las entidades`);
      console.log(`      3. Error en el campo carubid (no se guardó correctamente)`);
    }
    
    if (conRubroFarmacia === 0 && sinRubro > 0) {
      console.log(`\n🔧 Solución recomendada:`);
      console.log(`   Ejecutar script de migración retroactiva:`);
      console.log(`   node backend/db/migrate-farmacias-sin-rubro.js`);
    } else if (conRubroFarmacia > 0) {
      console.log(`\n✅ Sistema funcionando correctamente`);
      console.log(`   ${conRubroFarmacia} farmacias detectadas con rubroId asignado`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
checkFarmaciasImportadas().catch(console.error);
