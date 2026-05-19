# API de Notificaciones — Documentación para Integración

## 📋 Información General

**Base URL:** `http://localhost:3000` (desarrollo) o tu dominio en producción  
**Autenticación:** Bearer Token (JWT) — requerido en header `Authorization`  
**Formato:** JSON (Content-Type: application/json)

---

## 🔐 Autenticación

Todos los endpoints requieren un token JWT válido:

```http
Authorization: Bearer <token>
```

Para obtener un token, hacer login primero:

```bash
POST /auth/login
Content-Type: application/json

{
  "username": "usuario@email.com",
  "password": "123456"
}

# Respuesta:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": { ... }
}
```

---

## 📬 Estructura de Notificación

```typescript
interface Notification {
  id: string;                    // UUID
  nuusuid: string;               // ID del usuario (relación con tabla nuusuari)
  tipo: string;                  // 'autorizacion' | 'credencial' | 'general'
  titulo: string;                // Título corto (max 255 chars)
  mensaje: string;               // Mensaje completo (text)
  leida: boolean;                // true si fue leída
  fecha_creacion: string;        // ISO 8601 datetime
  fecha_leida: string | null;    // ISO 8601 datetime o null
  metadata: object | null;       // JSON arbitrario para datos extra
}
```

### Tipos de Notificación

- **`autorizacion`**: Relacionadas con solicitudes de autorización (aprobadas, rechazadas, pendientes)
- **`credencial`**: Actualizaciones de credencial digital (vencimiento, renovación)
- **`general`**: Mensajes informativos del sistema (bienvenida, mantenimientos, novedades)

---

## 🛠️ Endpoints Disponibles

### 1. Listar Notificaciones (GET /notifications)

Lista notificaciones del usuario autenticado con paginación y filtros.

**Request:**
```http
GET /notifications?page=1&limit=20&tipo=autorizacion&leida=false&fecha_desde=2026-01-01
Authorization: Bearer <token>
```

**Query Parameters:**

| Parámetro      | Tipo    | Requerido | Default             | Descripción                                     |
|----------------|---------|-----------|---------------------|-------------------------------------------------|
| `page`         | number  | No        | 1                   | Número de página (empieza en 1)                |
| `limit`        | number  | No        | 20                  | Registros por página (1-100)                    |
| `orderBy`      | string  | No        | `fecha_creacion`    | Campo para ordenar (`fecha_creacion`, `tipo`, `leida`) |
| `orderDir`     | string  | No        | `desc`              | Dirección del orden (`asc` o `desc`)            |
| `tipo`         | string  | No        | -                   | Filtrar por tipo: `autorizacion`, `credencial`, `general` |
| `leida`        | boolean | No        | -                   | Filtrar por estado: `true` o `false`            |
| `fecha_desde`  | string  | No        | -                   | Filtrar desde fecha (formato: `YYYY-MM-DD` o ISO 8601) |
| `fecha_hasta`  | string  | No        | -                   | Filtrar hasta fecha (formato: `YYYY-MM-DD` o ISO 8601) |

**Response Success (200):**
```json
{
  "notifications": [
    {
      "id": "821b27aa-91da-4ae2-ac41-92fae41e6418",
      "tipo": "autorizacion",
      "titulo": "Autorización Aprobada",
      "mensaje": "Tu solicitud de autorización para consulta médica ha sido aprobada.",
      "leida": false,
      "fecha_creacion": "2026-02-03T10:30:00.000Z",
      "fecha_leida": null,
      "metadata": {
        "autorizacionId": "12345",
        "prestacion": "Consulta médica"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 10,
    "totalPages": 1
  }
}
```

