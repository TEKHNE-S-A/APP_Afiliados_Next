-- Script para blanquear (limpiar) TODAS las tablas de cartilla
-- Ejecutar con precaución: ELIMINA TODOS LOS DATOS de cartilla
-- Fecha: 28/01/2026
-- 
-- Estructura completa de cartilla (9 tablas):
-- 1. nupais - países
-- 2. nuprovin - provincias
-- 3. nulocali - localidades
-- 4. cacartil - cartilla (relaciones)
-- 5. caendire - direcciones (tabla principal con GEO)
-- 6. caentele - teléfonos
-- 7. caentida - entidades
-- 8. caespeci - especialidades
-- 9. carubro - rubros

-- Eliminar datos en orden respetando foreign keys
-- Primero tablas dependientes, luego maestras
TRUNCATE TABLE caentele CASCADE;
TRUNCATE TABLE caendire CASCADE;
TRUNCATE TABLE cacartil CASCADE;
TRUNCATE TABLE caentida CASCADE;

-- Tablas maestras/catálogos
-- Se limpian porque vienen en el archivo de importación
TRUNCATE TABLE caespeci CASCADE;
TRUNCATE TABLE carubro CASCADE;
TRUNCATE TABLE nulocali CASCADE;
TRUNCATE TABLE nuprovin CASCADE;
TRUNCATE TABLE nupais CASCADE;

-- Verificar resultado
DO $$
DECLARE
  count_caentele INTEGER;
  count_caendire INTEGER;
  count_cacartil INTEGER;
  count_caentida INTEGER;
  count_caespeci INTEGER;
  count_carubro INTEGER;
  count_nulocali INTEGER;
  count_nuprovin INTEGER;
  count_nupais INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_caentele FROM caentele;
  SELECT COUNT(*) INTO count_caendire FROM caendire;
  SELECT COUNT(*) INTO count_cacartil FROM cacartil;
  SELECT COUNT(*) INTO count_caentida FROM caentida;
  SELECT COUNT(*) INTO count_caespeci FROM caespeci;
  SELECT COUNT(*) INTO count_carubro FROM carubro;
  SELECT COUNT(*) INTO count_nulocali FROM nulocali;
  SELECT COUNT(*) INTO count_nuprovin FROM nuprovin;
  SELECT COUNT(*) INTO count_nupais FROM nupais;
  
  RAISE NOTICE '=== Resultado de limpieza de tablas ===';
  RAISE NOTICE 'Tablas de datos:';
  RAISE NOTICE '  caentele (teléfonos): %', count_caentele;
  RAISE NOTICE '  caendire (direcciones): %', count_caendire;
  RAISE NOTICE '  cacartil (cartilla): %', count_cacartil;
  RAISE NOTICE '  caentida (entidades): %', count_caentida;
  RAISE NOTICE '';
  RAISE NOTICE 'Tablas de catálogos:';
  RAISE NOTICE '  caespeci (especialidades): %', count_caespeci;
  RAISE NOTICE '  carubro (rubros): %', count_carubro;
  RAISE NOTICE '  nulocali (localidades): %', count_nulocali;
  RAISE NOTICE '  nuprovin (provincias): %', count_nuprovin;
  RAISE NOTICE '  nupais (países): %', count_nupais;
  
  IF count_caentele = 0 AND count_caendire = 0 AND count_cacartil = 0 AND count_caentida = 0 
     AND count_caespeci = 0 AND count_carubro = 0 AND count_nulocali = 0 AND count_nuprovin = 0 AND count_nupais = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'OK - TODAS las tablas de cartilla blanqueadas exitosamente';
  ELSE
    RAISE WARNING 'ADVERTENCIA - Aun quedan registros en las tablas';
  END IF;
END $$;
