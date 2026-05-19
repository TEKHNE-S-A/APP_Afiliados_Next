# Test de Integración GAM desde App Móvil

**Fecha**: 16 de diciembre de 2025

## Estado del Entorno

### Backend
- ✅ Servidor corriendo en `http://localhost:3000`
- ✅ Integración GAM habilitada (`config.gam.enabled = true`)
- ✅ Endpoints disponibles:
  - `POST /register` - Registro con SOAP + GAM
  - `POST /auth/login` - Login con credenciales locales o GAM
  - `GET /auth/me` - Perfil del usuario autenticado
  - `GET /credencial` - Credenciales del grupo familiar

### Frontend (Mobile)
- ✅ Expo/Metro corriendo en puerto 8081
- ✅ AVD activo (emulator-5554)
- ✅ Configuración vía `.env`: `USE_MOCK=false`, `API_BASE_URL_ANDROID=http://10.0.2.2:3000`
- ✅ Ubicación: `USE_MOCK_LOCATION=false` (en release usa GPS real)

### Integración GAM
- ✅ Base URL: `https://test17.osep.gob.ar/APP_OSEP_TEST`
- ✅ Client ID: `c26AzH82zzA6U4CVE5kh6l6dHAGPQYKSLg0Q9xm3`
- ✅ Client Secret configurado
- ✅ Flujo completo: SOAP → GAM Register → GAM Login → UserInfo → PostgreSQL

## Pasos para Probar desde la App

### 1. Registro de Nuevo Usuario

**Datos de prueba válidos** (afiliado real en SOAP):
- **DNI**: 7126269
- **CUIL**: 20071262692
- **Nro Afiliado**: 0712626900
- **Fecha Nacimiento**: 19/07/1978
- **Sexo**: M
- **Email**: (usar único cada vez, ej: `test.mobile.YYYYMMDDHHmmss@example.com`)
- **Password**: `Pass1234!` (mínimo 8 caracteres para GAM)
- **Teléfono**: 2612345678
- **Cantidad Integrantes**: 2

**Flujo esperado**:
1. Usuario abre la app en AVD
2. Va a pantalla de registro
3. Completa formulario con datos arriba
4. Presiona "Registrarse"
5. Backend valida con SOAP BENEFICIARIOS
6. Backend registra en GAM (obtiene GUID)
7. Backend guarda en PostgreSQL con `nuusuid = GUID de GAM`
8. App recibe respuesta exitosa con `nuusuid` y datos del usuario
9. App navega a Home o Login

**Respuesta esperada del backend**:
```json
{
  "success": true,
  "message": "Usuario registrado (SOAP)",
  "data": {
    "nuusuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "afiliadoId": "000000063000000000001000000063",
    "apellido": "NIEVA",
    "nombre": "DIEGO JAVIER",
    "apellidoNombre": "NIEVA, DIEGO JAVIER",
    "planId": "1",
    "planDescripcion": "PLAN UNICO",
    "esTitular": "S",
    "afiliadoNro": "0712626900",
    "gam": {
      "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "registered": true,
      "hasToken": false
    }
  }
}
```

### 2. Login con Usuario Registrado

**Opciones de login**:
- **Por email**: `test.mobile.20251216145410@example.com`
- **Por DNI**: `7126269`
- **Por CUIL**: `20071262692`
- **Password**: `Pass1234!`

**Flujo esperado**:
1. Usuario ingresa credenciales (email/DNI/CUIL + password)
2. Backend busca en PostgreSQL (búsqueda flexible)
3. Backend verifica contraseña hasheada con `pbkdf2Sync`
4. Backend sincroniza credenciales desde SOAP (si tiene AfiliadoId)
5. Backend devuelve token + user + credenciales del grupo familiar
6. App guarda token en AsyncStorage
7. App navega a HomeScreen con credenciales

**Respuesta esperada del backend**:
```json
{
  "token": "generated_jwt_token_or_session_id",
  "user": {
    "nuusuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "email": "test.mobile.20251216145410@example.com",
    "apellido": "NIEVA",
    "nombre": "DIEGO JAVIER",
    "cuil": "20071262692",
    "afiliadoId": "000000063000000000001000000063"
  },
  "credenciales": [
    {
      "crcretitu": "S",
      "nombre": "DIEGO JAVIER NIEVA",
      "parentesco": "TITULAR",
      "cuil": "20071262692",
      "nroAfiliado": "0712626900",
      "fechaVencimiento": "2025-12-26T00:00:00.000Z"
    }
  ]
}
```

