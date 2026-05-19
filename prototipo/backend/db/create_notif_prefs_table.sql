-- ============================================================================
-- Tabla: nu_notif_prefs
-- Propósito: Preferencias de notificación por usuario y categoría
-- Tarea: 17 - Preferencias de notificación (Backlog P1)
-- Fecha: 18/03/2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS nu_notif_prefs (
  nuusuid    VARCHAR(100) NOT NULL,
  categoria  VARCHAR(50)  NOT NULL,
  push       BOOLEAN      NOT NULL DEFAULT true,
  in_app     BOOLEAN      NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  PRIMARY KEY (nuusuid, categoria),

  CONSTRAINT fk_notif_prefs_nuusuid
    FOREIGN KEY (nuusuid) REFERENCES nuusuari(nuusuid)
    ON DELETE CASCADE
);

-- Índice para listar todas las prefs de un usuario
CREATE INDEX IF NOT EXISTS idx_notif_prefs_nuusuid ON nu_notif_prefs (nuusuid);

COMMENT ON TABLE nu_notif_prefs IS
  'Preferencias de notificación del afiliado: push e in-app por categoría';

COMMENT ON COLUMN nu_notif_prefs.categoria IS
  'Categoría de notificación: credencial | autorizaciones | tramites | noticias | sistema';
COMMENT ON COLUMN nu_notif_prefs.push IS
  'Recibir notificaciones push para esta categoría';
COMMENT ON COLUMN nu_notif_prefs.in_app IS
  'Recibir notificaciones en la app para esta categoría';
