/**
 * Servicio de Geocodificación Batch - Google Maps API
 * Procesa direcciones pendientes con rate limiting y manejo de errores
 * 
 * Campos actualizados en caendire:
 * - caendlat: Decimal(10,8) - Latitud
 * - caendlng: Decimal(11,8) - Longitud
 * - caendgeost: Char(1) - Estado ('S' éxito, 'E' error, 'N' pendiente)
 * - caendgeoerr: VarChar(512) - Mensaje de error
 * - caendgeoup: Timestamp - Fecha último intento
 * - caendpenge: Char(1) - Pendiente procesamiento ('S' procesado, 'N' pendiente)
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');
const prisma = new PrismaClient();

// Cache de parámetros MAPA (TTL 5 minutos)
let mapaParamsCache = null;
let mapaParamsCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Rate limiting: Google Maps Geocoding API
// Free tier: 40,000 requests/month
// Recomendación: no más de 50 requests/second
const REQUESTS_PER_SECOND = 10; // Conservador: 10 req/seg
const DELAY_BETWEEN_REQUESTS_MS = 1000 / REQUESTS_PER_SECOND; // 100ms entre requests

// Configuración de reintentos
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 segundos entre reintentos

/**
 * Lee parámetros MAPA desde nusispar con cache
 */
async function getMapaParams() {
  const now = Date.now();
  
  // Retornar cache si es válido
  if (mapaParamsCache && (now - mapaParamsCacheTime) < CACHE_TTL_MS) {
    return mapaParamsCache;
  }

  // Cargar desde BD
  const params = await prisma.$queryRaw`
    SELECT nusistippa, nusisvalpa 
    FROM nusispar 
    WHERE nusisgrupa = 'MAPA'
    ORDER BY nusistippa
  `;

  if (!params || params.length === 0) {
    throw new Error('No se encontraron parámetros MAPA en nusispar');
  }

  // Convertir array a objeto
  const paramsObj = {};
  params.forEach(p => {
    const key = p.nusistippa?.trim() || '';
    const value = p.nusisvalpa?.trim() || '';
    if (key) {
      paramsObj[key] = value;
    }
  });

  // Debug: mostrar claves encontradas
  console.log('🔍 Claves MAPA encontradas:', Object.keys(paramsObj));

  // Validar parámetros requeridos (nota: 'API Key' tiene espacio en BD)
  const apiKey = paramsObj['API Key'] || paramsObj['APIKey'];
  const required = ['Host', 'BaseUrl', 'Secure'];
  const missing = required.filter(key => !paramsObj[key]);
  
  if (missing.length > 0 || !apiKey) {
    console.log('❌ Parámetros disponibles:', paramsObj);
    const allMissing = [...missing, !apiKey ? 'API Key' : ''].filter(Boolean);
    throw new Error(`Parámetros MAPA faltantes: ${allMissing.join(', ')}`);
  }

  // Construir URL base
  const protocol = paramsObj.Secure === '1' ? 'https' : 'http';
  const baseUrl = `${protocol}://${paramsObj.Host}${paramsObj.BaseUrl}json`;

  mapaParamsCache = {
    apiKey: apiKey,
    baseUrl,
    host: paramsObj.Host,
    path: paramsObj.BaseUrl + 'json'
  };
  mapaParamsCacheTime = now;

  return mapaParamsCache;
}

/**
 * Geocodifica una dirección usando Google Maps API
 * @param {string} address - Dirección completa
 * @returns {Promise<{lat: number, lng: number, status: string, error?: string}>}
 */
