/**
 * Verificación de persistencia de datos de geolocalización
 * Confirma que los datos están correctamente guardados en BD
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   VERIFICACIÓN PERSISTENCIA DATOS GEOGRÁFICOS      ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Estadísticas generales
  const stats = await prisma.$queryRaw`
    SELECT 
      COUNT(*)::int as total,
      COUNT(CASE WHEN caendlat IS NOT NULL AND caendlng IS NOT NULL THEN 1 END)::int as geocodificadas,
      COUNT(CASE WHEN caendgeost = 'S' THEN 1 END)::int as exitosas,
      COUNT(CASE WHEN caendgeost = 'E' THEN 1 END)::int as errores,
      MIN(caendlat) as lat_min,
      MAX(caendlat) as lat_max,
      MIN(caendlng) as lng_min,
      MAX(caendlng) as lng_max
    FROM caendire
  `;

  const stat = stats[0];
  const porcentaje = ((stat.geocodificadas / stat.total) * 100).toFixed(1);

  console.log('📊 Estado de la base de datos:\n');
  console.log(`   Total direcciones:         ${stat.total}`);
  console.log(`   Con coordenadas (lat/lng): ${stat.geocodificadas}`);
  console.log(`   Geocodificación exitosa:   ${stat.exitosas}`);
  console.log(`   Con errores:               ${stat.errores}`);
  console.log(`   Porcentaje guardado:       ${porcentaje}%\n`);

  console.log('🌍 Rangos de coordenadas almacenadas:\n');
  console.log(`   Latitud:  ${stat.lat_min} a ${stat.lat_max}`);
  console.log(`   Longitud: ${stat.lng_min} a ${stat.lng_max}\n`);

  // Validación de rangos
  const latValida = stat.lat_min >= -90 && stat.lat_max <= 90;
  const lngValida = stat.lng_min >= -180 && stat.lng_max <= 180;

  console.log('✅ Validación de rangos:\n');
  console.log(`   Latitudes válidas:  ${latValida ? '✅ Sí' : '❌ No'} (rango: -90 a +90)`);
  console.log(`   Longitudes válidas: ${lngValida ? '✅ Sí' : '❌ No'} (rango: -180 a +180)\n`);

  // Muestra de registros guardados
  console.log('📍 Muestra de registros guardados (últimos 5):\n');
  const muestra = await prisma.$queryRaw`
    SELECT 
      e.caentapeno,
      d.caendirecc,
      d.caendlat,
      d.caendlng,
      d.caendgeoup
    FROM caendire d
    INNER JOIN caentida e ON d.caentid = e.caentid
    WHERE d.caendlat IS NOT NULL
    ORDER BY d.caendgeoup DESC
    LIMIT 5
  `;

  muestra.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.caentapeno.substring(0, 45)}`);
    console.log(`      Dirección: ${r.caendirecc.substring(0, 55)}`);
    console.log(`      Coordenadas: ${r.caendlat}, ${r.caendlng}`);
    console.log(`      Guardado: ${r.caendgeoup.toISOString()}\n`);
  });

  // Verificar timestamps
  const timestamps = await prisma.$queryRaw`
    SELECT 
      MIN(caendgeoup) as fecha_primera,
      MAX(caendgeoup) as fecha_ultima
    FROM caendire
    WHERE caendgeoup IS NOT NULL
  `;

  console.log('⏱️  Timestamps de procesamiento:\n');
  console.log(`   Primera geocodificación: ${timestamps[0].fecha_primera.toISOString()}`);
  console.log(`   Última geocodificación:  ${timestamps[0].fecha_ultima.toISOString()}\n`);

  // Resumen final
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║                  RESUMEN FINAL                     ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  if (stat.geocodificadas === stat.total && stat.errores === 0) {
    console.log('✅ TODOS los datos de geolocalización están correctamente');
    console.log('   guardados en la base de datos PostgreSQL.\n');
    console.log(`   ${stat.total} registros con coordenadas válidas (lat/lng)`);
    console.log(`   0 errores de geocodificación`);
    console.log(`   100% de éxito en la persistencia\n`);
  } else {
    console.log('⚠️  Algunos registros no tienen coordenadas:\n');
    console.log(`   Faltantes: ${stat.total - stat.geocodificadas}`);
    console.log(`   Con errores: ${stat.errores}\n`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
