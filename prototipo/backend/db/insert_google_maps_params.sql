# Insertar parámetros de configuración para Google Maps API
# Ejecutar con: psql -U postgres -d app_afiliados_genexus -f insert_google_maps_params.sql

-- Grupo: GOOGLE_MAPS
-- Parámetros necesarios para geocodificación

-- API Key de Google Maps (obtener desde Google Cloud Console)
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr)
VALUES (
  'GOOGLE_MAPS',
  'ApiKey',
  'TU_GOOGLE_MAPS_API_KEY_AQUI',
  'API Key de Google Maps Geocoding API'
)
ON CONFLICT (nusisgrupa, nusistippa) 
DO UPDATE SET 
  nusisvalpa = EXCLUDED.nusisvalpa,
  nusisdescr = EXCLUDED.nusisdescr;

-- Habilitar/deshabilitar geocodificación
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr)
VALUES (
  'GOOGLE_MAPS',
  'Enabled',
  'S',
  'Habilitar geocodificación (S=sí, N=no)'
)
ON CONFLICT (nusisgrupa, nusistippa) 
DO UPDATE SET 
  nusisvalpa = EXCLUDED.nusisvalpa,
  nusisdescr = EXCLUDED.nusisdescr;

-- Tamaño de batch para procesamiento
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr)
VALUES (
  'GOOGLE_MAPS',
  'BatchSize',
  '50',
  'Cantidad de direcciones a procesar por batch'
)
ON CONFLICT (nusisgrupa, nusistippa) 
DO UPDATE SET 
  nusisvalpa = EXCLUDED.nusisvalpa,
  nusisdescr = EXCLUDED.nusisdescr;

-- Rate limit (requests por segundo)
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr)
VALUES (
  'GOOGLE_MAPS',
  'RateLimit',
  '50',
  'Requests por segundo (límite Google Maps API)'
)
ON CONFLICT (nusisgrupa, nusistippa) 
DO UPDATE SET 
  nusisvalpa = EXCLUDED.nusisvalpa,
  nusisdescr = EXCLUDED.nusisdescr;

-- Delay entre requests (milisegundos)
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr)
VALUES (
  'GOOGLE_MAPS',
  'DelayMs',
  '25',
  'Delay entre requests en milisegundos (rate limiting)'
)
ON CONFLICT (nusisgrupa, nusistippa) 
DO UPDATE SET 
  nusisvalpa = EXCLUDED.nusisvalpa,
  nusisdescr = EXCLUDED.nusisdescr;

-- Idioma de resultados
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr)
VALUES (
  'GOOGLE_MAPS',
  'Language',
  'es',
  'Idioma de resultados (es, en, etc.)'
)
ON CONFLICT (nusisgrupa, nusistippa) 
DO UPDATE SET 
  nusisvalpa = EXCLUDED.nusisvalpa,
  nusisdescr = EXCLUDED.nusisdescr;

-- Región para resultados
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr)
VALUES (
  'GOOGLE_MAPS',
  'Region',
  'AR',
  'Región/país para sesgar resultados (AR=Argentina)'
)
ON CONFLICT (nusisgrupa, nusistippa) 
DO UPDATE SET 
  nusisvalpa = EXCLUDED.nusisvalpa,
  nusisdescr = EXCLUDED.nusisdescr;

-- Verificar inserción
SELECT 
  nusisgrupa as grupo,
  nusistippa as tipo,
  nusisvalpa as valor,
  nusisdescr as descripcion
FROM nusispar
WHERE nusisgrupa = 'GOOGLE_MAPS'
ORDER BY nusistippa;

-- Verificación adicional
\echo ''
\echo '=== PARÁMETROS GOOGLE MAPS INSERTADOS ==='
\echo 'IMPORTANTE: Actualizar ApiKey con tu clave de Google Cloud Console'
\echo ''
