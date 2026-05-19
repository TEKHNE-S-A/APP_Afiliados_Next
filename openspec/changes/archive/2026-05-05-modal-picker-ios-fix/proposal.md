## Why

En iOS, `@react-native-picker/picker` no renderiza un dropdown sino un "drum/wheel" inline (UIPickerView) que queda visualmente colapsado cuando el contenedor tiene `height: 50` y `overflow: hidden`. Esto genera una UX degradada en iPhone donde el selector de afiliados, prestaciones, especialidades y miembros del grupo familiar se muestra como un input truncado e irreconocible. La app fue probada en BrowserStack con iPhone 16 Pro (iOS 18.6) y el problema es reproducible en producción.

## What Changes

- **Nuevo componente** `mobile/src/components/ModalPicker.tsx`: reemplaza `<Picker>` nativo con un bottom sheet modal — un `TouchableOpacity` que abre un `Modal` con lista de opciones (`FlatList`), compatible con iOS y Android.
- **Eliminación del uso directo** de `@react-native-picker/picker` en las 4 pantallas afectadas.
- **Limpieza de estilos** `pickerContainer` y `picker` huérfanos en cada pantalla.
- No es un cambio **BREAKING**: la API del componente (`items`, `selectedValue`, `onValueChange`, `placeholder`) es autocontenida.

## Capabilities

### New Capabilities
- `modal-picker`: Componente reutilizable de selección tipo dropdown compatible con iOS/Android. Reemplaza `@react-native-picker/picker` con un bottom sheet modal nativo.

### Modified Capabilities

## Impact

- **Archivos modificados**:
  - `mobile/src/screens/SolicitudAutorizacionScreen.tsx` (2 pickers: AFILIADO y PRESTACIÓN)
  - `mobile/src/screens/CartillaMapScreen.tsx` (1 picker: Especialidad)
  - `mobile/src/screens/EnrolamientosScreen.tsx` (1 picker: Miembro del grupo)
  - `mobile/src/screens/HistorialAtencionScreen.tsx` (1 picker: Miembro del grupo)
- **Nuevo archivo**: `mobile/src/components/ModalPicker.tsx`
- **Dependencias**: no se agrega ningún paquete nuevo; `@react-native-picker/picker` queda instalado pero sin uso activo.
- **APIs afectadas**: ninguna — cambio puramente de capa de presentación.
