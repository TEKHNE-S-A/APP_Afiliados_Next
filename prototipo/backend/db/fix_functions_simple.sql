-- Fix FINAL: Funciones simplificadas que retornan solo lo esencial
-- 11/02/2026 - Estructura simplificada para evitar errores de tipo

-- 1. Eliminar TODAS las versiones anteriores
DROP FUNCTION IF EXISTS desactivar_usuario(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS desactivar_usuario(TEXT) CASCADE;
DROP FUNCTION IF EXISTS reactivar_usuario(TEXT) CASCADE;

-- 2. Función desactivar_usuario SIMPLIFICADA
CREATE OR REPLACE FUNCTION desactivar_usuario(p_nuusuid TEXT, p_motivo TEXT DEFAULT 'Desactivado por administrador')
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_activ VARCHAR(1);
  v_count INT;
BEGIN
  -- Validar que existe el usuario
  SELECT COUNT(*) INTO v_count FROM nuusuari WHERE nuusuid = p_nuusuid;
  
  IF v_count = 0 THEN
    RETURN QUERY SELECT FALSE, 'Usuario no encontrado'::TEXT;
    RETURN;
  END IF;
  
  -- Verificar estado actual
  SELECT nuusuactiv INTO v_activ FROM nuusuari WHERE nuusuid = p_nuusuid;
  
  IF v_activ = 'N' THEN
    RETURN QUERY SELECT FALSE, 'Usuario ya está desactivado'::TEXT;
    RETURN;
  END IF;
  
  -- Desactivar usuario
  UPDATE nuusuari SET
    nuusuactiv = 'N',
    nuusufecde = NOW(),
    nuusumotde = p_motivo
  WHERE nuusuid = p_nuusuid;
  
  RETURN QUERY SELECT TRUE, 'Usuario desactivado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 3. Función reactivar_usuario SIMPLIFICADA
CREATE OR REPLACE FUNCTION reactivar_usuario(p_nuusuid TEXT)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_activ VARCHAR(1);
  v_count INT;
BEGIN
  -- Validar que existe el usuario
  SELECT COUNT(*) INTO v_count FROM nuusuari WHERE nuusuid = p_nuusuid;
  
  IF v_count = 0 THEN
    RETURN QUERY SELECT FALSE, 'Usuario no encontrado'::TEXT;
    RETURN;
  END IF;
  
  -- Verificar estado actual
  SELECT nuusuactiv INTO v_activ FROM nuusuari WHERE nuusuid = p_nuusuid;
  
  IF v_activ = 'S' THEN
    RETURN QUERY SELECT FALSE, 'Usuario ya está activo'::TEXT;
    RETURN;
  END IF;
  
  -- Reactivar usuario
  UPDATE nuusuari SET
    nuusuactiv = 'S',
    nuusufecde = NULL,
    nuusumotde = NULL
  WHERE nuusuid = p_nuusuid;
  
  RETURN QUERY SELECT TRUE, 'Usuario reactivado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 4. Verificar funciones creadas
SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('desactivar_usuario', 'reactivar_usuario')
ORDER BY p.proname, p.oid;
