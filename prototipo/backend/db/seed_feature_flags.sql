-- ============================================================================
-- SEED: Feature Flags - FUNCIONES_APP
-- ============================================================================
-- Ejecutar una sola vez al iniciar para poblar los feature flags
-- Estructura: grupo = FUNCIONES_APP, tipo = nombre del flag, valor = S/N

-- Prevenir duplicados
DELETE FROM nusispar WHERE nusisgrupa = 'FUNCIONES_APP';

-- ============================================================================
-- CARTILLA E INFORMACIÓN
-- ============================================================================
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ( 'FUNCIONES_APP', 'HabilitarCartilla', 'S', current_timestamp, 'admin');

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ('FUNCIONES_APP', 'HabilitarInfoUtil', 'S', current_timestamp, 'admin');

-- ============================================================================
-- AUTORIZACIONES / SIA
-- ============================================================================
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ('FUNCIONES_APP', 'HabilitarAutorizSinOrden', 'S', current_timestamp, 'admin');

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ('FUNCIONES_APP', 'HabilitarAutorizConOden', 'S', current_timestamp, 'admin');

-- ============================================================================
-- HISTORIAL Y CONSUMO
-- ============================================================================
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ('FUNCIONES_APP', 'HabilitarHistorialAtencion', 'S', current_timestamp, 'admin');

-- ============================================================================
-- NOTIFICACIONES (DESHABILITADAS POR DEFECTO EN TESTING)
-- ============================================================================
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ('FUNCIONES_APP', 'HabilitarNotificaciones', 'N', current_timestamp, 'admin');

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ('FUNCIONES_APP', 'HabilitarNotificacionesCola', 'N', current_timestamp, 'admin');

-- ============================================================================
-- MODO OFFLINE
-- ============================================================================
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ('FUNCIONES_APP', 'HabilitarModoOffline', 'S', current_timestamp, 'admin');

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ('FUNCIONES_APP', 'HabilitarColaOffline', 'N', current_timestamp, 'admin');

-- ============================================================================
-- UI Y EXPERIENCIA
-- ============================================================================
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ('FUNCIONES_APP', 'HabilitarModoBetaUI', 'N', current_timestamp, 'admin');

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ('FUNCIONES_APP', 'HabilitarTemaOscuro', 'S', current_timestamp, 'admin');

-- ============================================================================
-- TRÁMITES (DESHABILITADAS - FUNCIONALIDAD FUTURA)
-- ============================================================================
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ('FUNCIONES_APP', 'HabilitarTramites', 'N', current_timestamp, 'admin');

-- ============================================================================
-- OPERACIÓN
-- ============================================================================
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisulmod, nususrlsa)
VALUES ('FUNCIONES_APP', 'HabilitarDiagnosticoAdmin', 'S', current_timestamp, 'admin');

-- ============================================================================
-- VALIDACIÓN
-- ============================================================================
SELECT COUNT(*) as total_flags_creados FROM nusispar WHERE nusisgrupa = 'FUNCIONES_APP';
SELECT nusistippa, nusisvalpa FROM nusispar WHERE nusisgrupa = 'FUNCIONES_APP' ORDER BY nusistippa;
