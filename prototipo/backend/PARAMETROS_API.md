# Sistema de Parámetros - Administración

## Resumen

Sistema completo de gestión de parámetros de configuración con interfaz web, API REST autenticada y cache en memoria.

## Arquitectura

### Base de Datos
- **Tabla**: `nusispar`
- **Campos**:
  - `nusisgrupa` (VARCHAR) - Grupo del parámetro (PK1)
  - `nusistippa` (VARCHAR) - Tipo/nombre del parámetro (PK2)
  - `nusisvalpa` (TEXT) - Valor del parámetro
- **Total parámetros**: 115 activos
- **Grupos**: GENERALES, CREDENCIAL, AUTORIZACIONES, FUNCIONES_APP, etc.

### Cache Interno
```javascript
// Map() en memoria
const parametrosCache = new Map()
let parametrosCacheTimestamp = null
const CACHE_TTL_MS = 60000 // 1 minuto

// Recarga automática cada 5 minutos
setInterval(cargarParametros, 300000)
```

### Funciones Helper
```javascript
// Obtener parámetro como string
const valor = await getParametro('GENERALES', 'AppBaseUrl', 'http://default')

// Obtener como número
const dias = await getParametroNumero('GENERALES', 'VigenciaCred', 10)

// Obtener como booleano (S/N)
const habilitado = await getParametroBoolean('CREDENCIAL', 'HabilitarTokenCredencial', true)

// Forzar recarga del cache
await recargarParametros()
```

## Interfaz Web de Administración

### Acceso
- **URL**: `http://localhost:3000/admin`
- **Login**: `admin` / `admin123`
- **Archivo**: `backend/public/admin-parametros.html`

### Funcionalidades
1. **Dashboard**
   - Total de parámetros
   - Grupos únicos
   - Última actualización

2. **Búsqueda y Filtros**
   - Búsqueda en tiempo real (grupo, tipo, valor)
   - Filtro por grupo específico
   - Tabla responsive

3. **Operaciones CRUD**
   - ✅ Listar todos
   - ✅ Ver por grupo
   - ✅ Crear nuevo
   - ✏️ Editar existente
   - 🗑️ Eliminar con confirmación

4. **UI/UX**
   - Diseño moderno con gradiente violet/purple
   - Modales para crear/editar
   - Badges de colores por grupo
   - Mensajes de éxito/error
   - Responsive design

## API REST Autenticada

### Autenticación
Todos los endpoints requieren Bearer token en header:
```http
Authorization: Bearer <token>
```

Obtener token:
```bash
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Endpoints

#### 1. Listar todos los parámetros
```http
GET /admin/parametros
Authorization: Bearer <token>
```

Respuesta:
```json
{
  "success": true,
  "total": 115,
  "parametros": [
    {
      "nusisgrupa": "GENERALES",
      "nusistippa": "VigenciaCred",
      "nusisvalpa": "10"
    }
  ]
}
```

#### 2. Listar por grupo
```http
GET /admin/parametros/GENERALES
Authorization: Bearer <token>
```

#### 3. Obtener parámetro específico
```http
GET /admin/parametros/GENERALES/VigenciaCred
Authorization: Bearer <token>
```

#### 4. Actualizar parámetro
```http
PUT /admin/parametros/GENERALES/VigenciaCred
Authorization: Bearer <token>
Content-Type: application/json

{
  "valor": "15"
}
```

**Efecto**: Actualiza el valor Y recarga el cache automáticamente.

#### 5. Crear nuevo parámetro
```http
POST /admin/parametros
Authorization: Bearer <token>
Content-Type: application/json

{
  "grupo": "TEST",
  "tipo": "NuevoParam",
  "valor": "valor_test"
}
```

#### 6. Eliminar parámetro
```http
DELETE /admin/parametros/TEST/NuevoParam
Authorization: Bearer <token>
```

### Códigos de Respuesta
- `200` - Operación exitosa
- `201` - Parámetro creado
- `400` - Datos inválidos
- `401` - No autenticado o token inválido
- `404` - Parámetro no encontrado
- `409` - Conflicto (parámetro ya existe)
- `500` - Error del servidor

## Scripts PowerShell

### 1. Suite de Tests
```powershell
# Ejecutar 9 casos de prueba
.\backend\test-admin-parametros.ps1

