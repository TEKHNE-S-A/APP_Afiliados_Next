-- ============================================================
-- Botonera principal del Home
-- Grupo: BOTONERA_PRINCIPAL | Tipo: Botones
-- Valor: JSON array de HomeButton (ver mobile/src/types/homeButton.ts)
--
-- Cada botón con featureFlagKey se evalúa contra FUNCIONES_APP.{featureFlagKey}:
--   S → visible  |  N → oculto (sin espacio en blanco en la grilla)
-- El botón "mas_acciones" no tiene featureFlagKey: siempre aparece.
-- ============================================================

INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES (
  'BOTONERA_PRINCIPAL',
  'Botones',
  '[
    {
      "id": "autorizaciones",
      "label": "Autorizaciones",
      "icon": "document-text-outline",
      "iconColor": "#F59E0B",
      "iconBg": "#FFF5EB",
      "route": "SolicitudAutorizacionRoot",
      "orden": 1,
      "habilitado": true,
      "featureFlagKey": "HabilitarAutorizaciones",
      "badgeKey": "tramites_pendientes"
    },
    {
      "id": "farmacias",
      "label": "Farmacias",
      "icon": "medkit-outline",
      "iconColor": "#EF4444",
      "iconBg": "#FFF0F0",
      "route": "Farmacias",
      "orden": 2,
      "habilitado": true,
      "featureFlagKey": "HabilitarFarmacias"
    },
    {
      "id": "tramites",
      "label": "Trámites",
      "icon": "layers-outline",
      "iconColor": "#8B5CF6",
      "iconBg": "#F5F3FF",
      "route": "Transactions",
      "orden": 3,
      "habilitado": true,
      "featureFlagKey": "HabilitarTramites"
    },
    {
      "id": "historial_medico",
      "label": "Historial médico",
      "icon": "pulse-outline",
      "iconColor": "#059669",
      "iconBg": "#ECFDF5",
      "route": "Profile",
      "routeParams": { "screen": "HistorialAtencion", "params": { "from": "Home" } },
      "orden": 4,
      "habilitado": true,
      "featureFlagKey": "HabilitarHistorialAtencion"
    },
    {
      "id": "delegaciones",
      "label": "Delegaciones",
      "icon": "business-outline",
      "iconColor": "#6366F1",
      "iconBg": "#EEF2FF",
      "route": "Delegaciones",
      "orden": 5,
      "habilitado": true,
      "featureFlagKey": "HabilitarDelegaciones"
    },
    {
      "id": "mas_acciones",
      "label": "Más acciones",
      "icon": "add-circle-outline",
      "iconColor": "#64748B",
      "iconBg": "#F1F5F9",
      "route": "InfoUtil",
      "orden": 6,
      "habilitado": true,
      "esAccionExtra": true
    }
  ]'
)
ON CONFLICT (nusisgrupa, nusistippa) DO UPDATE
  SET nusisvalpa = EXCLUDED.nusisvalpa;

-- Versión del esquema (para invalidar cache en cliente al cambiar estructura)
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('BOTONERA_PRINCIPAL', 'Version', '1')
ON CONFLICT (nusisgrupa, nusistippa) DO NOTHING;

-- ============================================================
-- Feature flags de botones (FUNCIONES_APP)
-- Aplicar también: insert_parametro_habilitar_tramites.sql
-- ============================================================

-- Autorizaciones
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('FUNCIONES_APP', 'HabilitarAutorizaciones', 'S')
ON CONFLICT (nusisgrupa, nusistippa) DO NOTHING;

-- Farmacias
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('FUNCIONES_APP', 'HabilitarFarmacias', 'S')
ON CONFLICT (nusisgrupa, nusistippa) DO NOTHING;

-- Trámites
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('FUNCIONES_APP', 'HabilitarTramites', 'S')
ON CONFLICT (nusisgrupa, nusistippa) DO NOTHING;

-- Historial de atención
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('FUNCIONES_APP', 'HabilitarHistorialAtencion', 'S')
ON CONFLICT (nusisgrupa, nusistippa) DO NOTHING;

-- Delegaciones
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('FUNCIONES_APP', 'HabilitarDelegaciones', 'S')
ON CONFLICT (nusisgrupa, nusistippa) DO NOTHING;
