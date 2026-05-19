/**
 * Verificar estado de tabla cacartil (relaciones plan-entidad-rubro-especialidad)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCacartilStatus() {
  console.log('\n🔍 Verificando tabla cacartil...\n');

  try {
    // 1. Contar registros en cacartil
    const totalCacartil = await prisma.cacartil.count();
    console.log(`📊 Total registros en cacartil: ${totalCacartil}`);

    // 2. Contar entidades que tienen rubros/especialidades en JSON pero no en cacartil
    const entidadesConRubro = await prisma.caentida.count({
      where: {
        carubid: {
          not: null
        }
      }
    });

    console.log(`🏥 Entidades con rubroId asignado: ${entidadesConRubro}`);

    // 3. Mostrar sample de entidades con rubro pero sin relación en cacartil
    if (totalCacartil === 0 && entidadesConRubro > 0) {
      console.log(`\n⚠️  PROBLEMA DETECTADO:`);
      console.log(`   - ${entidadesConRubro} entidades tienen rubroId`);
      console.log(`   - 0 registros en tabla cacartil`);
      console.log(`   - Las relaciones plan-entidad-rubro-especialidad NO se guardaron\n`);

      // Mostrar algunas entidades con rubro
      console.log(`📋 Mostrando primeras 5 entidades con rubroId:\n`);
      
      const entidadesConRubroSample = await prisma.caentida.findMany({
        where: {
          carubid: {
            not: null
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

      entidadesConRubroSample.forEach((ent, idx) => {
        console.log(`${idx + 1}. ${ent.caentid.trim()} - ${ent.caentapeno.trim()}`);
        console.log(`   Rubro: ${ent.carubid?.trim()}`);
        console.log(`   Especialidad: ${ent.caespid?.trim() || 'NULL'}`);
      });

      console.log(`\n💡 Causa probable:`);
      console.log(`   El código ETL NO está guardando las relaciones en cacartil`);
      console.log(`   Función problemática: procesarRubroYEspecialidades()`);
      
      console.log(`\n🔧 Solución:`);
      console.log(`   1. Revisar cartillaImportService.js líneas ~490-530`);
      console.log(`   2. Verificar que se llame a procesarRubroYEspecialidades()`);
      console.log(`   3. O eliminar guardado en cacartil si solo necesitamos carubid/caespid en caentida`);

    } else if (totalCacartil > 0) {
      console.log(`\n✅ Tabla cacartil poblada correctamente`);
      
      // Mostrar sample de relaciones
      console.log(`\n📋 Mostrando primeras 5 relaciones:\n`);
      
      const cacartilSample = await prisma.cacartil.findMany({
        take: 5,
        select: {
          cacarid: true,
          caentid: true,
          carubid: true,
          caespid: true
        }
      });

      cacartilSample.forEach((rel, idx) => {
        console.log(`${idx + 1}. ${rel.cacarid.trim()}`);
        console.log(`   Entidad: ${rel.caentid?.trim()}`);
        console.log(`   Rubro: ${rel.carubid?.trim()}`);
        console.log(`   Especialidad: ${rel.caespid?.trim() || 'NULL'}`);
      });
    } else {
      console.log(`\n✅ Estado esperado:`);
      console.log(`   - 0 entidades con rubroId`);
      console.log(`   - 0 registros en cacartil`);
      console.log(`   - Tablas vacías después de limpieza`);
    }

    // 4. Diagnóstico adicional: verificar si cacartil es necesaria
    console.log(`\n\n💭 Análisis arquitectura:`);
    console.log(`   ¿Es necesaria la tabla cacartil?`);
    console.log(`   - SI: si necesitas histórico de planes (relación N:M compleja)`);
    console.log(`   - NO: si solo necesitas rubro/especialidad actual (campos en caentida)`);
    console.log(`\n   Estado actual: carubid y caespid YA están en tabla caentida`);
    console.log(`   Módulo mobile usa: filtro rubroId directo en caentida`);
    console.log(`   Conclusión: cacartil puede ser OPCIONAL para el MVP`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
checkCacartilStatus().catch(console.error);