# Tests incluidos:
# - Login
# - Listar todos
# - Listar por grupo
# - Obtener específico
# - Actualizar
# - Crear
# - Eliminar
# - Seguridad (401 sin token)
# - Restaurar valor original
```

### 2. Gestión Interactiva
```powershell
# Menu interactivo CLI
.\backend\manage-parametros.ps1 -Usuario admin -Clave admin123

# Opciones:
# 1. Listar todos
# 2. Listar por grupo
# 3. Ver específico
# 4. Actualizar
# 5. Crear
# 6. Eliminar
# 0. Salir
```

## Seguridad

### Middleware de Autenticación
```javascript
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader) {
    return res.status(401).json({ error: 'No autorizado. Token requerido.' })
  }

  const token = authHeader.replace('Bearer ', '')
  const session = sessions.get(token)

  if (!session) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }

  req.session = session
  next()
}
```

### Validaciones
- ✅ Token Bearer obligatorio
- ✅ Validación de sesión activa
- ✅ Log de modificaciones con username
- ✅ Confirmación para eliminaciones
- ✅ Validación de campos requeridos

## Uso en Código

### Ejemplo: Vigencia de Credenciales
```javascript
// Obtener días de vigencia configurados
async function getDiasVigenciaCredencial() {
  return await getParametroNumero('GENERALES', 'VigenciaCred', 10)
}

// Calcular fecha de vencimiento
async function getDefaultVencimiento(fechaRegistracion) {
  const dias = await getDiasVigenciaCredencial()
  const fechaBase = fechaRegistracion ? new Date(fechaRegistracion) : new Date()
  
  let diasAgregados = 0
  let fechaActual = new Date(fechaBase)
  
  while (diasAgregados < dias) {
    fechaActual.setDate(fechaActual.getDate() + 1)
    const diaSemana = fechaActual.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) { // Excluir sábados/domingos
      diasAgregados++
    }
  }
  
  return fechaActual.toISOString().split('T')[0]
}
```

### Ejemplo: Flag Booleano
```javascript
// Verificar si una función está habilitada
const habilitado = await getParametroBoolean('FUNCIONES_APP', 'HabilitarNotificaciones', false)

if (habilitado) {
  // Enviar notificación
}
```

## Parámetros Importantes

### GENERALES
- `VigenciaCred`: Días de vigencia de credenciales (default: 10)
- `AppBaseUrl`: URL base de la aplicación
- `CodificaErrorRegUsuario`: Codificar errores (S/N)

### CREDENCIAL
- `HabilitarTokenCredencial`: Habilitar tokens (S/N)
- `TimeoutTokenCredencial`: Timeout en minutos

### AUTORIZACIONES
- `HabitilarObsPrestPref`: Habilitar observaciones (S/N)
- `MensajeSolicitudAutorizacion`: Mensaje personalizado

## Flujo de Modificación

1. **Usuario accede a /admin**
2. **Login con credenciales** → Obtiene Bearer token
3. **Busca/filtra parámetro** en tabla interactiva
4. **Edita valor** mediante modal
5. **Guarda cambios** → PUT /admin/parametros/:grupo/:tipo
6. **Backend actualiza BD** + recarga cache automáticamente
7. **Siguiente request** usa el nuevo valor del cache

## Troubleshooting

### Cache no actualiza
```javascript
// Forzar recarga manual
await recargarParametros()
```

### Token expirado
- Hacer logout y volver a iniciar sesión
- El token se genera en `/auth/login` y se almacena en sessions Map

### Parámetro no existe
- Verificar que existe en BD: `SELECT * FROM nusispar WHERE nusisgrupa='X' AND nusistippa='Y'`
- Crear mediante POST /admin/parametros

### Puerto 3000 ocupado
```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
  Select-Object -ExpandProperty OwningProcess | 
  ForEach-Object { Stop-Process -Id $_ -Force }
```

## Próximas Mejoras

- [ ] Historial de cambios (audit log)
- [ ] Validación de tipos de datos
- [ ] Export/Import CSV
- [ ] Búsqueda avanzada con regex
- [ ] Agrupación jerárquica
- [ ] Permisos granulares por usuario
