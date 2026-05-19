/**
 * Test de geocodificación con muestra de 5 direcciones
 * Ejecutar: node test-geocode-sample.js
 * 
 * Valida el servicio de geocodificación antes del batch completo
 */

const { processBatch, getStats } = require('../services/geocodingBatchService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TEST GEOCODIFICACIÓN - Muestra de 5 direcciones');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Estadísticas iniciales
    const initialStats = await getStats();
    console.log('📊 Estado actual:');
    console.log(`   Total direcciones: ${initialStats.total}`);
    console.log(`   Pendientes: ${initialStats.pending}\n`);

    if (initialStats.pending === 0) {
      console.log('✅ No hay direcciones pendientes para probar.');
      return;
    }

    // Mostrar muestra de direcciones a procesar
    console.log('📝 Direcciones que serán geocodificadas:\n');
    const sample = await prisma.$queryRaw`
      SELECT 
        d.caendid,
        e.caentapeno,
        d.caendirecc,
        l.nulocdescr as localidad,
        p.nuprodescr as provincia
      FROM caendire d
      INNER JOIN caentida e ON d.caentid = e.caentid
      LEFT JOIN nulocali l ON d.nulocid = l.nulocid
      LEFT JOIN nuprovin p ON l.nuproid = p.nuproid
      WHERE d.caendpenge = 'N' OR d.caendlat IS NULL OR d.caendlng IS NULL
      ORDER BY d.caendid
      LIMIT 5
    `;

    sample.forEach((record, idx) => {
      console.log(`   ${idx + 1}. ${record.caentapeno}`);
      console.log(`      Dirección: ${record.caendirecc}`);
      console.log(`      Localidad: ${record.localidad || 'N/A'}`);
      console.log(`      Provincia: ${record.provincia || 'N/A'}\n`);
    });

    console.log('⏱️  Iniciando geocodificación...\n');
    const startTime = Date.now();

    // Procesar solo 5 direcciones
    const result = await processBatch(5, 0);

    const endTime = Date.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(1);

    // Resultados
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  RESULTADOS DEL TEST');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`⏱️  Tiempo: ${durationSeconds} segundos\n`);
    console.log(`✅ Procesados: ${result.processed}`);
    console.log(`✅ Exitosos: ${result.success}`);
    console.log(`❌ Errores: ${result.errors}`);
    console.log(`⏳ Restantes: ${result.remaining}\n`);

    // Mostrar resultados detallados
    console.log('📍 Resultados detallados:\n');
    const results = await prisma.$queryRaw`
      SELECT 
        e.caentapeno,
        d.caendirecc,
        d.caendlat,
        d.caendlng,
        d.caendgeost,
        d.caendgeoerr
      FROM caendire d
      INNER JOIN caentida e ON d.caentid = e.caentid
      WHERE d.caendid IN (
        SELECT caendid 
        FROM (
          SELECT caendid 
          FROM caendire 
          WHERE caendpenge = 'S'
          ORDER BY caendgeoup DESC
          LIMIT 5
        ) AS recent
      )
      ORDER BY d.caendgeoup DESC
    `;

    results.forEach((record, idx) => {
      console.log(`   ${idx + 1}. ${record.caentapeno}`);
      console.log(`      Dirección: ${record.caendirecc}`);
      if (record.caendgeost === 'S') {
        console.log(`      ✅ Geocodificado: ${record.caendlat}, ${record.caendlng}`);
        // Validar rangos
        const latValid = record.caendlat >= -90 && record.caendlat <= 90;
        const lngValid = record.caendlng >= -180 && record.caendlng <= 180;
        if (!latValid || !lngValid) {
          console.log(`      ⚠️  ADVERTENCIA: Coordenadas fuera de rango válido`);
        }
      } else {
        console.log(`      ❌ Error: ${record.caendgeoerr || 'Desconocido'}`);
      }
      console.log();
    });

    // Sugerencia
    if (result.success === result.processed) {
      console.log('✅ ÉXITO: Todas las direcciones fueron geocodificadas correctamente.');
      console.log('💡 Sugerencia: Ejecuta geocode-batch-process.js para procesar todas las direcciones.\n');
    } else if (result.errors > 0) {
      console.log('⚠️  ADVERTENCIA: Algunas direcciones tuvieron errores.');
      console.log('💡 Revisa los mensajes de error y considera ajustar las direcciones antes del batch completo.\n');
    }

  } catch (error) {
    console.error('\n❌ Error durante el test:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
