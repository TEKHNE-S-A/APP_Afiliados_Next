# Semana 30 — Sistema de Temas (Modo Claro / Oscuro) + Personalización de Perfil

## Resumen

Se implementó un sistema completo de temas (claro/oscuro/sistema) para toda la app mobile, abarcando **24 archivos** entre pantallas y componentes. Además se personalizó la pantalla de Perfil para mostrar el nombre real del afiliado.

---

## 1. Sistema de Temas — Archivos Creados

### `mobile/src/theme/colors.ts`
- Define la interfaz `ThemeColors` con ~60 tokens de color semánticos
- Exporta `LightColors` y `DarkColors` como paletas completas
- Tokens organizados por categoría:
  - **Backgrounds**: `background`, `surface`, `surfaceVariant`, `surfaceHighlight`
  - **Text**: `textPrimary`, `textSecondary`, `textMuted`, `textOnPrimary`, `textOnPrimaryMuted`
  - **Brand**: `primary`, `primaryDark`, `accent`, `accentDark`
  - **Status**: `success`, `error`, `errorDark`, `warning`, `warningDark`, `info`
  - **Borders**: `border`, `borderLight`, `borderError`
  - **Shadows**: `shadow`, `overlay`
  - **Navigation**: `tabActive`, `tabInactive`, `tabBadge`, `headerBackground`
  - **Cards/Inputs**: `card`, `cardBorder`, `inputBackground`, `inputBorder`, `inputText`, `inputPlaceholder`
  - **Buttons**: `buttonPrimary`, `buttonPrimaryText`, `buttonSecondary`, `buttonSecondaryText`, `buttonSecondaryBorder`, `buttonDanger`, `buttonDangerText`
  - **Modal**: `modalBackground`, `modalOverlay`
  - **Special**: `gold`, `offline`, `separator`, `disabledBackground`, `disabledText`
  - **Menu icons**: 8 colores para iconos de menú (naranja, indigo, verde, teal, azul, ámbar, púrpura, rojo)

### `mobile/src/theme/ThemeContext.tsx`
- `ThemeProvider`: componente React que envuelve la app
- `useTheme()`: hook que retorna `{ colors, mode, isDark, setMode, toggleTheme }`
- `ThemeMode`: `'light' | 'dark' | 'system'`
- Persistencia en `AsyncStorage` con clave `@app_theme_preference`
- Detecta preferencia del sistema vía `useColorScheme()` de React Native
- Espera carga de AsyncStorage antes de renderizar (evita flash)

### `mobile/src/theme/index.ts`
- Barrel exports: `LightColors`, `DarkColors`, `ThemeColors`, `ThemeProvider`, `useTheme`

---

## 2. Integración en App.tsx

- `<ThemeProvider>` envuelve toda la app (fuera de `AuthProvider`)
- `<StatusBar>` con `barStyle` dinámico según tema
- `NavigationContainer` con `theme` personalizado usando tokens del tema
- Tab bar (`HomeTabs`): colores dinámicos para activeColor, inactiveColor, badge, fondo y borde

---

## 3. Toggle de Tema — PerfilMenuScreen

Sección **"Apariencia"** con 3 botones en fila:
- ☀️ **Claro** — fuerza modo claro
- 📱 **Sistema** — sigue preferencia del SO
- 🌙 **Oscuro** — fuerza modo oscuro

Botón activo: fondo `colors.primary` con texto blanco. Inactivo: fondo `colors.surfaceVariant`.

---

## 4. Pantallas Actualizadas (22)

| Pantalla | Cambios principales |
|----------|-------------------|
| `LoginScreen` | Container, header, inputs, botones, errores, links, dividers |
| `HomeScreen` | Header, cards, dashboard stats, cartilla, quick access, modal, QR |
| `CredencialesScreen` | Container, header, botones, stats, modal, QR frame |
| `ProfileScreen` | Container, título, credencial card, QR, data rows, familia, logout |
| `PerfilMenuScreen` | Header, avatar, menú items, toggle tema, logout, versión |
| `RegisterScreen` | Container, header, inputs, labels, radio buttons, botón registro |
| `ForgotPasswordScreen` | Container, título, inputs, botón, links, errores |
| `TramitesScreen` | Container, header, cards, modal, inputs, botones |
| `TransactionsScreen` | Container, cards, texto |
| `NotificationsScreen` | Container, header, items, badges, modal completo, estados |
| `CartillaMapScreen` | Container, search, filtros, picker, cards, estados |
| `PrestadorDetalleScreen` | Container, header, info, acciones, cards |
| `FarmaciasScreen` | Container, search, filtros, cards, estados |
| `FarmaciaDetalleScreen` | Container, header, acciones, cards |
| `DelegacionesScreen` | Container, search, filtros, cards, estados |
| `DelegacionDetalleScreen` | Container, header, secciones, botones |
| `InfoUtilScreen` | Container, header, cards, sync info, estados |
| `EnrolamientosScreen` | Container, header, selector, cards, estados |
| `HistorialAtencionScreen` | Container, header, cards, modal prácticas, estados |
| `MisAutorizacionesScreen` | Container, header, cards, botones login, estados |
| `AutorizacionDetalleScreen` | Container, header, card detalle, filas datos, tabla full width de prácticas, expansión `Ver más / Ver menos` |
| `SolicitudAutorizacionScreen` | Container, header, secciones, tipo selector, campos, fotos, submit |

