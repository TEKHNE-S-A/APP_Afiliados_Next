-- Script de migración: Hacer FKs DEFERRABLE para permitir sync GAM → BD Local
-- 
-- Propósito: Las FKs de nuusuauth y crcredus hacia nuusuari deben ser DEFERRABLE
-- para permitir actualizaciones circulares durante la sincronización de usuarios GAM.
--
-- Fecha: 2026-02-18
-- Contexto: Script sync-users-from-gam.js necesita actualizar nuusuid en 3 tablas
-- simultáneamente dentro de una transacción.

BEGIN;

-- 1. Hacer DEFERRABLE la FK de nuusuauth → nuusuari
ALTER TABLE nuusuauth 
  DROP CONSTRAINT IF EXISTS nuusuauth_nuusuid_fkey;

ALTER TABLE nuusuauth 
  ADD CONSTRAINT nuusuauth_nuusuid_fkey 
  FOREIGN KEY (nuusuid) REFERENCES nuusuari(nuusuid)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT nuusuauth_nuusuid_fkey ON nuusuauth IS 
  'FK a nuusuari - DEFERRABLE para permitir sync GAM (2026-02-18)';

-- 2. Hacer DEFERRABLE la FK de crcredus → nuusuari
ALTER TABLE crcredus 
  DROP CONSTRAINT IF EXISTS crcredus_nuusuid_fkey;

ALTER TABLE crcredus 
  ADD CONSTRAINT crcredus_nuusuid_fkey 
  FOREIGN KEY (nuusuid) REFERENCES nuusuari(nuusuid)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT crcredus_nuusuid_fkey ON crcredus IS 
  'FK a nuusuari - DEFERRABLE para permitir sync GAM (2026-02-18)';

COMMIT;

-- Verificación
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  rc.update_rule,
  rc.delete_rule,
  pg_get_constraintdef(c.oid, true) as constraint_def
FROM information_schema.table_constraints tc
JOIN pg_constraint c ON c.conname = tc.constraint_name
LEFT JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('nuusuauth', 'crcredus')
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name LIKE '%nuusuid%'
ORDER BY tc.table_name;
