-- Migración: Agregar campos GEO a tabla caendire
-- Autor: Semana 11 - Cartillas con GEO
-- Fecha: 27/01/2026
-- Propósito: Preparar cartillas para geocoding y filtros por ubicación

-- 1. Agregar campos lat/lng como DECIMAL para cálculos precisos
ALTER TABLE caendire 
  ADD COLUMN IF NOT EXISTS caendlat DECIMAL(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS caendlng DECIMAL(10, 7) NULL;

COMMENT ON COLUMN caendire.caendlat IS 'Latitud (-90 a 90, 7 decimales = ~1.1cm precision)';
COMMENT ON COLUMN caendire.caendlng IS 'Longitud (-180 a 180, 7 decimales = ~1.1cm precision)';

-- 2. Agregar campos de estado de geocoding
ALTER TABLE caendire
  ADD COLUMN IF NOT EXISTS caendgeost VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS caendgeoer TEXT NULL,
  ADD COLUMN IF NOT EXISTS caendgeoup TIMESTAMP NULL;

COMMENT ON COLUMN caendire.caendgeost IS 'Estado geocoding: pending, success, error, manual';
COMMENT ON COLUMN caendire.caendgeoer IS 'Mensaje de error si geocoding falla';
COMMENT ON COLUMN caendire.caendgeoup IS 'Ultima fecha/hora de intento de geocoding';

-- 3. Agregar campo updated_at para sync incremental
ALTER TABLE caendire
  ADD COLUMN IF NOT EXISTS caendupdated TIMESTAMP NULL DEFAULT NOW();

COMMENT ON COLUMN caendire.caendupdated IS 'Ultima actualizacion del registro (para ETL incremental)';

-- 4. Crear índices para queries GEO eficientes
-- Índice compuesto para bounding box queries
CREATE INDEX IF NOT EXISTS idx_caendire_latlng 
  ON caendire(caendlat, caendlng) 
  WHERE caendlat IS NOT NULL AND caendlng IS NOT NULL;

-- Índice para filtrar por estado de geocoding
CREATE INDEX IF NOT EXISTS idx_caendire_geocode_status 
  ON caendire(caendgeost);

-- Índice para sync incremental (registros actualizados recientemente)
CREATE INDEX IF NOT EXISTS idx_caendire_updated 
  ON caendire(caendupdated DESC);

-- 5. Marcar todos los registros existentes como pendientes de geocoding
-- Solo si tienen dirección y no tienen lat/lng
UPDATE caendire
SET 
  caendgeost = 'pending',
  caendupdated = NOW()
WHERE 
  caendirecc IS NOT NULL 
  AND caendirecc <> ''
  AND (caendlat IS NULL OR caendlng IS NULL)
  AND (caendgeost IS NULL OR caendgeost = '');

-- 6. Validaciones
DO $$
DECLARE
  total_dirs INTEGER;
  pending_geocode INTEGER;
  with_coords INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_dirs FROM caendire;
  SELECT COUNT(*) INTO pending_geocode FROM caendire WHERE caendgeost = 'pending';
  SELECT COUNT(*) INTO with_coords FROM caendire WHERE caendlat IS NOT NULL AND caendlng IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migración GEO completada';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total direcciones: %', total_dirs;
  RAISE NOTICE 'Pendientes geocoding: %', pending_geocode;
  RAISE NOTICE 'Con coordenadas: %', with_coords;
  RAISE NOTICE '========================================';
END $$;

-- 7. Verificar índices creados
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'caendire'
  AND indexname LIKE 'idx_caendire_%'
ORDER BY indexname;
