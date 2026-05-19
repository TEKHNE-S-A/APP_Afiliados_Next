-- ============================================================================
-- SCRIPT AUXILIAR: Insertar notificaciones de prueba
-- ============================================================================
-- Uso: Ejecutar este script en PostgreSQL para crear notificaciones de prueba
--      Reemplazar 'USER_ID_AQUI' con el nuusuid real del usuario de prueba

-- Usuario de prueba: marianr@tekhne.com.ar
-- Para obtener el nuusuid: SELECT nuusuid FROM nuusuari WHERE nuusumail = 'marianr@tekhne.com.ar';

-- Insertar 10 notificaciones de prueba (5 leídas, 5 no leídas)
INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, fecha_leida, metadata)
VALUES 
  -- Notificaciones NO leídas
  (uuid_generate_v4(), 'USER_ID_AQUI', 'info', 'Nueva prestación disponible', 'Tenés una nueva prestación disponible para consultar', false, now() - interval '1 day', NULL, '{"categoria": "prestaciones"}'),
  (uuid_generate_v4(), 'USER_ID_AQUI', 'warning', 'Renovación de credencial', 'Tu credencial vence en 15 días. Renovála ahora.', false, now() - interval '2 days', NULL, '{"categoria": "credencial", "dias_vencimiento": 15}'),
  (uuid_generate_v4(), 'USER_ID_AQUI', 'success', 'Autorización aprobada', 'Tu solicitud de autorización #12345 fue aprobada', false, now() - interval '3 hours', NULL, '{"categoria": "autorizaciones", "numero": "12345"}'),
  (uuid_generate_v4(), 'USER_ID_AQUI', 'info', 'Recordatorio de turno', 'Recordá tu turno médico mañana a las 10:00', false, now() - interval '6 hours', NULL, '{"categoria": "turnos", "hora": "10:00"}'),
  (uuid_generate_v4(), 'USER_ID_AQUI', 'error', 'Pago pendiente', 'Tenés un pago de coseguro pendiente', false, now() - interval '12 hours', NULL, '{"categoria": "pagos", "monto": 2500}'),
  
  -- Notificaciones leídas
  (uuid_generate_v4(), 'USER_ID_AQUI', 'info', 'Bienvenido a OSEP', 'Gracias por registrarte en nuestra app móvil', true, now() - interval '7 days', now() - interval '6 days', '{"categoria": "bienvenida"}'),
  (uuid_generate_v4(), 'USER_ID_AQUI', 'success', 'Credencial actualizada', 'Tu credencial digital fue actualizada exitosamente', true, now() - interval '5 days', now() - interval '5 days', '{"categoria": "credencial"}'),
  (uuid_generate_v4(), 'USER_ID_AQUI', 'info', 'Nuevo servicio disponible', 'Ahora podés consultar farmacias cercanas', true, now() - interval '4 days', now() - interval '3 days', '{"categoria": "servicios"}'),
  (uuid_generate_v4(), 'USER_ID_AQUI', 'warning', 'Mantenimiento programado', 'El sistema estará en mantenimiento el domingo', true, now() - interval '8 days', now() - interval '7 days', '{"categoria": "sistema"}'),
  (uuid_generate_v4(), 'USER_ID_AQUI', 'success', 'Pago procesado', 'Tu pago de $1500 fue procesado correctamente', true, now() - interval '10 days', now() - interval '9 days', '{"categoria": "pagos", "monto": 1500}');

-- Verificar inserción
SELECT COUNT(*) as total, 
       SUM(CASE WHEN leida = false THEN 1 ELSE 0 END) as no_leidas,
       SUM(CASE WHEN leida = true THEN 1 ELSE 0 END) as leidas
FROM notifications 
WHERE nuusuid = 'USER_ID_AQUI';

-- Consulta para obtener el nuusuid del usuario de prueba
-- SELECT nuusuid FROM nuusuari WHERE nuusumail = 'marianr@tekhne.com.ar';
