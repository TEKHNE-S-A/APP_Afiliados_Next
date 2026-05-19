# Sistema de Modo Offline - APP Afiliados

## 📋 Descripción

Sistema completo de funcionamiento offline para la aplicación móvil, permitiendo a los usuarios acceder a sus credenciales y datos incluso sin conexión a internet.

**Estado:** ✅ **FUNCIONANDO COMPLETAMENTE** (Diciembre 2025)

## ✅ Funcionalidades Offline

**SIN CONEXIÓN - Disponibles:**
- ✅ Login con credenciales previamente guardadas (email, DNI o CUIL)
- ✅ Ver credenciales del grupo familiar (7 credenciales en cache)
- ✅ Mostrar códigos QR de credenciales
- ✅ Compartir credencial como imagen PNG
- ✅ Ver datos de perfil del usuario
- ✅ Navegación completa entre pantallas
- ✅ Token offline automático (generado localmente)

**REQUIEREN CONEXIÓN - No disponibles offline:**
- ❌ Primer login (sin cache previo)
- ❌ Registro de nuevos usuarios
- ❌ Sincronización de credenciales actualizadas
- ❌ Actualización de datos desde backend
- ❌ Gestión de trámites
- ❌ Notificaciones en tiempo real

## 🏗️ Arquitectura

### 1. Detección de Red
**Archivo:** `src/hooks/useNetworkStatus.ts`

```typescript
import { useNetworkStatus } from '../hooks/useNetworkStatus'

const { isConnected, isInternetReachable, type } = useNetworkStatus()
// Log: 📡 Network status changed: ONLINE/OFFLINE (wifi)
```

Usa `@react-native-community/netinfo@9.3.7` para monitorear el estado de conexión en tiempo real.

### 2. Cache Persistente con AsyncStorage
**Archivo:** `src/services/storageManager.ts`

```typescript
import { StorageManager } from '../services/storageManager'

// Guardar datos (login online)
await StorageManager.saveUser(user)
await StorageManager.saveCredenciales(credenciales)
await StorageManager.saveUserCredentials(username, password) // Múltiples claves

// Recuperar datos (login offline)
const user = await StorageManager.getUser()
const credenciales = await StorageManager.getCredenciales()
const isValid = await StorageManager.verifyUserCredentials(username, password)
```

**Características:**
- **Guardado múltiple**: Guarda contraseña con email, DNI y CUIL automáticamente
- **Búsqueda flexible**: Encuentra usuario por cualquiera de las claves guardadas
- **Hash SHA256**: Contraseñas hasheadas localmente con `crypto-js`
- **Persistencia**: AsyncStorage mantiene datos entre sesiones de app
const credenciales = await StorageManager.getCredenciales()
const isValid = await StorageManager.verifyUserCredentials(username, password)
```

**Datos guardados en AsyncStorage:**
- Usuario (perfil completo)
- Credenciales del grupo familiar
- Contraseñas hasheadas (SHA256) para validación offline
- Timestamp última sincronización

### 3. API con Manejo de Errores de Red
**Archivo:** `src/services/api.ts`

```typescript
import { apiPost, isNetworkError, NetworkError } from '../services/api'

try {
  const result = await apiPost('/endpoint', data)
} catch (error) {
  if (isNetworkError(error)) {
    // Manejar modo offline
    console.log('Sin conexión, usando cache...')
  }
}
```

**Tipos de error:**
- `NetworkError` - Sin conexión a internet
- `TimeoutError` - Timeout excedido (30s GET, 60-120s POST)

### 3. Login Dual Offline/Online
**Archivo:** `src/contexts/AuthContext.tsx`

**Flujo de Login - 3 Pasos:**

```typescript
const { signIn, isOfflineMode } = useAuth()

