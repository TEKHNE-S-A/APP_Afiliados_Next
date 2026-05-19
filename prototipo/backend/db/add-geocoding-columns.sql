-- Agregar columnas de geocodificación a tabla caendire
-- Estado: caendgeost ('S' = success, 'N' = pendiente, 'E' = error)
-- Latitud/Longitud: campos numéricos para coordenadas GPS

BEGIN;

-- Agregar columna de estado de geocodificación (1 char)
ALTER TABLE caendire 
  ADD COLUMN IF NOT EXISTS caendgeost CHAR(1) DEFAULT 'N';

-- Agregar columna de latitud (decimal con 8 dígitos de precisión)
ALTER TABLE caendire 
  ADD COLUMN IF NOT EXISTS caendlat NUMERIC(10, 8);

-- Agregar columna de longitud (decimal con 8 dígitos de precisión)
ALTER TABLE caendire 
  ADD COLUMN IF NOT EXISTS caendlng NUMERIC(11, 8);

-- Agregar columna de mensaje de error (opcional)
ALTER TABLE caendire 
  ADD COLUMN IF NOT EXISTS caendgeoerr VARCHAR(512);

-- Crear índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_caendire_geost 
  ON caendire(caendgeost);

-- Crear índice para búsquedas espaciales (lat/lng)
CREATE INDEX IF NOT EXISTS idx_caendire_latlong 
  ON caendire(caendlat, caendlng) 
  WHERE caendlat IS NOT NULL AND caendlng IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN caendire.caendgeost IS 'Estado geocodificación: S=success, N=pendiente, E=error';
COMMENT ON COLUMN caendire.caendlat IS 'Latitud GPS (ej: -32.889458)';
COMMENT ON COLUMN caendire.caendlng IS 'Longitud GPS (ej: -68.845839)';
COMMENT ON COLUMN caendire.caendgeoerr IS 'Mensaje de error si caendgeost=E';

COMMIT;

-- Verificar estado
SELECT 
  'caendgeost' AS columna,
  COUNT(*) FILTER (WHERE caendgeost = 'S') AS success,
  COUNT(*) FILTER (WHERE caendgeost = 'N') AS pendiente,
  COUNT(*) FILTER (WHERE caendgeost = 'E') AS error,
  COUNT(*) AS total
FROM caendire;