async function geocodeAddress(address) {
  const params = await getMapaParams();
  
  return new Promise((resolve, reject) => {
    const queryParams = new URLSearchParams({
      address: address,
      key: params.apiKey
    });

    const options = {
      hostname: params.host,
      path: `${params.path}?${queryParams.toString()}`,
      method: 'GET',
      timeout: 10000 // 10 segundos timeout
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.status === 'OK' && result.results && result.results.length > 0) {
            const location = result.results[0].geometry.location;
            resolve({
              lat: location.lat,
              lng: location.lng,
              status: 'S', // Success
              formattedAddress: result.results[0].formatted_address
            });
          } else {
            // Errores comunes de Google Maps API
            const errorMessages = {
              'ZERO_RESULTS': 'No se encontraron resultados para esta dirección',
              'OVER_QUERY_LIMIT': 'Se excedió el límite de consultas de la API',
              'REQUEST_DENIED': 'Solicitud denegada - verificar API Key',
              'INVALID_REQUEST': 'Solicitud inválida - dirección mal formada',
              'UNKNOWN_ERROR': 'Error desconocido del servidor'
            };
            
            resolve({
              lat: null,
              lng: null,
              status: 'E', // Error
              error: errorMessages[result.status] || `Error de geocodificación: ${result.status}`
            });
          }
        } catch (parseError) {
          resolve({
            lat: null,
            lng: null,
            status: 'E',
            error: `Error al parsear respuesta: ${parseError.message}`
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        lat: null,
        lng: null,
        status: 'E',
        error: `Error de red: ${err.message}`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        lat: null,
        lng: null,
        status: 'E',
        error: 'Timeout: la solicitud excedió 10 segundos'
      });
    });

    req.end();
  });
}

/**
 * Geocodifica con reintentos automáticos
 */
async function geocodeWithRetry(address, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await geocodeAddress(address);
    
    // Si es exitoso o error no recuperable, retornar
    if (result.status === 'S' || 
        (result.error && !result.error.includes('red') && !result.error.includes('Timeout'))) {
      return result;
    }
    
    // Si falla y quedan reintentos, esperar y reintentar
    if (attempt < retries) {
      await sleep(RETRY_DELAY_MS * attempt); // Backoff exponencial
      console.log(`   🔄 Reintento ${attempt}/${retries} para: ${address.substring(0, 50)}...`);
    }
  }
  
  return result; // Retornar último resultado después de agotar reintentos
}

/**
 * Procesa un batch de direcciones pendientes
 * @param {number} batchSize - Tamaño del batch (default 50)
 * @param {number} offset - Offset para paginación (default 0)
 * @returns {Promise<{processed: number, success: number, errors: number, remaining: number}>}
 */