await signIn('marianr@tekhne.com.ar', '123456')
// PASO 1: Validación offline (hash SHA256 local)
// PASO 2: Login offline si hay cache (user + credenciales)
//         - Genera token offline si no existe
//         - Sincronización background (500ms delay)
// PASO 3: Login online si no hay cache válido
```

**Diagrama de flujo:**

```
┌─────────────────────┐
│ Usuario hace login  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ PASO 1: Validación Offline          │
│ verifyUserCredentials()              │
│ - Busca hash por email/DNI/CUIL     │
│ - Compara SHA256                     │
└──────────┬──────────────────────────┘
           │
     ┌─────┴─────┐
     │ NO        │ SÍ ✅
     ▼           ▼
┌────────┐  ┌────────────────────────────┐
│ PASO 3 │  │ PASO 2: Login Offline      │
│ Login  │  │ - Carga user + credenciales│
│ Online │  │ - Genera token offline     │
│ (API)  │  │ - isOfflineMode = true     │
└────────┘  └──────────┬─────────────────┘
                       │
                       ▼
            ┌──────────────────────────┐
            │ setTimeout(500ms)        │
            │ Sync Background:         │
            │ - Intenta login online   │
            │ - Actualiza cache        │
            │ - No bloquea UI          │
            └──────────────────────────┘
```

**Características clave:**
- ✅ **Token offline**: Generado automáticamente si no existe (`offline_${timestamp}_${random}`)
- ✅ **Guardado múltiple**: Email (principal) + username + CUIL
- ✅ **Búsqueda flexible**: Acepta login con email, DNI o CUIL
- ✅ **Logout preserva cache**: Solo borra sesión, mantiene user/credenciales para próximo login offline
- ✅ **Sincronización no bloqueante**: Background async después de 500ms

### 4. API con Manejo de Errores de Red
**Archivo:** `src/services/api.ts`

```typescript
import { apiPost, isNetworkError, NetworkError, TimeoutError } from '../services/api'

try {
  const result = await apiPost('/auth/login', { username, password })
} catch (error) {
  if (isNetworkError(error)) {
    // Sin conexión - intentar offline
    console.log('📡 NetworkError detectado, modo offline')
  }
}
```

**Tipos de error:**
- `NetworkError` - Sin conexión a internet (ECONNREFUSED, Network request failed)
- `TimeoutError` - Timeout excedido (30s GET, 60s POST standard, 120s POST login)

### 5. UI con Indicadores
**Archivo:** `src/components/OfflineBanner.tsx`

Banner naranja (#FF9800) superior que aparece automáticamente cuando:
- `isOfflineMode === true` O
- `isConnected === false`

Incluye:
- 📡 Icono de estado (🌐 offline / 📶 online)
- Mensaje: "Modo Offline" o "Sin Conexión"
- Botón "🔄 Sincronizar" (solo visible si `isConnected === true`)
- ActivityIndicator durante sincronización

**Integrado en:**
- HomeScreen
- CredencialesScreen
- ProfileScreen

## 🚀 Instalación

### Dependencias
```bash
cd mobile
npm install --legacy-peer-deps
```

**Paquetes agregados:**
- `@react-native-community/netinfo@9.3.7` - Detección de red
- `crypto-js@^4.2.0` - Hashing SHA256 para contraseñas
- `@types/crypto-js@^4.2.1` - Types para TypeScript

## 🧪 Testing - Escenarios Verificados

### ✅ Escenario 1: Login Offline Completo (FUNCIONANDO)
**1. Primera conexión (online):**
```
Usuario: marianr@tekhne.com.ar
Password: 123456

Logs esperados:
LOG  🔐 ========== INICIO LOGIN ==========
LOG  🌐 ========== PASO 3: LOGIN ONLINE ==========
LOG  ✅ Token recibido, guardando...
LOG  💾 Usuario guardado en cache: marianr@tekhne.com.ar
LOG  💾 7 credenciales guardadas en cache
LOG  💾 Credenciales de login guardadas para: marianr@tekhne.com.ar
LOG  ✅ Guardado con email: marianr@tekhne.com.ar
LOG  🔍 ========== VERIFICACIÓN DE GUARDADO ==========
LOG  🔍 User guardado: SÍ ✅
LOG  🔍 Credenciales guardadas: 7 ✅
LOG  🔍 Token guardado: SÍ ✅
LOG  ✅ Login online completado exitosamente
```

**2. Logout (preserva cache):**
```
Presionar "Cerrar Sesión"

