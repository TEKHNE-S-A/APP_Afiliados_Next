-- Script para insertar el parámetro HabilitarTramites
-- Controla si el botón "Trámites" aparece en la botonera principal del Home
--
-- NUSISVALPA = 'S' → Visible (default)
-- NUSISVALPA = 'N' → Oculto (no aparece en la grilla)

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('FUNCIONES_APP', 'HabilitarTramites', 'S')
ON CONFLICT (nusisgrupa, nusistippa) DO NOTHING;
