-- Migración para Eliminación Lógica de Usuarios (Punto 4)
-- Prepara las tablas para soft delete en lugar de borrado físico

BEGIN;

-- 1. Agregar columnas de eliminación lógica a nuusuari
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusuactiv CHAR(1) DEFAULT 'S';
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusufecde TIMESTAMP;
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusumotde TEXT;

COMMENT ON COLUMN nuusuari.nuusuactiv IS 'Usuario activo: S=Activo, N=Desactivado';
COMMENT ON COLUMN nuusuari.nuusufecde IS 'Fecha de desactivación del usuario';
COMMENT ON COLUMN nuusuari.nuusumotde IS 'Motivo de desactivación (opcional)';

-- 2. Crear índice para búsquedas de usuarios activos
CREATE INDEX IF NOT EXISTS idx_nuusuari_activo ON nuusuari(nuusuactiv) WHERE nuusuactiv = 'S';

-- 3. Actualizar vista v_usuarios_tipo para incluir estado de activación
CREATE OR REPLACE VIEW v_usuarios_tipo AS
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

COMMENT ON VIEW v_usuarios_tipo IS 'Vista para identificar tipo de autenticación y estado de usuario';

-- 4. Crear vista solo de usuarios activos (para consultas comunes)
CREATE OR REPLACE VIEW v_usuarios_activos AS
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

COMMENT ON VIEW v_usuarios_activos IS 'Vista de usuarios activos (no desactivados)';

-- 5. Función para desactivar usuario (soft delete)
CREATE OR REPLACE FUNCTION desactivar_usuario(
  p_nuusuid VARCHAR(100),
  p_motivo TEXT DEFAULT 'Usuario solicitó eliminación de cuenta'
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  usuario_id VARCHAR(100),
  email VARCHAR(100),
  fecha_desactivacion TIMESTAMP
) AS $$
DECLARE
  v_count INTEGER;
  v_email VARCHAR(100);
BEGIN
  -- Verificar si el usuario existe
  SELECT nuusumail INTO v_email
  FROM nuusuari
  WHERE nuusuari.nuusuid = p_nuusuid;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE,
      'Usuario no encontrado',
      p_nuusuid,
      NULL::VARCHAR(100),
      NULL::TIMESTAMP;
    RETURN;
  END IF;
  
  -- Verificar si ya está desactivado
  SELECT COUNT(*) INTO v_count
  FROM nuusuari
  WHERE nuusuari.nuusuid = p_nuusuid
    AND nuusuactiv = 'N';
    
  IF v_count > 0 THEN
    RETURN QUERY SELECT 
      FALSE,
      'Usuario ya está desactivado',
      p_nuusuid,
      v_email,
      (SELECT nuusufecde FROM nuusuari WHERE nuusuari.nuusuid = p_nuusuid);
    RETURN;
  END IF;
  
  -- Desactivar el usuario
  UPDATE nuusuari
  SET 
    nuusuactiv = 'N',
    nuusufecde = NOW(),
    nuusumotde = p_motivo,
    nuusugamtok = NULL  -- Invalidar token GAM
  WHERE nuusuari.nuusuid = p_nuusuid;
  
  -- Retornar resultado exitoso
  RETURN QUERY SELECT 
    TRUE,
    'Usuario desactivado exitosamente',
    p_nuusuid,
    v_email,
    NOW();
    
  RAISE NOTICE 'Usuario % desactivado: %', p_nuusuid, v_email;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION desactivar_usuario IS 'Desactiva un usuario (soft delete) - preserva datos históricos';

-- 6. Función para reactivar usuario (solo admin)
CREATE OR REPLACE FUNCTION reactivar_usuario(p_nuusuid VARCHAR(100))
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  usuario_id VARCHAR(100),
  email VARCHAR(100)
) AS $$
DECLARE
  v_email VARCHAR(100);
BEGIN
  -- Verificar si el usuario existe y está desactivado
  SELECT nuusumail INTO v_email
  FROM nuusuari
  WHERE nuusuari.nuusuid = p_nuusuid
    AND nuusuactiv = 'N';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE,
      'Usuario no encontrado o no está desactivado',
      p_nuusuid,
      NULL::VARCHAR(100);
    RETURN;
  END IF;
  
  -- Reactivar el usuario
  UPDATE nuusuari
  SET 
    nuusuactiv = 'S',
    nuusufecde = NULL,
    nuusumotde = NULL
  WHERE nuusuari.nuusuid = p_nuusuid;
  
  -- Retornar resultado exitoso
  RETURN QUERY SELECT 
    TRUE,
    'Usuario reactivado exitosamente',
    p_nuusuid,
    v_email;
    
  RAISE NOTICE 'Usuario % reactivado: %', p_nuusuid, v_email;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reactivar_usuario IS 'Reactiva un usuario desactivado (solo admin)';

