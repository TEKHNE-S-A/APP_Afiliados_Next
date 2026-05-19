/**
 * SEED: Agregar parámetro para habilitar/deshabilitar Favoritos y Recientes
 * 
 * Tabla: nusispar
 * Grupo: FUNCIONES_APP
 * Tipo: HabilitarFavoritos
 * 
 * Ejecutar en la BD PostgreSQL
 */

-- Agregar parámetro para favoritos
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdesc)
VALUES (
  'FUNCIONES_APP',
  'HabilitarFavoritos',
  'S',
  'Habilita el sistema de favoritos y recientes en la cartilla de prestadores'
)
ON CONFLICT (nusisgrupa, nusistippa) DO UPDATE SET
  nusisvalpa = 'S',
  nusisdesc = 'Habilita el sistema de favoritos y recientes en la cartilla de prestadores';

-- Verificar inserción
SELECT nusisgrupa, nusistippa, nusisvalpa, nusisdesc 
FROM nusispar 
WHERE nusisgrupa = 'FUNCIONES_APP' 
  AND nusistippa IN ('HabilitarFavoritos', 'HabilitarFavoritosBuscador');

-- Mostrar todos los parámetros de FUNCIONES_APP
SELECT nusisgrupa, nusistippa, nusisvalpa 
FROM nusispar 
WHERE nusisgrupa = 'FUNCIONES_APP'
ORDER BY nusistippa;
