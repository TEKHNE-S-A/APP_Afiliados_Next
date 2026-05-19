/**
 * Script para insertar parámetros de Google Maps API en nusispar
 * Ejecutar con: node insert-google-maps-params.js
 */

const db = require('../db/connection');

async function insertGoogleMapsParams() {
  const client = await db.pool.connect();
  
  try {
    console.log('Insertando parámetros de Google Maps...\n');

    const parametros = [
      {
        grupo: 'GOOGLE_MAPS',
        tipo: 'ApiKey',
        valor: 'TU_GOOGLE_MAPS_API_KEY_AQUI'
      },
      {
        grupo: 'GOOGLE_MAPS',
        tipo: 'Enabled',
        valor: 'S'
      },
      {
        grupo: 'GOOGLE_MAPS',
        tipo: 'BatchSize',
        valor: '50'
      },
      {
        grupo: 'GOOGLE_MAPS',
        tipo: 'RateLimit',
        valor: '50'
      },
      {
        grupo: 'GOOGLE_MAPS',
        tipo: 'DelayMs',
        valor: '25'
      },
      {
        grupo: 'GOOGLE_MAPS',
        tipo: 'Language',
        valor: 'es'
      },
      {
        grupo: 'GOOGLE_MAPS',
        tipo: 'Region',
        valor: 'AR'
      }
    ];

    await client.query('BEGIN');

    for (const param of parametros) {
      await client.query(`
        INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
        VALUES ($1, $2, $3)
        ON CONFLICT (nusisgrupa, nusistippa) 
        DO UPDATE SET nusisvalpa = EXCLUDED.nusisvalpa
      `, [param.grupo, param.tipo, param.valor]);

      console.log(`✅ ${param.grupo}.${param.tipo} = ${param.valor}`);
    }

    await client.query('COMMIT');

    console.log('\n✅ Parámetros insertados exitosamente');

    // Verificar
    const result = await client.query(`
      SELECT nusisgrupa, nusistippa, nusisvalpa 
      FROM nusispar 
      WHERE nusisgrupa = 'GOOGLE_MAPS' 
      ORDER BY nusistippa
    `);

    console.log('\n=== PARÁMETROS GOOGLE MAPS ===');
    result.rows.forEach(row => {
      console.log(`  ${row.nusistippa}: ${row.nusisvalpa}`);
    });

    console.log('\n⚠️  IMPORTANTE:');
    console.log('1. Actualiza el parámetro ApiKey con tu clave de Google Cloud Console');
    console.log('2. Habilita la API "Geocoding API" en tu proyecto de Google Cloud');
    console.log('3. Configura límites de cuota y billing en Google Cloud Console');
    console.log('\n🔗 Más info: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
}

insertGoogleMapsParams()
  .then(() => {
    console.log('\n✅ Completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
