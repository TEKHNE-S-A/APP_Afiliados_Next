# Menú Perfil - Enrolamientos

## Descripción

Nueva funcionalidad implementada en el menú principal de la app bajo la pestaña "Perfil". Incluye:

1. **Pantalla de Menú Perfil** (`PerfilMenuScreen`)
   - Menú principal con opciones de perfil
   - Avatar y datos del usuario
   - Lista de funcionalidades disponibles
   - Botón de cerrar sesión

2. **Pantalla de Enrolamientos** (`EnrolamientosScreen`)
   - Consulta de enrolamientos del SIA
   - Selector para elegir miembro del grupo familiar
   - Lista de enrolamientos con vigencias
   - Filtrado automático de datos en blanco
   - Pull-to-refresh para actualizar datos

## Instalación

1. Instalar dependencia del Picker:
   ```powershell
   cd mobile
   .\install-picker.ps1
   ```

2. Reiniciar el servidor Expo:
   ```powershell
   npx expo start
   ```

## Estructura de Navegación

```
Tab Navigator
└── Profile (Tab)
    └── PerfilStack (Stack Navigator)
        ├── PerfilMenu (Pantalla de menú)
        ├── Enrolamientos (Consulta enrolamientos)
        └── Credenciales (Vista de credenciales)
```

## Funcionalidades

### Menú Perfil

- ✅ **Enrolamientos**: Consulta de enrolamientos biométricos
- ✅ **Credenciales**: Acceso a credenciales del grupo familiar
- ⏳ **Datos Personales**: Por implementar
- ⏳ **Configuración**: Por implementar

### Pantalla de Enrolamientos

**Características:**
- Selector de miembro del grupo familiar en la parte superior
- Consulta automática al cambiar de miembro seleccionado
- Muestra enrolamientos con los siguientes datos:
  - Descripción
  - Vigencia (destacada en verde)
  - Estado (badge con colores)
  - Fecha
  - Otros campos dinámicos

**Filtrado:**
- Solo muestra enrolamientos que tengan:
  - Vigencia con valor no vacío
  - Estado con valor no vacío
- Oculta automáticamente campos con datos en blanco

**Interacción:**
- Pull-to-refresh para actualizar datos
- Botón "Reintentar" en estado vacío
- Indicador de carga durante la consulta

## Integración con Backend

**Endpoint utilizado:**
```
POST /sia/enrolamientos
```

**Parámetros:**
- `NroInternoPersona`: Último segmento del AfiliadoId (9 dígitos)
- `Fecha`: Fecha actual en formato DD/MM/YYYY

**Ejemplo de request:**
```json
{
  "NroInternoPersona": "000000265",
  "Fecha": "12/12/2025"
}
```

**Formato de respuesta esperado:**
```json
{
  "success": true,
  "data": [
    {
      "NroInternoPersona": "63",
      "Fecha": "12/12/2025",
      "Vigencia": "31/12/2026",
      "Estado": "Activo",
      "Descripcion": "Enrolamiento biométrico principal"
    }
  ]
}
```

## Archivos Creados

```
mobile/src/
├── screens/
│   ├── PerfilMenuScreen.tsx       # Menú principal del perfil
│   └── EnrolamientosScreen.tsx    # Pantalla de consulta de enrolamientos
└── App.tsx                         # Actualizado con PerfilStack
```

## Estilos y UX

**Colores principales:**
- Verde #4CAF50: Enrolamientos y estados activos
- Azul #2196F3: Credenciales
- Naranja #FF9800: Datos personales
- Morado #9C27B0: Configuración
- Rojo #FF3B30: Cerrar sesión

**Componentes reutilizados:**
- `OfflineBanner`: Banner de estado offline/online
- `Ionicons`: Iconos de React Native Vector Icons
- Estilos consistentes con el resto de la app

## Testing

Para probar la funcionalidad:

1. Iniciar backend:
   ```powershell
   cd backend
   .\restart-backend.ps1
   ```

2. Iniciar app móvil:
   ```powershell
   cd mobile
   npx expo start
   ```

3. Navegar a la pestaña "Perfil" en el menú inferior
4. Seleccionar "Enrolamientos" en el menú
5. Elegir un miembro del grupo familiar
6. Verificar que se muestran los enrolamientos con vigencias

## Próximas Mejoras

- [ ] Implementar "Datos Personales"
- [ ] Implementar "Configuración"
- [ ] Caché local de enrolamientos
- [ ] Modo offline para enrolamientos
- [ ] Exportar/compartir enrolamientos
- [ ] Notificaciones de vencimiento de enrolamientos

## Notas Técnicas

- El `NroInternoPersona` se extrae del `AfiliadoId` usando `.slice(-9)`
- El formato de fecha usa `toLocaleDateString('es-AR')` para DD/MM/YYYY
- Los enrolamientos se filtran antes de mostrar para evitar datos en blanco
- El estado del enrolamiento determina el color del badge (verde=activo, rojo=inactivo)
