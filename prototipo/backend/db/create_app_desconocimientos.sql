-- Tabla para registrar desconocimientos de prácticas del historial de atención
-- Un afiliado puede marcar como "no reconocida" una práctica del AUDETALLE_CONSUMO_APP

CREATE TABLE IF NOT EXISTS public.app_desconocimientos (
  id              SERIAL PRIMARY KEY,
  nuusuid         VARCHAR(100) NOT NULL,              -- FK → nuusuari.nuusuid (GAM GUID o legacy)
  afiliado_id     VARCHAR(60)  NOT NULL,              -- AfiliadoId del afiliado que reclama
  atencion_id     VARCHAR(40)  NOT NULL,              -- AtencionId de HISTORIAL_ATENCION_APP
  nro_delegacion  VARCHAR(10)  NULL,                  -- Parte del AtencionId (primeros 5 chars)
  nro_autorizacion VARCHAR(30) NULL,                  -- Parte del AtencionId (resto)
  prestador_nombre VARCHAR(200) NULL,                 -- EntidadNombre del historial
  practica_detalle TEXT        NULL,                  -- JSON string con el detalle de la práctica desconocida
  motivo           VARCHAR(50)  NOT NULL DEFAULT 'no_reconozco'
                   CHECK (motivo IN ('no_reconozco','incorrecto','duplicado','otro')),
  descripcion      TEXT        NULL,                  -- Comentario libre del afiliado
  estado           VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente','en_revision','resuelto','cerrado')),
  created_at       TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_app_descon_nuusuid  ON public.app_desconocimientos (nuusuid);
CREATE INDEX IF NOT EXISTS idx_app_descon_afiliado ON public.app_desconocimientos (afiliado_id);
CREATE INDEX IF NOT EXISTS idx_app_descon_estado   ON public.app_desconocimientos (estado);
CREATE INDEX IF NOT EXISTS idx_app_descon_created  ON public.app_desconocimientos (created_at DESC);
