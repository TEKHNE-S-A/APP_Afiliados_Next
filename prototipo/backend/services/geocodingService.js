/**
 * Servicio de Geocodificación Batch
 * 
 * Procesa direcciones pendientes de geocodificación usando Google Maps Geocoding API.
 * - Batch processing con rate limiting
 * - Persistencia de lat/lng y status en caendire
 * - Retry logic para errores transitorios
 * - Estadísticas de procesamiento
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene configuración de Google Maps API desde nusispar
 */
async function getGoogleMapsConfig() {
  const apiKey = await prisma.nusispar.findFirst({
    where: {
      nusisgrupa: 'GOOGLE_MAPS',
      nusistippa: 'ApiKey'
    }
  });

  const enabled = await prisma.nusispar.findFirst({
    where: {
      nusisgrupa: 'GOOGLE_MAPS',
      nusistippa: 'Enabled'
    }
  });

  const batchSize = await prisma.nusispar.findFirst({
    where: {
      nusisgrupa: 'GOOGLE_MAPS',
      nusistippa: 'BatchSize'
    }
  });

  return {
    apiKey: apiKey?.nusisvalpa || process.env.GOOGLE_MAPS_API_KEY,
    enabled: enabled?.nusisvalpa === 'S',
    batchSize: parseInt(batchSize?.nusisvalpa || '50', 10)
  };
}

/**
 * Geocodifica una dirección usando Google Maps Geocoding API
 * @param {string} direccion - Dirección completa
 * @param {string} localidad - Localidad/ciudad
 * @param {string} provincia - Provincia (opcional)
 * @param {string} apiKey - API key de Google Maps
 * @returns {Promise<{lat: number, lng: number, status: string, error?: string}>}
 */
async function geocodeAddress(direccion, localidad, provincia, apiKey) {
  try {
    // Construir query completa
    const parts = [direccion, localidad, provincia, 'Argentina'].filter(Boolean);
    const address = parts.join(', ');

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        status: 'S', // Success
        formattedAddress: result.formatted_address
      };
    } else if (data.status === 'ZERO_RESULTS') {
      return {
        lat: null,
        lng: null,
        status: 'E', // Error
        error: 'No se encontraron resultados para esta dirección'
      };
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      return {
        lat: null,
        lng: null,
        status: 'N', // Pending (para reintentar después)
        error: 'Límite de cuota API excedido - reintentar más tarde'
      };
    } else {
      return {
        lat: null,
        lng: null,
        status: 'E',
        error: `Google Maps API error: ${data.status} - ${data.error_message || 'Sin mensaje'}`
      };
    }
  } catch (error) {
    console.error('Error en geocodeAddress:', error);
    return {
      lat: null,
      lng: null,
      status: 'E',
      error: `Error de red: ${error.message}`
    };
  }
}

/**
 * Obtiene direcciones pendientes de geocodificación
 * @param {number} limit - Cantidad máxima de registros
 * @returns {Promise<Array>}
 */
async function getPendingAddresses(limit = 50) {
  const direcciones = await prisma.$queryRaw`
    SELECT 
      d.caentid,
      d.caendid,
      d.caendirecc,
      d.nulocid,
      l.nulocdescr,
      p.nuprodescr,
      e.caentapeno
    FROM caendire d
    LEFT JOIN nulocali l ON d.nulocid = l.nulocid
    LEFT JOIN nuprovin p ON l.nuproid = p.nuproid
    LEFT JOIN caentida e ON d.caentid = e.caentid
    WHERE d.caendpenge = 'N'
      AND d.caendirecc IS NOT NULL
      AND d.caendirecc != ''
    ORDER BY e.caentapeno
    LIMIT ${limit}
  `;

  return direcciones;
}

/**
 * Actualiza información de geocodificación en la BD
 * NOTA: caentid y caendid son CHAR(30) con padding, requieren TRIM para matching
 */
async function updateGeocodingResult(caentid, caendid, result) {
  const affected = await prisma.$executeRaw`
    UPDATE caendire
    SET 
      caendlat = ${result.lat},
      caendlng = ${result.lng},
      caendgeost = ${result.status},
      caendgeoerr = ${result.error || null},
      caendgeoup = CURRENT_TIMESTAMP,
      caendupdated = CURRENT_TIMESTAMP,
      caendpenge = ${result.status === 'N' ? 'N' : 'S'}
    WHERE TRIM(caentid) = TRIM(${caentid})
      AND TRIM(caendid) = TRIM(${caendid})
  `;
  
  // Log para debugging
  if (affected === 0) {
    console.warn(`   ⚠️ UPDATE no afectó ninguna fila: ${caentid}/${caendid}`);
  }
  
  return affected;
}

