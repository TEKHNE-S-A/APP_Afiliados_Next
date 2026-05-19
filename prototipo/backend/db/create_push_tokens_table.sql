-- Tabla para almacenar push tokens de dispositivos
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nuusuid VARCHAR(100) NOT NULL,
  push_token VARCHAR(500) NOT NULL,
  plataforma VARCHAR(20) NOT NULL, -- 'ios', 'android', 'web'
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_ultima_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Foreign key
  CONSTRAINT fk_push_tokens_nuusuid 
    FOREIGN KEY (nuusuid) 
    REFERENCES nuusuari(nuusuid) 
    ON DELETE CASCADE,
  
  -- Un usuario puede tener múltiples dispositivos
  CONSTRAINT unique_user_token UNIQUE (nuusuid, push_token)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_push_tokens_nuusuid ON push_tokens(nuusuid);
CREATE INDEX IF NOT EXISTS idx_push_tokens_activo ON push_tokens(activo);

-- Comentarios
COMMENT ON TABLE push_tokens IS 'Tokens de notificaciones push de dispositivos móviles';
COMMENT ON COLUMN push_tokens.push_token IS 'Expo Push Token en formato ExponentPushToken[...]';
COMMENT ON COLUMN push_tokens.plataforma IS 'Plataforma del dispositivo: ios, android, web';
COMMENT ON COLUMN push_tokens.activo IS 'Token activo (false si el usuario hizo logout o desinstaló la app)';