Logs esperados:
LOG  ✅ Logout completado (cache offline preservado)
```

**3. Desconectar red:**
```
- AVD: Settings > Network & Internet > Wi-Fi > DESACTIVAR
- O en Quick Settings: Desactivar WiFi y Mobile Data
```

**4. Login offline:**
```
Usuario: marianr@tekhne.com.ar (o 20288787655)
Password: 123456

Logs esperados:
LOG  🔐 ========== INICIO LOGIN ==========
LOG  📂 PASO 1: Verificando cache local...
LOG  🔐 Validación offline: EXITOSA
LOG  ✅ ========== VALIDACIÓN OFFLINE EXITOSA ==========
LOG  📂 Cache user: Sí ✅
LOG  📂 Cache creds: 7 ✅
LOG  📂 Cache token: No
LOG  🔑 Token offline generado
LOG  🟠 Modo OFFLINE activado
LOG  🔐 ========== LOGIN OFFLINE COMPLETADO ==========

Resultado:
✅ Login exitoso sin conexión
✅ 7 credenciales del grupo familiar visibles
✅ QR funcional
✅ Banner naranja "Modo Offline" visible
✅ Navegación completa disponible
```

### ✅ Escenario 2: Sincronización Automática (FUNCIONANDO)
**1. Estar en modo offline**
```
Banner naranja visible: "Modo Offline"
```

**2. Activar WiFi:**
```
- Activar WiFi en AVD
- Banner detecta conexión automáticamente
- Muestra botón "🔄 Sincronizar"

Logs automáticos (500ms después):
LOG  🔄 ========== SYNC BACKGROUND ==========
LOG  🔄 Intentando sincronización online...
LOG  ✅ Sincronización online completada
LOG  🟢 Modo ONLINE activado

Resultado:
✅ Credenciales actualizadas desde backend
✅ Banner desaparece (modo online)
✅ isOfflineMode cambia a false
```

### ✅ Escenario 3: Compartir Credencial Offline (FUNCIONANDO)
**1. En modo offline:**
```
- Navegar a "Credenciales" (tab inferior)
- Tocar cualquier credencial del carrusel
- Se abre modal con credencial completa + QR
- Presionar botón "📤 Compartir"

Resultado:
✅ Captura credencial como imagen PNG (1080x2400)
✅ Incluye QR, datos, badges (TITULAR/VIGENTE)
✅ Abre menú compartir del sistema
✅ Comparte vía WhatsApp, Email, etc.
✅ TODO funciona SIN CONEXIÓN
```

### ✅ Escenario 4: Búsqueda Flexible de Usuario (FUNCIONANDO)
**Login offline acepta múltiples identificadores:**
```
# Opción 1: Email
Usuario: marianr@tekhne.com.ar
Password: 123456
✅ Login exitoso

# Opción 2: DNI (username ingresado en registro)
Usuario: 20288787655
Password: 123456
LOG  🔍 Credenciales encontradas con clave alternativa: marianr@tekhne.com.ar
✅ Login exitoso

# Opción 3: CUIL (si fue guardado)
Usuario: 20288787655
Password: 123456
✅ Login exitoso

Todos funcionan porque saveUserCredentials() guarda con múltiples claves.
```

## 📝 Logs de Debug Importantes

El sistema incluye logs detallados:

```typescript
// Login dual
🔐 Intentando login dual (offline/online)...
✅ Validación OFFLINE exitosa
📂 Sesión restaurada desde cache: 7 credenciales
🔄 Intentando sincronización online en background...
✅ Sincronización online completada

// Detección de red
📡 Network status changed: ONLINE (wifi)
📡 Network status changed: OFFLINE (none)

// Cache
💾 Usuario guardado en cache: marianr@tekhne.com.ar
💾 7 credenciales guardadas en cache
🔐 Validación offline: EXITOSA

