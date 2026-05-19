# Testing - Sincronización de Credenciales (CRCREDEN)

**Fecha**: 4 de diciembre de 2025  
**Estado**: ✅ IMPLEMENTADO - Listo para Testing

---

## Resumen de Implementación

Se ha implementado exitosamente el sistema completo de sincronización de credenciales del grupo familiar:

- ✅ Backend: Funciones de sincronización en `server-soap.js`
- ✅ Endpoints: `/auth/login`, `/credenciales/refresh`, `/credenciales`
- ✅ Mobile: `AuthContext` actualizado con soporte de credenciales
- ✅ UI: `CredencialesScreen.tsx` para visualización

---

## Prerequisitos para Testing

### 1. Backend Corriendo

```powershell
cd backend
node server-soap.js
```

**Verificar**:
```
✅ Backend escuchando en http://0.0.0.0:3000
✅ Cliente SOAP conectado exitosamente
```

### 2. Base de Datos con Tablas Creadas

Verificar que existen las tablas:
- `nuusuari` - Usuarios registrados
- `crcreden` - Credenciales
- `crcredus` - Relación usuario-credencial

```sql
SELECT count(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('nuusuari', 'crcreden', 'crcredus');
```

Debe retornar: **3**

---

## Test 1: Crear Usuario de Prueba

### PowerShell

```powershell
$body = @{
    username = 'testuser2025'
    password = 'test123'
    email = 'test2025@test.com'
} | ConvertTo-Json

(Invoke-WebRequest `
    -Uri http://localhost:3000/debug/create-test-user `
    -Method POST `
    -Body $body `
    -ContentType 'application/json' `
    -UseBasicParsing).Content
```

**Resultado Esperado**:
```json
{
  "success": true,
  "message": "Usuario de prueba creado",
  "user": {
    "username": "testuser2025",
    "email": "test2025@test.com"
  },
  "credentials": {
    "username": "testuser2025",
    "password": "test123"
  }
}
```

---

## Test 2: Agregar AfiliadoId al Usuario

Para poder probar la sincronización, necesitamos un usuario con `afiliadoId` válido del servicio SOAP.

### Opción A: Usar un registro real

Si ya hay un usuario registrado desde la app con datos reales:

```sql
-- Ver usuarios con AfiliadoId
SELECT nuusuid, nuusuafili, nuusuapell, nuusumailf 
FROM nuusuari 
WHERE nuusuafili IS NOT NULL 
AND nuusuafili != '';
```

Anotar el `nuusumailf` (email) para usar en login.

### Opción B: Modificar archivo users.json manualmente

**Ubicación**: `backend/data/users.json`

Agregar campo `afiliadoId` a un usuario:

```json
[
  {
    "key": "testuser2025",
    "email": "test2025@test.com",
    "passwordHash": "...",
    "afiliadoId": "123456789000000000001234567890",
    "registradoEn": "2025-12-04T..."
  }
]
```

**Nota**: El `afiliadoId` debe ser un string de 30 caracteres válido del sistema SOAP.

---

## Test 3: Login con Sincronización Automática

### PowerShell

```powershell
$loginBody = @{
    username = 'test2025@test.com'  # O el email del usuario con afiliadoId
    password = 'test123'
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri http://localhost:3000/auth/login `
    -Method POST `
    -Body $loginBody `
    -ContentType 'application/json' `
    -UseBasicParsing

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Resultado Esperado**:

```json
{
  "token": "abc123...",
  "user": {
    "username": "testuser2025",
    "email": "test2025@test.com",
    "nombre": "APELLIDO, NOMBRE"
  },
  "credenciales": [
    {
      "crcreid": "123456789000000000001234567890",
      "crcrefecvi": "2025-12-31",
      "crcrelin": "https://credencial.tekhne.com.ar/img/123.png",
      "crcrenroaf": "0000123456",
      "crcreapeno": "PEREZ, JUAN CARLOS",
      "crcreafili": "123456789000000000001234567890",
      "crcrecuil": 20123456789,
      "crcreplaid": "PLAN001",
      "crcredocum": "12345678",
      "crcresexo": "M",
      "crcrefecha": "1985-05-15",
      "crcrehash": "a1b2c3...",
      "crcreifech": "2025-12-04T...",
      "crcrepropi": "S"
    },
    {
      "crcreid": "123456789000000000001234567891",
      "crcreapeno": "PEREZ, MARIA LAURA",
      "crcrepropi": "N",
      ...
    }
  ],
  "sync": {
    "total": 2,
    "inserted": 2,
    "updated": 0,
    "unchanged": 0
  },
  "message": "Login exitoso"
}
```

### Logs del Backend Esperados

```
🔄 Sincronizando credenciales para AfiliadoId: 123456789000000000001234567890
📞 Llamando CONSULTA_DATOS_CREDENCIAL... { USUARIO: 'mariar', ... }
📋 Credenciales obtenidas desde SOAP: 2
  ✅ INSERTED: PEREZ, JUAN CARLOS
  ✅ INSERTED: PEREZ, MARIA LAURA
