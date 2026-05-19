# Corrección de Solicitudes SIA con Fotos - Límites de Caracteres

**Fecha**: 22 de diciembre de 2025  
**Estado**: ✅ CORREGIDO - Pendiente test final  
**Archivo afectado**: `backend/server-soap.js` (líneas 4276-4296)

---

## 📋 Resumen Ejecutivo

Se corrigieron errores de longitud de campos al enviar solicitudes con fotos adjuntas al sistema SIA a través de SOAP. El servicio `REC_SOLICITUDES_APP` rechazaba las solicitudes con el error PostgreSQL **"value too long for type character(20)"** debido a que dos campos (`AUSoFFileName` y `AUSoFIdExt`) excedían el límite de 20 caracteres impuesto por la base de datos de SIA.

---

## 🔴 Problema Original

### Error Observado
```
ERROR: value too long for type character(20)
CONTEXT: Remote SQL statement: INSERT INTO "ausofot_bc" ...
```

### Análisis del Error
El servicio SOAP `REC_SOLICITUDES_APP` inserta registros en la tabla `ausofot_bc` de SIA, que tiene restricciones estrictas de longitud en varios campos. Dos campos excedían el límite de **20 caracteres**:

| Campo | Valor Original | Longitud | Límite | Estado |
|-------|----------------|----------|--------|--------|
| `AUSoFFileName` | `solicitud_2166852d-3e52-4dc3-a56f-c6f18e5d07f1_foto1.jpg` | **59 chars** | 20 | ❌ EXCEDE |
| `AUSoFIdExt` | `17c6bfe7-e958-4d64-bc27-227d388d8bb9` (UUID) | **36 chars** | 20 | ❌ EXCEDE |

### Estructura de Datos Problemática (Antes)

```javascript
// ❌ INCORRECTO - Campos demasiado largos
const fotosSIA = []
if (foto1Base64) {
  const foto1Clean = cleanBase64(foto1Base64)
  fotosSIA.push({
    AUSoFId: fotoIndex,
    AUSoFIdExt: crypto.randomUUID(),                              // 36 caracteres ❌
    AUSoFFileName: `solicitud_${ausolicid}_foto${fotoIndex}.jpg`, // 59 caracteres ❌
    AUSoFFotoBase64: foto1Clean
  })
  fotoIndex++
}
```

---

## ✅ Solución Implementada

### Cambios Aplicados

#### 1. **AUSoFFileName**: Nombre de archivo simplificado
```javascript
// ANTES (59 caracteres):
AUSoFFileName: `solicitud_${ausolicid}_foto${fotoIndex}.jpg`

// DESPUÉS (6 caracteres):
AUSoFFileName: `f${fotoIndex}.jpg`  // Ejemplo: "f1.jpg", "f2.jpg"
```

**Justificación**: El nombre del archivo es solo referencial en SIA. La foto completa se guarda en base64 y en la BD local con su UUID correspondiente. El nombre corto es suficiente para identificación.

#### 2. **AUSoFIdExt**: Identificador externo numérico
```javascript
// ANTES (36 caracteres - UUID):
AUSoFIdExt: crypto.randomUUID()  // "17c6bfe7-e958-4d64-bc27-227d388d8bb9"

// DESPUÉS (1-2 caracteres):
AUSoFIdExt: fotoIndex.toString()  // "1" o "2"
```

**Justificación**: El identificador externo es usado por SIA para referenciar la foto. El índice secuencial (`fotoIndex`) es único dentro del contexto de cada solicitud y cumple perfectamente este propósito.

### Código Corregido Final

```javascript
// ✅ CORRECTO - Todos los campos dentro del límite de 20 caracteres
const fotosSIA = []
let fotoIndex = 1

// Foto 1
if (foto1Base64) {
  const foto1Clean = cleanBase64(foto1Base64)
  fotosSIA.push({
    AUSoFId: fotoIndex,                    // Número: 1
    AUSoFIdExt: fotoIndex.toString(),      // String: "1" (1 carácter) ✅
    AUSoFFileName: `f${fotoIndex}.jpg`,    // String: "f1.jpg" (6 caracteres) ✅
    AUSoFFotoBase64: foto1Clean
  })
  fotoIndex++
}

// Foto 2
if (foto2Base64) {
  const foto2Clean = cleanBase64(foto2Base64)
  fotosSIA.push({
    AUSoFId: fotoIndex,                    // Número: 2
    AUSoFIdExt: fotoIndex.toString(),      // String: "2" (1 carácter) ✅
    AUSoFFileName: `f${fotoIndex}.jpg`,    // String: "f2.jpg" (6 caracteres) ✅
    AUSoFFotoBase64: foto2Clean
  })
  fotoIndex++
}

// Añadir al body del SOAP
if (fotosSIA.length > 0) {
  bodyParsed.Foto = fotosSIA
  console.log(`📸 Fotos preparadas para SIA:`, fotosSIA.map(f => ({
    id: f.AUSoFId,
    idExt: f.AUSoFIdExt,
    filename: f.AUSoFFileName,
    base64Length: f.AUSoFFotoBase64?.length
  })))
}
```