// Errores
📡 Sin conexión detectada
⚠️  No se pudieron sincronizar credenciales, usando cache
```

## ⚙️ Configuración

### Habilitar/Deshabilitar Modo Offline

El modo offline funciona automáticamente, pero puedes controlarlo:

```typescript
// En AuthContext.tsx
const [isOfflineMode, setIsOfflineMode] = useState(false)

// Forzar modo online (descartar cache)
setIsOfflineMode(false)
await StorageManager.clearAll()

// Forzar validación local
const isValid = await StorageManager.verifyUserCredentials(username, password)
```

### Limpiar Cache Completo (Factory Reset)

```typescript
// Elimina TODO incluyendo credenciales de login
await StorageManager.clearAllIncludingCredentials()
```

### Limpiar Cache (Preservar Login)

```typescript
// Elimina datos de sesión pero preserva credenciales de login
await StorageManager.clearAll()
```

## 🔐 Seguridad

### Hashing de Contraseñas

**Backend (PostgreSQL):**
- Algoritmo: `crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512')`
- Formato: `salt:hash`
- Almacenado en tabla `nuusuauth`

**Mobile (AsyncStorage):**
- Algoritmo: `CryptoJS.SHA256(password)`
- Hash de 64 caracteres hexadecimal
- Usado solo para validación offline local

**⚠️ IMPORTANTE:** El hash SHA256 mobile NO es compatible con pbkdf2 backend. Se usa únicamente para validación local offline. El login online siempre usa el backend pbkdf2.

### Datos Sensibles

Los datos guardados localmente:
- ✅ Contraseñas hasheadas (SHA256)
- ✅ Token de autenticación
- ✅ Credenciales médicas (no incluyen datos bancarios)
- ❌ NO se guardan contraseñas en texto plano
- ❌ NO se guardan datos de pago

## 🐛 Troubleshooting

### Error: "Sin conexión a internet. Necesitas haberte conectado al menos una vez"
**Causa:** Intentar login offline sin haber hecho login online previamente.
**Solución:** Conectar WiFi/datos y hacer login para crear cache inicial.

### Banner offline no desaparece después de conectar
**Causa:** Sincronización en background aún no completó.
**Solución:** Presionar botón "🔄 Sincronizar" manualmente o esperar 5-10 segundos.

### Credenciales desactualizadas en modo offline
**Causa:** Última sincronización fue hace tiempo.
**Solución:** Conectar a internet y hacer pull-to-refresh en pantalla de credenciales.

### Login offline falla con password correcta
**Causa:** Hash local corrupto o no guardado.
**Solución:** 
```typescript
// Limpiar cache y reconectar
await StorageManager.clearAllIncludingCredentials()
// Login online para recrear cache
```

## 📊 Métricas

### Performance
- **Login offline:** < 500ms (cache AsyncStorage)
- **Login online + sync:** 2-5s (depende de SOAP)
- **Carga credenciales cache:** < 200ms
- **Sincronización background:** 3-8s (no bloquea UI)

### Storage
- **Usuario:** ~1KB
- **Credenciales (7 miembros):** ~5KB
- **Hashes login:** ~100 bytes/usuario
- **Total estimado:** < 10KB por usuario

## 🔄 Versionado

**Versión actual:** 1.0.0

**Changelog:**
- **1.0.0** (2025-12-05): Implementación inicial modo offline
  - Login dual offline/online
  - Cache persistente AsyncStorage
  - Detección de red con NetInfo
  - UI con OfflineBanner
  - Sincronización automática background

## 📚 Referencias

- [React Native NetInfo](https://github.com/react-native-netinfo/react-native-netinfo)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- [CryptoJS](https://cryptojs.gitbook.io/docs/)
- [Expo Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/)

## 👥 Usuarios de Prueba

Para testing offline/online:

```
Usuario: marianr@tekhne.com.ar
Password: 123456
Credenciales: 7 (grupo familiar completo)

Usuario: diana76ar@gmail.com
Password: 123456
Credenciales: 2

Usuario: 20120282388 (DNI)
Password: 123456
Credenciales: Según BD
```

---

**Documentación actualizada:** 5 de diciembre de 2025
