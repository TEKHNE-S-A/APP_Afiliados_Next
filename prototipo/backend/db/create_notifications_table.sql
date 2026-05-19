-- Tabla de notificaciones para APP_Afiliados
-- Fecha: 23 de diciembre de 2025

-- Asegurar extensión uuid
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nuusuid VARCHAR(100) NOT NULL,  -- FK a nuusuari
  tipo VARCHAR(50) NOT NULL,  -- 'autorizacion', 'tramite', 'credencial', 'sistema'
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_leida TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT fk_notif_usuario FOREIGN KEY (nuusuid) REFERENCES nuusuari(nuusuid) ON DELETE CASCADE
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_notifications_usuario ON notifications(nuusuid);
CREATE INDEX IF NOT EXISTS idx_notifications_leida ON notifications(leida);
CREATE INDEX IF NOT EXISTS idx_notifications_fecha ON notifications(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_usuario_leida ON notifications(nuusuid, leida);

-- Comentarios
COMMENT ON TABLE notifications IS 'Notificaciones de la aplicación para usuarios';
COMMENT ON COLUMN notifications.tipo IS 'Tipo de notificación: autorizacion, tramite, credencial, sistema';
COMMENT ON COLUMN notifications.metadata IS 'Datos adicionales en formato JSON (ej: {"autorizacionId": "...", "estado": "..."})';
