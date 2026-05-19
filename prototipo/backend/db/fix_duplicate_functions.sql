-- Fix: Eliminar funciones duplicadas y recrear correctamente
-- 10/02/2026 - Fix para error "la función reactivar_usuario(unknown) no es única"

-- 1. Eliminar TODAS las versiones de ambas funciones
DROP FUNCTION IF EXISTS desactivar_usuario(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS desactivar_usuario(TEXT) CASCADE;
DROP FUNCTION IF EXISTS desactivar_usuario() CASCADE;

DROP FUNCTION IF EXISTS reactivar_usuario(TEXT) CASCADE;
DROP FUNCTION IF EXISTS reactivar_usuario() CASCADE;
DROP FUNCTION IF EXISTS reactivar_usuario(TEXT, TEXT) CASCADE;

-- 2. Recrear función desactivar_usuario (2 parámetros: nuusuid, motivo)
CREATE OR REPLACE FUNCTION desactivar_usuario(p_nuusuid TEXT, p_motivo TEXT DEFAULT 'Desactivado por administrador')
RETURNS TABLE(
  r_success BOOLEAN,
  r_message TEXT,
  r_nuusuid TEXT,
  r_nuusumail TEXT,
  r_nuusuapell TEXT,
  r_nuusuactiv VARCHAR(1),
  r_nuusufecde TIMESTAMP,
  r_nuusumotde TEXT
) AS $$
DECLARE
  v_activ VARCHAR(1);
  v_count INT;
BEGIN
  -- Validar que existe el usuario
  SELECT COUNT(*) INTO v_count
  FROM nuusuari
  WHERE nuusuari.nuusuid = p_nuusuid;
  
  IF v_count = 0 THEN
    RETURN QUERY SELECT 
      FALSE,
      'Usuario no encontrado'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::VARCHAR(1),
      NULL::TIMESTAMP,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Verificar estado actual
  SELECT nuusuari.nuusuactiv INTO v_activ
  FROM nuusuari
  WHERE nuusuari.nuusuid = p_nuusuid;
  
  -- Comparación directa con valor esperado
  IF v_activ = 'N' THEN
    RETURN QUERY SELECT 
      FALSE,
      'Usuario ya está desactivado'::TEXT,
      p_nuusuid,
      NULL::TEXT,
      NULL::TEXT,
      v_activ,
      NULL::TIMESTAMP,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Desactivar usuario
  UPDATE nuusuari SET
    nuusuactiv = 'N',
    nuusufecde = NOW(),
    nuusumotde = p_motivo
  WHERE nuusuari.nuusuid = p_nuusuid;
  
  -- Retornar resultado
  RETURN QUERY 
  SELECT 
    TRUE,
    'Usuario desactivado exitosamente'::TEXT,
    n.nuusuid,
    n.nuusumail,
    n.nuusuapell,
    n.nuusuactiv,
    n.nuusufecde,
    n.nuusumotde
  FROM nuusuari n
  WHERE n.nuusuid = p_nuusuid;
END;
$$ LANGUAGE plpgsql;

-- 3. Recrear función reactivar_usuario (1 parámetro: nuusuid)
CREATE OR REPLACE FUNCTION reactivar_usuario(p_nuusuid TEXT)
RETURNS TABLE(
  r_success BOOLEAN,
  r_message TEXT,
  r_nuusuid TEXT,
  r_nuusumail TEXT,
  r_nuusuapell TEXT,
  r_nuusuactiv VARCHAR(1),
  r_nuusufecha TIMESTAMP,
  r_nuusumotde TEXT
) AS $$
DECLARE
  v_activ VARCHAR(1);
  v_count INT;
BEGIN
  -- Validar que existe el usuario
  SELECT COUNT(*) INTO v_count
  FROM nuusuari
  WHERE nuusuari.nuusuid = p_nuusuid;
  
  IF v_count = 0 THEN
    RETURN QUERY SELECT 
      FALSE,
      'Usuario no encontrado'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::VARCHAR(1),
      NULL::TIMESTAMP,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Verificar estado actual
  SELECT nuusuari.nuusuactiv INTO v_activ
  FROM nuusuari
  WHERE nuusuari.nuusuid = p_nuusuid;
  
  -- Comparación directa con valor esperado 'S'
  IF v_activ = 'S' THEN
    RETURN QUERY SELECT 
      FALSE,
      'Usuario ya está activo'::TEXT,
      p_nuusuid,
      NULL::TEXT,
      NULL::TEXT,
      v_activ,
      NULL::TIMESTAMP,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Reactivar usuario
  UPDATE nuusuari SET
    nuusuactiv = 'S',
    nuusufecde = NULL,
    nuusumotde = NULL
  WHERE nuusuari.nuusuid = p_nuusuid;
  
  -- Retornar resultado
  RETURN QUERY 
  SELECT 
    TRUE,
    'Usuario reactivado exitosamente'::TEXT,
    n.nuusuid,
    n.nuusumail,
    n.nuusuapell,
    n.nuusuactiv,
    n.nuusufecha,
    n.nuusumotde
  FROM nuusuari n
  WHERE n.nuusuid = p_nuusuid;
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

COMMIT;
