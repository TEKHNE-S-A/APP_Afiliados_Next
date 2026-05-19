-- ============================================================================
-- Instalación de Funciones PostgreSQL para Token Temporal
-- ============================================================================
-- Ejecutar este script UNA SOLA VEZ en la base de datos
-- Base de datos: app_afiliados_genexus
-- Requiere: Extensión pgcrypto (para digest SHA256)
-- ============================================================================

-- Verificar/instalar extensión pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- FUNCIÓN 1: Generar Token Temporal
-- ============================================================================
CREATE OR REPLACE FUNCTION generar_token_temporal(
    p_afiliado_id VARCHAR(30),
    p_timeout_minutos INTEGER DEFAULT 10,
    p_timestamp TIMESTAMP DEFAULT NOW()
) RETURNS VARCHAR(3) AS $$
DECLARE
    v_bucket_ms BIGINT;
    v_epoch_ms BIGINT;
    v_bucket BIGINT;
    v_payload TEXT;
    v_hash BYTEA;
    v_int_val BIGINT;
    v_token_num INTEGER;
BEGIN
    -- 1. Calcular bucket
    v_bucket_ms := p_timeout_minutos * 60 * 1000;
    v_epoch_ms := EXTRACT(EPOCH FROM p_timestamp) * 1000;
    v_bucket := FLOOR(v_epoch_ms / v_bucket_ms);
    
    -- 2. Construir payload
    v_payload := p_afiliado_id || ':' || v_bucket::TEXT;
    
    -- 3. Hash SHA256
    v_hash := digest(v_payload, 'sha256');
    
    -- 4. Primeros 4 bytes a int (big-endian)
    v_int_val := (get_byte(v_hash, 0)::BIGINT << 24) |
                 (get_byte(v_hash, 1)::BIGINT << 16) |
                 (get_byte(v_hash, 2)::BIGINT << 8) |
                 get_byte(v_hash, 3)::BIGINT;
    
    -- 5. Módulo 1000
    v_token_num := v_int_val % 1000;
    
    -- 6. Padding a 3 dígitos
    RETURN LPAD(v_token_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generar_token_temporal IS 'Genera token temporal de 3 dígitos basado en SHA256(afiliadoId:bucket)';

-- ============================================================================
-- FUNCIÓN 2: Validar Token Temporal
-- ============================================================================
CREATE OR REPLACE FUNCTION validar_token_temporal(
    p_afiliado_id VARCHAR(30),
    p_token VARCHAR(3),
    p_timeout_minutos INTEGER DEFAULT 10,
    p_tolerancia_buckets INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
    v_bucket_ms BIGINT;
    v_now TIMESTAMP;
    v_delta INTEGER;
    v_test_time TIMESTAMP;
    v_test_token VARCHAR(3);
BEGIN
    v_now := NOW();
    v_bucket_ms := p_timeout_minutos * 60 * 1000;
    
    -- Probar bucket actual y buckets adyacentes (±1 para compensar clock drift)
    FOR v_delta IN -p_tolerancia_buckets..p_tolerancia_buckets LOOP
        v_test_time := v_now + (v_delta * p_timeout_minutos || ' minutes')::INTERVAL;
        v_test_token := generar_token_temporal(p_afiliado_id, p_timeout_minutos, v_test_time);
        
        IF v_test_token = p_token THEN
            RETURN TRUE;
        END IF;
    END LOOP;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validar_token_temporal IS 'Valida token temporal con tolerancia de ±1 bucket para compensar diferencias de reloj';

-- ============================================================================
-- TESTS DE VERIFICACIÓN
-- ============================================================================
DO $$
DECLARE
    v_test_afiliado VARCHAR(30) := '000082018000000000001000082018';
    v_token_generado VARCHAR(3);
    v_validacion BOOLEAN;
    v_error_msg TEXT := '';
BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'TESTS DE VERIFICACIÓN - Funciones Token Temporal';
    RAISE NOTICE '================================================================';
    
    -- TEST 1: Generar token
    BEGIN
        v_token_generado := generar_token_temporal(v_test_afiliado, 10);
        RAISE NOTICE '✅ TEST 1 PASSED: Token generado = "%"', v_token_generado;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION '❌ TEST 1 FAILED: Error generando token - %', SQLERRM;
    END;
    
    -- TEST 2: Validar que el token generado es válido
    BEGIN
        v_validacion := validar_token_temporal(v_test_afiliado, v_token_generado, 10, 1);
        IF v_validacion THEN
            RAISE NOTICE '✅ TEST 2 PASSED: Token % es válido', v_token_generado;
        ELSE
            RAISE EXCEPTION '❌ TEST 2 FAILED: Token generado no valida como correcto';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION '❌ TEST 2 FAILED: Error validando token - %', SQLERRM;
    END;
    
    -- TEST 3: Validar que un token incorrecto es rechazado
    BEGIN
        v_validacion := validar_token_temporal(v_test_afiliado, '999', 10, 1);
        IF NOT v_validacion THEN
            RAISE NOTICE '✅ TEST 3 PASSED: Token incorrecto "999" correctamente rechazado';
        ELSE
            RAISE NOTICE '⚠️  TEST 3 WARNING: Token "999" fue aceptado (puede ser válido por casualidad)';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION '❌ TEST 3 FAILED: Error validando token incorrecto - %', SQLERRM;
    END;
    
    -- TEST 4: Verificar formato del token (3 dígitos con padding)
    BEGIN
        IF LENGTH(v_token_generado) = 3 AND v_token_generado ~ '^[0-9]{3}$' THEN
            RAISE NOTICE '✅ TEST 4 PASSED: Formato correcto (3 dígitos)';
        ELSE
            RAISE EXCEPTION '❌ TEST 4 FAILED: Formato incorrecto - longitud % valor "%"', 
                LENGTH(v_token_generado), v_token_generado;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION '❌ TEST 4 FAILED: Error verificando formato - %', SQLERRM;
    END;
    
    RAISE NOTICE '================================================================';
    RAISE NOTICE '✅ TODOS LOS TESTS COMPLETADOS EXITOSAMENTE';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Funciones instaladas y verificadas:';
    RAISE NOTICE '  - generar_token_temporal(afiliado_id, timeout, timestamp)';
    RAISE NOTICE '  - validar_token_temporal(afiliado_id, token, timeout, tolerancia)';
    RAISE NOTICE '';
    RAISE NOTICE 'Ejemplo de uso desde GeneXus:';
    RAISE NOTICE '  SELECT validar_token_temporal(:afiliadoId, :token, 10, 1)';
    RAISE NOTICE '================================================================';
END $$;

-- ============================================================================
-- EJEMPLOS DE USO
-- ============================================================================

-- Ejemplo 1: Generar token actual
-- SELECT generar_token_temporal('000082018000000000001000082018', 10);

-- Ejemplo 2: Validar token
-- SELECT validar_token_temporal('000082018000000000001000082018', '972', 10, 1);

-- Ejemplo 3: Ver información del bucket actual
-- SELECT 
--     FLOOR((EXTRACT(EPOCH FROM NOW()) * 1000) / (10 * 60 * 1000)) as bucket_actual,
--     generar_token_temporal('000082018000000000001000082018', 10) as token_actual;
