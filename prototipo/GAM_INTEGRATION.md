# Integración GAM - APP_Afiliados

## 📋 Resumen Ejecutivo

Este documento describe la integración del sistema **GAM (GeneXus Access Manager)** en APP_Afiliados para gestionar la autenticación de usuarios. El campo **`UserID`** de GAM reemplaza al `nuusuid` generado localmente.

---

## 🎯 Cambios Principales

## 🔀 Modo GAM Opcional (nuevo)

La integración GAM puede activarse o desactivarse por parámetro sin redeploy.

- Parámetro BD: `SEGURIDAD_APP.HabilitarGAM`
- Valores:
  - `S`: flujo GAM habilitado
  - `N`: flujo GAM deshabilitado (fallback local para login/register)

Comportamiento de endpoints `/gam/*`:

- Con `HabilitarGAM=S`: operan normalmente
- Con `HabilitarGAM=N`: responden `410` con `code: GAM_DISABLED`

Notas de implementación:

- El backend consulta el flag en `gamService.isGAMEnabled()`
- `POST /register` y `POST /auth/login` ahora bifurcan por este flag
- El guard `/gam/*` evalúa el parámetro con `forceRefresh` para aplicar cambios inmediatamente

### Antes (Sistema Actual)
```
1. Usuario se registra → SOAP REGISTRACION (Beneficiarios)
2. Backend genera nuusuid (PostgreSQL sequence)
3. Guarda en nuusuari + contraseña local en nuusuauth
4. Login valida contra nuusuauth (PostgreSQL)
```

### Ahora (Con GAM)
```
1. Usuario se registra → GAM NURegistroUsuario
2. GAM devuelve UserID → usar como nuusuid
3. Guardar en nuusuari con UserID de GAM
4. Login → GAM OAuth2 (access_token)
5. Todas las operaciones usan token GAM
```

---

## 🔐 Configuración GAM

### Credenciales (en `backend/config.json`)
```json
{
  "gam": {
    "baseUrl": "https://test17.osep.gob.ar/APP_OSEP_TEST",
    "clientId": "c26AzH82zzA6U4CVE5kh6l6dHAGPQYKSLg0Q9xm3",
    "clientSecret": "Qkz9ESBUq3GY2CcHXTmCxBAmPo6flP4yc5SeWiY1SQxghzxDuT5moH8Le7MrsZGrtYaozAGasRIUkGhw",
    "timeout": 30000,
    "enabled": true
  }
}
```

### Variables de Entorno (alternativa)
```bash
GAM_BASE_URL=https://test17.osep.gob.ar/APP_OSEP_TEST
GAM_CLIENT_ID=c26AzH82zzA6U4CVE5kh6l6dHAGPQYKSLg0Q9xm3
GAM_CLIENT_SECRET=Qkz9ESBUq3GY2CcHXTmCxBAmPo6flP4yc5SeWiY1SQxghzxDuT5moH8Le7MrsZGrtYaozAGasRIUkGhw
```

---

## 📡 Servicios GAM Implementados

### 1. Registro de Usuario
**Función:** `registerUserGAM(userData)`  
**Endpoint GAM:** `POST /rest/Nucleo/NURegistroUsuario`

```javascript
const resultado = await gamService.registerUserGAM({
  email: 'usuario@example.com',
  password: 'MiPassword123!',
  firstName: 'Juan',
  lastName: 'Perez',
  telefono: '3834888888',
  nroAfiliado: '07-12345678-00',
  documento: '12345678',
  cuil: '20123456789',
  sexo: 'M',
  fechaNacimiento: '1985-04-15',
  canMiembrosFamiliar: 1
});

console.log('UserID:', resultado.userId); // Este será el nuusuid
```

### 2. Login OAuth2
**Función:** `loginGAM(username, password)`  
**Endpoint GAM:** `POST /oauth/access_token`

```javascript
const login = await gamService.loginGAM(
  'usuario@example.com',
  'MiPassword123!'
);

console.log('Access Token:', login.access_token);
console.log('User ID:', login.user_id);
console.log('Expires in:', login.expires_in); // segundos
```

### 3. Obtener Info de Usuario
**Función:** `getUserInfo(accessToken)`  
**Endpoint GAM:** `GET /oauth/userinfo`

