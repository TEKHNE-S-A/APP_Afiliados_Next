-- ============================================================================
-- Rollback: Sistema de Roles y Permisos
-- Ejecutar solo si se necesita revertir add_roles_permissions.sql
-- ============================================================================

-- 1. Quitar referencia en nuusuari
ALTER TABLE nuusuari DROP COLUMN IF EXISTS nurolid;

-- 2. Eliminar tabla de roles
DROP TABLE IF EXISTS nurolper;
