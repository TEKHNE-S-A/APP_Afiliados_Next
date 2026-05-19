-- Agregar columna crcreparen (parentesco) a tabla crcreden
-- Esta columna almacena el tipo de parentesco del miembro del grupo familiar
-- Ejemplos: "Titular", "Cónyuge", "Hijo/a", "Familiar directo", etc.

-- Agregar columna si no existe
ALTER TABLE public.crcreden 
ADD COLUMN IF NOT EXISTS crcreparen VARCHAR(50);

-- Actualizar valores existentes donde sea NULL
-- Los titulares (crcrepropi = 'S' en crcredus) se marcan como 'Titular'
UPDATE public.crcreden c
SET crcreparen = 'Titular'
WHERE crcreparen IS NULL
  AND EXISTS (
    SELECT 1 FROM public.crcredus cu
    WHERE cu.crcreid = c.crcreid
      AND cu.crcrepropi = 'S'
  );

-- Los miembros del grupo (crcrepropi = 'N') se marcan como 'Familiar'
UPDATE public.crcreden c
SET crcreparen = 'Familiar'
WHERE crcreparen IS NULL
  AND EXISTS (
    SELECT 1 FROM public.crcredus cu
    WHERE cu.crcreid = c.crcreid
      AND cu.crcrepropi = 'N'
  );

-- Verificar resultados
SELECT 
  crcreparen,
  COUNT(*) as cantidad
FROM public.crcreden
GROUP BY crcreparen
ORDER BY cantidad DESC;
