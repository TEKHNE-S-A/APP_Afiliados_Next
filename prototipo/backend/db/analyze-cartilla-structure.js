/**
 * Script análisis: Estructura BD para sync incremental
 * 
 * Analiza las tablas de cartilla para identificar:
 * - Campos de timestamp (creación, actualización)
 * - Campos de baja lógica (estado, activo, deleted_at)
 * - Claves primarias y únicas
 * 
 * Objetivo: Diseñar contrato API para sync incremental (Semana 20)
 * 
 * Uso:
 *   node backend/db/analyze-cartilla-structure.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeCartillaStructure() {
  try {
    console.log('🔍 Analizando estructura BD para sync incremental\n');
    console.log('=' * 60);

    // Análisis tabla caentida (entidades)
    console.log('\n📋 Tabla: caentida (Entidades)');
    console.log('-' * 60);
    
    const entidadSample = await prisma.caentida.findFirst();
    if (entidadSample) {
      console.log('Campos disponibles:');
      Object.keys(entidadSample).forEach(key => {
        const value = entidadSample[key];
        const type = typeof value;
        const sample = value ? (type === 'string' ? value.substring(0, 30) : value) : 'NULL';
        console.log(`  - ${key}: ${type} (ej: ${sample})`);
      });
    }

    // Análisis tabla caendire (direcciones)
    console.log('\n📋 Tabla: caendire (Direcciones)');
    console.log('-' * 60);
    
    const direccionSample = await prisma.caendire.findFirst();
    if (direccionSample) {
      console.log('Campos disponibles:');
      Object.keys(direccionSample).forEach(key => {
        const value = direccionSample[key];
        const type = typeof value;
        const sample = value ? (type === 'string' ? value.substring(0, 30) : value) : 'NULL';
        console.log(`  - ${key}: ${type} (ej: ${sample})`);
      });
    }

    // Buscar campos de timestamp
    console.log('\n⏰ Campos de timestamp identificados:');
    console.log('-' * 60);
    
    const timestampFields = [];
    if (entidadSample) {
      Object.keys(entidadSample).forEach(key => {
        if (key.toLowerCase().includes('fecha') || 
            key.toLowerCase().includes('date') || 
            key.toLowerCase().includes('time') ||
            key.toLowerCase().includes('updated') ||
            key.toLowerCase().includes('created') ||
            key.toLowerCase().includes('modified')) {
          timestampFields.push({ tabla: 'caentida', campo: key, tipo: typeof entidadSample[key] });
        }
      });
    }
    
    if (direccionSample) {
      Object.keys(direccionSample).forEach(key => {
        if (key.toLowerCase().includes('fecha') || 
            key.toLowerCase().includes('date') || 
            key.toLowerCase().includes('time') ||
            key.toLowerCase().includes('updated') ||
            key.toLowerCase().includes('created') ||
            key.toLowerCase().includes('modified')) {
          timestampFields.push({ tabla: 'caendire', campo: key, tipo: typeof direccionSample[key] });
        }
      });
    }

    if (timestampFields.length > 0) {
      timestampFields.forEach(f => {
        console.log(`  ✓ ${f.tabla}.${f.campo} (${f.tipo})`);
      });
    } else {
      console.log('  ⚠️  No se encontraron campos de timestamp');
    }

    // Buscar campos de baja lógica
    console.log('\n🗑️  Campos de baja lógica identificados:');
    console.log('-' * 60);
    
    const bajaFields = [];
    if (entidadSample) {
      Object.keys(entidadSample).forEach(key => {
        if (key.toLowerCase().includes('baja') || 
            key.toLowerCase().includes('delete') || 
            key.toLowerCase().includes('activ') ||
            key.toLowerCase().includes('estado') ||
            key.toLowerCase().includes('status')) {
          bajaFields.push({ tabla: 'caentida', campo: key, valor: entidadSample[key] });
        }
      });
    }

    if (bajaFields.length > 0) {
      bajaFields.forEach(f => {
        console.log(`  ✓ ${f.tabla}.${f.campo} (valor ej: ${f.valor})`);
      });
    } else {
      console.log('  ⚠️  No se encontraron campos de baja lógica explícitos');
    }

    // Verificar si caendire tiene caendupdated (agregado en Semana 12)
    console.log('\n📅 Verificación campo caendupdated (Semana 12):');
    console.log('-' * 60);
    
    if (direccionSample && direccionSample.caendupdated !== undefined) {
      console.log(`  ✓ caendire.caendupdated existe`);
      console.log(`    Tipo: ${typeof direccionSample.caendupdated}`);
      console.log(`    Valor muestra: ${direccionSample.caendupdated}`);
    } else {
      console.log('  ❌ caendire.caendupdated NO existe');
    }

    // Verificar cacartil (múltiples rubros por entidad)
    console.log('\n🔗 Tabla: cacartil (Cartillas - múltiples rubros)');
    console.log('-' * 60);
    
    const cartillaSample = await prisma.cacartil.findFirst();
    if (cartillaSample) {
      console.log('Campos disponibles:');
      Object.keys(cartillaSample).forEach(key => {
        const value = cartillaSample[key];
        const type = typeof value;
        const sample = value ? (type === 'string' ? value.substring(0, 30) : value) : 'NULL';
        console.log(`  - ${key}: ${type} (ej: ${sample})`);
      });
    }

    // Contar entidades con múltiples rubros
    const multipleRubrosCount = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM (
        SELECT caentid
        FROM cacartil
        GROUP BY caentid
        HAVING COUNT(DISTINCT carubid) > 1
      ) subq
    `;

    console.log(`\n📊 Entidades con múltiples rubros: ${multipleRubrosCount[0].total}`);

    // Recomendaciones
    console.log('\n💡 Recomendaciones para sync incremental:');
    console.log('=' * 60);
    
    if (direccionSample && direccionSample.caendupdated) {
      console.log('  ✓ Usar caendupdated como timestamp de cambios');
    } else {
      console.log('  ⚠️  Agregar campo timestamp para tracking de cambios');
    }

    if (bajaFields.length === 0) {
      console.log('  ⚠️  Agregar campo baja lógica (ej: caentactivo BOOLEAN DEFAULT true)');
    } else {
      console.log(`  ✓ Usar ${bajaFields[0].campo} para bajas lógicas`);
    }

    console.log('  ℹ️  IDs CHAR(30) requieren TRIM() en queries y responses');
    console.log('  ℹ️  Considerar lastSync en tabla de metadatos para tracking general');

    console.log('\n✅ Análisis completo\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

analyzeCartillaStructure();
