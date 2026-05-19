-- Agregar columna nuusugamrefresh para guardar refresh_token de GAM
-- Este campo permite renovar access_token automáticamente sin requerir contraseña

ALTER TABLE nuusuari 
ADD COLUMN IF NOT EXISTS nuusugamrefresh VARCHAR(500);

COMMENT ON COLUMN nuusuari.nuusugamrefresh IS 'Refresh token de GAM OAuth2 para renovar access_token automáticamente';

-- Verificar cambio
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'nuusuari' AND column_name = 'nuusugamrefresh';
