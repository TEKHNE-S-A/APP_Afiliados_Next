## ADDED Requirements

### Requirement: HomeScreen section order
El HomeScreen SHALL mostrar las secciones en el siguiente orden de arriba hacia abajo dentro del ScrollView: (1) Credencial del titular + estadísticas del dashboard, (2) Trámites, (3) Acceso Rápido, (4) Novedades.

#### Scenario: Usuario ve la pantalla principal
- **WHEN** el usuario navega al HomeScreen
- **THEN** la sección Trámites aparece inmediatamente debajo de la credencial y el dashboard

#### Scenario: Orden completo del scroll
- **WHEN** el usuario hace scroll hacia abajo desde la credencial
- **THEN** encuentra primero Trámites, luego Acceso Rápido, y finalmente Novedades al final