**Ejemplo cURL:**
```bash
curl -X GET "http://localhost:3000/notifications?page=1&limit=10&tipo=autorizacion&leida=false" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

**Ejemplo PowerShell:**
```powershell
$headers = @{ "Authorization" = "Bearer $token" }
$response = Invoke-RestMethod -Uri "http://localhost:3000/notifications?page=1&limit=10" -Headers $headers
$response.notifications | Format-Table tipo, titulo, leida
```

---

### 2. Contar No Leídas (GET /notifications/unread-count)

Devuelve el número de notificaciones no leídas del usuario.

**Request:**
```http
GET /notifications/unread-count
Authorization: Bearer <token>
```

**Response Success (200):**
```json
{
  "unreadCount": 5
}
```

**Ejemplo cURL:**
```bash
curl -X GET "http://localhost:3000/notifications/unread-count" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

**Ejemplo PowerShell:**
```powershell
$headers = @{ "Authorization" = "Bearer $token" }
$response = Invoke-RestMethod -Uri "http://localhost:3000/notifications/unread-count" -Headers $headers
Write-Host "No leídas: $($response.unreadCount)"
```

---

### 3. Marcar como Leída (PUT /notifications/:id/mark-read)

Marca una notificación específica como leída.

**Request:**
```http
PUT /notifications/821b27aa-91da-4ae2-ac41-92fae41e6418/mark-read
Authorization: Bearer <token>
```

**URL Parameters:**

| Parámetro | Tipo   | Requerido | Descripción                |
|-----------|--------|-----------|----------------------------|
| `id`      | string | Sí        | UUID de la notificación    |

**Response Success (200):**
```json
{
  "notification": {
    "id": "821b27aa-91da-4ae2-ac41-92fae41e6418",
    "tipo": "autorizacion",
    "titulo": "Autorización Aprobada",
    "mensaje": "Tu solicitud de autorización para consulta médica ha sido aprobada.",
    "leida": true,
    "fecha_creacion": "2026-02-03T10:30:00.000Z",
    "fecha_leida": "2026-02-03T14:45:00.000Z",
    "metadata": null
  }
}
```

**Response Error (404):**
```json
{
  "error": "NOT_FOUND",
  "message": "Notificación no encontrada"
}
```

**Response Error (403):**
```json
{
  "error": "FORBIDDEN",
  "message": "No tienes permiso para modificar esta notificación"
}
```

**Ejemplo cURL:**
```bash
curl -X PUT "http://localhost:3000/notifications/821b27aa-91da-4ae2-ac41-92fae41e6418/mark-read" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

**Ejemplo PowerShell:**
```powershell
$headers = @{ "Authorization" = "Bearer $token" }
$notifId = "821b27aa-91da-4ae2-ac41-92fae41e6418"
$response = Invoke-RestMethod -Uri "http://localhost:3000/notifications/$notifId/mark-read" -Method Put -Headers $headers
Write-Host "Notificación marcada: $($response.notification.titulo)"
```

---

### 4. Marcar Todas como Leídas (POST /notifications/mark-all-read)

Marca TODAS las notificaciones no leídas del usuario como leídas.

**Request:**
```http
POST /notifications/mark-all-read
Authorization: Bearer <token>
```

**Response Success (200):**
```json
{
  "success": true,
  "count": 5,
  "message": "5 notificaciones marcadas como leídas"
}
```

**Ejemplo cURL:**
```bash
curl -X POST "http://localhost:3000/notifications/mark-all-read" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

**Ejemplo PowerShell:**
```powershell
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$response = Invoke-RestMethod -Uri "http://localhost:3000/notifications/mark-all-read" -Method Post -Headers $headers
Write-Host "✅ $($response.count) notificaciones marcadas como leídas"
```

---

### 5. Crear Notificación (POST /api/notifications/send) ⭐ NUEVO

Crea una notificación nueva con validaciones automáticas y envío de push notifications.

> 🔒 **Requiere autenticación:** Bearer Token  
> ⚡ **Funcionalidad automática:**  
> - Validaciones de datos (usuario existe, tipo válido, límites de caracteres)
> - Envío automático de push notification si el usuario tiene dispositivos registrados
> - Persistencia en base de datos PostgreSQL
> - Logging de operaciones

