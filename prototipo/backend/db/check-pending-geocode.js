// Verificar registros pendientes de geocodificación
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

const prisma = new PrismaClient();

async function checkPendingGeocode() {
  console.log('\n📍 Verificando registros pendientes de geocodificación\n');
  
  try {
    // Total de direcciones
    const totalResult = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM caendire`;
    const totalDirecciones = totalResult[0].count;
    
    // Pendientes (caendpenge = 'N' o caendlat/caendlng NULL)
    const pendientesResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count 
      FROM caendire 
      WHERE caendpenge = 'N' OR caendlat IS NULL OR caendlng IS NULL
    `;
    const pendientes = pendientesResult[0].count;
    
    // Con errores de geocodificación
    const errorResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count 
      FROM caendire 
      WHERE caendgeoerr IS NOT NULL AND TRIM(caendgeoerr) != ''
    `;
    const conError = errorResult[0].count;
    
    // Geocodificadas exitosamente
    const geocodResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count 
      FROM caendire 
      WHERE caendlat IS NOT NULL AND caendlng IS NOT NULL AND caendpenge = 'S'
    `;
    const geocodificadas = geocodResult[0].count;
    
    const porcentajeCompleto = totalDirecciones > 0 ? 
      ((geocodificadas / totalDirecciones) * 100).toFixed(2) : 0;
    
    console.log('📊 Estadísticas:');
    console.log(`  Total direcciones:         ${totalDirecciones.toString().padStart(6)}`);
    console.log(`  Geocodificadas exitosas:   ${geocodificadas.toString().padStart(6)} (${porcentajeCompleto}%)`);
    console.log(`  Pendientes:                ${pendientes.toString().padStart(6)}`);
    console.log(`  Con errores:               ${conError.toString().padStart(6)}\n`);
    
    if (pendientes > 0) {
      console.log(`⚠️  Hay ${pendientes} direcciones pendientes de geocodificación\n`);
      
      // Muestra de direcciones pendientes
      const muestra = await prisma.$queryRaw`
        SELECT 
          d.caendid,
          d.caendirecc,
          d.caendpenge,
          d.caendlat,
          d.caendlng,
          e.caentapeno,
          l.nulocdescr
        FROM caendire d
        LEFT JOIN caentida e ON d.caentid = e.caentid
        LEFT JOIN nulocali l ON d.nulocid = l.nulocid
        WHERE d.caendpenge = 'N' OR d.caendlat IS NULL OR d.caendlng IS NULL
        LIMIT 5
      `;
      
      console.log('📝 Muestra de direcciones pendientes (primeras 5):');
      muestra.forEach((dir, idx) => {
        console.log(`  ${idx + 1}. ${dir.caentapeno?.trim() || 'SIN NOMBRE'}`);
        console.log(`     Dirección: ${dir.caendirecc?.trim() || 'SIN DIRECCIÓN'}`);
        console.log(`     Localidad: ${dir.nulocdescr?.trim() || 'SIN LOCALIDAD'}`);
        console.log(`     Estado: caendpenge=${dir.caendpenge}, lat=${dir.caendlat}, lng=${dir.caendlng}\n`);
      });
    } else {
      console.log('✅ No hay direcciones pendientes de geocodificación\n');
    }
    
    console.log('🎯 Siguiente paso:');
    console.log('   Implementar servicio de geocodificación batch para procesar los registros pendientes\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkPendingGeocode();
