-- Migración: eliminar columnas no utilizadas de nuusuari
-- Fecha: 2026-02-13
-- Nota: se conserva nuusunivel por requerimiento funcional.

BEGIN;

ALTER TABLE IF EXISTS nuusuari
  DROP COLUMN IF EXISTS nuusubille,
  DROP COLUMN IF EXISTS nuusuidbil,
  DROP COLUMN IF EXISTS nuusumailf,
  DROP COLUMN IF EXISTS nuusui_gxi,
  DROP COLUMN IF EXISTS nuusui,
  DROP COLUMN IF EXISTS nuusuacept,
  DROP COLUMN IF EXISTS nuusuqrbil,
  DROP COLUMN IF EXISTS nuusuultno;

COMMIT;
