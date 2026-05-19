# Semana 16 — Google Maps + Ubicación

## Implementación Completada ✅

### Componentes creados

1. **`locationService.ts`** — Servicio de ubicación
   - Permisos de ubicación (solicitar, verificar)
   - Obtener ubicación actual y última conocida
   - Verificar servicios de ubicación habilitados
   - Cálculo de distancia con fórmula de Haversine
   - Formato de distancias (m/km)

2. **`MapViewComponent.tsx`** — Componente de mapa reutilizable
   - Wrapper de `react-native-maps`
   - Soporte para markers personalizables
   - Ubicación del usuario con marker azul
   - Ajuste automático de región para mostrar todos los markers
   - Loading states

3. **`CartillaMapScreen.tsx`** — Pantalla base mapa + lista
   - Mapa con ubicación actual del usuario
   - Lista scrollable de prestadores cercanos
   - Filtros: búsqueda por texto, radio (5/10/20/50 km)
   - Integración con API `/api/cartilla` (filtros geográficos)
   - Estados: loading, empty, error
   - Refresh y scroll infinito

### Dependencias instaladas

```bash
npx expo install expo-location react-native-maps
```

- **`expo-location`** — Permisos y geolocalización
- **`react-native-maps`** — Componente de mapa con Google Maps

### Configuración de permisos

**Android** (`app.json`):
```json
"android": {
  "permissions": [
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION"
  ],
  "config": {
    "googleMaps": {
      "apiKey": "GOOGLE_MAPS_API_KEY_PLACEHOLDER"
    }
  }
}
```

**iOS** (`app.json`):
```json
"ios": {
  "infoPlist": {
    "NSLocationWhenInUseUsageDescription": "...",
    "NSLocationAlwaysUsageDescription": "..."
  },
  "config": {
    "googleMapsApiKey": "GOOGLE_MAPS_API_KEY_PLACEHOLDER"
  }
}
```

**Plugin expo-location** (`app.json`):
```json
"plugins": [
  ["expo-location", {
    "locationAlwaysAndWhenInUsePermission": "..."
  }]
]
```

### Integración en navegación

CartillaMapScreen agregada al PerfilStack en `App.tsx`:
```tsx
<Stack.Screen
  name="CartillaMap"
  component={CartillaMapScreen}
  options={{ title: 'Cartilla', headerShown: false }}
/>
```

### Configuración de Google Maps API Key

⚠️ **PENDIENTE**: Configurar API Key real de Google Maps

**Pasos para obtener API Key:**

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto o seleccionar existente
3. Habilitar APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Geocoding API
4. Crear credenciales (API Key)
5. Configurar restricciones (por aplicación Android/iOS bundle ID)
6. Reemplazar placeholders en `app.json`:
   - `android.config.googleMaps.apiKey`
   - `ios.config.googleMapsApiKey`

**Nota**: El mismo API Key del backend (parámetro `MAPA.ApiKey` en nusispar) puede usarse para mobile.

### Testing

**Flujo de prueba:**

1. Ejecutar app: `npx expo start`
2. Navegar a: Perfil → CartillaMap
3. Permitir permisos de ubicación
4. Verificar:
   - Mapa muestra ubicación actual (marker azul)
   - Lista carga prestadores cercanos (ordenados por distancia)
   - Filtros de radio funcionales (5/10/20/50 km)
   - Búsqueda por texto
   - Markers en mapa coinciden con lista

**Ubicación de prueba (Catamarca capital):**
- Lat: -28.4686692
- Lng: -65.7798579
- Radio: 10 km → ~1,023 prestadores

### Características técnicas

**Servicio de ubicación:**
- Alta precisión (Location.Accuracy.High)
- Timeout: 5 segundos
- Solicitud de permisos con fallback
- Cache de última ubicación conocida
- Haversine: radio tierra = 6371 km

**Mapa:**
- Provider: PROVIDER_GOOGLE
- Región inicial: Catamarca (-28.4696, -65.7795)
- Delta: 0.05 (zoom ~5km de radio)
- Auto-fit markers con padding
- Callouts personalizables

**API Integration:**
- Endpoint: `GET /api/cartilla`
- Query params: `lat`, `lng`, `radioKm`, `orderBy`, `q`, `page`, `limit`
- Response: `{ data: Entidad[], pagination: {...} }`
- Paginación: scroll infinito (20 items por página)

### Próximos pasos (Semana 17)

- [ ] Pantalla detalle de entidad (al tocar item de lista o marker)
- [ ] Filtros avanzados (especialidad, rubro)
- [ ] Reutilizar para Farmacias y Delegaciones
- [ ] Guardar filtros en AsyncStorage
- [ ] Modo offline con cache de entidades

### Archivos modificados

```
mobile/
├── src/
│   ├── services/
│   │   └── locationService.ts (NEW - 200 líneas)
│   ├── components/
│   │   └── MapViewComponent.tsx (NEW - 220 líneas)
│   ├── screens/
│   │   └── CartillaMapScreen.tsx (NEW - 630 líneas)
│   └── App.tsx (UPDATED - import + route)
├── app.json (UPDATED - permisos + API keys)
└── package.json (UPDATED - dependencias)
```

### Logs de desarrollo

```
✅ expo-location y react-native-maps instalados
✅ locationService.ts creado con 9 funciones
✅ MapViewComponent.tsx creado (soporte markers + región)
✅ CartillaMapScreen.tsx creado (mapa + lista + filtros)
✅ Integración en App.tsx (PerfilStack)
✅ Permisos configurados (Android + iOS)
✅ Plugins expo-location configurados
```

### Referencias

- [expo-location docs](https://docs.expo.dev/versions/latest/sdk/location/)
- [react-native-maps docs](https://github.com/react-native-maps/react-native-maps)
- [Google Maps API](https://developers.google.com/maps/documentation)
- [Haversine formula](https://en.wikipedia.org/wiki/Haversine_formula)
