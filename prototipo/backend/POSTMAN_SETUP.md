# Configuración Postman - API Notificaciones

## 📥 Importar Colección y Entorno

### Paso 1: Importar Colección

1. Abrir Postman
2. Click en **Import** (esquina superior izquierda)
3. Arrastrar el archivo: `Postman_Notificaciones_Collection.json`
4. Click en **Import**

### Paso 2: Importar Entorno

1. Click en **Environments** (ícono de engranaje)
2. Click en **Import**
3. Arrastrar el archivo: `Postman_Environment.json`
4. Click en **Import**
5. Seleccionar el entorno **"APP_Afiliados - Desarrollo"** en el dropdown superior

---

## 🚀 Uso Rápido (Quick Start)

### 1️⃣ Login Automático

**Ejecutar primero este request:**

```
0️⃣ Autenticación > Login (Obtener Token)
```

✅ **El token se guarda automáticamente** en la variable de entorno `auth_token`  
✅ Todos los requests posteriores usan este token automáticamente  
✅ No necesitas copiar/pegar el token manualmente

**Output esperado:**
```
✅ Token guardado exitosamente
👤 Usuario: RODRIGUEZ, MARIANA
🔑 Token: eyJhbGciOiJIUzI1Ni...
```

### 2️⃣ Ejecutar Cualquier Endpoint

Todos los endpoints ya tienen configurado:
- ✅ **Bearer Token automático** (variable `{{auth_token}}`)
- ✅ **Tests automáticos** (validación de respuestas)
- ✅ **Logs en consola** (debugging info)

**Ejemplos:**

```
1️⃣ Listar Notificaciones > Listar Todas (Paginado)
1️⃣ Listar Notificaciones > Solo No Leídas
2️⃣ Contar No Leídas > Contador de No Leídas
3️⃣ Marcar como Leída > Marcar Una Notificación
```

### 3️⃣ Ver Resultados

Después de cada request, revisar:

- **📊 Body**: Respuesta JSON del servidor
- **✅ Test Results**: Tests automáticos (pasados/fallidos)
- **📝 Console**: Logs detallados con información adicional

---

## 🔧 Configuración de Variables

### Variables de Entorno (se configuran automáticamente)

| Variable | Descripción | Valor Inicial |
|----------|-------------|---------------|
| `base_url` | URL del backend | `http://localhost:3000` |
| `test_username` | Usuario de prueba | `marianr@tekhne.com.ar` |
| `test_password` | Contraseña | `123456` |
| `auth_token` | Token JWT (automático) | *(se guarda al hacer login)* |
| `nuusuid` | ID del usuario (automático) | *(se guarda al hacer login)* |
| `sample_notification_id` | ID de notificación para tests | *(se guarda al listar)* |

### Cambiar Usuario de Prueba

Si quieres usar otro usuario:

1. Click en **Environments** (ícono engranaje)
2. Seleccionar **APP_Afiliados - Desarrollo**
3. Editar variables:
   - `test_username`: `nuevo@email.com`
   - `test_password`: `nueva_contraseña`
4. **Ejecutar Login nuevamente** para obtener nuevo token

### Cambiar URL del Backend

Para apuntar a producción o staging:

1. Editar variable `base_url`
2. Cambiar de `http://localhost:3000` a URL deseada
3. Ejemplo: `https://api.osep.gob.ar`

---

## 🧪 Tests Automáticos Incluidos

Cada request ejecuta tests automáticamente:

### Tests Globales (todos los requests)

```javascript
✅ Tiempo de respuesta aceptable (< 2s)
```

### Tests Específicos

**Login:**
```javascript
✅ Login exitoso
✅ Token es string válido
✅ User es objeto válido
```

**Listar Notificaciones:**
```javascript
✅ Respuesta correcta
✅ notifications es array
✅ pagination es objeto
```

