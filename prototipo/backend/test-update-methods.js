/**
 * Test MANUAL de UPDATE con diferentes métodos Prisma
 * Para diagnosticar problema de persistencia
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function main() {
  try {
    console.log('🧪 TEST MANUAL DE UPDATE - Diagnóstico persistencia\n');
    
    // 1. Leer primer registro
    const record = await prisma.$queryRaw`
      SELECT caendid, caendirecc, caendlat, caendlng, caendpenge
      FROM caendire
      ORDER BY caendid
      LIMIT 1
    `;
    
    console.log('📍 Registro inicial:');
    console.log(`   ID: ${record[0].caendid}`);
    console.log(`   Dirección: ${record[0].caendirecc}`);
    console.log(`   Lat: ${record[0].caendlat}, Lng: ${record[0].caendlng}`);
    console.log(`   Procesado: ${record[0].caendpenge}\n`);
    
    const testId = record[0].caendid;
    
    // 2. Probar UPDATE con $executeRaw
    console.log('🔧 Método 1: $executeRaw con template literals\n');
    
    const lat = -28.4715254;
    const lng = -65.7769134;
    
    const result1 = await prisma.$executeRaw`
      UPDATE caendire
      SET 
        caendlat = ${lat}::numeric,
        caendlng = ${lng}::numeric,
        caendgeost = 'S',
        caendpenge = 'S'
      WHERE caendid = ${testId}
    `;
    
    console.log(`   Filas afectadas: ${result1}`);
    
    // 3. Verificar inmediatamente
    const check1 = await prisma.$queryRaw`
      SELECT caendlat, caendlng, caendgeost, caendpenge
      FROM caendire
      WHERE caendid = ${testId}
    `;
    
    console.log('   Verificación inmediata:');
    console.log(`     Lat: ${check1[0].caendlat}, Lng: ${check1[0].caendlng}`);
    console.log(`     Estado: ${check1[0].caendgeost}, Procesado: ${check1[0].caendpenge}\n`);
    
    if (check1[0].caendlat === null) {
      console.log('   ❌ FALLO - Lat es NULL\n');
      
      // 4. Probar con $executeRawUnsafe
      console.log('🔧 Método 2: $executeRawUnsafe con string interpolation\n');
      
      const result2 = await prisma.$executeRawUnsafe(
        `UPDATE caendire
         SET caendlat = $1, caendlng = $2, caendgeost = $3, caendpenge = $4
         WHERE caendid = $5`,
        lat, lng, 'S', 'S', testId
      );
      
      console.log(`   Filas afectadas: ${result2}`);
      
      const check2 = await prisma.$queryRaw`
        SELECT caendlat, caendlng, caendgeost, caendpenge
        FROM caendire
        WHERE caendid = ${testId}
      `;
      
      console.log('   Verificación inmediata:');
      console.log(`     Lat: ${check2[0].caendlat}, Lng: ${check2[0].caendlng}`);
      console.log(`     Estado: ${check2[0].caendgeost}, Procesado: ${check2[0].caendpenge}\n`);
      
      if (check2[0].caendlat === null) {
        console.log('   ❌ FALLO - Lat sigue siendo NULL\n');
        
        // 5. Probar UPDATE directo en PostgreSQL
        console.log('🔧 Método 3: Pool nativo de PostgreSQL\n');
        
        const { Pool } = require('pg');
        const pool = new Pool({
          host: 'localhost',
          port: 5432,
          database: 'app_afiliados_genexus',
          user: 'postgres',
          password: '12345678'
        });
        
        const pgResult = await pool.query(
          'UPDATE caendire SET caendlat = $1, caendlng = $2, caendgeost = $3, caendpenge = $4 WHERE caendid = $5 RETURNING caendlat, caendlng',
          [lat, lng, 'S', 'S', testId]
        );
        
        console.log(`   Filas afectadas: ${pgResult.rowCount}`);
        console.log(`   RETURNING: Lat=${pgResult.rows[0].caendlat}, Lng=${pgResult.rows[0].caendlng}\n`);
        
        // Verificar con Prisma
        const check3 = await prisma.$queryRaw`
          SELECT caendlat, caendlng, caendgeost, caendpenge
          FROM caendire
          WHERE caendid = ${testId}
        `;
        
        console.log('   Verificación con Prisma:');
        console.log(`     Lat: ${check3[0].caendlat}, Lng: ${check3[0].caendlng}`);
        console.log(`     Estado: ${check3[0].caendgeost}, Procesado: ${check3[0].caendpenge}\n`);
        
        if (check3[0].caendlat !== null) {
          console.log('   ✅ ÉXITO con pg Pool - Problema es con Prisma\n');
        } else {
          console.log('   ❌ FALLO incluso con pg Pool - Problema de BD o permisos\n');
        }
        
        await pool.end();
      } else {
        console.log('   ✅ ÉXITO con $executeRawUnsafe\n');
      }
    } else {
      console.log('   ✅ ÉXITO con $executeRaw\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
