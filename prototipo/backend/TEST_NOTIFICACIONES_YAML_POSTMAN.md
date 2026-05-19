# Testing API Notificaciones con YAML en Postman

Este documento explica cómo probar el endpoint `/api/notifications/send` con formato YAML en Postman usando **Basic Auth**.

---

## 🚀 Configuración Postman

### 1. Crear nuevo Request

1. Abrir Postman
2. Click en "New" → "HTTP Request"
3. Configurar:
   - **Method**: `POST`
   - **URL**: `http://localhost:3000/api/notifications/send`

### 2. Configurar Autenticación

**Opción A: Basic Auth (RECOMENDADO para testing)** ✅

1. Ir a la pestaña **"Authorization"**
2. Seleccionar **"Basic Auth"** en el dropdown
3. Ingresar credenciales:
   - **Username**: `admin@test.local`
   - **Password**: `admin123`
4. Postman generará automáticamente el header: `Authorization: Basic YWRtaW5AdGVzdC5sb2NhbDphZG1pbjEyMw==`

**Opción B: Bearer Token (para app móvil)**

Si prefieres usar JWT, primero hacer login en `/auth/login` y usar el token devuelto.

### 3. Configurar Headers

En la pestaña "Headers", agregar:

| Key | Value |
|-----|-------|
| `Content-Type` | `application/yaml` |
| `Accept` | `application/yaml` |

**Nota**: El header `Authorization` se agrega automáticamente desde la pestaña "Authorization".

### 4. Configurar Body

En la pestaña "Body":
1. Seleccionar **"raw"**
2. Cambiar el dropdown de "JSON" a **"Text"** (o "Other")
3. Pegar el siguiente contenido YAML:

```yaml
nuusuid: "0000000000000000000000000000000000000025"
tipo: autorizacion
titulo: Autorización Aprobada
mensaje: Tu solicitud #12345 ha sido aprobada exitosamente.
metadata:
  autorizacionId: 12345
  prestacion: Consulta médica
  estado: APROBADA
```

**Nota**: El `nuusuid` usado (`0000000000000000000000000000000000000025`) corresponde al usuario admin de testing.

---

## 📝 Ejemplos de Requests

### Ejemplo 1: Autorización Aprobada

**Headers:**
```
Content-Type: application/yaml
Accept: application/yaml
Authorization: Basic YWRtaW5AdGVzdC5sb2NhbDphZG1pbjEyMw==
```

**Request YAML:**
```yaml
nuusuid: "0000000000000000000000000000000000000025"
tipo: autorizacion
titulo: Autorización Aprobada
mensaje: Tu solicitud #12345 ha sido aprobada exitosamente.
metadata:
  autorizacionId: 12345
  prestacion: Consulta médica
  estado: APROBADA
```

**Response esperado (201):**
```yaml
success: true
notification:
  id: 821b27aa-91da-4ae2-ac41-92fae41e6418
  nuusuid: "0000000000000000000000000000000000000025"
  tipo: autorizacion
  titulo: Autorización Aprobada
  mensaje: Tu solicitud #12345 ha sido aprobada exitosamente.
  leida: false
  fecha_creacion: 2026-02-19T10:30:00.000Z
  metadata:
    autorizacionId: 12345
    prestacion: Consulta médica
    estado: APROBADA
```

### Ejemplo 2: Credencial próxima a vencer

**Request YAML:**
```yaml
nuusuid: "0000000000000000000000000000000000000025"
tipo: credencial
titulo: Credencial próxima a vencer
mensaje: Tu credencial digital vence en 5 días. Actualízala desde la app.
metadata:
  diasRestantes: 5
  fechaVencimiento: 2026-02-24
```

### Ejemplo 3: Mensaje de bienvenida

**Request YAML:**
```yaml
nuusuid: "0000000000000000000000000000000000000025"
tipo: general
titulo: Bienvenido a OSEP
mensaje: Gracias por registrarte. Tu credencial digital ya está disponible.
```

### Ejemplo 4: Notificación sin metadata

**Request YAML:**
```yaml
nuusuid: "0000000000000000000000000000000000000025"
tipo: general
titulo: Mantenimiento Programado
mensaje: La app estará en mantenimiento el sábado de 00:00 a 06:00 hs.
```

---

## ✅ Testing paso a paso

### Paso 1: Obtener credenciales

