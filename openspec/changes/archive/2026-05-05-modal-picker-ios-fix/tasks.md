## 1. Componente ModalPicker

- [x] 1.1 Crear `mobile/src/components/ModalPicker.tsx` con props `items`, `selectedValue`, `onValueChange`, `placeholder`, `disabled`
- [x] 1.2 Implementar trigger (TouchableOpacity con chevron) que muestra el label seleccionado o el placeholder
- [x] 1.3 Implementar bottom sheet Modal con FlatList de opciones
- [x] 1.4 Marcar ítem seleccionado con color primario y checkmark
- [x] 1.5 Agregar botón "Cancelar" y cierre tocando fuera del modal
- [x] 1.6 Aplicar `useTheme()` para colores del sistema de diseño
- [x] 1.7 Soporte de prop `disabled` con opacidad reducida y bloqueo de apertura

## 2. SolicitudAutorizacionScreen

- [x] 2.1 Reemplazar `import { Picker }` por `import ModalPicker`
- [x] 2.2 Reemplazar picker AFILIADO (sección AFILIADO) con `<ModalPicker>`
- [x] 2.3 Reemplazar picker PRESTACIÓN (sección PRESTACIÓN tipo S) con `<ModalPicker>`
- [x] 2.4 Eliminar estilos `pickerContainer` y `picker` del StyleSheet

## 3. CartillaMapScreen

- [x] 3.1 Reemplazar `import { Picker }` por `import ModalPicker`
- [x] 3.2 Reemplazar picker Especialidad con `<ModalPicker>` incluyendo opción "Todas las especialidades"
- [x] 3.3 Eliminar estilos `pickerContainer` y `picker` del StyleSheet

## 4. EnrolamientosScreen

- [x] 4.1 Reemplazar `import { Picker }` por `import ModalPicker`
- [x] 4.2 Reemplazar picker Miembro del grupo con `<ModalPicker>`
- [x] 4.3 Eliminar estilos `pickerContainer` y `picker` del StyleSheet

## 5. HistorialAtencionScreen

- [x] 5.1 Reemplazar `import { Picker }` por `import ModalPicker`
- [x] 5.2 Reemplazar picker Miembro del grupo con `<ModalPicker>`
- [x] 5.3 Eliminar estilos `pickerContainer` y `picker` del StyleSheet

## 6. Verificación

- [x] 6.1 Confirmar 0 errores TypeScript en los 5 archivos modificados
- [ ] 6.2 Probar en iOS (BrowserStack iPhone 16 Pro) que el selector abre como bottom sheet
- [x] 6.3 Probar en Android que el selector abre como bottom sheet
- [ ] 6.4 Verificar selección de afiliado cambia los enrolamientos en SolicitudAutorizacionScreen
- [ ] 6.5 Verificar selección de prestación funciona en tipo "Sin Prescripción"
