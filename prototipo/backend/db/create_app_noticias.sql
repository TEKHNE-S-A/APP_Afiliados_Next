-- Tabla de Noticias / Novedades administradas desde el backend
-- Soporta texto, imágenes o combinación de ambos

CREATE TABLE IF NOT EXISTS public.app_noticias (
  id           SERIAL PRIMARY KEY,
  titulo       VARCHAR(200)    NOT NULL,
  contenido    TEXT            NULL,          -- texto libre (opcional si hay imagen)
  imagen_url   VARCHAR(500)    NULL,          -- ruta relativa: /uploads/noticias/<filename>
  tipo         VARCHAR(10)     NOT NULL DEFAULT 'texto'
                               CHECK (tipo IN ('texto', 'imagen', 'mixta')),
  activa       BOOLEAN         NOT NULL DEFAULT TRUE,
  orden        INTEGER         NOT NULL DEFAULT 0,  -- menor nro = primero
  fecha_inicio TIMESTAMP       NULL,          -- NULL = siempre visible
  fecha_fin    TIMESTAMP       NULL,          -- NULL = sin expiración
  created_at   TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Índice para consulta pública (activas, vigentes, ordenadas)
CREATE INDEX IF NOT EXISTS idx_app_noticias_activa_orden
  ON public.app_noticias (activa, orden, fecha_inicio, fecha_fin);
