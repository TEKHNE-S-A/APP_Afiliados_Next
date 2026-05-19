## Context

La app React Native (Expo + TypeScript) usaba `@react-native-picker/picker` directamente en 4 pantallas. En Android este componente renderiza un spinner dropdown nativo. En iOS renderiza un UIPickerView ("drum/wheel") inline que requiere ~215px de altura para verse correctamente; el proyecto lo limitaba a `height: 50` con `overflow: hidden`, colapsando visualmente el selector a una línea irreconocible.

Pantallas afectadas: `SolicitudAutorizacionScreen` (pickers AFILIADO y PRESTACIÓN), `CartillaMapScreen` (Especialidad), `EnrolamientosScreen` (Miembro del grupo), `HistorialAtencionScreen` (Miembro del grupo).

## Goals / Non-Goals

**Goals:**
- UX consistente y correcta en iOS y Android para todos los selectores desplegables.
- Componente reutilizable que centralice la lógica del picker en un solo lugar.
- Cero nuevas dependencias npm.

**Non-Goals:**
- Rediseño visual de las pantallas afectadas más allá del picker.
- Reemplazar DateTimePicker (componente separado ya funcional).
- Modificar la lógica de negocio ni los endpoints de backend.

## Decisions

### Decisión 1: Bottom sheet modal sobre `Platform.OS` condicional

**Alternativas consideradas:**
- **A) Ajuste de altura por plataforma**: `Platform.OS === 'ios' ? height: 215 : height: 50`. Simple pero sigue sin parecer un dropdown; la rueda iOS no es el patrón esperado por usuarios acostumbrados a apps nativas con dropdowns.
- **B) ActionSheetIOS**: Muy nativo en iOS pero requiere código bifurcado por plataforma y no funciona en Android.
- **C) Bottom sheet modal (elegida)**: Patrón estándar de la industria para formularios React Native. Mismo comportamiento en iOS y Android. Visualmente aparece como un campo input con chevron; al tocar abre un `Modal` con `FlatList` de opciones. Aceptado por Apple App Store (no usa APIs privadas, es un modal estándar).

**Rationale**: Una sola implementación, cero dependencias externas, UX predecible para el usuario final.

### Decisión 2: Componente nuevo vs. wrapper del Picker existente

Se creó `ModalPicker` como componente independiente (no un wrapper de `<Picker>`), ya que la implementación del modal no requiere `@react-native-picker/picker` en absoluto. Esto simplifica la lógica y permite eliminar el import en cada pantalla.

### Decisión 3: `FlatList` sobre `ScrollView` con `map`

Con listas largas (ej.: prestaciones médicas con 50+ ítems), `FlatList` tiene mejor rendimiento por virtualización. `ScrollView` + `map` sería suficiente para listas cortas (grupo familiar, 2-7 ítems) pero se estandarizó para todos los casos.

## Risks / Trade-offs

- **[Riesgo] Accesibilidad**: El modal custom puede tener peor soporte de VoiceOver/TalkBack que el Picker nativo. → Mitigación: los elementos `TouchableOpacity` de la lista ya son accesibles por defecto en RN; se puede agregar `accessibilityLabel` en iteraciones futuras.
- **[Trade-off] `@react-native-picker/picker` sigue instalado**: La dependencia no se desinstala para evitar conflictos con otras partes del proyecto que podrían usarla. → Impacto nulo en bundle size (tree-shaking de Metro).
- **[Riesgo] Modal sobre Modal**: Si una pantalla ya tiene un Modal abierto y el usuario toca el picker, se anida un segundo Modal. → No aplica en ninguna de las 4 pantallas afectadas actualmente.

## Migration Plan

1. Componente `ModalPicker` creado en `mobile/src/components/ModalPicker.tsx`.
2. Cada pantalla reemplaza `import { Picker }` por `import ModalPicker` y adapta el JSX.
3. Estilos `pickerContainer` y `picker` eliminados de cada pantalla.
4. **Rollback**: Revertir los 4 archivos de pantalla y eliminar `ModalPicker.tsx`. No hay cambios de base de datos ni de backend.

## Open Questions

- ¿Se desea unificar también `DateTimePicker` con un patrón similar? (actualmente ya usa modal en iOS, no es urgente)