**Credenciales de testing (ya creadas):**
- **Email**: `admin@test.local`
- **Password**: `admin123`
- **Base64**: `YWRtaW5AdGVzdC5sb2NhbDphZG1pbjEyMw==`

Si necesitas generar el Base64 manualmente (PowerShell):
```powershell
$cred = "admin@test.local:admin123"
$base64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cred))
Write-Host $base64
# Output: YWRtaW5AdGVzdC5sb2NhbDphZG1pbjEyMw==
```

### Paso 2: Configurar Postman

1. **URL**: `http://localhost:3000/api/notifications/send`
2. **Method**: `POST`
3. **Authorization**: Basic Auth (`admin@test.local` / `admin123`)
4. **Headers**:
   - `Content-Type: application/yaml`
   - `Accept: application/yaml`
5. **Body**: YAML (ver ejemplos arriba)

### Paso 3: Enviar request

1. Click en **"Send"**
2. **Verificar respuesta**:
   - Status code: `201 Created`
   - Body: YAML con la notificación creada
   - Campo `success: true`

### Paso 4: Verificar en BD (opcional)

Ejecutar en PowerShell:

```powershell
# Conectar a PostgreSQL (requiere módulo PostgreSql)
$connectionString = "Host=localhost;Port=5432;Database=app_afiliados_genexus;Username=postgres;Password=12345678"

# Ver últimas notificaciones
$query = @"
SELECT id, nuusuid, tipo, titulo, fecha_creacion
FROM notifications
ORDER BY fecha_creacion DESC
LIMIT 5
"@

Invoke-PgQuery -ConnectionString $connectionString -Query $query | Format-Table
```

---

## 🐛 Errores comunes

### Error 401: Unauthorized

**Síntoma:**
```yaml
error: UNAUTHORIZED
message: Usuario o contraseña incorrectos
```

**Causas y soluciones:**

1. **Header mal formado:**
   - ✅ CORRECTO: `Authorization: Basic YWRtaW5AdGVzdC5sb2NhbDphZG1pbjEyMw==`
   - ❌ INCORRECTO: `Authorization: YWRtaW5AdGVzdC5sb2NhbDphZG1pbjEyMw==` (falta "Basic ")

2. **Base64 incorrecto:**
   - Verificar que el Base64 codifica "usuario:contraseña" (con los dos puntos)
   - Regenerar: `echo -n "admin@test.local:admin123" | base64`

3. **Credenciales inválidas:**
   - Verificar que el usuario existe en la BD
   - Usar credenciales de testing: `admin@test.local` / `admin123`

### Error 400: YAML_PARSE_ERROR

**Síntoma:**
```yaml
error: BAD_REQUEST
message: Error parseando YAML
```

**Causa**: Formato YAML inválido  
**Solución**: Verificar indentación (YAML usa 2 espacios, NO tabs)

**Ejemplo incorrecto:**
```yaml
metadata:
    autorizacionId: 12345  # ❌ 4 espacios (incorrecto)
```

**Ejemplo correcto:**
```yaml
metadata:
  autorizacionId: 12345  # ✅ 2 espacios
```

### Error 404: USER_NOT_FOUND

**Síntoma:**
```yaml
error: USER_NOT_FOUND
message: El usuario especificado no existe en la base de datos
```

**Causa**: El `nuusuid` no existe en la tabla `nuusuari`  
**Solución**: Usar un `nuusuid` válido:

```sql
-- Ver usuarios disponibles
SELECT nuusuid, nuusumail, nuusuapell 
FROM nuusuari 
WHERE nuusuid IS NOT NULL 
LIMIT 10;
```

### Error 400: VALIDATION_ERROR

**Síntoma:**
```yaml
error: VALIDATION_ERROR
message: Parámetros requeridos: nuusuid, tipo, titulo, mensaje
```

**Causa**: Falta algún campo obligatorio o excede límites  
**Solución**: Verificar:
- ✅ `nuusuid` no vacío (40 caracteres)
- ✅ `tipo` es uno de: `autorizacion`, `credencial`, `general`
- ✅ `titulo` no vacío y < 255 caracteres
- ✅ `mensaje` no vacío y < 5000 caracteres

---

## 🔄 Comparación JSON vs YAML

### Request en JSON

```json
{
  "nuusuid": "0000000000000000000000000000000000000025",
  "tipo": "autorizacion",
  "titulo": "Autorización Aprobada",
  "mensaje": "Tu solicitud ha sido aprobada",
  "metadata": {
    "autorizacionId": 12345
  }
}
```

