const geocodingService = require('../services/geocodingService');

async function testGeocoding() {
  try {
    console.log('\n🧪 Test directo del servicio de geocodificación\n');
    
    // Test 1: Verificar configuración
    console.log('📋 Paso 1: Verificar configuración Google Maps...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const apiKey = await prisma.nusispar.findFirst({
      where: {
        nusisgrupa: 'GOOGLE_MAPS',
        nusistippa: 'ApiKey'
      }
    });
    
    console.log(`   API Key configurada: ${apiKey?.nusisvalpa ? '✅ Sí' : '❌ No'}`);
    if (apiKey?.nusisvalpa) {
      console.log(`   Primeros 20 caracteres: ${apiKey.nusisvalpa.substring(0, 20)}...`);
    }
    
    // Test 2: Ver direcciones pendientes
    console.log('\n📊 Paso 2: Verificar direcciones pendientes...');
    const pendientes = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM caendire d
      INNER JOIN cacartil c ON d.caentid = c.caentid
      WHERE d.caendpenge = 'N'
        AND d.caendirecc IS NOT NULL
        AND d.caendirecc != ''
    `;
    
    console.log(`   Direcciones pendientes: ${pendientes[0].count}`);
    
    // Test 3: Ver ejemplo de direcciones pendientes
    console.log('\n📍 Paso 3: Ejemplos de direcciones pendientes...');
    const ejemplos = await prisma.$queryRaw`
      SELECT 
        e.caentapeno,
        d.caendirecc,
        l.nulocdescr,
        p.nuprodescr,
        c.carubid
      FROM caendire d
      INNER JOIN cacartil c ON d.caentid = c.caentid
      INNER JOIN caentida e ON d.caentid = e.caentid
      LEFT JOIN nulocali l ON d.nulocid = l.nulocid
      LEFT JOIN nuprovin p ON l.nuproid = p.nuproid
      WHERE d.caendpenge = 'N'
        AND d.caendirecc IS NOT NULL
        AND d.caendirecc != ''
      ORDER BY e.caentapeno
      LIMIT 3
    `;
    
    ejemplos.forEach((ej, i) => {
      console.log(`\n   ${i + 1}. ${ej.caentapeno}`);
      console.log(`      Dirección: ${ej.caendirecc}`);
      console.log(`      Localidad: ${ej.nulocdescr?.trim() || 'Sin localidad'}`);
      console.log(`      Provincia: ${ej.nuprodescr?.trim() || 'Sin provincia'}`);
      console.log(`      Rubro: ${ej.carubid}`);
    });
    
    // Test 4: Intentar procesar 2 direcciones
    console.log('\n\n🚀 Paso 4: Intentar geocodificar 2 direcciones...');
    console.log('   (esto puede tardar unos segundos)\n');
    
    const result = await geocodingService.processBatchGeocoding(2);
    
    console.log('\n📊 RESULTADO:');
    console.log(`   Procesadas: ${result.processed}`);
    console.log(`   Exitosas: ${result.success}`);
    console.log(`   Errores: ${result.errors}`);
    console.log(`   Pendientes: ${result.pending}`);
    
    if (result.success > 0) {
      console.log('\n✅ El servicio de geocodificación FUNCIONA correctamente');
    } else {
      console.log('\n❌ El servicio de geocodificación tiene problemas');
      if (result.errors > 0) {
        console.log('   Revisar logs arriba para ver detalles del error');
      }
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('\n❌ Error en el test:', error.message);
    console.error(error);
  }
}

testGeocoding();
