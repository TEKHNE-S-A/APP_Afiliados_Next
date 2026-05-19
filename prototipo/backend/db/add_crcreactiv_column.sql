-- Migración: agregar columna crcreactiv a crcreden
-- Permite marcar una credencial como activa (S) o inactiva (N) desde el panel admin
-- Tarea 34 — 27/03/2026

ALTER TABLE crcreden ADD COLUMN IF NOT EXISTS crcreactiv bpchar(1) DEFAULT 'S';

-- Inicializar registros existentes como activos
UPDATE crcreden SET crcreactiv = 'S' WHERE crcreactiv IS NULL;