✅ Sincronización completa: +2 ↻0 =0
```

---

## Test 4: Verificar Datos en Base de Datos

### Credenciales Insertadas

```sql
SELECT 
  crcreid,
  crcreapeno,
  crcrenroaf,
  crcrefecvi,
  crcrepropi,
  crcreifech
FROM crcreden c
INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
WHERE cu.nuusuid = (
  SELECT nuusuid FROM nuusuari WHERE nuusumailf = 'test2025@test.com'
)
ORDER BY cu.crcrepropi DESC;
```

**Verificar**:
- ✅ Hay al menos 1 credencial insertada
- ✅ La credencial propia tiene `crcrepropi = 'S'`
- ✅ Las credenciales familiares tienen `crcrepropi = 'N'`
- ✅ `crcrehash` está poblado (64 caracteres hexadecimales)
- ✅ `crcreifech` es reciente (timestamp del login)

---

## Test 5: Segundo Login (Sin Cambios)

Hacer login nuevamente con el mismo usuario:

```powershell
# Repetir Test 3
```

**Resultado Esperado**:

```json
{
  "sync": {
    "total": 2,
    "inserted": 0,
    "updated": 0,
    "unchanged": 2  // ← Todas sin cambios
  }
}
```

### Logs del Backend Esperados

```
🔄 Sincronizando credenciales para AfiliadoId: ...
📋 Credenciales obtenidas desde SOAP: 2
  ⏭️  UNCHANGED: PEREZ, JUAN CARLOS
  ⏭️  UNCHANGED: PEREZ, MARIA LAURA
✅ Sincronización completa: +0 ↻0 =2
```

---

## Test 6: Refrescar Credenciales (Endpoint Dedicado)

### PowerShell

```powershell
$token = "abc123..."  # Token del login anterior

$response = Invoke-WebRequest `
    -Uri http://localhost:3000/credenciales/refresh `
    -Method GET `
    -Headers @{Authorization="Bearer $token"} `
    -UseBasicParsing

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Resultado Esperado**:

```json
{
  "credenciales": [ ... ],
  "sync": {
    "total": 2,
    "inserted": 0,
    "updated": 0,
    "unchanged": 2
  },
  "message": "Credenciales actualizadas exitosamente"
}
```

---

## Test 7: Obtener Credenciales (Solo Lectura)

### PowerShell

```powershell
$response = Invoke-WebRequest `
    -Uri http://localhost:3000/credenciales `
    -Method GET `
    -Headers @{Authorization="Bearer $token"} `
    -UseBasicParsing

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Diferencia con /credenciales/refresh**:
- **`/credenciales`**: Solo lee de BD, no consulta SOAP
- **`/credenciales/refresh`**: Consulta SOAP y sincroniza cambios

---

## Test 8: Simulación de Cambios en SOAP

**Objetivo**: Verificar que el sistema detecta y actualiza cambios.

### Escenario

1. Un afiliado renueva su plan → cambia `FechaVencimiento`
2. Próximo login debe detectar cambio y hacer UPDATE

### Proceso

**No hay forma de simular esto sin modificar SOAP**, pero el sistema está preparado:

1. El hash SHA-256 incluye todos los campos relevantes
2. Si algún campo cambia, el hash será diferente
3. Backend ejecutará UPDATE automáticamente

### Logs Esperados (Hipotético)

```
🔄 Sincronizando credenciales para AfiliadoId: ...
📋 Credenciales obtenidas desde SOAP: 2
  🔄 UPDATED: PEREZ, JUAN CARLOS  ← Fecha vencimiento cambió
  ⏭️  UNCHANGED: PEREZ, MARIA LAURA
✅ Sincronización completa: +0 ↻1 =1
```

---

## Test 9: App Móvil - Testing UI

### Desde Expo

1. **Login**:
   ```typescript
   // Usuario: test2025@test.com
   // Password: test123
   await signIn('test2025@test.com', 'test123')
   ```

2. **Verificar Estado**:
   ```typescript
   console.log('Credenciales:', credenciales.length)
   console.log('Sync Stats:', syncStats)
   ```

