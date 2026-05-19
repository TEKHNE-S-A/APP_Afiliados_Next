-- Tabla para calificaciones de atención médica
-- Un afiliado puede calificar una atención del historial (1-5 estrellas + comentario)

CREATE TABLE IF NOT EXISTS public.app_calificaciones (
  id               SERIAL PRIMARY KEY,
  nuusuid          VARCHAR(100) NOT NULL,              -- FK → nuusuari.nuusuid
  afiliado_id      VARCHAR(60)  NOT NULL,              -- AfiliadoId del afiliado que califica
  atencion_id      VARCHAR(40)  NOT NULL,              -- AtencionId de HISTORIAL_ATENCION_APP
  entidad_id       VARCHAR(40)  NULL,                  -- EntidadId del prestador
  entidad_nombre   VARCHAR(200) NULL,                  -- EntidadNombre
  puntuacion       SMALLINT     NOT NULL               -- 1 a 5 estrellas
                   CHECK (puntuacion BETWEEN 1 AND 5),
  comentario       TEXT         NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  -- Solo una calificación por atención y usuario
  CONSTRAINT uq_calificacion_atencion_user UNIQUE (nuusuid, atencion_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_app_calif_nuusuid    ON public.app_calificaciones (nuusuid);
CREATE INDEX IF NOT EXISTS idx_app_calif_afiliado   ON public.app_calificaciones (afiliado_id);
CREATE INDEX IF NOT EXISTS idx_app_calif_entidad    ON public.app_calificaciones (entidad_id);
CREATE INDEX IF NOT EXISTS idx_app_calif_puntuacion ON public.app_calificaciones (puntuacion);
CREATE INDEX IF NOT EXISTS idx_app_calif_created    ON public.app_calificaciones (created_at DESC);
