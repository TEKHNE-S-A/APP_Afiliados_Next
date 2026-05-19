-- Fix crcredus.nuusuid para consistencia con migración GAM
-- Actualiza de BPCHAR(40) a VARCHAR(100) para soportar UserID de GAM

BEGIN;

-- Actualizar tipo de columna
ALTER TABLE crcredus ALTER COLUMN nuusuid TYPE VARCHAR(100);

-- Agregar comentario explicativo
COMMENT ON COLUMN crcredus.nuusuid IS 'FK a nuusuari.nuusuid - soporta UserID de GAM (VARCHAR 100)';

COMMIT;

-- Verificar resultado
SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    CASE 
        WHEN character_maximum_length IS NOT NULL THEN 
            data_type || '(' || character_maximum_length || ')'
        ELSE 
            data_type 
    END as tipo_completo
FROM information_schema.columns 
WHERE table_name = 'crcredus' 
AND column_name = 'nuusuid';