---

## 📊 Tabla de Campos SIA - Límites y Restricciones

### Campos del Objeto `Foto[]` (Array)

| Campo | Tipo | Longitud Máxima | Ejemplo Correcto | Descripción |
|-------|------|-----------------|------------------|-------------|
| `AUSoFId` | Number | N/A | `1`, `2` | Índice secuencial de la foto |
| `AUSoFIdExt` | String | **≤ 20 chars** | `"1"`, `"2"` | Identificador externo (usar índice) |
| `AUSoFFileName` | String | **≤ 20 chars** | `"f1.jpg"`, `"f2.jpg"` | Nombre del archivo (simplificado) |
| `AUSoFFotoBase64` | String | Sin límite | `"/9j/4AAQ..."` | Imagen en base64 (sin prefix) |

### Otros Campos de Solicitud con Límites

| Campo | Tipo | Longitud Máxima | Recomendación |
|-------|------|-----------------|---------------|
| `AUSolPresId` | Number | N/A | Enviar como número |
| `AUSolPresCant` | Number | N/A | Enviar como número |
| `AUSolReferencia` | String | **≤ 255** | Usar `.substring(0, 255)` |
| `AUSolProfesional` | String | **≤ 255** | Usar `.substring(0, 255)` |

---

## 🗄️ Base de Datos: Local vs SIA

### **IMPORTANTE**: Diferencia de Esquemas

La **base de datos local** y el **sistema SIA** usan esquemas completamente diferentes para almacenar fotos:

#### BD Local (PostgreSQL - APP_Afiliados)

**Tabla**: `ausoaufo`

```sql
CREATE TABLE ausoaufo (
  ausolicid UUID NOT NULL,        -- FK a ausolicitud
  ausolfotid UUID NOT NULL,       -- UUID único de la foto (sin límite de caracteres)
  ausolf BYTEA NOT NULL,          -- Foto en formato binario
  PRIMARY KEY (ausolicid, ausolfotid)
);
```

**Características**:
- ✅ **Sin límites de caracteres** en `ausolfotid` (es UUID)
- ✅ Almacena foto como **bytea** (binario)
- ✅ No tiene campos `AUSoFIdExt` ni `AUSoFFileName`

**Ejemplo de INSERT Local**:
```javascript
await client.query(
  'INSERT INTO ausoaufo (ausolicid, ausolfotid, ausolf) VALUES ($1, $2, $3)',
  [
    ausolicid,    // UUID de la solicitud
    foto1Id,      // UUID de la foto (36 caracteres - OK para UUID)
    foto1Buffer   // Buffer binario de la imagen
  ]
)
```

#### BD SIA (PostgreSQL - Sistema Tekhne)

**Tabla**: `ausofot_bc` (Business Component)

```sql
CREATE TABLE ausofot_bc (
  AUSoFId INTEGER,
  AUSoFIdExt CHARACTER(20),      -- LÍMITE 20 CARACTERES ⚠️
  AUSoFFileName CHARACTER(20),   -- LÍMITE 20 CARACTERES ⚠️
  AUSoFFotoBase64 TEXT,
  -- otros campos...
);
```

**Características**:
- ⚠️ **Límite estricto de 20 caracteres** en `AUSoFIdExt` y `AUSoFFileName`
- ⚠️ No acepta UUIDs (36 chars) en campos CHARACTER(20)
- ⚠️ Recibe foto en **base64** (no binario)

### 📝 Resumen

| Aspecto | BD Local | BD SIA |
|---------|----------|--------|
| **Tabla** | `ausoaufo` | `ausofot_bc` |
| **ID Foto** | `ausolfotid` (UUID sin límite) | `AUSoFIdExt` (≤20 chars) |
| **Nombre** | No almacena | `AUSoFFileName` (≤20 chars) |
| **Formato** | Binario (bytea) | Base64 (TEXT) |
| **Conflictos** | ❌ NINGUNO | ⚠️ Límites estrictos |