**Marcar como Leída:**
```javascript
✅ Marcada correctamente
✅ leida == true
✅ fecha_leida no es null
```

### Ver Resultados de Tests

Después de ejecutar un request:

1. Abrir pestaña **"Test Results"**
2. Ver tests pasados (✅ verde) y fallidos (❌ rojo)
3. Expandir cada test para ver detalles

---

## 📋 Endpoints Disponibles

### 0️⃣ Autenticación

- **Login (Obtener Token)** — `POST /auth/login`
- **Verificar Usuario Autenticado** — `GET /auth/me`

### 1️⃣ Listar Notificaciones

- **Listar Todas (Paginado)** — `GET /notifications?page=1&limit=20`
- **Filtrar por Tipo (Autorizaciones)** — `GET /notifications?tipo=autorizacion`
- **Solo No Leídas** — `GET /notifications?leida=false`
- **Filtrar por Rango de Fechas** — `GET /notifications?fecha_desde=2026-02-01`

### 2️⃣ Contar No Leídas

- **Contador de No Leídas** — `GET /notifications/unread-count`

### 3️⃣ Marcar como Leída

- **Marcar Una Notificación** — `PUT /notifications/:id/mark-read`
- **Marcar Todas como Leídas** — `POST /notifications/mark-all-read`

### 4️⃣ Crear Notificación (Admin/Sistema)

- **Crear Notificación** — `POST /api/notifications/send`
- **Crear Notificación (Autorización Aprobada)** — Ejemplo con metadata autorizacion
- **Crear Notificación (Credencial Vence)** — Ejemplo con metadata credencial

📋 **Request Body:**
```json
{
  "nuusuid": "string (100 caracteres max)",
  "tipo": "autorizacion | credencial | general",
  "titulo": "string (max 255 caracteres)",
  "mensaje": "string (max 5000 caracteres)",
  "metadata": {} // JSON opcional
}
```

✅ **Validaciones Automáticas:**
- Usuario (nuusuid) existe en la base de datos
- Tipo es válido: `autorizacion`, `credencial`, `general`
- Título no vacío (max 255 caracteres)
- Mensaje no vacío (max 5000 caracteres)
- Metadata es JSON válido (si se proporciona)

🚀 **Funcionalidad Automática:**
- 📱 Envío de push notification si el usuario tiene dispositivos registrados
- 💾 Persistencia en base de datos PostgreSQL
- 📝 Logging de operaciones
- 🔒 Control de permisos (requiere autenticación JWT)

📤 **Response 201 (Success):**
```json
{
  "success": true,
  "notification": {
    "id": "uuid",
    "nuusuid": "...",
    "tipo": "autorizacion",
    "titulo": "Autorización Aprobada",
    "mensaje": "...",
    "leida": false,
    "fecha_creacion": "2025-12-22T10:15:00.000Z",
    "metadata": { ... }
  }
}
```

❌ **Response 400 (Validation Error):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "El título no puede estar vacío"
}
```

❌ **Response 404 (User Not Found):**
```json
{
  "error": "USER_NOT_FOUND",
  "message": "Usuario no existe en la base de datos"
}
```

### 🧪 Tests Completos

- **Test Suite Completo** — Ejecuta todos los tests automáticamente

---

## 🔐 Seguridad Integrada

### Autenticación Bearer Token (automática)

Todos los endpoints (excepto Login) incluyen automáticamente:

```http
Authorization: Bearer {{auth_token}}
```

### Pre-request Scripts

Antes de cada request, se ejecuta:

```javascript
// Validar que existe token
if (!token && !pm.request.url.path.includes('login')) {
    console.warn('⚠️  No hay token. Ejecutar Login primero.');
}
```

### Post-response Scripts

Después de cada request, se ejecuta:

```javascript
// Guardar datos automáticamente
pm.environment.set('auth_token', response.token);
pm.environment.set('nuusuid', response.user.nuusuid);
pm.environment.set('sample_notification_id', first.id);
```

---

## 🎯 Flujo de Trabajo Típico

### Scenario 1: Testing Manual

```
1. Login (Obtener Token)
   ↓
