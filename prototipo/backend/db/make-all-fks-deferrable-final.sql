-- Script final: Hacer DEFERRABLE TODAS las FKs restantes a nuusuari.nuusuid
-- 
-- Propósito: Completar la migración para permitir sync GAM → BD Local
-- Afecta: notifications, push_tokens
--
-- Fecha: 2026-02-18

BEGIN;

-- 1. notifications.fk_notif_usuario
ALTER TABLE notifications 
  DROP CONSTRAINT IF EXISTS fk_notif_usuario;

ALTER TABLE notifications 
  ADD CONSTRAINT fk_notif_usuario
  FOREIGN KEY (nuusuid) REFERENCES nuusuari(nuusuid)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT fk_notif_usuario ON notifications IS 
  'FK a nuusuari - DEFERRABLE para sync GAM (2026-02-18)';

-- 2. push_tokens.fk_push_tokens_nuusuid
ALTER TABLE push_tokens 
  DROP CONSTRAINT IF EXISTS fk_push_tokens_nuusuid;

ALTER TABLE push_tokens 
  ADD CONSTRAINT fk_push_tokens_nuusuid
  FOREIGN KEY (nuusuid) REFERENCES nuusuari(nuusuid)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT fk_push_tokens_nuusuid ON push_tokens IS 
  'FK a nuusuari - DEFERRABLE para sync GAM (2026-02-18)';

COMMIT;

-- Verificación final
SELECT 
  tc.table_name,
  tc.constraint_name,
  CASE 
    WHEN pg_get_constraintdef(c.oid, true) LIKE '%DEFERRABLE%' THEN '✅ DEFERRABLE'
    ELSE '❌ NO DEFERRABLE'
  END as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN pg_constraint c ON c.conname = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'nuusuari'
  AND ccu.column_name = 'nuusuid'
ORDER BY tc.table_name, tc.constraint_name;