**Conclusión**: Los campos `AUSoFIdExt` y `AUSoFFileName` son **exclusivos del payload SOAP hacia SIA** y **NO se almacenan en la BD local**. Por lo tanto, acortarlos no afecta el almacenamiento local.

---

## 🧪 Testing y Validación

### Pasos de Prueba

1. **Preparar solicitud desde la app móvil**
   - Navegar a Trámites → Crear Solicitud
   - Completar campos: tipo de prestación, cantidad, referencia
   - Adjuntar 1 o 2 fotos (desde galería o cámara)

2. **Enviar solicitud y capturar logs del backend**
   ```powershell
   # Ver logs en tiempo real
   cd backend
   node server-soap.js
   ```

3. **Verificar en logs del backend**
   
   **✅ Log esperado - ÉXITO**:
   ```
   📸 Fotos preparadas para SIA:
   [
     {
       id: 1,
       idExt: '1',
       filename: 'f1.jpg',
       base64Length: 45678
     },
     {
       id: 2,
       idExt: '2',
       filename: 'f2.jpg',
       base64Length: 52341
     }
   ]
   
   🎯 SOAP REQUEST:
   {
     "Parametros": {
       "AfiliadoId": "...",
       "Foto": [
         {
           "AUSoFId": 1,
           "AUSoFIdExt": "1",
           "AUSoFFileName": "f1.jpg",
           "AUSoFFotoBase64": "/9j/4AAQ..."
         },
         {
           "AUSoFId": 2,
           "AUSoFIdExt": "2",
           "AUSoFFileName": "f2.jpg",
           "AUSoFFotoBase64": "/9j/4AAQ..."
         }
       ],
       // otros campos...
     }
   }
   
   ✅ SOAP RESPONSE from SIA:
   {
     "AUSolId": 12345,
     "AUSolEstId": 1,
     ...
   }
   
   ✅ Solicitud creada: ID=2166852d-..., SIA ID=12345
   ```

   **❌ Log de error - FALLO**:
   ```
   ❌ Error SOAP callSoapExecuteSIA:
   ERROR: value too long for type character(20)
   CONTEXT: Remote SQL statement: INSERT INTO "ausofot_bc" ...
   ```

4. **Verificar en BD local**
   ```sql
   -- Verificar que la solicitud se guardó
   SELECT * FROM ausolicitud WHERE ausolicid = '2166852d-...';
   
   -- Verificar que las fotos se guardaron
   SELECT ausolicid, ausolfotid, length(ausolf) as foto_size
   FROM ausoaufo
   WHERE ausolicid = '2166852d-...';
   ```

5. **Verificar en app móvil**
   - La solicitud debe aparecer en "Mis Solicitudes"
   - Estado: "Pendiente" (AUSolEstId = 1)
   - Fotos visibles al abrir detalle

### Casos de Prueba

| # | Descripción | Fotos | Resultado Esperado |
|---|-------------|-------|---------------------|
| 1 | Solicitud con 1 foto | 1 | ✅ AUSolId > 0, guardado local OK |
| 2 | Solicitud con 2 fotos | 2 | ✅ AUSolId > 0, guardado local OK |
| 3 | Solicitud sin fotos | 0 | ✅ AUSolId > 0, guardado local OK |
| 4 | Foto muy grande (>5MB) | 1 | ⚠️ Posible timeout, revisar logs |
| 5 | Campos largos (referencia 500 chars) | 0 | ✅ Debe truncar a 255 chars |

---

## 🔧 Scripts de Prueba

### Script PowerShell de Prueba Rápida

Crear `backend/test-crear-solicitud-fotos.ps1`:

```powershell
# Test de creación de solicitud con fotos
$baseUrl = "http://localhost:3000"

# Login (obtener token)
$loginBody = @{
    username = "marianr@tekhne.com.ar"
    password = "123456"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "✅ Token obtenido: $($token.Substring(0,20))..."

# Crear solicitud con foto de prueba (base64 pequeño de 1x1 pixel)
$fotoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="

$solicitudBody = @{
    AfiliadoId = $loginResponse.user.nuusuafili
    AUSolTipo = "A"
    AUSolPresId = 101
    AUSolPresCant = 1
    AUSolReferencia = "Test con foto - script PowerShell"
    AUSolProfesional = "Dr. Test"
    Foto1Base64 = $fotoBase64
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
}

Write-Host "`n🚀 Enviando solicitud con foto..."
$solicitudResponse = Invoke-RestMethod -Uri "$baseUrl/sia/solicitudes" -Method Post -Body $solicitudBody -ContentType "application/json" -Headers $headers

