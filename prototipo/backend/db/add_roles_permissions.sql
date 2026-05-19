-- ============================================================================
-- Migración: Sistema de Roles y Permisos para Administradores Backend
-- Fecha: 2026-05-05
-- ============================================================================

-- 1. Crear tabla de roles
CREATE TABLE IF NOT EXISTS nurolper (
  nurolid      SERIAL PRIMARY KEY,
  nurolnombre  VARCHAR(100) NOT NULL UNIQUE,
  nurolpermisos TEXT NOT NULL DEFAULT '[]',
  nurolactivo  CHAR(1) NOT NULL DEFAULT 'S',
  nurolcrea    TIMESTAMP NOT NULL DEFAULT NOW(),
  nurolultm    TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE nurolper IS 'Roles de administrador backend con permisos granulares por módulo';
COMMENT ON COLUMN nurolper.nurolpermisos IS 'JSON array de módulos permitidos: parametros, usuarios, credenciales, sia, reportes, salud';

-- 2. Agregar columna nurolid en nuusuari (nullable = retrocompatible; NULL = acceso total)
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nurolid INTEGER REFERENCES nurolper(nurolid);

COMMENT ON COLUMN nuusuari.nurolid IS 'Rol asignado al usuario admin. NULL = acceso total (sin restricciones)';

-- 3. Roles por defecto
INSERT INTO nurolper (nurolnombre, nurolpermisos, nurolactivo) VALUES
  ('super_admin',   '["parametros","usuarios","credenciales","sia","reportes","salud"]', 'S'),
  ('operador_sia',  '["sia","credenciales"]', 'S'),
  ('visor',         '["credenciales","reportes"]', 'S')
ON CONFLICT (nurolnombre) DO NOTHING;
