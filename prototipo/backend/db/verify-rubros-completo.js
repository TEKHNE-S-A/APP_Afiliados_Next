/**
 * Script verificación: 9 rubros incluyendo FARMACIA y DELEGACION
 * 
 * Uso:
 *   node backend/db/verify-rubros-completo.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyRubros() {
  try {
    console.log('📋 Verificando rubros en la base de datos...\n');

    // Obtener todos los rubros ordenados por ID
    const rubros = await prisma.carubro.findMany({
      orderBy: { carubid: 'asc' }
    });

    console.log(`Total de rubros encontrados: ${rubros.length}\n`);

    // Listar todos
    rubros.forEach((rubro, idx) => {
      const id = rubro.carubid.trim();
      const marker = (id === '000000008' || id === '000000009') ? ' ✨' : '';
      console.log(`${idx + 1}. ID: ${id} | Descripción: ${rubro.carubdescr}${marker}`);
    });

    // Verificar rubros críticos
    const farmacia = rubros.find(r => r.carubid.trim() === '000000008');
    const delegacion = rubros.find(r => r.carubid.trim() === '000000009');

    console.log('\n🔍 Verificación rubros críticos:');
    console.log(`   ✅ FARMACIA (000000008): ${farmacia ? 'Existe' : '❌ NO EXISTE'}`);
    console.log(`   ✅ DELEGACION (000000009): ${delegacion ? 'Existe' : '❌ NO EXISTE'}`);

    // Contar entidades por rubro
    console.log('\n📊 Entidades por rubro:');
    for (const rubro of rubros) {
      const count = await prisma.caentida.count({
        where: { carubid: rubro.carubid }
      });
      console.log(`   ${rubro.carubdescr.padEnd(15)} → ${count} entidades`);
    }

    // Verificar filtro en webpanel
    console.log('\n💡 Filtro de Rubro en Admin Panel:');
    console.log('   URL: http://localhost:3000/admin/cartilla');
    console.log('   Dropdown "Rubro" debe mostrar:');
    console.log('   - Todos (opción por defecto)');
    rubros.forEach(r => {
      console.log(`   - ${r.carubdescr} (${r.carubid.trim()})`);
    });

    console.log('\n✅ Verificación completa');

  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
verifyRubros()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
