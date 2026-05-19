-- Migración: Agregar columnas DNI y CUIL a tabla nuusuari
-- Fecha: 2025-12-19
-- Propósito: Permitir validación de duplicados por DNI/CUIL en el registro

-- Agregar columna nuusudni (DNI)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nuusuari' AND column_name = 'nuusudni'
    ) THEN
        ALTER TABLE nuusuari ADD COLUMN nuusudni VARCHAR(20);
        RAISE NOTICE 'Columna nuusudni agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna nuusudni ya existe';
    END IF;
END $$;

-- Agregar columna nuusucuil (CUIL)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nuusuari' AND column_name = 'nuusucuil'
    ) THEN
        ALTER TABLE nuusuari ADD COLUMN nuusucuil VARCHAR(20);
        RAISE NOTICE 'Columna nuusucuil agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna nuusucuil ya existe';
    END IF;
END $$;

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_nuusuari_dni ON nuusuari(nuusudni);
CREATE INDEX IF NOT EXISTS idx_nuusuari_cuil ON nuusuari(nuusucuil);

-- Mostrar resumen
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada';
    RAISE NOTICE 'Columnas agregadas: nuusudni, nuusucuil';
    RAISE NOTICE 'Índices creados: idx_nuusuari_dni, idx_nuusuari_cuil';
END $$;
