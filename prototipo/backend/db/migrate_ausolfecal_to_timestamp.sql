-- Migración: Cambiar ausolfecal y ausolfecor de DATE a TIMESTAMP
-- Fecha: 23 de diciembre de 2025
-- Propósito: Permitir ordenamiento eficiente de solicitudes con hora exacta

-- ============================================================================
-- BACKUP: Crear tabla temporal de respaldo
-- ============================================================================

CREATE TABLE IF NOT EXISTS ausolici_backup_20251223 AS 
SELECT * FROM ausolici;

COMMENT ON TABLE ausolici_backup_20251223 IS 'Backup antes de migrar ausolfecal a TIMESTAMP';

-- ============================================================================
-- MIGRACIÓN: Cambiar tipos de dato
-- ============================================================================

BEGIN;

-- Cambiar ausolfecal de DATE a TIMESTAMP
-- Los valores DATE se convertirán automáticamente a TIMESTAMP (hora 00:00:00)
ALTER TABLE ausolici 
  ALTER COLUMN ausolfecal TYPE TIMESTAMP USING ausolfecal::TIMESTAMP;

-- Cambiar ausolfecor de DATE a TIMESTAMP
ALTER TABLE ausolici 
  ALTER COLUMN ausolfecor TYPE TIMESTAMP USING ausolfecor::TIMESTAMP;

-- Agregar comentarios descriptivos
COMMENT ON COLUMN ausolici.ausolfecal IS 'Fecha y hora de alta de la solicitud';
COMMENT ON COLUMN ausolici.ausolfecor IS 'Fecha y hora de orden de la solicitud';

COMMIT;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar tipos de dato actualizados
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ausolici' 
  AND column_name IN ('ausolfecal', 'ausolfecor')
ORDER BY column_name;

-- Verificar registros existentes (primeros 5)
SELECT 
  ausolicid,
  ausolfecal,
  ausolfecor,
  ausoldescr,
  ausolestad
FROM ausolici
ORDER BY ausolfecal DESC
LIMIT 5;

-- Contar registros antes y después
SELECT 
  'ausolici' as tabla,
  COUNT(*) as total_registros
FROM ausolici
UNION ALL
SELECT 
  'ausolici_backup_20251223' as tabla,
  COUNT(*) as total_registros
FROM ausolici_backup_20251223;

-- ============================================================================
-- ÍNDICES: Recrear índice de ordenamiento
-- ============================================================================

-- Eliminar índice existente si usa DATE
DROP INDEX IF EXISTS uausoli1;

-- Crear índice optimizado para TIMESTAMP
CREATE INDEX IF NOT EXISTS idx_ausolici_user_fecha 
  ON ausolici (nuusuid, ausolfecal DESC, ausolfecor DESC, ausolicid);

COMMENT ON INDEX idx_ausolici_user_fecha IS 'Índice para consultas por usuario ordenadas por fecha descendente';

-- ============================================================================
-- ROLLBACK (en caso de problemas)
-- ============================================================================

-- Si algo sale mal, ejecutar:
-- BEGIN;
-- DROP TABLE IF EXISTS ausolici CASCADE;
-- ALTER TABLE ausolici_backup_20251223 RENAME TO ausolici;
-- COMMIT;

-- ============================================================================
-- CLEANUP (después de verificar que todo funciona)
-- ============================================================================

-- Una vez verificado que todo funciona correctamente, eliminar backup:
-- DROP TABLE IF EXISTS ausolici_backup_20251223;