/**
 * Procesa batch de geocodificación
 * @param {number} batchSize - Tamaño del batch
 * @returns {Promise<{processed: number, success: number, errors: number, pending: number}>}
 */
async function processBatchGeocoding(batchSize = 50) {
  const config = await getGoogleMapsConfig();

  if (!config.enabled) {
    throw new Error('Geocodificación deshabilitada en configuración (GOOGLE_MAPS.Enabled != S)');
  }

  if (!config.apiKey) {
    throw new Error('API Key de Google Maps no configurada (GOOGLE_MAPS.ApiKey)');
  }

  const direcciones = await getPendingAddresses(batchSize);
  
  if (direcciones.length === 0) {
    return {
      processed: 0,
      success: 0,
      errors: 0,
      pending: 0,
      message: 'No hay direcciones pendientes de geocodificación'
    };
  }

  let success = 0;
  let errors = 0;
  let pending = 0;

  console.log(`\n🌍 Procesando ${direcciones.length} direcciones...`);

  for (let i = 0; i < direcciones.length; i++) {
    const dir = direcciones[i];
    
    console.log(`\n[${i + 1}/${direcciones.length}] ${dir.caentapeno || 'Sin nombre'}`);
    console.log(`   Dirección: ${dir.caendirecc}`);
    console.log(`   Localidad: ${dir.nulocdescr || 'Sin localidad'}`);

    // Geocodificar
    const result = await geocodeAddress(
      dir.caendirecc,
      dir.nulocdescr,
      dir.nuprodescr,
      config.apiKey
    );

    // Actualizar BD
    await updateGeocodingResult(dir.caentid, dir.caendid, result);

    // Contadores
    if (result.status === 'S') {
      success++;
      console.log(`   ✅ OK: (${result.lat}, ${result.lng})`);
    } else if (result.status === 'N') {
      pending++;
      console.log(`   ⏳ Pendiente: ${result.error}`);
    } else {
      errors++;
      console.log(`   ❌ Error: ${result.error}`);
    }

    // Rate limiting: 50 requests/second = 20ms entre requests
    if (i < direcciones.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  }

  return {
    processed: direcciones.length,
    success,
    errors,
    pending
  };
}

/**
 * Obtiene estadísticas de geocodificación
 */
async function getGeocodingStats() {
  const stats = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN caendpenge = 'N' THEN 1 END) as pendientes,
      COUNT(CASE WHEN caendgeost = 'S' THEN 1 END) as exitosas,
      COUNT(CASE WHEN caendgeost = 'E' THEN 1 END) as errores,
      COUNT(CASE WHEN caendlat IS NOT NULL AND caendlng IS NOT NULL THEN 1 END) as con_coordenadas,
      MAX(caendgeoup) as ultima_actualizacion
    FROM caendire
    WHERE caendirecc IS NOT NULL AND caendirecc != ''
  `;

  const stat = stats[0];
  const totalDirecciones = parseInt(stat.total, 10);
  const conCoordenadas = parseInt(stat.con_coordenadas, 10);

  return {
    total: totalDirecciones,
    pendientes: parseInt(stat.pendientes, 10),
    exitosas: parseInt(stat.exitosas, 10),
    errores: parseInt(stat.errores, 10),
    conCoordenadas,
    porcentajeGeocodificado: totalDirecciones > 0 
      ? ((conCoordenadas / totalDirecciones) * 100).toFixed(2)
      : '0.00',
    ultimaActualizacion: stat.ultima_actualizacion
  };
}

/**
 * Re-procesa direcciones con error
 * @param {number} limit - Cantidad máxima a reprocesar
 */
async function retryFailedGeocoding(limit = 20) {
  // Resetear estado de direcciones con error para reintento
  await prisma.$executeRaw`
    UPDATE caendire
    SET caendpenge = 'N',
        caendgeost = NULL,
        caendgeoer = NULL
    WHERE caendgeost = 'E'
      AND caendirecc IS NOT NULL
      AND caendirecc != ''
    LIMIT ${limit}
  `;

  // Procesar batch
  return await processBatchGeocoding(limit);
}

module.exports = {
  geocodeAddress,
  getPendingAddresses,
  processBatchGeocoding,
  getGeocodingStats,
  retryFailedGeocoding,
  getGoogleMapsConfig
};
