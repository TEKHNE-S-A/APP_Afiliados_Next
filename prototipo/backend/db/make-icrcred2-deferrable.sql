-- Script de migración: Hacer DEFERRABLE la FK icrcred2 (duplicada)
-- 
-- Propósito: La tabla crcredus tiene DOS FKs a nuusuari.nuusuid
-- Ambas deben ser DEFERRABLE para permitir sync GAM
--
-- Fecha: 2026-02-18

BEGIN;

-- Hacer DEFERRABLE la FK icrcred2 de crcredus → nuusuari
ALTER TABLE crcredus 
  DROP CONSTRAINT IF EXISTS icrcred2;

ALTER TABLE crcredus 
  ADD CONSTRAINT icrcred2 
  FOREIGN KEY (nuusuid) REFERENCES nuusuari(nuusuid)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT icrcred2 ON crcredus IS 
  'FK duplicada a nuusuari - DEFERRABLE para sync GAM (2026-02-18)';

-- También hacer DEFERRABLE icrcred1 por si acaso
ALTER TABLE crcredus 
  DROP CONSTRAINT IF EXISTS icrcred1;

ALTER TABLE crcredus 
  ADD CONSTRAINT icrcred1 
  FOREIGN KEY (crcreid) REFERENCES crcreden(crcreid)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT icrcred1 ON crcredus IS 
  'FK a crcreden - DEFERRABLE para sync GAM (2026-02-18)';

COMMIT;

-- Verificación
SELECT 
  tc.constraint_name,
  pg_get_constraintdef(c.oid, true) as constraint_def
FROM information_schema.table_constraints tc
JOIN pg_constraint c ON c.conname = tc.constraint_name
WHERE tc.table_name = 'crcredus'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;
