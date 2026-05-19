/**
 * Script one-time: Insertar rubro DELEGACIONES en tabla carubro
 * 
 * Contexto:
 * - Prestadores: migración masiva desde JSON (con rubro/especialidad)
 * - Farmacias: migración masiva con detección automática (sin rubro/especialidad)
 * - Delegaciones: incorporación MANUAL via admin panel (sin migración masiva por ahora)
 * 
 * Uso:
 *   node backend/db/insert-rubro-delegaciones.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function insertRubroDelegaciones() {
  try {
    console.log('🏢 Insertando rubro DELEGACIONES...\n');

    // Verificar rubros actuales
    const rubrosActuales = await prisma.carubro.findMany({
      orderBy: { carubid: 'asc' }
    });

    console.log('📋 Rubros actuales:', rubrosActuales.length);
    rubrosActuales.forEach((r, idx) => {
      console.log(`   ${idx + 1}. ${r.carubid.trim()} | ${r.carubdescr}`);
    });

    // Obtener último ID (debería ser 000000008 - FARMACIA)
    const ultimoRubro = rubrosActuales[rubrosActuales.length - 1];
    const ultimoId = parseInt(ultimoRubro.carubid.trim());
    const nuevoId = (ultimoId + 1).toString().padStart(9, '0');

    console.log(`\n   Último ID: ${ultimoRubro.carubid.trim()}`);
    console.log(`   Nuevo ID:  ${nuevoId}\n`);

    // Verificar que no exista ya
    const existente = await prisma.carubro.findUnique({
      where: { carubid: nuevoId.padEnd(30, ' ') }
    });

    if (existente) {
      console.log('⚠️  Rubro DELEGACIONES ya existe');
      console.log(`   ID: ${existente.carubid.trim()}`);
      console.log(`   Descripción: ${existente.carubdescr}`);
      return;
    }

    // Insertar nuevo rubro
    const nuevoRubro = await prisma.carubro.create({
      data: {
        carubid: nuevoId.padEnd(30, ' '),    // CHAR(30) con padding
        carubdescr: 'DELEGACION',            // VARCHAR(40) - singular para consistencia
        carubtipor: 'DEL'                    // CHAR(3) - tipo rubro
      }
    });

    console.log('✅ Rubro DELEGACIONES insertado exitosamente');
    console.log(`   ID: ${nuevoRubro.carubid.trim()}`);
    console.log(`   Descripción: ${nuevoRubro.carubdescr}`);
    console.log(`   Tipo: ${nuevoRubro.carubtipor}\n`);

    // Listar todos los rubros después de inserción
    const rubrosFinales = await prisma.carubro.findMany({
      orderBy: { carubid: 'asc' }
    });

    console.log(`📋 Rubros actuales: ${rubrosFinales.length} total`);
    rubrosFinales.forEach((r, idx) => {
      const marker = r.carubid.trim() === nuevoId ? ' ✨ (nuevo)' : '';
      console.log(`   ${idx + 1}. ${r.carubid.trim()} | ${r.carubdescr}${marker}`);
    });

    console.log('\n💡 Próximos pasos:');
    console.log('   1. Incorporar delegaciones manualmente via admin panel');
    console.log('      URL: http://localhost:3000/admin/cartilla');
    console.log('   2. Crear DelegacionesScreen en mobile (Semana 19)');
    console.log('      - Basado en FarmaciasScreen');
    console.log('      - Constante: RUBRO_ID_DELEGACIONES = \'000000009\'');
    console.log('   3. Filtrar entidades con rubroId=000000009 en API\n');

  } catch (error) {
    console.error('❌ Error insertando rubro DELEGACIONES:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
insertRubroDelegaciones()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
