-- Migration: add app_functional_events table
-- Idempotente: usa IF NOT EXISTS para no romper instancias que ya tienen la tabla (legado del prototipo)

CREATE TABLE IF NOT EXISTS app_functional_events (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_name  VARCHAR(80)  NOT NULL,
  module      VARCHAR(50)  NOT NULL,
  screen      VARCHAR(80)  NOT NULL,
  method      VARCHAR(10)  NOT NULL,
  path        VARCHAR(255) NOT NULL,
  status_code INTEGER      NOT NULL,
  nuusuid     VARCHAR(100),
  actor       VARCHAR(120),
  platform    VARCHAR(40),
  app_version VARCHAR(40),
  metadata    JSONB
);

CREATE INDEX IF NOT EXISTS idx_app_functional_events_created_at
  ON app_functional_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_functional_events_event_name
  ON app_functional_events (event_name);

CREATE INDEX IF NOT EXISTS idx_app_functional_events_module
  ON app_functional_events (module);
