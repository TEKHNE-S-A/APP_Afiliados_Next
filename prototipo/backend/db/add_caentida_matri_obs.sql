-- Agregar columnas caentmatri (matrícula) y caentobs (observaciones) a caentida
-- Fecha: 28 de enero de 2026

BEGIN;

-- Agregar caentmatri (matrícula profesional)
ALTER TABLE caentida 
ADD COLUMN IF NOT EXISTS caentmatri VARCHAR(100) NULL;

-- Agregar caentobs (observaciones)
ALTER TABLE caentida 
ADD COLUMN IF NOT EXISTS caentobs TEXT NULL;

-- Verificar las columnas agregadas
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'caentida'
AND column_name IN ('caentmatri', 'caentobs');

COMMIT;

-- Mensaje
SELECT 'Columnas caentmatri y caentobs agregadas exitosamente a caentida' AS resultado;
