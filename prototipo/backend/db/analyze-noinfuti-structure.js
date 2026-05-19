/**
 * Análisis de estructura y contenido de tabla noinfuti
 * Semana 21 - Info Útil
 * 
 * Objetivo: Relevar catálogo de tipos y estructura actual
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeNoinfuti() {
  console.log('\n============================================================================');
  console.log('ANÁLISIS TABLA noinfuti - SEMANA 21');
  console.log('============================================================================\n');

  try {
    // 1. Estructura de la tabla
    console.log('📋 PASO 1: Estructura de la tabla\n');
    
    const columns = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'noinfuti'
      ORDER BY ordinal_position
    `;
    
    console.log('Columnas encontradas:');
    console.table(columns);

    // 2. Count total de registros
    console.log('\n📊 PASO 2: Cantidad de registros\n');
    
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM noinfuti
    `;
    console.log(`Total registros: ${count[0].total}`);

    // 3. Catálogo de tipos (noinftipo)
    console.log('\n🏷️  PASO 3: Catálogo de tipos existentes (noinftipo)\n');
    
    const tipos = await prisma.$queryRaw`
      SELECT 
        TRIM(noinftipo) as tipo,
        COUNT(*) as cantidad,
        ARRAY_AGG(TRIM(noinfdescr)) as ejemplos_titulos
      FROM noinfuti
      GROUP BY TRIM(noinftipo)
      ORDER BY COUNT(*) DESC
    `;
    
    console.log('Tipos encontrados en BD:');
    tipos.forEach(t => {
      console.log(`\n  Tipo "${t.tipo}": ${t.cantidad} registros`);
      console.log(`  Ejemplos títulos:`, t.ejemplos_titulos.slice(0, 3));
    });

    // 4. Sample de registros completos
    console.log('\n📄 PASO 4: Sample de registros (primeros 5)\n');
    
    const samples = await prisma.$queryRaw`
      SELECT 
        noinfutili,
        TRIM(noinftipo) as tipo,
        TRIM(noinfdescr) as descripcion,
        TRIM(noinftelef) as telefono,
        TRIM(noinfldire) as direccion,
        TRIM(noinflink) as link,
        TRIM(noinfgeolo) as geolocalizacion,
        LENGTH(noinim_gxi) as imagen_bytes
      FROM noinfuti
      ORDER BY noinfutili
      LIMIT 5
    `;
    
    console.log('Registros de ejemplo:');
    samples.forEach((s, idx) => {
      console.log(`\n--- Registro ${idx + 1} ---`);
      console.log(`  ID: ${s.noinfutili}`);
      console.log(`  Tipo: "${s.tipo}"`);
      console.log(`  Descripción: "${s.descripcion}"`);
      console.log(`  Teléfono: "${s.telefono}"`);
      console.log(`  Dirección: "${s.direccion}"`);
      console.log(`  Link: "${s.link}"`);
      console.log(`  Geo: "${s.geolocalizacion}"`);
      console.log(`  Imagen: ${s.imagen_bytes || 0} bytes`);
    });

    // 5. Análisis de campos vacíos/null
    console.log('\n🔍 PASO 5: Análisis de campos vacíos por tipo\n');
    
    const emptyFields = await prisma.$queryRaw`
      SELECT 
        TRIM(noinftipo) as tipo,
        COUNT(*) as total,
        SUM(CASE WHEN TRIM(noinftelef) = '' OR noinftelef IS NULL THEN 1 ELSE 0 END) as sin_telefono,
        SUM(CASE WHEN TRIM(noinfldire) = '' OR noinfldire IS NULL THEN 1 ELSE 0 END) as sin_direccion,
        SUM(CASE WHEN TRIM(noinflink) = '' OR noinflink IS NULL THEN 1 ELSE 0 END) as sin_link,
        SUM(CASE WHEN TRIM(noinfgeolo) = '' OR noinfgeolo IS NULL THEN 1 ELSE 0 END) as sin_geo,
        SUM(CASE WHEN noinim_gxi IS NULL OR LENGTH(noinim_gxi) = 0 THEN 1 ELSE 0 END) as sin_imagen
      FROM noinfuti
      GROUP BY TRIM(noinftipo)
      ORDER BY total DESC
    `;
    
    console.log('Campos vacíos por tipo:');
    console.table(emptyFields);

    // 6. Verificar índices existentes
    console.log('\n📇 PASO 6: Índices existentes\n');
    
    const indexes = await prisma.$queryRaw`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'noinfuti'
      ORDER BY indexname
    `;
    
    console.log('Índices encontrados:');
    indexes.forEach(idx => {
      console.log(`\n  ${idx.indexname}:`);
      console.log(`  ${idx.indexdef}`);
    });

    // 7. Propuesta de mapeo DTO
    console.log('\n💡 PASO 7: Propuesta de mapeo DTO público\n');
    console.log(`
Propuesta de contrato DTO (desacoplado del esquema BD):

interface InfoUtilDTO {
  id: number;                    // noinfutili
  tipo: string;                  // TRIM(noinftipo) - 1 char
  titulo: string;                // TRIM(noinfdescr)
  telefono?: string;             // TRIM(noinftelef) - solo si no vacío
  direccion?: string;            // TRIM(noinfldire) - solo si no vacío
  link?: string;                 // TRIM(noinflink) - solo si no vacío
  geo?: {                        // TRIM(noinfgeolo) - parsear si existe
    lat: number;
    lng: number;
  };
  imagenUrl?: string;            // URL generada si noinim_gxi tiene datos
}

Catálogo de tipos detectados:
${tipos.map(t => `  "${t.tipo}": ${t.cantidad} items`).join('\n')}

RECOMENDACIONES:
1. Usar TRIM() en todos los CHAR fields
2. Omitir campos opcionales si están vacíos (no devolver null/empty string)
3. Parsear geo como objeto {lat, lng} si existe
4. Generar imagenUrl solo si noinim_gxi tiene bytes
5. Ordenar por tipo y descripción: ORDER BY noinftipo, noinfdescr
    `);

    console.log('\n============================================================================');
    console.log('✅ ANÁLISIS COMPLETADO');
    console.log('============================================================================\n');

  } catch (error) {
    console.error('❌ Error en análisis:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
analyzeNoinfuti()
  .then(() => {
    console.log('\n✅ Script finalizado correctamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
