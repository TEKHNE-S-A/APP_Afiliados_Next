-- Migración: Agregar carubid y caespecial a tabla caentida
-- Fecha: 29/01/2026
-- Descripción: Permite filtrar entidades por rubro y especialidad directamente
-- Requerido para: módulo Farmacias mobile + filtros por rubro

-- 1. Agregar columnas
ALTER TABLE caentida 
  ADD COLUMN IF NOT EXISTS carubid CHAR(30),
  ADD COLUMN IF NOT EXISTS caespid CHAR(30);

-- 2. Agregar comentarios
COMMENT ON COLUMN caentida.carubid IS 'Rubro principal de la entidad (FK a carubro)';
COMMENT ON COLUMN caentida.caespid IS 'Especialidad principal (FK compuesta a caespeci con carubid)';

-- 3. Crear índices para performance de filtros
CREATE INDEX IF NOT EXISTS idx_caentida_carubid ON caentida(carubid);
CREATE INDEX IF NOT EXISTS idx_caentida_caespid ON caentida(caespid, carubid);

-- 4. Agregar foreign keys (opcional - comentado por ahora para flexibilidad)
-- ALTER TABLE caentida 
--   ADD CONSTRAINT fk_caentida_carubro 
--   FOREIGN KEY (carubid) REFERENCES carubro(carubid) ON DELETE SET NULL;

-- ALTER TABLE caentida 
--   ADD CONSTRAINT fk_caentida_caespeci 
--   FOREIGN KEY (caespid, carubid) REFERENCES caespeci(caespid, carubid) ON DELETE SET NULL;

-- 5. Verificación
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'caentida' 
  AND column_name IN ('carubid', 'caespid')
ORDER BY ordinal_position;

-- Resultado esperado:
-- | column_name | data_type | character_maximum_length | is_nullable |
-- |-------------|-----------|--------------------------|-------------|
-- | carubid     | character | 30                       | YES         |
-- | caespid     | character | 30                       | YES         |