**Request:**
```http
POST /api/notifications/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "nuusuid": "0000000000000000000000000000000000000024",
  "tipo": "autorizacion",
  "titulo": "Autorización Aprobada",
  "mensaje": "Tu solicitud de autorización #12345 ha sido aprobada exitosamente.",
  "metadata": {
    "autorizacionId": 12345,
    "prestacion": "Consulta médica",
    "estado": "APROBADA"
  }
}
```

**Request Body Parameters:**

| Parámetro  | Tipo   | Requerido | Descripción                                                  |
|------------|--------|-----------|--------------------------------------------------------------|
| `nuusuid`  | string | ✅ Sí     | ID del usuario destinatario (debe existir en `nuusuari`)    |
| `tipo`     | string | ✅ Sí     | Tipo de notificación: `autorizacion`, `credencial`, `general` |
| `titulo`   | string | ✅ Sí     | Título de la notificación (max 255 caracteres)              |
| `mensaje`  | string | ✅ Sí     | Mensaje completo (max 5000 caracteres)                       |
| `metadata` | object | ❌ No     | Objeto JSON con datos adicionales                            |

**Validaciones Automáticas:**

✅ Usuario (nuusuid) existe en la base de datos  
✅ Tipo es válido: `autorizacion`, `credencial`, `general`  
✅ Título no vacío (max 255 caracteres)  
✅ Mensaje no vacío (max 5000 caracteres)  
✅ Metadata es JSON válido (si se proporciona)

**Response Success (201):**
```json
{
  "success": true,
  "notification": {
    "id": "821b27aa-91da-4ae2-ac41-92fae41e6418",
    "nuusuid": "0000000000000000000000000000000000000024",
    "tipo": "autorizacion",
    "titulo": "Autorización Aprobada",
    "mensaje": "Tu solicitud de autorización #12345 ha sido aprobada exitosamente.",
    "leida": false,
    "fecha_creacion": "2025-12-22T10:15:00.000Z",
    "metadata": {
      "autorizacionId": 12345,
      "prestacion": "Consulta médica",
      "estado": "APROBADA"
    }
  }
}
```

**Response Error (400 - Validation Error):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "El título no puede estar vacío"
}
```

**Response Error (404 - User Not Found):**
```json
{
  "error": "USER_NOT_FOUND",
  "message": "El usuario no existe en la base de datos"
}
```

**Response Error (500 - Internal Error):**
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Error interno del servidor al crear la notificación",
  "details": "..."
}
```

**Ejemplo cURL:**
```bash
curl -X POST "http://localhost:3000/api/notifications/send" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..." \
  -H "Content-Type: application/json" \
  -d '{
    "nuusuid": "0000000000000000000000000000000000000024",
    "tipo": "autorizacion",
    "titulo": "Autorización Aprobada",
    "mensaje": "Tu solicitud ha sido aprobada exitosamente.",
    "metadata": {"autorizacionId": 12345}
  }'
```

**Ejemplo PowerShell:**
```powershell
$headers = @{ 
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

$body = @{
  nuusuid = "0000000000000000000000000000000000000024"
  tipo = "autorizacion"
  titulo = "Autorización Aprobada"
  mensaje = "Tu solicitud ha sido aprobada exitosamente."
  metadata = @{
    autorizacionId = 12345
    prestacion = "Consulta médica"
  }
} | ConvertTo-Json -Depth 5

$response = Invoke-RestMethod `
  -Uri "http://localhost:3000/api/notifications/send" `
  -Method Post `
  -Headers $headers `
  -Body $body

Write-Host "✅ Notificación creada: $($response.notification.id)"
```

**Ejemplo Node.js:**
```javascript
const axios = require('axios');

async function crearNotificacion(token, nuusuid, tipo, titulo, mensaje, metadata) {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/notifications/send',
      {
        nuusuid,
        tipo,
        titulo,
        mensaje,
        metadata
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Notificación creada:', response.data.notification.id);
    return response.data.notification;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

// Uso
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6...';
const nuusuid = '0000000000000000000000000000000000000024';

crearNotificacion(
  token,
  nuusuid,
  'autorizacion',
  'Autorización Aprobada',
  'Tu solicitud #12345 ha sido aprobada.',
  { autorizacionId: 12345, estado: 'APROBADA' }
);
```

