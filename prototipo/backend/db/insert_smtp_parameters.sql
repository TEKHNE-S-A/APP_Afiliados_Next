-- ============================================================================
-- Script SQL: Insertar parámetros SMTP para envío de emails desde backend
-- ============================================================================
-- Tabla: nusispar
-- Grupo: SMTP (mayúsculas)
-- 
-- Parámetros configurables para diferentes ambientes (DEV/QA/PROD):
-- - Host: Servidor SMTP (ej: smtp.gmail.com, smtp-relay.gmail.com, smtp.office365.com)
-- - Port: Puerto SMTP (587 para STARTTLS, 465 para SSL/TLS)
-- - Secure: S para SSL/TLS (puerto 465), N para STARTTLS (puerto 587)
-- - User: Usuario de autenticación SMTP
-- - Password: Contraseña SMTP (o App Password para Gmail)
-- - FromEmail: Email remitente que aparecerá en los correos
-- - FromName: Nombre del remitente
--
-- IMPORTANTE: Actualizar estos valores según el ambiente:
-- - DEV: Usar cuenta de prueba
-- - QA: Usar cuenta de testing
-- - PROD: Usar cuenta corporativa OSEP
-- ============================================================================

-- Eliminar parámetros SMTP existentes (si los hay)
DELETE FROM nusispar WHERE nusisgrupa = 'SMTP';

-- Insertar parámetros SMTP (valores de ejemplo - ACTUALIZAR según ambiente)
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisobse) VALUES
  ('SMTP', 'Host', 'smtp.gmail.com', 'Servidor SMTP para envío de emails'),
  ('SMTP', 'Port', '587', 'Puerto SMTP (587=STARTTLS, 465=SSL/TLS)'),
  ('SMTP', 'Secure', 'N', 'S=SSL/TLS puerto 465, N=STARTTLS puerto 587'),
  ('SMTP', 'User', 'noreply@osep.gob.ar', 'Usuario de autenticación SMTP'),
  ('SMTP', 'Password', 'CHANGE_ME_PASSWORD', 'Contraseña SMTP - ACTUALIZAR'),
  ('SMTP', 'FromEmail', 'noreply@osep.gob.ar', 'Email remitente'),
  ('SMTP', 'FromName', 'OSEP App Afiliados', 'Nombre del remitente');

-- Verificar inserción
SELECT * FROM nusispar WHERE nusisgrupa = 'SMTP' ORDER BY nusistippa;

-- ============================================================================
-- INSTRUCCIONES POST-INSTALACIÓN:
-- ============================================================================
-- 1. Actualizar los valores de User y Password con credenciales reales
-- 2. Configurar FromEmail con el email corporativo de OSEP
-- 3. Si usa Gmail con 2FA, generar App Password:
--    https://myaccount.google.com/apppasswords
-- 4. Para Office365, usar credenciales de cuenta de servicio
-- 5. Verificar configuración desde backend con:
--    node -e "require('./emailService').verifySMTPConfig().then(console.log)"
-- ============================================================================

-- ============================================================================
-- EJEMPLOS DE CONFIGURACIÓN POR PROVEEDOR:
-- ============================================================================
-- 
-- GMAIL (con App Password para cuentas 2FA):
-- UPDATE nusispar SET nusisvalpa = 'smtp.gmail.com' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Host';
-- UPDATE nusispar SET nusisvalpa = '587' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Port';
-- UPDATE nusispar SET nusisvalpa = 'N' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Secure';
-- UPDATE nusispar SET nusisvalpa = 'tu-email@gmail.com' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'User';
-- UPDATE nusispar SET nusisvalpa = 'xxxx xxxx xxxx xxxx' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Password';
--
-- OFFICE 365:
-- UPDATE nusispar SET nusisvalpa = 'smtp.office365.com' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Host';
-- UPDATE nusispar SET nusisvalpa = '587' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Port';
-- UPDATE nusispar SET nusisvalpa = 'N' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Secure';
--
-- SMTP RELAY (sin autenticación):
-- UPDATE nusispar SET nusisvalpa = 'smtp-relay.example.com' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Host';
-- UPDATE nusispar SET nusisvalpa = '25' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Port';
-- UPDATE nusispar SET nusisvalpa = 'N' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Secure';
-- UPDATE nusispar SET nusisvalpa = '' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'User';
-- UPDATE nusispar SET nusisvalpa = '' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Password';
-- ============================================================================
