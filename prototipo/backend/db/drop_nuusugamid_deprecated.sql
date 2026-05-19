-- Eliminación de columna deprecada nuusugamid
-- Contexto: nuusuid ya almacena el UserID de GAM (string) y se usa como identificador único.

BEGIN;

DROP VIEW IF EXISTS v_usuarios_activos CASCADE;
DROP VIEW IF EXISTS v_usuarios_tipo CASCADE;

CREATE VIEW v_usuarios_tipo AS
SELECT
  nuusuid,
  nuusumail,
  nuusunroaf,
  nuusuapell,
  nuusuactiv,
  nuusufecde,
  nuusumotde,
  CASE
    WHEN nuusuid !~ '^[0-9]+$' THEN 'GAM'
    WHEN nuusuid ~ '^[0-9]+$' THEN 'LOCAL'
    ELSE 'DESCONOCIDO'
  END AS tipo_autenticacion,
  nuusugamexp,
  CASE
    WHEN nuusugamexp IS NOT NULL AND nuusugamexp > NOW() THEN 'VÁLIDO'
    WHEN nuusugamexp IS NOT NULL AND nuusugamexp <= NOW() THEN 'EXPIRADO'
    ELSE NULL
  END AS estado_token_gam,
  CASE
    WHEN nuusuactiv = 'S' THEN 'ACTIVO'
    WHEN nuusuactiv = 'N' THEN 'DESACTIVADO'
    ELSE 'DESCONOCIDO'
  END AS estado_usuario
FROM nuusuari;

CREATE VIEW v_usuarios_activos AS
SELECT
  nuusuid,
  nuusumail,
  nuusunroaf,
  nuusuapell,
  nuusutelef,
  nuusuafili,
  nuusugamexp
FROM nuusuari
WHERE nuusuactiv = 'S';

DROP INDEX IF EXISTS idx_nuusuari_gamid;

ALTER TABLE nuusuari
  DROP COLUMN IF EXISTS nuusugamid;

COMMENT ON TABLE nuusuari IS 'nuusuid almacena identificador único (local numérico o GAM string).';

COMMIT;