```javascript
const userInfo = await gamService.getUserInfo(accessToken);

console.log('Username:', userInfo.username);
console.log('Email:', userInfo.email);
console.log('Roles:', userInfo.roles);
```

### 4. Validar Usuario
**Función:** `validateUserGAM(validationData)`  
**Endpoint GAM:** `POST /rest/Nucleo/NUValidoUsuario`

```javascript
const validation = await gamService.validateUserGAM({
  nroAfiliado: '07-12345678-00',
  documento: '12345678',
  cuil: '20123456789',
  sexo: 'M',
  fechaNacimiento: '1985-04-15',
  canMiembrosFamiliar: 1
});

console.log('Válido:', validation.valid);
console.log('Usuario existe:', validation.userExists);
```

### 5. Cambiar Contraseña
**Función:** `changePasswordGAM(accessToken, username, currentPassword, newPassword)`  
**Endpoint GAM:** `POST /rest/Nucleo/NUCambiaContrasenaUsuario`

```javascript
await gamService.changePasswordGAM(
  accessToken,
  'usuario@example.com',
  'PasswordActual123!',
  'PasswordNuevo456!'
);
```

### 6. Recuperación de Contraseña
**Función:** `passwordRecoveryGAM(email)`  
**Endpoint GAM:** `POST /rest/Nucleo/NUEnvioMailRecuPassword`

```javascript
await gamService.passwordRecoveryGAM('usuario@example.com');
// Envía email con link de recuperación
```

### 7. Enviar Código de Validación
**Función:** `sendValidationCodeEmail(email, codigo)`  
**Endpoint GAM:** `POST /rest/Nucleo/NUEnvioMailValidacion`

```javascript
await gamService.sendValidationCodeEmail(
  'usuario@example.com',
  1234
);
```

### 8. Anular Registro
**Función:** `cancelRegistrationGAM(accessToken)`  
**Endpoint GAM:** `POST /rest/Nucleo/NUAnulaRegistracion`

```javascript
await gamService.cancelRegistrationGAM(accessToken);
// Cancela/desactiva el registro del usuario
```

---

## 🔄 Flujo de Integración

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│                    REGISTRO NUEVO USUARIO                    │
└─────────────────────────────────────────────────────────────┘

  1. Mobile/Web → POST /gam/register
                    ↓
  2. Backend → gamService.registerUserGAM()
                    ↓
  3. GAM API → POST /rest/Nucleo/NURegistroUsuario
                    ↓
  4. GAM devuelve: { userId, success }
                    ↓
  5. Backend guarda en nuusuari:
     - nuusuid = userId (de GAM)
     - nuusumail, nuusunroaf, etc.
                    ↓
  6. Backend NO guarda contraseña local
     (GAM maneja autenticación)
                    ↓
  7. Respuesta → { success, userId, message }


┌─────────────────────────────────────────────────────────────┐
│                    LOGIN USUARIO EXISTENTE                   │
└─────────────────────────────────────────────────────────────┘

  1. Mobile/Web → POST /gam/login
                    { username, password }
                    ↓
  2. Backend → gamService.loginGAM()
                    ↓
  3. GAM API → POST /oauth/access_token
                    ↓
  4. GAM devuelve: { access_token, user_id, expires_in }
                    ↓
  5. Backend busca en nuusuari:
     WHERE nuusuid = user_id
                    ↓
  6. Backend carga credenciales SOAP (si existen)
                    ↓
  7. Respuesta → { 
       access_token,  // Token GAM (NO token local)
       user: { ... },
       credenciales: [ ... ]
     }


┌─────────────────────────────────────────────────────────────┐
│                    REQUESTS AUTENTICADOS                     │
└─────────────────────────────────────────────────────────────┘

  Todos los requests usan:
  Header: Authorization: Bearer <access_token_gam>

  Backend valida con:
  gamService.getUserInfo(access_token)
  
  Si válido → procesa request
  Si inválido/expirado → 401 Unauthorized
```

---

## 🛠️ Endpoints Backend

### Nuevos Endpoints GAM

#### POST /gam/register
Registra usuario vía GAM y guarda UserID como nuusuid

```bash
POST http://localhost:3000/gam/register
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "MiPassword123!",
  "firstName": "Juan",
  "lastName": "Perez",
  "telefono": "3834888888",
  "nroAfiliado": "07-12345678-00",
  "documento": "12345678",
  "cuil": "20123456789",
  "sexo": "M",
  "fechaNacimiento": "1985-04-15",
  "canMiembrosFamiliar": 1
}
```

**Respuesta:**
```json
{
  "success": true,
  "userId": "gam-user-12345",
  "nuusuid": "gam-user-12345",
  "message": "Usuario registrado exitosamente"
}
```

#### POST /gam/login
Login OAuth2 con GAM

```bash
POST http://localhost:3000/gam/login
Content-Type: application/json

