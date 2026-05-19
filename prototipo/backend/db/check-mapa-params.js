// Verificar parámetros MAPA en nusispar
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Leer .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^"|"$/g, '');
    }
  });
}

let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:12345678@localhost:5432/app_afiliados_genexus';
dbUrl = dbUrl.replace(/^"|"$/g, '');

const prisma = new PrismaClient();

async function checkMapaParams() {
  console.log('\n🗺️  Verificando parámetros MAPA en nusispar\n');
  
  try {
    const params = await prisma.nusispar.findMany({
      where: {
        nusisgrupa: 'MAPA'
      },
      orderBy: {
        nusistippa: 'asc'
      }
    });
    
    if (params.length === 0) {
      console.log('❌ No se encontraron parámetros MAPA');
      return;
    }
    
    console.log(`✅ Encontrados ${params.length} parámetros MAPA:\n`);
    
    params.forEach(param => {
      const value = param.nusisvalpa?.trim() || 'NULL';
      const isSensitive = param.nusistippa.toLowerCase().includes('key') || 
                         param.nusistippa.toLowerCase().includes('secret');
      const displayValue = isSensitive ? '***REDACTADO***' : value;
      
      console.log(`  📌 ${param.nusistippa.padEnd(20)} = ${displayValue}`);
    });
    
    // Verificar campos esenciales
    const requiredParams = ['Host', 'API Key', 'BaseUrl', 'Secure'];
    const missingParams = [];
    
    requiredParams.forEach(req => {
      const found = params.find(p => p.nusistippa.trim() === req);
      if (!found || !found.nusisvalpa?.trim()) {
        missingParams.push(req);
      }
    });
    
    console.log('');
    if (missingParams.length === 0) {
      console.log('✅ Todos los parámetros requeridos están presentes\n');
      
      // Construir URL de ejemplo (sin mostrar API key)
      const host = params.find(p => p.nusistippa.trim() === 'Host')?.nusisvalpa?.trim();
      const baseUrl = params.find(p => p.nusistippa.trim() === 'BaseUrl')?.nusisvalpa?.trim();
      const secureValue = params.find(p => p.nusistippa.trim() === 'Secure')?.nusisvalpa?.trim();
      const apiKey = params.find(p => p.nusistippa.trim() === 'API Key')?.nusisvalpa?.trim();
      
      const protocol = secureValue === '1' || secureValue?.toUpperCase() === 'S' ? 'https' : 'http';
      const fullUrl = `${protocol}://${host}${baseUrl}`;
      
      console.log('🌐 URL base Google Maps API:');
      console.log(`   ${fullUrl}\n`);
      
      console.log(`🔑 API Key: ${apiKey ? '✅ Configurada' : '❌ NO configurada'}\n`);
      
      console.log('📊 Próximos pasos:');
      console.log('   1. Verificar que la API Key sea válida en Google Cloud Console');
      console.log('   2. Confirmar que la API "Geocoding API" esté habilitada');
      console.log('   3. Verificar límites y cuotas del proyecto');
      console.log('   4. Implementar servicio de geocodificación batch\n');
    } else {
      console.log(`⚠️  Faltan parámetros requeridos: ${missingParams.join(', ')}\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkMapaParams();
