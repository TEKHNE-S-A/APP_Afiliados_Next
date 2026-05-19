-- Migración para Integración GAM
-- Prepara la tabla nuusuari para recibir UserID de GAM como nuusuid

BEGIN;

-- 1. Cambiar tipo de nuusuid a VARCHAR para soportar UserID de GAM (strings)
--    NOTA: Los registros existentes con nuusuid numérico se preservarán automáticamente
ALTER TABLE nuusuari ALTER COLUMN nuusuid TYPE VARCHAR(100);

COMMENT ON COLUMN nuusuari.nuusuid IS 'ID de usuario - numérico (legacy) o UserID de GAM (string)';

-- 2. Agregar columnas para información de GAM
-- NOTA: nuusugamid está DEPRECADO - nuusuid es el campo único que almacena UserID de GAM
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusugamid VARCHAR(100);
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusugamtok TEXT;
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusugamexp TIMESTAMP;

COMMENT ON COLUMN nuusuari.nuusugamid IS 'DEPRECADO - No usar. nuusuid almacena el UserID de GAM directamente';
COMMENT ON COLUMN nuusuari.nuusugamtok IS 'Último access_token GAM (caché temporal)';
COMMENT ON COLUMN nuusuari.nuusugamexp IS 'Fecha expiración del token GAM';

-- 3. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_nuusuari_gamid ON nuusuari(nuusugamid);
CREATE INDEX IF NOT EXISTS idx_nuusuari_mail ON nuusuari(nuusumail);

-- 4. Ajustar tabla crcredus para consistencia con nuusuid VARCHAR(100)
--    Esta tabla relaciona usuarios con credenciales del grupo familiar
ALTER TABLE crcredus ALTER COLUMN nuusuid TYPE VARCHAR(100);

COMMENT ON COLUMN crcredus.nuusuid IS 'FK a nuusuari.nuusuid - soporta UserID de GAM (VARCHAR)';

-- 5. Ajustar tabla nuusuauth (si existe) para soportar ambos tipos de ID
--    Usuarios GAM NO usarán nuusuauth (autenticación delegada a GAM)
--    Esta tabla solo se usará para usuarios legacy
COMMENT ON TABLE nuusuauth IS 'Autenticación local (solo usuarios legacy - usuarios GAM autentican en GAM)';

-- 6. Verificar constraints
DO $$ 
BEGIN
  -- Verificar que nuusuid en nuusuauth pueda ser VARCHAR
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'nuusuauth' 
    AND column_name = 'nuusuid' 
    AND data_type != 'character varying'
  ) THEN
    ALTER TABLE nuusuauth ALTER COLUMN nuusuid TYPE VARCHAR(100);
    RAISE NOTICE 'Tipo de nuusuauth.nuusuid cambiado a VARCHAR(100)';
  END IF;
END $$;

-- 7. Crear vista para diferenciar usuarios GAM vs legacy
-- NOTA: Usuarios GAM se detectan por nuusuid NO numérico (UserID es string)
-- Usuarios legacy tienen nuusuid numérico autogenerado
CREATE OR REPLACE VIEW v_usuarios_tipo AS
SELECT 
  nuusuid,
  nuusumail,
  nuusunroaf,
  nuusuapell,
  CASE 
    WHEN nuusuid !~ '^[0-9]+$' AND nuusuid IS NOT NULL THEN 'GAM'
    WHEN nuusuid ~ '^[0-9]+$' THEN 'LOCAL'
    ELSE 'DESCONOCIDO'
  END AS tipo_autenticacion,
  nuusugamexp,
  CASE 
    WHEN nuusugamexp IS NOT NULL AND nuusugamexp > NOW() THEN 'VÁLIDO'
    WHEN nuusugamexp IS NOT NULL AND nuusugamexp <= NOW() THEN 'EXPIRADO'
    ELSE NULL
  END AS estado_token_gam
FROM nuusuari;

COMMENT ON VIEW v_usuarios_tipo IS 'Vista para identificar tipo de autenticación por usuario';

-- 8. Función para limpiar tokens GAM expirados (mantenimiento)
CREATE OR REPLACE FUNCTION limpiar_tokens_gam_expirados()
RETURNS INTEGER AS $$
DECLARE
  count_limpiados INTEGER;
BEGIN
  UPDATE nuusuari
  SET nuusugamtok = NULL
  WHERE nuusugamexp IS NOT NULL
    AND nuusugamexp < NOW() - INTERVAL '1 day';
    
  GET DIAGNOSTICS count_limpiados = ROW_COUNT;
  
  RAISE NOTICE 'Tokens GAM expirados limpiados: %', count_limpiados;
  
  RETURN count_limpiados;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION limpiar_tokens_gam_expirados IS 'Limpia tokens GAM expirados (más de 1 día)';

-- 9. Registrar migración
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_migrations (version, description) 
VALUES ('20251216_gam_integration', 'Preparación para integración GAM - nuusuid como VARCHAR, campos GAM, vistas')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '✅ Migración GAM completada exitosamente';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Cambios aplicados:';
  RAISE NOTICE '  - nuusuid ahora es VARCHAR(100) (soporta UserID de GAM)';
  RAISE NOTICE '  - crcredus.nuusuid actualizado a VARCHAR(100) para consistencia';
  RAISE NOTICE '  - Campos GAM agregados: nuusugamid, nuusugamtok, nuusugamexp';
  RAISE NOTICE '  - Vista v_usuarios_tipo creada';
  RAISE NOTICE '  - Función limpiar_tokens_gam_expirados() creada';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos pasos:';
  RAISE NOTICE '  1. Usuarios nuevos se registrarán con GAM → nuusuid será string';
  RAISE NOTICE '  2. Usuarios existentes pueden seguir usando autenticación local';
  RAISE NOTICE '  3. Ejecutar limpiar_tokens_gam_expirados() periódicamente (cron)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '  - Tabla nuusuauth solo para usuarios legacy';
  RAISE NOTICE '  - Usuarios GAM NO usan nuusuauth';
  RAISE NOTICE '  - Token GAM se almacena temporalmente en nuusugamtok (opcional)';
END $$;
