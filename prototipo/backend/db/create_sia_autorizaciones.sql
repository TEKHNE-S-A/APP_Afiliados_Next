-- =============================================================================
-- create_sia_autorizaciones.sql
-- Tabla para persistir callbacks de WS_AUTORIZACION (GeneXus/SIA)
-- Corresponde al SDT_AUSolic_WS enviado por el sistema externo
-- =============================================================================

CREATE TABLE IF NOT EXISTS sia_autorizaciones (
    -- Clave primaria: ID externo de la solicitud (char 40)
    ausol_id_ext               VARCHAR(40)     NOT NULL,

    -- Campos del SDT_AUSolic_WS
    ausol_estado               CHAR(3),
    ausol_aut_d_codigo         NUMERIC(5,0),
    ausol_aut_numero           NUMERIC(12,0),
    ausol_aut_cod_gra          NUMERIC(2,0),
    ausol_aut_mar              CHAR(3),
    ausol_aud_mar              CHAR(3),
    ausol_aut_estado           VARCHAR(20),
    ausol_fec_vto              DATE,
    ausol_rechazo_def          CHAR(1)         CHECK (ausol_rechazo_def IN ('S','N')),
    ausol_aut_nro_afiliado     VARCHAR(20),
    ausol_aut_nom_afi          VARCHAR(50),
    ausol_aut_prov             NUMERIC(6,0),
    ausol_aut_raz_pro          VARCHAR(35),
    ausol_aut_suc              NUMERIC(4,0),
    ausol_entidad_id           VARCHAR(30),
    ausol_texto                TEXT,

    -- Control interno
    recibido_en                TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_sia_autorizaciones PRIMARY KEY (ausol_id_ext)
);

-- Índices de búsqueda frecuente
CREATE INDEX IF NOT EXISTS idx_sia_aut_nro_afiliado
    ON sia_autorizaciones (ausol_aut_nro_afiliado);

CREATE INDEX IF NOT EXISTS idx_sia_aut_estado
    ON sia_autorizaciones (ausol_estado);

CREATE INDEX IF NOT EXISTS idx_sia_aut_recibido
    ON sia_autorizaciones (recibido_en DESC);

-- Comentarios
COMMENT ON TABLE  sia_autorizaciones                    IS 'Resultados de autorizaciones recibidos via WS_AUTORIZACION (callback SIA)';
COMMENT ON COLUMN sia_autorizaciones.ausol_id_ext       IS 'ID externo de la solicitud (char 40) — clave del contrato SDT_AUSolic_WS';
COMMENT ON COLUMN sia_autorizaciones.ausol_estado       IS 'Estado de la solicitud (char 3)';
COMMENT ON COLUMN sia_autorizaciones.ausol_aut_numero   IS 'Numero de autorizacion asignado por SIA (num 12)';
COMMENT ON COLUMN sia_autorizaciones.ausol_fec_vto      IS 'Fecha de vencimiento de la autorizacion';
COMMENT ON COLUMN sia_autorizaciones.ausol_rechazo_def  IS 'Rechazo definitivo: S=si / N=no';
COMMENT ON COLUMN sia_autorizaciones.recibido_en        IS 'Timestamp del ultimo callback recibido por WS_AUTORIZACION';