### Request en YAML (equivalente)

```yaml
nuusuid: "0000000000000000000000000000000000000025"
tipo: autorizacion
titulo: Autorización Aprobada
mensaje: Tu solicitud ha sido aprobada
metadata:
  autorizacionId: 12345
```

**Ventajas YAML:**
- ✅ Más legible
- ✅ Menos caracteres especiales (no requires `{}`, `"` para todo)
- ✅ Menos propenso a errores de sintaxis
- ✅ Indentación visual más clara

---

## 📦 Script PowerShell de prueba rápida

Guardar como `test-notif-yaml-postman.ps1`:

```powershell
# Test rápido de API notificaciones con YAML + Basic Auth
$baseUrl = "http://localhost:3000"

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  TEST API NOTIFICACIONES YAML" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Credenciales Basic Auth
$username = "admin@test.local"
$password = "admin123"
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${username}:${password}"))

Write-Host "`n Credenciales:" -ForegroundColor Yellow
Write-Host "   Usuario: $username" -ForegroundColor Gray
Write-Host "   Base64:  $base64Auth" -ForegroundColor Gray

# Enviar notificación
Write-Host "`n Enviando notificacion..." -NoNewline

$timestamp = Get-Date -Format "o"
$notifBody = @"
nuusuid: "0000000000000000000000000000000000000025"
tipo: general
titulo: Test desde PowerShell
mensaje: Esta es una notificacion de prueba enviada con YAML + Basic Auth
metadata:
  test: true
  timestamp: $timestamp
  authType: BasicAuth
  usuario: $username
"@

$headers = @{
    Authorization = "Basic $base64Auth"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/notifications/send" `
        -Method Post `
        -Headers $headers `
        -Body $notifBody `
        -ContentType "application/yaml"

    Write-Host " OK" -ForegroundColor Green
    
    Write-Host "`n NOTIFICACION CREADA:" -ForegroundColor Cyan
    Write-Host "   ID:     $($response.notification.id)" -ForegroundColor White
    Write-Host "   Tipo:   $($response.notification.tipo)" -ForegroundColor White
    Write-Host "   Titulo: $($response.notification.titulo)" -ForegroundColor White
    Write-Host "   Fecha:  $($response.notification.fecha_creacion)" -ForegroundColor Gray
    
    Write-Host "`n=====================================" -ForegroundColor Cyan
    Write-Host "  TEST EXITOSO" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Cyan
    
} catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "`n ERROR:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`n   Detalles:" -ForegroundColor Yellow
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
    exit 1
}
```

**Ejecutar:**
```powershell
.\test-notif-yaml-postman.ps1
```

---

## 🔍 Colección Postman (JSON export)

Puedes importar esta colección en Postman:

```json
{
  "info": {
    "name": "API Notificaciones OSEP",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Enviar Notificación (YAML + Basic Auth)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/yaml"
          },
          {
            "key": "Accept",
            "value": "application/yaml"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "nuusuid: \"0000000000000000000000000000000000000025\"\ntipo: general\ntitulo: Test desde Postman\nmensaje: Notificación de prueba con YAML y Basic Auth\nmetadata:\n  test: true\n  source: postman"
        },
        "url": {
          "raw": "http://localhost:3000/api/notifications/send",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "notifications", "send"]
        },
        "auth": {
          "type": "basic",
          "basic": [
            {
              "key": "username",
              "value": "admin@test.local"
            },
            {
              "key": "password",
              "value": "admin123"
            }
          ]
        }
      }
    }
  ]
}
```

**Importar en Postman:**
1. Copiar el JSON de arriba
2. En Postman: File → Import → Raw text → Pegar → Import
3. La colección aparecerá en el sidebar izquierdo

---

## 📞 Soporte

**Documentación relacionada:**
- 📂 Integración completa: `INTEGRACION_NOTIFICACIONES_SISTEMAS.md`
- 📂 API REST completa: `backend/API_NOTIFICACIONES.md`
- 🧪 Script PowerShell: `backend/test-notif-basic-auth.ps1`
- 🔧 Backend: `backend/server-soap.js`

**Credenciales de testing:**
- Email: `admin@test.local`
- Password: `admin123`
- Base64: `YWRtaW5AdGVzdC5sb2NhbDphZG1pbjEyMw==`
- nuusuid: `0000000000000000000000000000000000000025`

---

**Última actualización:** 19 de febrero de 2026  
**Versión:** 2.0 - Basic Auth + YAML