3. **Navegar a CredencialesScreen**:
   - Ver lista de credenciales
   - Pull-to-refresh para sincronizar
   - Verificar indicador ⭐ en credencial propia

4. **Verificar UI**:
   - ✅ Credencial propia aparece primero (⭐)
   - ✅ Familiares aparecen después
   - ✅ Estadísticas de sincronización visibles
   - ✅ Pull-to-refresh funciona
   - ✅ Credenciales vencidas muestran alerta roja

---

## Casos de Uso Documentados

### Caso 1: Primer Login (Credenciales Nuevas)

**Input**: Usuario sin credenciales previas en BD  
**SOAP Response**: 3 credenciales (titular + 2 familiares)  
**Backend Action**: INSERT x3  
**Output**: `sync: { total: 3, inserted: 3, updated: 0, unchanged: 0 }`

---

### Caso 2: Login Repetido (Sin Cambios)

**Input**: Usuario con credenciales en BD  
**SOAP Response**: Mismas 3 credenciales  
**Backend Action**: Ninguna (hash coincide)  
**Output**: `sync: { total: 3, inserted: 0, updated: 0, unchanged: 3 }`

---

### Caso 3: Renovación de Plan

**Input**: Usuario con credenciales en BD  
**SOAP Response**: 3 credenciales con nuevas fechas vencimiento  
**Backend Action**: UPDATE x3 (hash diferente)  
**Output**: `sync: { total: 3, inserted: 0, updated: 3, unchanged: 0 }`

---

### Caso 4: Nuevo Familiar Agregado

**Input**: Usuario con 2 credenciales en BD  
**SOAP Response**: 3 credenciales (agregaron un hijo)  
**Backend Action**: INSERT x1, UNCHANGED x2  
**Output**: `sync: { total: 3, inserted: 1, updated: 0, unchanged: 2 }`

---

## Queries de Diagnóstico

### Contar Credenciales por Usuario

```sql
SELECT 
  u.nuusumailf AS email,
  COUNT(cu.crcreid) AS total_credenciales,
  SUM(CASE WHEN cu.crcrepropi = 'S' THEN 1 ELSE 0 END) AS propias,
  SUM(CASE WHEN cu.crcrepropi = 'N' THEN 1 ELSE 0 END) AS familiares
FROM nuusuari u
LEFT JOIN crcredus cu ON u.nuusuid = cu.nuusuid
GROUP BY u.nuusumailf
HAVING COUNT(cu.crcreid) > 0;
```

### Última Sincronización de Credenciales

```sql
SELECT 
  crcreid,
  crcreapeno,
  crcrefecvi,
  crcreifech,
  EXTRACT(EPOCH FROM (NOW() - crcreifech))/60 AS minutos_desde_sync
FROM crcreden
ORDER BY crcreifech DESC
LIMIT 10;
```

### Verificar Integridad de Hash

```sql
SELECT 
  crcreid,
  crcreapeno,
  LENGTH(crcrehash) AS hash_length,
  CASE 
    WHEN LENGTH(crcrehash) = 64 THEN 'OK'
    ELSE 'ERROR'
  END AS hash_valido
FROM crcreden
WHERE crcreifech > NOW() - INTERVAL '1 day';
```

---

## Troubleshooting

### Error: "No se pudieron cargar credenciales"

**Causa**: Usuario no tiene `nuusuid` en tabla `nuusuari`  
**Solución**: El usuario debe registrarse primero desde `/register`

---

### Error: "AfiliadoId no disponible"

**Causa**: Usuario no tiene `afiliadoId` asociado  
**Solución**: 
1. Verificar que el registro SOAP fue exitoso
2. Verificar que `afiliadoId` está guardado en `users.json`
3. Verificar que `nuusuafili` está poblado en `nuusuari`

---

### Error: SOAP "Cannot find module"

**Causa**: Servicio SOAP no responde o WSDL no accesible  
**Solución**: Verificar conectividad con `tkqa.tekhne.com.ar:8700`

---

### Credenciales No Se Actualizan

**Causa**: Hash idéntico aunque datos cambiaron  
**Solución**: Verificar que todos los campos están incluidos en `calculateCredencialHash()`

---

## Estado Actual

✅ **Backend Implementado**  
✅ **Endpoints Creados**  
✅ **AuthContext Actualizado**  
✅ **CredencialesScreen Creado**  
✅ **Documentación Completa**

⏳ **Pendiente**:  
- Testing end-to-end con usuario real  
- Agregar navegación a CredencialesScreen  
- Pruebas de performance con muchas credenciales  

---

**Fin de Documento de Testing**