**Ejemplo GeneXus (HTTP Client):**
```genexus
// Procedure: EnviarNotificacionViaAPI
Parm(in:&Token, in:&UsuarioId, in:&Tipo, in:&Titulo, in:&Mensaje, 
     out:&NotifId, out:&Exito, out:&Error)

// Nota: en algunas versiones de GeneXus no compila `new HttpClient()`.
// En ese caso usar `new()` y declarar &HttpClient como variable HttpClient.
&HttpClient = new()
&HttpClient.BaseURL = "http://localhost:3000"
&HttpClient.AddHeader("Content-Type", "application/json")
&HttpClient.AddHeader("Authorization", "Bearer " + &Token)

// Construir JSON body
&Body = "{"
&Body += '"nuusuid":"' + &UsuarioId + '",'
&Body += '"tipo":"' + &Tipo + '",'
&Body += '"titulo":"' + EscapeJson(&Titulo) + '",'
&Body += '"mensaje":"' + EscapeJson(&Mensaje) + '"'
&Body += "}"

&Response = &HttpClient.Post("/api/notifications/send", &Body)

If &HttpClient.StatusCode = 201
    &JsonObj.FromJsonString(&Response)
    &NotifId = &JsonObj.Get("notification.id")
    &Exito = True
    &Error = ""
    msg("✅ Notificación enviada: " + &NotifId)
Else
    &JsonObj.FromJsonString(&Response)
    &NotifId = ""
    &Exito = False
    &Error = &JsonObj.Get("message")
    msg("❌ Error: " + &Error)
EndIf
```

📖 **Ver más ejemplos de integración en:** `INTEGRACION_NOTIFICACIONES_SISTEMAS.md`

---

### 6. Historial Admin de Notificaciones (GET /admin/notifications/list) ⭐ NUEVO

Lista notificaciones de todos los usuarios (solo administradores), incluyendo filtros por afiliado, fechas, tipo, estado y origen.

> 🔒 Requiere autenticación Bearer Token + rol admin backend.

**Request:**
```http
GET /admin/notifications/list?page=1&limit=25&q=rios@gmail.com&origen=externa&leida=false
Authorization: Bearer <token_admin>
```

**Query Parameters:**

| Parámetro      | Tipo    | Requerido | Default          | Descripción |
|----------------|---------|-----------|------------------|-------------|
| `page`         | number  | No        | 1                | Número de página |
| `limit`        | number  | No        | 25               | Registros por página (máx 100) |
| `orderBy`      | string  | No        | `fecha_creacion` | Orden por `fecha_creacion`, `leida`, `tipo`, `titulo` |
| `orderDir`     | string  | No        | `desc`           | Dirección `asc` o `desc` |
| `q`            | string  | No        | -                | Búsqueda por email, nombre, nro afiliado o afiliadoId |
| `nuusuid`      | string  | No        | -                | Filtro exacto por usuario |
| `tipo`         | string  | No        | -                | Filtro por tipo |
| `origen`       | string  | No        | -                | `interna` o `externa` |
| `leida`        | boolean | No        | -                | `true` o `false` |
| `fecha_desde`  | string  | No        | -                | Inicio de rango (ISO o `YYYY-MM-DD`) |
| `fecha_hasta`  | string  | No        | -                | Fin de rango (ISO o `YYYY-MM-DD`) |

