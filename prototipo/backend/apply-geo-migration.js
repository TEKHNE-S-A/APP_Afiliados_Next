/**
 * Aplicar migración GEO a tabla caendire
 * Sin usar psql - directamente con Prisma
 */

// Cargar variables de entorno desde .env
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyGeoMigration() {
  console.log('\n===== APLICANDO MIGRACION GEO =====\n');

  try {
    // Leer archivo SQL
    const sqlFile = path.join(__dirname, 'db', 'add_cartillas_geo_fields.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📄 Ejecutando SQL migration...');
    console.log(`   Archivo: ${sqlFile}\n`);

    // Ejecutar con Prisma.$executeRawUnsafe
    // Dividir por punto y coma para ejecutar statement por statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

    let ejecutadas = 0;
    let errores = 0;

    for (const statement of statements) {
      try {
        // Skip comentarios y líneas vacías
        if (statement.startsWith('COMMENT ON')) {
          // Comentarios se ejecutan por separado
          await prisma.$executeRawUnsafe(statement);
          console.log('✅ Comentario aplicado');
        } else if (statement.includes('ALTER TABLE')) {
          await prisma.$executeRawUnsafe(statement);
          console.log('✅ ALTER TABLE ejecutado');
        } else if (statement.includes('CREATE INDEX')) {
          await prisma.$executeRawUnsafe(statement);
          console.log('✅ Índice creado');
        } else if (statement.includes('UPDATE')) {
          const result = await prisma.$executeRawUnsafe(statement);
          console.log(`✅ UPDATE ejecutado (${result} filas afectadas)`);
        }
        ejecutadas++;
      } catch (error) {
        // Algunos errores son esperados (ej: columna ya existe)
        if (error.message.includes('already exists') || error.message.includes('ya existe')) {
          console.log(`⚠️  ${error.message.split('\n')[0]} (ignorado)`);
        } else {
          console.error(`❌ Error: ${error.message.split('\n')[0]}`);
          errores++;
        }
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   Statements ejecutados: ${ejecutadas}`);
    console.log(`   Errores: ${errores}`);

    // Verificar columnas GEO
    console.log('\n🔍 Verificando columnas GEO en caendire...');
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'caendire'
      AND column_name LIKE 'caend%'
      ORDER BY ordinal_position;
    `;

    console.log('\n📋 Columnas actuales:');
    result.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   ${col.column_name} (${col.data_type}) ${nullable}`);
    });

    console.log('\n✅ Migración GEO completada!');

  } catch (error) {
    console.error('\n❌ Error fatal en migración:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyGeoMigration();
