-- Migración: Agregar campo `version` a tablas principales
-- Propósito: Soporte para optimistic locking (control de concurrencia optimista)
-- Tablas: nuusuari, crcreden, ausolici, nusispar, nuplan
-- Aplicar: node backend/db/apply-version-column.js
-- Fecha: 05/05/2026

ALTER TABLE nuusuari
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE crcreden
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE ausolici
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE nusispar
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE nuplan
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Comentarios descriptivos
COMMENT ON COLUMN nuusuari.version IS 'Optimistic locking: incrementar en cada UPDATE. Verificar al actualizar para evitar writes concurrentes.';
COMMENT ON COLUMN crcreden.version IS 'Optimistic locking: incrementar en cada UPDATE.';
COMMENT ON COLUMN ausolici.version IS 'Optimistic locking: incrementar en cada UPDATE.';
COMMENT ON COLUMN nusispar.version IS 'Optimistic locking: incrementar en cada UPDATE.';
COMMENT ON COLUMN nuplan.version IS 'Optimistic locking: incrementar en cada UPDATE.';