**Response Success (200):**
```json
{
  "data": [
    {
      "id": "f2f8dd7d-4e3d-4a6e-8bc8-bb4725ad6d66",
      "nuusuid": "ca87f1be-ac8c-46b8-9652-7cc2e6e58eda",
      "tipo": "general",
      "titulo": "Aviso institucional",
      "mensaje": "Mensaje de ejemplo",
      "leida": false,
      "fecha_creacion": "2026-04-22T02:35:00.000Z",
      "fecha_leida": null,
      "origen": "externa",
      "canal": "ws_notificacion",
      "usuario_email": "afiliado@test.local",
      "usuario_nombre": "Apellido, Nombre",
      "usuario_nroafiliado": "123456",
      "usuario_afiliadoid": "000000001000000000001234567890"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "stats": {
    "total": 1,
    "noLeidas": 1,
    "leidas": 0,
    "usuariosDistintos": 1
  },
  "filters": {
    "origen": "externa"
  }
}
```

---

### 7. Estadísticas Admin de Notificaciones (GET /admin/notifications/stats) ⭐ NUEVO

Devuelve totales globales para tablero admin de notificaciones.

**Request:**
```http
GET /admin/notifications/stats
Authorization: Bearer <token_admin>
```

**Response Success (200):**
```json
{
  "total": 120,
  "noLeidas": 82,
  "leidas": 38,
  "usuariosConNotificaciones": 17,
  "porTipo": {
    "info": 0,
    "warning": 0,
    "success": 0,
    "error": 0,
    "otros": 120
  },
  "actividad": {
    "ultimas24h": 14,
    "ultimos7d": 75
  }
}
```

---

## 🧭 Origen de Notificaciones (Interna vs Externa)

Desde Semana 30 el backend clasifica y expone el origen para facilitar auditoría y visualización en admin.

### Reglas de clasificación

- `externa`: notificaciones que ingresan por `POST /api/ws/WS_NOTIFICACION`
- `interna`: notificaciones generadas por backend/app (`POST /api/notifications/send`, broadcast admin u otros flujos internos)

### Metadata recomendada

Se utiliza `metadata` para estandarizar trazabilidad:

- `origen`: `interna` o `externa`
- `canal`: canal técnico (`ws_notificacion`, `api_notifications_send`, `admin_broadcast`, etc.)
- `source`: etiqueta de integración opcional para auditoría

Ejemplos reales:

- `POST /api/ws/WS_NOTIFICACION` guarda: `origen=externa`, `canal=ws_notificacion`
- `POST /api/notifications/send` completa por defecto: `origen=interna`, `canal=api_notifications_send`
- `POST /admin/notifications/broadcast` guarda: `origen=interna`, `canal=admin_broadcast`, `broadcast=true` y los `filtros` aplicados

---

## 🖥️ Panel Web Admin

El historial se visualiza en:

- `GET /admin/notificaciones` → pestaña **Historial de notificaciones**

Capacidades:

- listado paginado de todos los usuarios
- filtros por afiliado, tipo, origen, estado y rango de fechas
- visualización de `origen` + `canal` por fila
- pestaña **Broadcast** con segmentación por plan, tipo de afiliado, sexo y rango etario
- previsualización de destinatarios antes del envío mediante `GET /admin/notifications/broadcast/preview`

### Segmentación de broadcast

El endpoint de envío masivo soporta un objeto `filtros` para consolidar grupos específicos:

```json
{
  "titulo": "Campaña preventiva",
  "mensaje": "Recordá realizar tu control anual.",
  "categoria": "noticias",
  "filtros": {
    "plan": "001",
    "tipo": "titular",
    "sexo": "F",
    "edadMin": 18,
    "edadMax": 65,
    "plataforma": "android"
  }
}
```

Campos admitidos en `filtros`:

- `plan`: valor exacto de `nuplaid`
- `tipo`: `todos`, `titular` o `familiar`
- `sexo`: `M` o `F`
- `edadMin` / `edadMax`: rango etario calculado desde `nuusufecha`
- `plataforma`: `ios` o `android`

### Comportamiento del filtro por dispositivo

El filtro `plataforma` no reduce la población objetivo de usuarios.

- Las notificaciones **in-app** se crean para todos los usuarios que cumplen los filtros demográficos/funcionales.
- El filtro `plataforma` se aplica solo sobre `push_tokens` activos para decidir a qué dispositivos se envía el push.
- Si no existen tokens registrados para la plataforma elegida, el envío push se omite para ese canal, pero la notificación in-app igualmente se crea.

