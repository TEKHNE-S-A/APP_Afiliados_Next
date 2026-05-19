-- Roles y permisos para admin backend (idempotente)

CREATE TABLE IF NOT EXISTS nurolper (
  nurolid SERIAL PRIMARY KEY,
  nurolnombre VARCHAR(100) NOT NULL UNIQUE,
  nurolpermisos TEXT NOT NULL,
  nurolactivo CHAR(1) NOT NULL DEFAULT 'S',
  nurolcrea TIMESTAMP NOT NULL DEFAULT NOW(),
  nurolultm TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE nuusuari
  ADD COLUMN IF NOT EXISTS nurolid INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_nuusuari_nurolper'
  ) THEN
    ALTER TABLE nuusuari
      ADD CONSTRAINT fk_nuusuari_nurolper
      FOREIGN KEY (nurolid)
      REFERENCES nurolper(nurolid)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION;
  END IF;
END $$;

INSERT INTO nurolper (nurolnombre, nurolpermisos, nurolactivo)
VALUES
  ('super_admin', '["parametros","usuarios","credenciales","sia","reportes","salud"]', 'S'),
  ('operador_sia', '["sia","credenciales"]', 'S'),
  ('visor', '["credenciales","reportes"]', 'S')
ON CONFLICT (nurolnombre)
DO UPDATE SET
  nurolpermisos = EXCLUDED.nurolpermisos,
  nurolactivo = 'S',
  nurolultm = NOW();