-- 7. Función de estadísticas de usuarios
CREATE OR REPLACE FUNCTION estadisticas_usuarios()
RETURNS TABLE(
  total_usuarios BIGINT,
  usuarios_activos BIGINT,
  usuarios_desactivados BIGINT,
  usuarios_gam BIGINT,
  usuarios_local BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) AS total_usuarios,
    COUNT(*) FILTER (WHERE nuusuactiv = 'S') AS usuarios_activos,
    COUNT(*) FILTER (WHERE nuusuactiv = 'N') AS usuarios_desactivados,
    COUNT(*) FILTER (WHERE nuusuid !~ '^[0-9]+$') AS usuarios_gam,
    COUNT(*) FILTER (WHERE nuusuid ~ '^[0-9]+$') AS usuarios_local
  FROM nuusuari;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION estadisticas_usuarios IS 'Retorna estadísticas de usuarios por estado y tipo';

-- 8. Trigger para auditoría de desactivaciones (opcional pero recomendado)
CREATE TABLE IF NOT EXISTS auditoria_usuarios (
  audit_id SERIAL PRIMARY KEY,
  nuusuid VARCHAR(100) NOT NULL,
  accion VARCHAR(50) NOT NULL,
  fecha TIMESTAMP DEFAULT NOW(),
  motivo TEXT,
  usuario_responsable VARCHAR(100)
);

COMMENT ON TABLE auditoria_usuarios IS 'Registro de auditoría de activaciones/desactivaciones';

CREATE OR REPLACE FUNCTION audit_usuario_desactivacion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.nuusuactiv = 'S' AND NEW.nuusuactiv = 'N' THEN
    INSERT INTO auditoria_usuarios (nuusuid, accion, motivo)
    VALUES (NEW.nuusuid, 'DESACTIVACION', NEW.nuusumotde);
  ELSIF OLD.nuusuactiv = 'N' AND NEW.nuusuactiv = 'S' THEN
    INSERT INTO auditoria_usuarios (nuusuid, accion, motivo)
    VALUES (NEW.nuusuid, 'REACTIVACION', 'Usuario reactivado');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_audit_usuario ON nuusuari;
CREATE TRIGGER trig_audit_usuario
  AFTER UPDATE OF nuusuactiv ON nuusuari
  FOR EACH ROW
  EXECUTE FUNCTION audit_usuario_desactivacion();

-- 9. Registrar migración
INSERT INTO schema_migrations (version, description) 
VALUES ('20251217_logical_deletion', 'Implementación eliminación lógica usuarios - campos activo/fecha/motivo desactivación')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '✅ Migración Eliminación Lógica completada exitosamente';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Cambios aplicados:';
  RAISE NOTICE '  - Columnas agregadas: nuusuactiv, nuusufecde, nuusumotde';
  RAISE NOTICE '  - Vista v_usuarios_tipo actualizada con estado_usuario';
  RAISE NOTICE '  - Vista v_usuarios_activos creada (solo usuarios S)';
  RAISE NOTICE '  - Función desactivar_usuario() creada';
  RAISE NOTICE '  - Función reactivar_usuario() creada';
  RAISE NOTICE '  - Función estadisticas_usuarios() creada';
  RAISE NOTICE '  - Tabla auditoria_usuarios creada';
  RAISE NOTICE '  - Trigger audit_usuario_desactivacion activado';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Uso:';
  RAISE NOTICE '  SELECT * FROM desactivar_usuario(''user_id'', ''Motivo opcional'');';
  RAISE NOTICE '  SELECT * FROM reactivar_usuario(''user_id'');';
  RAISE NOTICE '  SELECT * FROM estadisticas_usuarios();';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '  - Usuarios desactivados NO pueden hacer login';
  RAISE NOTICE '  - Datos históricos se preservan';
  RAISE NOTICE '  - Backend debe validar nuusuactiv = ''S'' en login';
END $$;