### 3. Verificación en Base de Datos

Consultar PostgreSQL para verificar registro:

```sql
-- Verificar usuario en nuusuari
SELECT nuusuid, nuusumail, nuusuapell, nuusuafili, nuusugamid 
FROM nuusuari 
WHERE nuusumail LIKE '%test.mobile%' 
ORDER BY nuusumailf DESC 
LIMIT 5;

-- Verificar contraseña en nuusuauth
SELECT nuusuid, LENGTH(nuusupass) as pass_length, nuusucrea 
FROM nuusuauth 
WHERE nuusuid IN (
  SELECT nuusuid FROM nuusuari WHERE nuusumail LIKE '%test.mobile%'
);

-- Verificar credenciales sincronizadas
SELECT c.crcreusid, c.crcrenomb, c.crcretitu, c.crcreparent, c.crcrevenc
FROM crcreden c
JOIN nuusuari u ON c.crcreusid = u.nuusuid
WHERE u.nuusumail LIKE '%test.mobile%';
```

## Debugging desde App Móvil

### Ver logs del backend en tiempo real

En una terminal de PowerShell separada:
```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados\backend
.\start-backend-logs.ps1
```

### Ver logs de Metro/Expo
El terminal donde corre `npx expo start` muestra logs de:
- Requests HTTP desde la app
- Errores de red
- Console.log del código React Native

### Capturar logs del AVD (Logcat)
```powershell
adb logcat | Select-String "ReactNativeJS"
```

## Endpoints de Testing Directo

Mientras la app está abierta, puedes probar endpoints manualmente:

```powershell
# Test de registro
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$registerData = @{
    email = "test.direct.$timestamp@example.com"
    password = "Pass1234!"
    dni = "7126269"
    cuil = "20071262692"
    nroAfiliado = "0712626900"
    sexo = "M"
    fechaNacimiento = "19/07/1978"
    cantidadIntegrantes = 2
    telefono = "2612345678"
    registracionconnroafiliado = "S"
    registracioncondni = "S"
    registracionconcuil = "S"
}
Invoke-RestMethod -Uri "http://localhost:3000/register" -Method POST `
    -ContentType "application/json" `
    -Body ($registerData | ConvertTo-Json)

# Test de login
$loginData = @{
    username = "test.direct.$timestamp@example.com"
    password = "Pass1234!"
}
Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST `
    -ContentType "application/json" `
    -Body ($loginData | ConvertTo-Json)
```

## Problemas Comunes

### 1. "Network request failed"
- Verificar que backend esté corriendo: `Test-NetConnection localhost -Port 3000`
- Verificar configuración en `mobile/.env`
- Para AVD debe ser `http://10.0.2.2:3000` (NO localhost)
- Para dispositivo físico USB: `adb reverse tcp:3000 tcp:3000`

### 2. "Cannot read property 'nuusuid' of undefined"
- Backend devolvió error (revisar logs)
- Estructura de respuesta incorrecta
- Verificar que el endpoint existe

### 3. "Invalid credentials"
- Password debe tener mínimo 8 caracteres
- Verificar que usuario esté registrado en BD
- Probar con búsqueda flexible (email, DNI o CUIL)

### 4. "GAM no devolvió userId"
- GAM puede estar offline
- Backend continúa con registro legacy (sin GAM)
- Revisar logs del backend para detalles

### 5. AVD no conecta al backend
```powershell
# Verificar conectividad desde AVD
adb shell ping -c 4 10.0.2.2
```

## Resultado Esperado

Si todo funciona correctamente:

1. ✅ Usuario se registra exitosamente
2. ✅ `nuusuid` es un GUID de GAM (formato UUID)
3. ✅ Usuario puede hacer login con email/DNI/CUIL
4. ✅ App muestra HomeScreen con credencial titular
5. ✅ Credenciales del grupo familiar disponibles
6. ✅ QR code se genera correctamente
7. ✅ Token temporal visible en credencial

## Próximos Pasos

Una vez validado el flujo básico:
- [ ] Probar recuperación de contraseña (GAM)
- [ ] Probar cambio de contraseña (GAM)
- [ ] Probar modo offline (sin GAM)
- [ ] Probar sincronización de credenciales
- [ ] Probar funcionalidades SIA (autorizaciones, coseguros, etc.)