{
  "username": "usuario@example.com",
  "password": "MiPassword123!"
}
```

**Respuesta:**
```json
{
  "access_token": "87a56d6d-edea-4507-a6c3-bf322228db93...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user_id": "gam-user-12345",
  "user": {
    "nuusuid": "gam-user-12345",
    "email": "usuario@example.com",
    "apellido": "Perez, Juan"
  },
  "credenciales": []
}
```

#### GET /gam/userinfo
Obtiene info del usuario autenticado

```bash
GET http://localhost:3000/gam/userinfo
Authorization: Bearer <access_token>
```

**Respuesta:**
```json
{
  "user_id": "gam-user-12345",
  "username": "usuario@example.com",
  "email": "usuario@example.com",
  "first_name": "Juan",
  "last_name": "Perez",
  "roles": ["user", "affiliate"]
}
```

#### POST /gam/change-password
Cambia contraseña del usuario

```bash
POST http://localhost:3000/gam/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "MiPassword123!",
  "newPassword": "NuevoPassword456!"
}
```

#### POST /gam/password-recovery
Inicia recuperación de contraseña

```bash
POST http://localhost:3000/gam/password-recovery
Content-Type: application/json

{
  "email": "usuario@example.com"
}
```

---

## 📦 Migración de Base de Datos

### Campo nuusuid
**ANTES:** Generado por sequence PostgreSQL  
**AHORA:** Recibido desde GAM como UserID (string)

### Script de Migración
```sql
-- Preparar tabla nuusuari para recibir UserID de GAM
ALTER TABLE nuusuari ALTER COLUMN nuusuid TYPE VARCHAR(100);

-- Agregar índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_nuusuari_gamid ON nuusuari(nuusuid);

-- Agregar columna para identificar origen
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusugamid VARCHAR(100);
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusugamtok TEXT;
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusugamexp TIMESTAMP;

COMMENT ON COLUMN nuusuari.nuusugamid IS 'GAM UserID original';
COMMENT ON COLUMN nuusuari.nuusugamtok IS 'Último access_token GAM';
COMMENT ON COLUMN nuusuari.nuusugamexp IS 'Fecha expiración token GAM';
```

---

## ✅ Testing

### Script de Prueba
```powershell
cd backend
.\test-gam-integration.ps1
```

### Smoke test de GAM opcional

```powershell
cd backend
.\test-gam-optional.ps1
```

Este test:

1. Login admin
2. Guarda `HabilitarGAM=S` y valida que `/gam/userinfo` no quede bloqueado por guard (`401` esperado)
3. Guarda `HabilitarGAM=N` y valida bloqueo por guard (`410` esperado)
4. Con `HabilitarGAM=N`, valida que `/auth/login` responda controlado (`401` esperado para usuario inexistente)
5. Restaura el valor original

Este script ejecuta:
1. Test directo de `gamService.js` (Node.js)
2. Validación de usuario (puede fallar si no existe)
3. Registro de usuario GAM
4. Login OAuth2
5. Obtener info de usuario
6. Endpoints REST del backend

### Salida Esperada
```
🔐 Test de Integración GAM - APP_Afiliados
================================================

📋 Datos de prueba:
{
  "email": "test.gam.20251216150000@example.com",
  "password": "TestGAM123!",
  ...
}

✅ Backend activo

🔐 Testing GAM Base URL: https://test17.osep.gob.ar/APP_OSEP_TEST
🔐 Testing GAM Client ID: c26AzH82zzA6U4CVE5...

--- Test 1: Validar Usuario ---
❌ Validación falló (esperado si usuario no existe)

--- Test 2: Registrar Usuario ---
✅ Registro exitoso: { success: true, userId: 'gam-user-12345' }
📋 UserID (será nuusuid): gam-user-12345

