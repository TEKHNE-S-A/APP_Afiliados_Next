-- Script para recrear función desactivar_usuario() (FIX)
-- Problema: Función actual está fallando "Usuario ya está desactivado" incorrectamente

-- IMPORTANTE: Este script DEBE ejecutarse en PostgreSQL
-- Comando: psql -h localhost -U postgres -d app_afiliados_genexus -f recreate-desactivar-function.sql

-- 1. DROP función existente
DROP FUNCTION IF EXISTS desactivar_usuario(VARCHAR, TEXT);

-- 2. Recrear función CORREGIDA
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
  v_activ CHAR(1);
BEGIN
  -- Verificar si el usuario existe
  SELECT nuusumail, nuusuactiv INTO v_email, v_activ
  FROM nuusuari
  WHERE nuusuid = p_nuusuid;
  
  RAISE NOTICE 'DEBUG: Usuario % - Email: %, nuusuactiv: [%]', p_nuusuid, v_email, v_activ;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'DEBUG: Usuario NO encontrado';
    RETURN QUERY SELECT 
      FALSE,
      'Usuario no encontrado',
      p_nuusuid,
      NULL::VARCHAR(100),
      NULL::TIMESTAMP;
    RETURN;
  END IF;
  
  -- Verificar si ya está desactivado
  IF v_activ = 'N' THEN
    RAISE NOTICE 'DEBUG: Usuario YA desactivado (nuusuactiv = N)';
    RETURN QUERY SELECT 
      FALSE,
      'Usuario ya está desactivado',
      p_nuusuid,
      v_email,
      (SELECT nuusufecde FROM nuusuari WHERE nuusuid = p_nuusuid);
    RETURN;
  END IF;
  
  RAISE NOTICE 'DEBUG: Usuario ACTIVO (nuusuactiv = %), procediendo a desactivar...', v_activ;
  
  -- Desactivar el usuario
  UPDATE nuusuari
  SET 
    nuusuactiv = 'N',
    nuusufecde = NOW(),
    nuusumotde = p_motivo,
    nuusugamtok = NULL
  WHERE nuusuid = p_nuusuid;
  
  RAISE NOTICE 'DEBUG: Usuario desactivado exitosamente';
  
  -- Retornar resultado exitoso
  RETURN QUERY SELECT 
    TRUE,
    'Usuario desactivado exitosamente',
    p_nuusuid,
    v_email,
    NOW();
    
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION desactivar_usuario IS 'Desactiva un usuario (soft delete) - v2 FIXED - compara v_activ directamente';

-- Test de la función
DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST FUNCION RECREADA ===';
  RAISE NOTICE '';
  
  -- Test con usuario activo
  SELECT * INTO test_result 
  FROM desactivar_usuario('0000000000000000000000000000000000000023', 'Test recreacion funcion');
  
  RAISE NOTICE 'Resultado: success=%, message=%', test_result.success, test_result.message;
  RAISE NOTICE '';
  RAISE NOTICE '=== FIN TEST ===';
END $$;
