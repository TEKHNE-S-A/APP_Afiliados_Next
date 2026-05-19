/**
 * Script aplicar migración: agregar carubid y caespecial a caentida
 * 
 * Uso:
 *   node backend/db/apply-add-rubro-especialidad.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('📋 Aplicando migración: carubid + caespid en caentida...\n');

    // 1. Agregar columnas
    await prisma.$executeRawUnsafe(`
      ALTER TABLE caentida 
        ADD COLUMN IF NOT EXISTS carubid CHAR(30),
        ADD COLUMN IF NOT EXISTS caespid CHAR(30)
    `);
    console.log('✅ Columnas agregadas');

    // 2. Crear índices
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_caentida_carubid ON caentida(carubid)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_caentida_caespid ON caentida(caespid, carubid)
    `);
    console.log('✅ Índices creados');

    // 3. Verificar estructura
    const columns = await prisma.$queryRawUnsafe(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'caentida' 
        AND column_name IN ('carubid', 'caespid')
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Estructura actualizada:');
    console.table(columns);

    console.log('\n✅ Migración completada exitosamente');
    console.log('\n💡 Próximo paso: Ejecutar importación con detección automática de farmacias');
    console.log('   node backend/db/import-cartilla-complete.ps1');

  } catch (error) {
    console.error('\n❌ Error aplicando migración:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
applyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
