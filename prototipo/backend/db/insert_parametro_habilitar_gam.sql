-- Script para insertar el parámetro HabilitarGAM
-- Este parámetro controla si el backend utiliza integración GAM
-- para registración/login, o si opera en modo local (legacy)

-- Eliminar si existe (para evitar duplicados)
DELETE FROM nusispar
WHERE nusisgrupa = 'SEGURIDAD_APP'
  AND nusistippa = 'HabilitarGAM';

-- Insertar el parámetro
-- NUSISVALPA = 'S' -> Habilitado (usar GAM)
-- NUSISVALPA = 'N' -> Deshabilitado (usar autenticación local)
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('SEGURIDAD_APP', 'HabilitarGAM', 'S');

-- Verificar inserción
SELECT
  nusisgrupa AS grupo,
  nusistippa AS tipo,
  nusisvalpa AS valor,
  CASE
    WHEN nusisvalpa = 'S' THEN 'HABILITADO: Registro/Login con GAM'
    WHEN nusisvalpa = 'N' THEN 'DESHABILITADO: Registro/Login local (legacy)'
    ELSE 'VALOR INVALIDO'
  END AS descripcion
FROM nusispar
WHERE nusisgrupa = 'SEGURIDAD_APP'
  AND nusistippa = 'HabilitarGAM';

-- Notas:
-- - Este parametro sera leido por gamService.isGAMEnabled()
-- - Cambiar a 'N' permite cortar dependencia con GAM sin redeploy
-- - Valor por defecto recomendado: 'S' para mantener compatibilidad actual
