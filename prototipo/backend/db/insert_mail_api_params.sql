-- ============================================================
-- Parámetros para Tekhne Mail API (grupo MAIL_API) y proveedor activo (grupo EMAIL)
-- Ejecutar sobre BD app_afiliados_genexus
-- ============================================================

-- Proveedor de email activo: SMTP | API | DUAL
-- SMTP  = solo SMTP (actual, default)
-- API   = solo Tekhne Mail API
-- DUAL  = SMTP primero, Tekhne API como fallback
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('EMAIL', 'Provider', 'SMTP')
ON CONFLICT (nusisgrupa, nusistippa) DO UPDATE SET nusisvalpa = EXCLUDED.nusisvalpa;

-- URL del endpoint de la API de Tekhne
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('MAIL_API', 'Url', 'http://tkqa.tekhne.com.ar:8081/api/mail/send')
ON CONFLICT (nusisgrupa, nusistippa) DO UPDATE SET nusisvalpa = EXCLUDED.nusisvalpa;

-- API Key de autenticación (solicitar a portal@tekhne.com.ar)
-- IMPORTANTE: Reemplazar TU_API_KEY_AQUI con la API Key real
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('MAIL_API', 'ApiKey', 'TU_API_KEY_AQUI')
ON CONFLICT (nusisgrupa, nusistippa) DO UPDATE SET nusisvalpa = EXCLUDED.nusisvalpa;

-- Email del remitente para Tekhne API
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('MAIL_API', 'FromEmail', 'noreply@osep.gob.ar')
ON CONFLICT (nusisgrupa, nusistippa) DO UPDATE SET nusisvalpa = EXCLUDED.nusisvalpa;

-- Nombre del remitente para Tekhne API
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('MAIL_API', 'FromName', 'OSEP App Afiliados')
ON CONFLICT (nusisgrupa, nusistippa) DO UPDATE SET nusisvalpa = EXCLUDED.nusisvalpa;

-- Habilitado: S para activar, N para desactivar
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('MAIL_API', 'Habilitado', 'N')
ON CONFLICT (nusisgrupa, nusistippa) DO UPDATE SET nusisvalpa = EXCLUDED.nusisvalpa;

-- Verificar
SELECT nusisgrupa, nusistippa, nusisvalpa
FROM nusispar
WHERE nusisgrupa IN ('EMAIL', 'MAIL_API', 'SMTP')
ORDER BY nusisgrupa, nusistippa;
