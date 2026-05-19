-- Rollback limpio de roles/permisos backend

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_nuusuari_nurolper'
  ) THEN
    ALTER TABLE nuusuari DROP CONSTRAINT fk_nuusuari_nurolper;
  END IF;
END $$;

ALTER TABLE nuusuari
  DROP COLUMN IF EXISTS nurolid;

DROP TABLE IF EXISTS nurolper;