Write-Host "`n✅ RESPUESTA DE SIA:"
$solicitudResponse | ConvertTo-Json -Depth 10

if ($solicitudResponse.AUSolId -gt 0) {
    Write-Host "`n✅✅ ÉXITO: Solicitud creada con ID SIA: $($solicitudResponse.AUSolId)" -ForegroundColor Green
} else {
    Write-Host "`n❌ ERROR: SIA no devolvió ID válido" -ForegroundColor Red
}
```

Ejecutar:
```powershell
cd backend
.\test-crear-solicitud-fotos.ps1
```

---

## 📚 Referencias

### Archivos Relacionados

- **Código principal**: `backend/server-soap.js` (líneas 4190-4350)
- **Servicios SIA**: `backend/SIA_SERVICES.md`
- **Ejemplos SOAP**: `backend/SIA_SOAP_EXAMPLES.md`
- **Integración SOAP**: `backend/SOAP_INTEGRATION.md`

### Funciones Clave

#### `cleanBase64(base64String)`
Remueve el prefijo `data:image/jpeg;base64,` de las cadenas base64.

```javascript
const cleanBase64 = (base64String) => {
  if (!base64String) return null
  const base64Prefix = base64String.indexOf(',')
  if (base64Prefix !== -1) {
    return base64String.substring(base64Prefix + 1)
  }
  return base64String
}
```

#### Construcción del Payload SOAP
```javascript
// Estructura final del payload
const bodyParsed = {
  AfiliadoId: afiliadoId,
  AUSolTipo: AUSolTipo || 'A',
  AUSolPresId: parseInt(AUSolPresId),
  AUSolPresCant: parseInt(AUSolPresCant),
  AUSolReferencia: (AUSolReferencia || '').substring(0, 255),
  AUSolProfesional: (AUSolProfesional || '').substring(0, 255),
  Foto: fotosSIA  // Array con fotos corregidas
}
```

---

## 🚨 Troubleshooting

### Error: "value too long for type character(20)"

**Causa**: Un campo de tipo `CHARACTER(20)` recibió más de 20 caracteres.

**Solución**: 
1. Verificar logs del backend: buscar `📸 Fotos preparadas para SIA`
2. Confirmar que `idExt` y `filename` tienen máximo 20 caracteres
3. Si el error persiste, revisar otros campos del payload

### Error: "Foto[] no debe estar vacío"

**Causa**: Se envió un array vacío en lugar de omitir el campo.

**Solución**:
```javascript
// ❌ INCORRECTO
if (fotosSIA.length > 0) {
  bodyParsed.Foto = fotosSIA
} else {
  bodyParsed.Foto = []  // ❌ No enviar array vacío
}

// ✅ CORRECTO
if (fotosSIA.length > 0) {
  bodyParsed.Foto = fotosSIA
}
// No incluir campo Foto si no hay fotos
```

### Foto no se muestra en la app

**Posibles causas**:
1. No se guardó en BD local (`ausoaufo`)
2. Base64 mal formateado
3. Buffer de imagen corrupto

**Verificación**:
```sql
-- Ver fotos guardadas
SELECT 
  au.ausolicid,
  au.ausolfotid,
  length(au.ausolf) as tamano_bytes,
  encode(substring(au.ausolf, 1, 20), 'hex') as primeros_bytes
FROM ausoaufo au
WHERE ausolicid = '2166852d-...';
```

---

## 📝 Historial de Cambios

| Fecha | Versión | Cambio | Autor |
|-------|---------|--------|-------|
| 2025-12-22 | 1.0 | Corrección inicial de límites de caracteres | AI Agent |
| 2025-12-22 | 1.1 | Documentación completa del fix | AI Agent |

---

## ✅ Checklist de Validación

- [x] Código corregido en `server-soap.js`
- [x] Backend reiniciado con cambios
- [x] Documentación técnica creada
- [ ] **Test desde app móvil con 1 foto**
- [ ] **Test desde app móvil con 2 fotos**
- [ ] **Verificación en BD local**
- [ ] **Confirmación de respuesta SIA (AUSolId > 0)**
- [ ] **Test de edge cases (campos largos)**

---

## 🎯 Estado Actual

**✅ CORRECCIONES COMPLETADAS**  
**🔄 PENDIENTE: Test final desde app móvil**

Para validar que todo funciona correctamente:
1. Abrir app móvil
2. Crear solicitud con 1-2 fotos
3. Verificar logs del backend
4. Confirmar que SIA devuelve `AUSolId > 0`
5. Verificar que fotos se guardaron en BD local

---

**Última actualización**: 22 de diciembre de 2025, 18:57 GMT-3