### Preview de destinatarios

`GET /admin/notifications/broadcast/preview`

Query params soportados:

- `plan`
- `tipo`
- `sexo`
- `edadMin`
- `edadMax`
- `plataforma`

Ejemplo:

```http
GET /admin/notifications/broadcast/preview?tipo=titular&sexo=F&edadMin=18&edadMax=65&plataforma=android
```

Respuesta ejemplo:

```json
{
  "total": 25,
  "dispositivosPlat": 0,
  "plataformaFiltro": "android",
  "filtros": {
    "tipo": "titular",
    "sexo": "F",
    "edadMin": "18",
    "edadMax": "65",
    "plataforma": "android"
  }
}
```

Interpretación:

- `total`: usuarios que recibirán la notificación in-app
- `dispositivosPlat`: usuarios con al menos un token push activo en la plataforma solicitada
- `plataformaFiltro`: plataforma evaluada para el canal push

---

## 🔨 Crear Notificaciones desde Otros Sistemas (Alternativas Legacy)

Si necesitas insertar notificaciones **sin usar la API REST** (no recomendado para producción), puedes hacerlo directamente en la base de datos PostgreSQL.

> ⚠️ **IMPORTANTE:** La inserción directa NO ejecuta validaciones ni envía push notifications automáticamente.  
> **RECOMENDADO:** Usar el endpoint `POST /api/notifications/send` para garantizar validaciones y push automático.

### Opción 1: SQL Directo (sin validaciones)

```sql
INSERT INTO notifications (
  id,
  nuusuid,
  tipo,
  titulo,
  mensaje,
  leida,
  fecha_creacion,
  metadata
) VALUES (
  gen_random_uuid(),                                           -- UUID automático
  '0000000000000000000000000000000000000024',                -- ID del usuario destinatario
  'autorizacion',                                              -- Tipo
  'Nueva Autorización',                                        -- Título
  'Se creó una nueva autorización para tu trámite.',          -- Mensaje
  false,                                                       -- No leída
  NOW(),                                                       -- Fecha actual
  '{"autorizacionId": "12345", "estado": "APROBADO"}'::jsonb -- Metadata JSON
);
```

### Opción 2: Script Node.js

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'app_afiliados_genexus',
  user: 'postgres',
  password: 'tu_password',
});

async function crearNotificacion(nuusuid, tipo, titulo, mensaje, metadata = null) {
  const query = `
    INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, metadata)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, false, NOW(), $5)
    RETURNING *
  `;
  
  const values = [nuusuid, tipo, titulo, mensaje, metadata ? JSON.stringify(metadata) : null];
  
  try {
    const result = await pool.query(query, values);
    console.log('✅ Notificación creada:', result.rows[0].id);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creando notificación:', error);
    throw error;
  }
}

// Ejemplo de uso
crearNotificacion(
  '0000000000000000000000000000000000000024',
  'autorizacion',
  'Autorización Aprobada',
  'Tu solicitud ha sido aprobada exitosamente.',
  { autorizacionId: '12345', prestacion: 'Consulta médica' }
);
```

### Opción 3: Script PowerShell

```powershell
# Requiere módulo PostgreSQL: Install-Module -Name PostgreSql
Import-Module PostgreSql

$connectionString = "Host=localhost;Port=5432;Database=app_afiliados_genexus;Username=postgres;Password=tu_password"

$nuusuid = "0000000000000000000000000000000000000024"
$tipo = "autorizacion"
$titulo = "Nueva Autorización"
$mensaje = "Se creó una nueva autorización para tu trámite."
$metadata = '{"autorizacionId": "12345"}'

$query = @"
INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, metadata)
VALUES (gen_random_uuid(), @nuusuid, @tipo, @titulo, @mensaje, false, NOW(), @metadata::jsonb)
RETURNING id
"@

