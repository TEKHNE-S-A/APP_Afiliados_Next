-- Plantilla de credenciales (general y por plan)
-- Permite configurar visibilidad, posición, tipografía, estilo y ojito por campo.

CREATE TABLE IF NOT EXISTS app_credencial_layout (
  id BIGSERIAL PRIMARY KEY,
  scope_type VARCHAR(10) NOT NULL CHECK (scope_type IN ('GENERAL', 'PLAN')),
  plan_id VARCHAR(30),
  config_json JSONB NOT NULL,
  updated_by VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scope_type, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_app_cred_layout_scope ON app_credencial_layout (scope_type, plan_id);
