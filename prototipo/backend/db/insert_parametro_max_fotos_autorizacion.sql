-- Script para insertar el parámetro MaxFotosAutorizacion
-- Este parámetro controla el máximo de fotos permitidas
-- para autorizaciones CON prescripción (tipo "P")

DELETE FROM nusispar
WHERE nusisgrupa = 'FUNCIONES_APP'
  AND nusistippa = 'MaxFotosAutorizacion';

-- NUSISVALPA admite valores enteros entre 1 y 5.
-- El backend aplica clamp automático al rango válido.
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('FUNCIONES_APP', 'MaxFotosAutorizacion', '5');

SELECT
  nusisgrupa AS grupo,
  nusistippa AS tipo,
  nusisvalpa AS valor,
  CASE
    WHEN nusisvalpa IN ('1', '2', '3', '4', '5') THEN 'VÁLIDO: máximo configurable de fotos para autorizaciones con prescripción'
    ELSE 'VALOR INVÁLIDO'
  END AS descripcion
FROM nusispar
WHERE nusisgrupa = 'FUNCIONES_APP'
  AND nusistippa = 'MaxFotosAutorizacion';

-- Notas:
-- - Endpoint público: GET /parametros/funciones-app/max-fotos-autorizacion
-- - La app móvil consulta este valor al abrir la pantalla de nueva solicitud
-- - Si el parámetro falta o es inválido, el backend/mobile usan fallback 5