$result = Invoke-PgQuery -ConnectionString $connectionString -Query $query -Parameters @{
  nuusuid = $nuusuid
  tipo = $tipo
  titulo = $titulo
  mensaje = $mensaje
  metadata = $metadata
}

Write-Host "✅ Notificación creada con ID: $($result.id)"
```

---

## 🧪 Testing Completo

Existe un script de prueba automatizada que ejecuta todos los endpoints:

```powershell
cd backend
.\test-notif-quick.ps1
```

**Tests incluidos:**
1. ✅ Login con usuario de prueba
2. ✅ Listar todas las notificaciones
3. ✅ Contar notificaciones no leídas
4. ✅ Filtrar por tipo (`autorizacion`)
5. ✅ Filtrar solo no leídas (`leida=false`)
6. ✅ Marcar una notificación como leída
7. ✅ Marcar todas como leídas
8. ✅ Verificar que contador quedó en 0

---

## 📊 Esquema de Base de Datos

```sql
CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nuusuid           VARCHAR(100) NOT NULL REFERENCES nuusuari(nuusuid),
  tipo              VARCHAR(50) NOT NULL,
  titulo            VARCHAR(255) NOT NULL,
  mensaje           TEXT NOT NULL,
  leida             BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_leida       TIMESTAMP(3),
  metadata          JSONB,
  
  INDEX idx_notifications_nuusuid (nuusuid),
  INDEX idx_notifications_tipo (tipo),
  INDEX idx_notifications_leida (leida),
  INDEX idx_notifications_fecha_creacion (fecha_creacion)
);
```

---

## 🚀 Casos de Uso Comunes

### 1. Dashboard: Mostrar últimas 5 notificaciones no leídas

```bash
GET /notifications?leida=false&limit=5&orderBy=fecha_creacion&orderDir=desc
```

### 2. Badge contador en app mobile

```bash
GET /notifications/unread-count
# Hacer polling cada 30 segundos para actualizar
```

### 3. Filtrar autorizaciones de la última semana

```bash
GET /notifications?tipo=autorizacion&fecha_desde=2026-01-27&fecha_hasta=2026-02-03
```

### 4. Usuario marca todas como leídas al cerrar pantalla

```bash
POST /notifications/mark-all-read
```

### 5. Notificar usuario cuando se aprueba autorización

```javascript
// En tu código backend de autorizaciones:
await pool.query(`
  INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, metadata)
  VALUES (
    gen_random_uuid(),
    $1,
    'autorizacion',
    'Autorización Aprobada',
    'Tu autorización #${autorizacionId} ha sido aprobada.',
    false,
    NOW(),
    $2::jsonb
  )
`, [nuusuid, JSON.stringify({ autorizacionId, prestacion })]);
```

---

## 🔒 Seguridad

- ✅ **Autenticación JWT**: Todos los endpoints requieren Bearer token válido
- ✅ **Validación de propiedad**: Los endpoints verifican que la notificación pertenezca al usuario autenticado
- ✅ **Validación Zod**: Parámetros de query y URL son validados con esquemas Zod
- ✅ **No expone datos de otros usuarios**: Cada usuario solo ve sus propias notificaciones

**Headers de seguridad recomendados:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

---

## ⚙️ Configuración para Producción

### Variables de Entorno

```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=tu_secret_key_segura
```

### Limpieza Automática (Opcional)

Para evitar acumulación de notificaciones antiguas, puedes crear un job que elimine notificaciones leídas después de 30 días:

```sql
DELETE FROM notifications
WHERE leida = true
  AND fecha_leida < NOW() - INTERVAL '30 days';
```

---

## 📞 Soporte

Para dudas o problemas:
- 📂 Documentación: `backend/API_NOTIFICACIONES.md`
- 🧪 Tests: `backend/test-notif-quick.ps1`
- 📝 Ejemplo creación: `backend/create-test-notifications.js`
- 🔧 Backend: `backend/server-soap.js` (líneas 7880-8130)

---

**Última actualización:** 22 Abril 2026  
**Versión:** 2.2 (Semana 30)
