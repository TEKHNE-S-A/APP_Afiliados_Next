-- ===================================================================
-- Script: Insertar parámetros de alertas operativas (grupo ALERTAS_OPS)
-- ===================================================================
-- Descripción: Todos los umbrales y configuración de notificaciones del
--              sistema de alertas se leen desde nusispar.
--              El script monitor-backend.ps1 consulta estos valores
--              en cada ejecución via GET /health/alerts/config.
--
-- Uso:
--   psql -U postgres -d app_afiliados_genexus -f insert_parametros_alertas_ops.sql
-- ===================================================================

DO $$
DECLARE
  params TEXT[][] := ARRAY[
    ARRAY['Enabled',        'S',                          'Habilitar sistema de alertas operativas (S/N)'],
    ARRAY['ErrorRatePct',   '20',                         'Umbral porcentaje de errores 5xx para disparar alerta'],
    ARRAY['MaxLatencyMs',   '8000',                       'Umbral latencia máxima en ms por chequeo de dependencia'],
    ARRAY['IntervalSeconds','60',                         'Intervalo en segundos entre chequeos del monitor'],
    ARRAY['SmtpServer',     '',                           'Servidor SMTP para envío de alertas por email'],
    ARRAY['SmtpPort',       '25',                         'Puerto SMTP'],
    ARRAY['MailFrom',       '',                           'Dirección de correo origen de alertas'],
    ARRAY['MailTo',         '',                           'Dirección(es) destino de alertas (separadas por coma)'],
    ARRAY['WebhookUrl',     '',                           'URL de webhook para notificaciones (Slack, Teams, etc.)']
  ];
  p TEXT[];
BEGIN
  FOREACH p SLICE 1 IN ARRAY params LOOP
    IF NOT EXISTS (
      SELECT 1 FROM nusispar
      WHERE nusisgrupa = 'ALERTAS_OPS'
        AND nusistippa = p[1]
    ) THEN
      INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
      VALUES ('ALERTAS_OPS', p[1], p[2]);
      RAISE NOTICE 'Insertado ALERTAS_OPS.%  = ''%''  (%)', p[1], p[2], p[3];
    ELSE
      RAISE NOTICE 'Ya existe ALERTAS_OPS.% — sin cambios', p[1];
    END IF;
  END LOOP;
END;
$$;