---

## 5. Componentes Actualizados (6)

| Componente | Cambios |
|-----------|---------|
| `CredencialCard` | Shadow color dinámico (`colors.shadow`) |
| `CredencialesCarousel` | Dots activo/inactivo, counter, empty text |
| `OfflineBanner` | Background (`colors.offline`), borde (`colors.warningDark`) |
| `FilterModal` | Overlay, container, header, secciones, tipos, switch, fechas, footer |
| `MapViewComponent` | Container background, loading spinner |
| `OnlineRequiredNotice` | Container bg/border, icono y texto con `colors.warning` |

---

## 6. Personalización del nombre en Perfil

### Antes
- Mostraba texto fijo **"Usuario"** como fallback

### Después
Lógica de resolución del nombre (en orden de prioridad):
1. **`user.nombre`** o **`user.nuusuapell`** (campo de BD, formato "APELLIDO, NOMBRE") → se capitaliza a "Apellido, Nombre"
2. **`user.email`** → extrae la parte antes del `@` (ej: `marianr` de `marianr@tekhne.com.ar`)
3. **`user.username`** → muestra tal cual
4. Fallback: cadena vacía (sin texto genérico)

---

## 7. Criterios de diseño

### Colores semánticos preservados
Los colores de **estado** (aprobado, rechazado, pendiente, etc.) se mantienen hardcodeados porque su significado no cambia entre temas:
- Verde (#4CAF50, #10B981, #34C759) → aprobado/vigente/activo
- Rojo (#EF4444, #FF3B30, #f44336) → rechazado/error/vencido
- Naranja (#FF9800, #F59E0B) → pendiente/advertencia
- Amarillo (#F59E0B) → próximo a vencer

### Patrón de aplicación
- `StyleSheet.create()` se mantiene intacto (colores fallback)
- Colores dinámicos se aplican vía **inline styles**: `[styles.foo, { backgroundColor: colors.X }]`
- Esto permite que el código funcione incluso si el `ThemeProvider` no está disponible

### Paleta oscura
- Background: `#111827` (gris muy oscuro, no negro puro)
- Surface: `#1F2937` (cards, modales)
- Primary: `#3B82F6` (azul más brillante que en modo claro)
- Texto: `#F9FAFB` (casi blanco)
- Bordes: `#374151` (gris medio)

---

## 8. Persistencia

- Preferencia guardada en `AsyncStorage` con clave `@app_theme_preference`
- Se carga al iniciar la app antes del primer render
- Cambios inmediatos al tocar el toggle
- Modo **"Sistema"** responde automáticamente a cambios en la configuración del dispositivo

---

## 9. Archivos NO modificados (no requieren tema)

- `mobile/src/contexts/AuthContext.tsx` — no tiene UI
- `mobile/src/services/*` — lógica de negocio
- `mobile/src/hooks/*` — solo lógica
- `mobile/src/types/*` — tipos TypeScript
- `mobile/src/utils/*` — utilidades
- `backend/*` — no aplica

---

## 10. Error preexistente detectado

En `CredencialesScreen.tsx` línea 297 existe un error de tipo:
```
La propiedad "crcreafili" no existe en el tipo "Credencial"
```
Este error es **preexistente** y no está relacionado con los cambios de tema. El campo `crcreafili` se usa en el valor del QR pero no está declarado en la interfaz `Credencial`.

---

## Comandos para probar

```powershell
# Iniciar app mobile
cd mobile
npx expo start
# Presionar 'a' para AVD o escanear QR con dispositivo físico

# Cambiar tema:
# Ir a pestaña "Perfil" → sección "Apariencia" → tocar Claro / Sistema / Oscuro
```
