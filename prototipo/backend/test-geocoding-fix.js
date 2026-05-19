/**
 * Test de geocodificación con fix de CAST
 * Procesa 5 direcciones para verificar persistencia
 */

const { PrismaClient } = require('@prisma/client');
const { processBatch } = require('./services/geocodingBatchService');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧪 TEST DE GEOCODIFICACIÓN - 5 direcciones\n');
    
    // Resetear flags de las primeras 5 direcciones
    await prisma.$executeRaw`
      UPDATE caendire 
      SET caendpenge = 'N', 
          caendlat = NULL, 
          caendlng = NULL,
          caendgeost = NULL,
          caendgeoerr = NULL
      WHERE caendid IN (
        SELECT caendid FROM caendire ORDER BY caendid LIMIT 5
      )
    `;
    
    console.log('✅ Flags reseteados para 5 direcciones\n');
    
    // Procesar batch de 5
    console.log('📍 Iniciando geocodificación...\n');
    const result = await processBatch(5);
    
    console.log('\n✅ Batch completado');
    console.log(`   Procesados: ${result.processed}`);
    console.log(`   Exitosos: ${result.success}`);
    console.log(`   Errores: ${result.errors}\n`);
    
    // Verificar persistencia
    console.log('🔍 Verificando persistencia en BD...\n');
    
    const verificacion = await prisma.$queryRaw`
      SELECT 
        caendid,
        caendirecc,
        caendlat,
        caendlng,
        caendgeost,
        caendpenge
      FROM caendire
      WHERE caendid IN (
        SELECT caendid FROM caendire ORDER BY caendid LIMIT 5
      )
      ORDER BY caendid
    `;
    
    console.log('📊 Resultados en BD:\n');
    verificacion.forEach((row, idx) => {
      console.log(`${idx + 1}. ID: ${row.caendid}`);
      console.log(`   Dirección: ${row.caendirecc}`);
      console.log(`   Lat: ${row.caendlat}, Lng: ${row.caendlng}`);
      console.log(`   Estado: ${row.caendgeost}, Procesado: ${row.caendpenge}`);
      console.log('');
    });
    
    // Contar éxitos
    const conCoordenadas = verificacion.filter(r => r.caendlat !== null && r.caendlng !== null).length;
    const conFlag = verificacion.filter(r => r.caendpenge === 'S').length;
    
    console.log('📈 Resumen verificación:');
    console.log(`   Con coordenadas: ${conCoordenadas}/5 (${(conCoordenadas/5*100).toFixed(0)}%)`);
    console.log(`   Con flag 'S': ${conFlag}/5 (${(conFlag/5*100).toFixed(0)}%)`);
    
    if (conCoordenadas === 5 && conFlag === 5) {
      console.log('\n✅ ¡TEST EXITOSO! Persistencia funcionando correctamente');
      console.log('   Listo para procesar las 2,898 direcciones completas\n');
    } else {
      console.log('\n❌ TEST FALLIDO - Revisar logs de error\n');
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
