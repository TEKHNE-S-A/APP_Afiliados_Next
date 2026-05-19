# modal-picker Specification

## Purpose
TBD - created by archiving change modal-picker-ios-fix. Update Purpose after archive.
## Requirements
### Requirement: Selector desplegable compatible con iOS y Android
El sistema SHALL proveer un componente `ModalPicker` que funcione como selector de opciones con UX consistente en iOS y Android, sin depender del comportamiento nativo de UIPickerView.

#### Scenario: Apertura del selector en iOS
- **WHEN** el usuario toca el campo selector en un iPhone
- **THEN** se abre un bottom sheet modal con la lista completa de opciones visibles

#### Scenario: Apertura del selector en Android
- **WHEN** el usuario toca el campo selector en un dispositivo Android
- **THEN** se abre el mismo bottom sheet modal con la lista de opciones

#### Scenario: Selección de una opción
- **WHEN** el usuario toca una opción dentro del modal
- **THEN** el modal se cierra y el campo muestra la opción seleccionada

#### Scenario: Cancelación sin cambio
- **WHEN** el usuario toca fuera del modal o el botón "Cancelar"
- **THEN** el modal se cierra sin modificar el valor seleccionado

#### Scenario: Indicador de opción seleccionada
- **WHEN** el modal está abierto y ya existe una opción seleccionada
- **THEN** esa opción se muestra resaltada con el color primario y un checkmark

### Requirement: Placeholder cuando no hay selección
El componente `ModalPicker` SHALL mostrar un texto placeholder cuando `selectedValue` no coincide con ningún ítem de la lista.

#### Scenario: Sin valor seleccionado
- **WHEN** `selectedValue` es vacío o no coincide con ningún ítem
- **THEN** el campo muestra el texto `placeholder` en color atenuado

### Requirement: Estado deshabilitado
El componente `ModalPicker` SHALL soportar un prop `disabled` que impida la interacción del usuario.

#### Scenario: Picker deshabilitado
- **WHEN** `disabled` es `true` y el usuario toca el campo
- **THEN** el modal NO se abre y el componente se muestra con opacidad reducida

### Requirement: Reemplazo en pantallas existentes
El sistema SHALL usar `ModalPicker` en lugar de `@react-native-picker/picker` en las siguientes pantallas:
- `SolicitudAutorizacionScreen`: selector de afiliado y selector de prestación
- `CartillaMapScreen`: selector de especialidad
- `EnrolamientosScreen`: selector de miembro del grupo familiar
- `HistorialAtencionScreen`: selector de miembro del grupo familiar

#### Scenario: Selector de afiliado en SolicitudAutorizacionScreen
- **WHEN** la pantalla carga con credenciales disponibles
- **THEN** el selector de afiliado muestra el nombre del integrante junto con su parentesco (TITULAR/FAMILIAR)

#### Scenario: Selector de prestación en SolicitudAutorizacionScreen
- **WHEN** el tipo de autorización es "Sin Prescripción" y las prestaciones cargan correctamente
- **THEN** el selector de prestación muestra la lista de prestaciones médicas disponibles

#### Scenario: Selector de especialidad en CartillaMapScreen
- **WHEN** hay especialidades disponibles en el filtro de cartilla
- **THEN** el selector incluye la opción "Todas las especialidades" como primer ítem

#### Scenario: Selector de miembro en EnrolamientosScreen e HistorialAtencionScreen
- **WHEN** el grupo familiar tiene más de un integrante
- **THEN** el selector permite cambiar entre integrantes y el contenido de la pantalla se actualiza

