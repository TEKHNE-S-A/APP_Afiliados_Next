-- ===================================================================
-- Script: Insertar parámetro para vigencia de credenciales
-- ===================================================================
-- Descripción: Inserta el parámetro 'VigenciaCred' en la tabla nusispar
--              Este parámetro controla cuántos días hábiles tendrán de vigencia
--              las credenciales desde la fecha de registración del usuario.
-- 
-- Uso:
--   psql -U postgres -d app_afiliados_genexus -f insert_parametro_vigencia_credencial.sql
-- ===================================================================

-- Verificar si ya existe el parámetro
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM nusispar 
        WHERE nusisgrupa = 'GENERALES' 
        AND nusistippa = 'VigenciaCred'
    ) THEN
        -- Insertar parámetro con valor por defecto 10 días hábiles
        INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
        VALUES ('GENERALES', 'VigenciaCred', '10');
        
        RAISE NOTICE 'Parámetro VigenciaCred insertado con valor: 10 días hábiles';
    ELSE
        RAISE NOTICE 'El parámetro VigenciaCred ya existe';
    END IF;
END $$;

-- Verificar resultado
SELECT 
    nusisgrupa AS "Grupo",
    nusistippa AS "Tipo Parámetro",
    nusisvalpa AS "Valor (días hábiles)"
FROM nusispar
WHERE nusisgrupa = 'GENERALES' 
AND nusistippa = 'VigenciaCred';

-- ===================================================================
-- Notas:
-- ===================================================================
-- * El valor nusisvalpa puede ser modificado posteriormente:
--     UPDATE nusispar 
--     SET nusisvalpa = '15' 
--     WHERE nusisgrupa = 'GENERALES' AND nusistippa = 'VigenciaCred';
--
-- * Los días hábiles excluyen sábados y domingos
-- * Si el parámetro no existe o hay error, el backend usa fallback de 10 días
-- ===================================================================