async function processBatch(batchSize = 50, offset = 0) {
  // Obtener direcciones pendientes
  const pendientes = await prisma.$queryRaw`
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
    LIMIT ${batchSize} OFFSET ${offset}
  `;

  if (!pendientes || pendientes.length === 0) {
    return { processed: 0, success: 0, errors: 0, remaining: 0 };
  }

  let successCount = 0;
  let errorCount = 0;

  // Procesar cada dirección con rate limiting
  for (let i = 0; i < pendientes.length; i++) {
    const record = pendientes[i];
    
    // Construir dirección completa
    const addressParts = [
      record.caendirecc,
      record.localidad,
      record.provincia,
      'Argentina'
    ].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    console.log(`   [${i + 1}/${pendientes.length}] Geocodificando: ${record.caentapeno} - ${fullAddress.substring(0, 60)}...`);

    // Geocodificar con reintentos
    const result = await geocodeWithRetry(fullAddress);

    // Actualizar BD
    try {
      // IMPORTANTE: Usar NULL explícito o CAST para campos NUMERIC
      // Prisma $executeRaw con template literals no maneja null en NUMERIC correctamente
      const latValue = result.lat !== null ? result.lat : null;
      const lngValue = result.lng !== null ? result.lng : null;
      
      // CRÍTICO: caendid es CHAR(30) con padding - usar TRIM() en WHERE
      await prisma.$executeRaw`
        UPDATE caendire
        SET 
          caendlat = ${latValue}::numeric,
          caendlng = ${lngValue}::numeric,
          caendgeost = ${result.status},
          caendgeoerr = ${result.error || null},
          caendgeoup = CURRENT_TIMESTAMP,
          caendupdated = CURRENT_TIMESTAMP,
          caendpenge = 'S'
        WHERE TRIM(caendid) = TRIM(${record.caendid})
      `;

      if (result.status === 'S') {
        successCount++;
        console.log(`      ✅ Éxito: ${result.lat}, ${result.lng}`);
      } else {
        errorCount++;
        console.log(`      ❌ Error: ${result.error}`);
      }
    } catch (dbError) {
      errorCount++;
      console.error(`      ❌ Error al actualizar BD: ${dbError.message}`);
    }

    // Rate limiting: esperar entre requests
    if (i < pendientes.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  // Contar pendientes restantes
  const remainingResult = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count 
    FROM caendire 
    WHERE caendpenge = 'N' OR caendlat IS NULL OR caendlng IS NULL
  `;
  const remaining = remainingResult[0]?.count || 0;

  return {
    processed: pendientes.length,
    success: successCount,
    errors: errorCount,
    remaining
  };
}

/**
 * Procesa todas las direcciones pendientes en batches
 * @param {number} batchSize - Tamaño de cada batch
 * @param {function} progressCallback - Callback para reportar progreso
 */
async function processAllPending(batchSize = 50, progressCallback = null) {
  console.log('🚀 Iniciando geocodificación batch...\n');

  // Contar total pendiente
  const totalResult = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count 
    FROM caendire 
    WHERE caendpenge = 'N' OR caendlat IS NULL OR caendlng IS NULL
  `;
  const totalPending = totalResult[0]?.count || 0;

  if (totalPending === 0) {
    console.log('✅ No hay direcciones pendientes de geocodificación');
    return { totalProcessed: 0, totalSuccess: 0, totalErrors: 0 };
  }

  console.log(`📊 Total direcciones pendientes: ${totalPending}\n`);

  let offset = 0;
  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalErrors = 0;
  let batchNumber = 1;

  while (true) {
    console.log(`\n📦 Batch ${batchNumber} (registros ${offset + 1} a ${offset + batchSize}):`);
    
    const result = await processBatch(batchSize, offset);
    
    totalProcessed += result.processed;
    totalSuccess += result.success;
    totalErrors += result.errors;

    const percentage = ((totalProcessed / totalPending) * 100).toFixed(1);
    console.log(`\n   📊 Progreso: ${totalProcessed}/${totalPending} (${percentage}%)`);
    console.log(`   ✅ Exitosos: ${totalSuccess}`);
    console.log(`   ❌ Errores: ${totalErrors}`);
    console.log(`   ⏳ Restantes: ${result.remaining}`);

    // Callback de progreso
    if (progressCallback) {
      progressCallback({
        batchNumber,
        processed: totalProcessed,
        success: totalSuccess,
        errors: totalErrors,
        remaining: result.remaining,
        total: totalPending,
        percentage: parseFloat(percentage)
      });
    }

    // Si no hay más pendientes o no se procesó nada, terminar
    if (result.remaining === 0 || result.processed === 0) {
      break;
    }

    offset += batchSize;
    batchNumber++;
  }

  console.log('\n✅ Geocodificación batch completada');
  console.log(`   Total procesado: ${totalProcessed}`);
  console.log(`   Exitosos: ${totalSuccess} (${((totalSuccess / totalProcessed) * 100).toFixed(1)}%)`);
  console.log(`   Errores: ${totalErrors} (${((totalErrors / totalProcessed) * 100).toFixed(1)}%)`);

  return { totalProcessed, totalSuccess, totalErrors };
}

/**
 * Obtiene estadísticas de geocodificación
 */
async function getStats() {
  const stats = await prisma.$queryRaw`
    SELECT 
      COUNT(*)::int as total,
      COUNT(CASE WHEN caendgeost = 'S' THEN 1 END)::int as geocoded_success,
      COUNT(CASE WHEN caendgeost = 'E' THEN 1 END)::int as geocoded_error,
      COUNT(CASE WHEN caendpenge = 'N' OR caendlat IS NULL THEN 1 END)::int as pending
    FROM caendire
  `;

  return stats[0];
}

/**
 * Función helper para sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  geocodeAddress,
  geocodeWithRetry,
  processBatch,
  processAllPending,
  getStats,
  getMapaParams
};