--- Test 3: Login OAuth2 ---
✅ Login exitoso
📋 Access Token (primeros 50 chars): 87a56d6d-edea-4507-a6c3-bf322228db93...
📋 User ID: gam-user-12345
📋 Expires in: 3600 segundos

--- Test 4: Obtener Info Usuario ---
✅ Info usuario obtenida: { ... }
```

---

## 🔒 Seguridad

### Tokens GAM
- **Almacenamiento:** Solo en memoria del backend (sesión)
- **Transmisión:** Solo HTTPS en producción
- **Expiración:** Respetada desde GAM (`expires_in`)
- **Renovación:** Implementar refresh antes de expiración

### Contraseñas
- **NO se guardan localmente:** GAM gestiona autenticación
- **Tabla nuusuauth:** Se puede deprecar o usar solo para usuarios legacy
- **Recuperación:** Delegada a GAM (`/rest/Nucleo/NUEnvioMailRecuPassword`)

### Client Secret
- **NUNCA exponer en frontend**
- **Solo en backend/config.json**
- **Usar variables de entorno en producción**

---

## 📱 Integración Mobile

### Cambios en AuthContext
```typescript
// mobile/src/contexts/AuthContext.tsx

interface AuthContextData {
  user: User | null;
  access_token: string | null; // Token GAM (no token local)
  expires_in: number | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
  isOfflineMode: boolean;
}

// Login con GAM
const signIn = async (username: string, password: string) => {
  try {
    // Intentar login online con GAM
    const response = await apiPost('/gam/login', { username, password });
    
    setUser(response.user);
    setAccessToken(response.access_token);
    setExpiresIn(response.expires_in);
    
    // Guardar en AsyncStorage
    await AsyncStorage.setItem('gam_token', response.access_token);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));
    
  } catch (error) {
    // Fallback a modo offline (si hay cache)
    const cachedUser = await AsyncStorage.getItem('user');
    if (cachedUser) {
      setUser(JSON.parse(cachedUser));
      setIsOfflineMode(true);
    } else {
      throw error;
    }
  }
};
```

### Cambios en api.ts
```typescript
// mobile/src/services/api.ts

export async function apiGet(endpoint: string) {
  const token = await AsyncStorage.getItem('gam_token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  });
  
  if (response.status === 401) {
    // Token expirado - logout
    await AsyncStorage.removeItem('gam_token');
    // Navegar a login
  }
  
  return response.json();
}
```

---

## 🚀 Despliegue

### Checklist Pre-Producción
- [ ] Actualizar `GAM_BASE_URL` a producción
- [ ] Mover `client_id` y `client_secret` a variables de entorno
- [ ] Habilitar HTTPS obligatorio
- [ ] Configurar rate limiting en endpoints GAM
- [ ] Implementar logging de auditoría
- [ ] Documentar proceso de renovación de tokens
- [ ] Testear recuperación de contraseña end-to-end
- [ ] Migrar usuarios existentes a GAM (si aplica)

### Variables de Entorno Producción
```bash
NODE_ENV=production
GAM_BASE_URL=https://produccion.osep.gob.ar/APP_OSEP
GAM_CLIENT_ID=<client_id_produccion>
GAM_CLIENT_SECRET=<client_secret_produccion>
GAM_TIMEOUT=30000
```

---

## 📚 Referencias

- **Documentación GAM:** [GAM_Authentication_Documentation.md](GAM_Authentication_Documentation.md)
- **Código gamService:** [backend/gamService.js](backend/gamService.js)
- **Script de prueba:** [backend/test-gam-integration.ps1](backend/test-gam-integration.ps1)
- **Configuración:** [backend/config.json](backend/config.json)

---

## 🐛 Troubleshooting

### Error: "ECONNREFUSED" al llamar GAM
**Causa:** URL de GAM incorrecta o servicio GAM caído  
**Solución:** Verificar `GAM_BASE_URL` y conectividad

### Error: "Invalid client credentials"
**Causa:** `client_id` o `client_secret` incorrectos  
**Solución:** Verificar credenciales en config.json

### Error: "User not found" en login
**Causa:** Usuario no registrado en GAM  
**Solución:** Registrar primero con `/gam/register`

### Token expirado (401)
**Causa:** Token GAM expiró  
**Solución:** Implementar renovación automática o solicitar nuevo login

---

**Última actualización:** 16 de diciembre de 2025  
**Versión:** 1.0.0  
**Autor:** Sistema APP_Afiliados
