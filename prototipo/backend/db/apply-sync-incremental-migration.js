/**
 * Script aplicación: Migración sync incremental
 * 
 * Ejecuta add-sync-incremental-fields.sql para agregar:
 * - caentactivo (BOOLEAN): bajas lógicas
 * - caentupdated (TIMESTAMP): tracking cambios
 * - Índices para queries eficientes
 * - Triggers automáticos
 * 
 * Uso:
 *   node backend/db/apply-sync-incremental-migration.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applySyncIncrementalMigration() {
  try {
    console.log('🔄 Aplicando migración sync incremental...\n');

    // 1. Agregar campo caentactivo
    console.log('1️⃣  Agregando campo caentactivo...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE caentida ADD COLUMN IF NOT EXISTS caentactivo BOOLEAN DEFAULT true
      `;
      await prisma.$executeRaw`
        UPDATE caentida SET caentactivo = true WHERE caentactivo IS NULL
      `;
      console.log('   ✓ Campo caentactivo agregado\n');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ℹ️  Campo caentactivo ya existe\n');
      } else {
        throw e;
      }
    }

    // 2. Agregar campo caentupdated
    console.log('2️⃣  Agregando campo caentupdated...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE caentida ADD COLUMN IF NOT EXISTS caentupdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `;
      await prisma.$executeRaw`
        UPDATE caentida SET caentupdated = CURRENT_TIMESTAMP WHERE caentupdated IS NULL
      `;
      console.log('   ✓ Campo caentupdated agregado\n');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ℹ️  Campo caentupdated ya existe\n');
      } else {
        throw e;
      }
    }

    // 3. Crear índices
    console.log('3️⃣  Creando índices...');
    const indices = [
      { nombre: 'idx_caentida_updated', sql: 'CREATE INDEX IF NOT EXISTS idx_caentida_updated ON caentida(caentupdated DESC)' },
      { nombre: 'idx_caentida_activo', sql: 'CREATE INDEX IF NOT EXISTS idx_caentida_activo ON caentida(caentactivo)' },
      { nombre: 'idx_caentida_activo_updated', sql: 'CREATE INDEX IF NOT EXISTS idx_caentida_activo_updated ON caentida(caentactivo, caentupdated DESC)' },
      { nombre: 'idx_caendire_updated', sql: 'CREATE INDEX IF NOT EXISTS idx_caendire_updated ON caendire(caendupdated DESC)' }
    ];

    for (const indice of indices) {
      try {
        await prisma.$executeRawUnsafe(indice.sql);
        console.log(`   ✓ ${indice.nombre}`);
      } catch (e) {
        console.log(`   ℹ️  ${indice.nombre} ya existe`);
      }
    }
    console.log('');

    // 4. Crear función para el trigger
    console.log('4️⃣  Creando función trigger...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION update_caentida_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.caentupdated = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      console.log('   ✓ Función update_caentida_timestamp creada\n');
    } catch (e) {
      console.log('   ℹ️  Función ya existe\n');
    }

    // 5. Crear trigger
    console.log('5️⃣  Creando trigger...');
    try {
      await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trigger_update_caentida_timestamp ON caentida');
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER trigger_update_caentida_timestamp
        BEFORE UPDATE ON caentida
        FOR EACH ROW
        EXECUTE FUNCTION update_caentida_timestamp()
      `);
      console.log('   ✓ Trigger trigger_update_caentida_timestamp creado\n');
    } catch (e) {
      console.log('   ℹ️  Error creando trigger:', e.message, '\n');
    }

    console.log('\n✅ Migración aplicada exitosamente');
    
    // Verificar campos agregados
    console.log('\n🔍 Verificando cambios...\n');
    
    const verificacion = await prisma.$queryRaw`
      SELECT 
        column_name, 
        data_type, 
column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'caentida' 
      AND column_name IN ('caentactivo', 'caentupdated')
      ORDER BY column_name
    `;

    console.log('Campos en caentida:');
    verificacion.forEach(campo => {
      console.log(`  ✓ ${campo.column_name}: ${campo.data_type} (nullable: ${campo.is_nullable}, default: ${campo.column_default || 'N/A'})`);
    });

    // Contar entidades activas vs inactivas
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE caentactivo = true) as activas,
        COUNT(*) FILTER (WHERE caentactivo = false) as inactivas,
        COUNT(*) as total
      FROM caentida
    `;

    console.log(`\n📊 Estadísticas:`);
    console.log(`  - Activas: ${stats[0].activas}`);
    console.log(`  - Inactivas: ${stats[0].inactivas}`);
    console.log(`  - Total: ${stats[0].total}`);

    console.log('\n✅ Verificación completa\n');

  } catch (error) {
    console.error('❌ Error aplicando migración:', error.message);
    if (error.message.includes('syntax error')) {
      console.error('\n💡 Tip: Verifica la sintaxis SQL en add-sync-incremental-fields.sql');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applySyncIncrementalMigration();