2. Listar Todas (Paginado)
   ↓ (guarda sample_notification_id automáticamente)
3. Marcar Una Notificación
   ↓
4. Contador de No Leídas (verificar que bajó el contador)
```

### Scenario 2: Testing Filtros

```
1. Login (Obtener Token)
   ↓
2. Filtrar por Tipo (Autorizaciones)
   ↓ (verificar que todas sean tipo 'autorizacion')
3. Solo No Leídas
   ↓ (verificar que todas tengan leida=false)
4. Filtrar por Rango de Fechas
   ↓ (verificar fechas dentro del rango)
```

### Scenario 3: Testing Completo Automatizado

```
1. Login (Obtener Token)
   ↓
2. 🧪 Test Suite Completo
   ↓ (ejecuta 3 tests en paralelo automáticamente)
   ✅ Test 1: Listar notificaciones
   ✅ Test 2: Contar no leídas
   ✅ Test 3: Filtro por tipo
```

---

## 📝 Logs en Consola

Para ver logs detallados:

1. Abrir **Postman Console** (View > Show Postman Console)
2. Ejecutar cualquier request
3. Ver logs en tiempo real:

```
✅ Token guardado exitosamente
👤 Usuario: RODRIGUEZ, MARIANA
🔑 Token: eyJhbGciOiJIUzI1Ni...
⏱️  Tiempo de respuesta: 145ms
📊 Status code: 200
📬 Total notificaciones: 10
📄 Página: 1/1
📝 Items en esta página: 10
💾 ID de muestra guardado: 821b27aa-91da-4ae2-ac41-92fae41e6418
```

---

## ⚠️ Troubleshooting

### Error: "No autorizado" (401)

**Causa**: Token expirado o inválido

**Solución**:
1. Ejecutar **Login** nuevamente
2. Verificar que la variable `auth_token` tiene valor en el entorno

### Error: "Token no encontrado"

**Causa**: No se ejecutó Login primero

**Solución**:
1. Ejecutar **0️⃣ Autenticación > Login (Obtener Token)**
2. Verificar en Console que aparezca "✅ Token guardado exitosamente"

### Error: "Notificación no encontrada" (404)

**Causa**: El ID de notificación no es válido

**Solución**:
1. Ejecutar **Listar Todas (Paginado)** primero
2. Esto guarda automáticamente un `sample_notification_id` válido
3. Luego ejecutar **Marcar Una Notificación**

### Backend no responde

**Causa**: Servidor no está corriendo

**Solución**:
```powershell
cd backend
node server-soap.js
# O usar:
.\restart-backend.ps1
```

---

## 🔄 Actualizar Credenciales

Para usar otros usuarios de prueba, editar variables en el entorno:

### Usuarios Disponibles

| Email | Password | Credenciales |
|-------|----------|--------------|
| `marianr@tekhne.com.ar` | `123456` | 7 credenciales |
| `diana76ar@gmail.com` | `123456` | 2 credenciales |
| `alfredofalletto@gmail.com` | `123456` | 1 credencial |

### Cambiar Usuario

1. Environments > **APP_Afiliados - Desarrollo**
2. Editar:
   - `test_username` → nuevo email
   - `test_password` → nueva contraseña
3. **Save**
4. Ejecutar **Login** nuevamente

---

## 📚 Referencias

- **Documentación API completa**: `backend/API_NOTIFICACIONES.md`
- **Integración desde sistemas externos**: `INTEGRACION_NOTIFICACIONES_SISTEMAS.md`
- **Script de prueba PowerShell**: `backend/test-notif-quick.ps1`

---

**Última actualización:** 18 de febrero de 2026  
**Versión Postman:** 10.0+  
**Compatible con:** Postman Desktop, Postman Web
