/**
 * Migración: Soporte sync incremental cartillas
 * 
 * Agrega campos necesarios para sync incremental:
 * - caentactivo: BOOLEAN para bajas lógicas en entidades
 * - caentupdated: TIMESTAMP para tracking de cambios en entidades
 * - Triggers automáticos para actualizar timestamps
 * 
 * Contexto: Semana 20 - Sync incremental cartillas
 * 
 * Uso (script Node.js):
 *   node backend/db/add-sync-incremental-fields.js
 */

-- =====================================================
-- 1. AGREGAR CAMPO BAJA LÓGICA EN CAENTIDA
-- =====================================================
-- Campo: caentactivo (BOOLEAN)
-- Default: true (entidad activa)
-- Propósito: marcar entidades dadas de baja sin eliminarlas físicamente

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'caentida' AND column_name = 'caentactivo'
    ) THEN
        ALTER TABLE caentida ADD COLUMN caentactivo BOOLEAN DEFAULT true;
        COMMENT ON COLUMN caentida.caentactivo IS 'Indica si la entidad está activa (true) o dada de baja lógicamente (false)';
        
        -- Marcar todas las entidades existentes como activas
        UPDATE caentida SET caentactivo = true WHERE caentactivo IS NULL;
        
        RAISE NOTICE 'Campo caentactivo agregado exitosamente';
    ELSE
        RAISE NOTICE 'Campo caentactivo ya existe';
    END IF;
END $$;

-- =====================================================
-- 2. AGREGAR CAMPO TIMESTAMP EN CAENTIDA
-- =====================================================
-- Campo: caentupdated (TIMESTAMP)
-- Default: CURRENT_TIMESTAMP
-- Propósito: tracking de última modificación a nivel entidad

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'caentida' AND column_name = 'caentupdated'
    ) THEN
        ALTER TABLE caentida ADD COLUMN caentupdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        COMMENT ON COLUMN caentida.caentupdated IS 'Timestamp de última actualización de la entidad';
        
        -- Inicializar con timestamp actual para registros existentes
        UPDATE caentida SET caentupdated = CURRENT_TIMESTAMP WHERE caentupdated IS NULL;
        
        RAISE NOTICE 'Campo caentupdated agregado exitosamente';
    ELSE
        RAISE NOTICE 'Campo caentupdated ya existe';
    END IF;
END $$;

-- =====================================================
-- 3. CREAR ÍNDICES PARA QUERIES DE SYNC
-- =====================================================
-- Índice para queries con timestamp (WHERE caentupdated > ?)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'caentida' AND indexname = 'idx_caentida_updated'
    ) THEN
        CREATE INDEX idx_caentida_updated ON caentida(caentupdated DESC);
        RAISE NOTICE 'Índice idx_caentida_updated creado exitosamente';
    ELSE
        RAISE NOTICE 'Índice idx_caentida_updated ya existe';
    END IF;
END $$;

-- Índice para queries de bajas lógicas (WHERE caentactivo = true)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'caentida' AND indexname = 'idx_caentida_activo'
    ) THEN
        CREATE INDEX idx_caentida_activo ON caentida(caentactivo);
        RAISE NOTICE 'Índice idx_caentida_activo creado exitosamente';
    ELSE
        RAISE NOTICE 'Índice idx_caentida_activo ya existe';
    END IF;
END $$;

-- Índice compuesto para sync queries (activo + updated)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'caentida' AND indexname = 'idx_caentida_activo_updated'
    ) THEN
        CREATE INDEX idx_caentida_activo_updated ON caentida(caentactivo, caentupdated DESC);
        RAISE NOTICE 'Índice idx_caentida_activo_updated creado exitosamente';
    ELSE
        RAISE NOTICE 'Índice idx_caentida_activo_updated ya existe';
    END IF;
END $$;

-- =====================================================
-- 4. TRIGGER AUTOMÁTICO PARA ACTUALIZAR TIMESTAMP
-- =====================================================
-- Función que actualiza caentupdated automáticamente

CREATE OR REPLACE FUNCTION update_caentida_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.caentupdated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger BEFORE UPDATE en caentida
DROP TRIGGER IF EXISTS trigger_update_caentida_timestamp ON caentida;
CREATE TRIGGER trigger_update_caentida_timestamp
    BEFORE UPDATE ON caentida
    FOR EACH ROW
    EXECUTE FUNCTION update_caentida_timestamp();

COMMENT ON TRIGGER trigger_update_caentida_timestamp ON caentida IS 
'Actualiza automáticamente caentupdated cuando se modifica una entidad';

-- =====================================================
-- 5. ÍNDICE EN CAENDIRE.CAENDUPDATED (DIRECCIONES)
-- =====================================================
-- Índice para queries de sync de direcciones
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'caendire' AND indexname = 'idx_caendire_updated'
    ) THEN
        CREATE INDEX idx_caendire_updated ON caendire(caendupdated DESC);
        RAISE NOTICE 'Índice idx_caendire_updated creado exitosamente';
    ELSE
        RAISE NOTICE 'Índice idx_caendire_updated ya existe';
    END IF;
END $$;

-- =====================================================
-- 6. VERIFICACIÓN FINAL
-- =====================================================
DO $$ 
DECLARE
    campo_record RECORD;
    indice_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'VERIFICACIÓN FINAL - SYNC INCREMENTAL';
    RAISE NOTICE '==============================================';
    
    -- Verificar campos agregados
    RAISE NOTICE '';
    RAISE NOTICE 'Campos agregados en caentida:';
    FOR campo_record IN 
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'caentida' 
        AND column_name IN ('caentactivo', 'caentupdated')
        ORDER BY column_name
    LOOP
        RAISE NOTICE '  ✓ % (%) - Default: %', 
            campo_record.column_name, 
            campo_record.data_type, 
            COALESCE(campo_record.column_default, 'NULL');
    END LOOP;
    
    -- Verificar índices creados
    RAISE NOTICE '';
    RAISE NOTICE 'Índices creados:';
    FOR indice_record IN 
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE indexname LIKE '%updated%' OR indexname LIKE '%activo%'
        ORDER BY tablename, indexname
    LOOP
        RAISE NOTICE '  ✓ %.%', indice_record.tablename, indice_record.indexname;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migración sync incremental completada';
    RAISE NOTICE '';
END $$;
