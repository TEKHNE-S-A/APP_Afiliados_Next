-- Script para insertar el parámetro HabilitarAutorizSinOrden
-- Este parámetro controla si la app muestra la opción de crear
-- autorizaciones SIN prescripción (tipo "S" - sin adjuntar fotos)

-- Eliminar si existe (para evitar duplicados)
DELETE FROM nusispar 
WHERE nusisgrupa = 'FUNCIONES_APP' 
  AND nusistippa = 'HabilitarAutorizSinOrden';

-- Insertar el parámetro
-- NUSISVALPA = 'S' → Habilitado (mostrar opción tipo "S")
-- NUSISVALPA = 'N' → Deshabilitado (solo tipo "P" con fotos)
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('FUNCIONES_APP', 'HabilitarAutorizSinOrden', 'S');

-- Verificar inserción
SELECT 
  nusisgrupa AS grupo, 
  nusistippa AS tipo, 
  nusisvalpa AS valor,
  CASE 
    WHEN nusisvalpa = 'S' THEN 'HABILITADO: App mostrará opción de autorizaciones SIN prescripción'
    WHEN nusisvalpa = 'N' THEN 'DESHABILITADO: App solo permite autorizaciones CON prescripción (fotos)'
    ELSE 'VALOR INVÁLIDO'
  END AS descripcion
FROM nusispar
WHERE nusisgrupa = 'FUNCIONES_APP' 
  AND nusistippa = 'HabilitarAutorizSinOrden';

-- Notas:
-- - Este parámetro se lee desde el endpoint GET /parametros/funciones-app/habilitar-autoriz-sin-orden
-- - La app móvil lo consulta al cargar la pantalla de nueva solicitud
-- - Usar 'S' en producción si se requiere autorizaciones sin prescripción
-- - Usar 'N' en ambientes de prueba o si aún no se implementó el flujo completo
