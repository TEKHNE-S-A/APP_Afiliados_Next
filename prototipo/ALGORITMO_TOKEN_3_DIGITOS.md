# Algoritmo Token Temporal de 3 Dígitos

## Resumen
Sistema de tokens temporales de 3 dígitos (000-999) que se regeneran cada N minutos, basado en SHA256 del AfiliadoId + timestamp.

---

## Parámetros del Sistema

| Parámetro | Valor | Ubicación |
|-----------|-------|-----------|
| **TimeoutTokenCredencial** | 3-10 minutos (configurable) | Tabla `nusispar` (CREDENCIAL.TimeoutTokenCredencial) |
| **Formato Token** | 3 dígitos con padding (000-999) | Hardcoded |
| **Algoritmo Hash** | SHA256 | Hardcoded |
| **HabilitarValidTokenDni** | S/N | `nusispar` (CREDENCIAL.HabilitarValidTokenDni) |
| **ApiKeySistemaExterno** | string secreto | `nusispar` (CREDENCIAL.ApiKeySistemaExterno) |

---

## Endpoints REST de Validación

### `GET /credencial/token-valido` — Validación por AfiliadoId

Endpoint **público** (sin autenticación). Útil para sistemas internos con acceso directo al AfiliadoId.

```
GET /credencial/token-valido?afiliadoId=000000380...&token=535
```

**Respuesta exitosa:**
```json
{
  "valido": true,
  "expiraEn": "2026-04-22T15:10:00.000Z",
  "segundosRestantes": 87,
  "timeoutMinutos": 3
}
```

---

### `GET /credencial/token-valido-dni` — Validación por DNI *(nuevo — Abril 2026)*

Endpoint **autenticado** pensado para **sistemas externos** (SIA, GeneXus, farmacia, prestadores) que solo conocen el DNI del afiliado, sin necesidad de tener el AfiliadoId de 30 caracteres.

#### Flujo interno del endpoint

```
DNI recibido
    │
    ▼
nuusuari WHERE nuusunroaf::text LIKE '%DNI%'
    │
    ├─ No encontrado ──► { valido: false }  (sin revelar 404)
    │
    ▼
nuusuafili (AfiliadoId de 30 chars)
    │
    ▼
crcreden WHERE TRIM(crcreid::text) = nuusuafili
    │
    ├─ No encontrado ──► { valido: false }
    │
    ▼
crcredocum (DNI almacenado en la credencial)
    │
    ▼
normalizarDoc(crcredocum) === normalizarDoc(DNI recibido)?
    │
    ├─ No coincide ──► { valido: false }   (protección OWASP API3)
    │
    ▼
generateTokenFor(afiliadoId, now)  +  bucket anterior
    │
    ▼
{ valido, expiraEn, segundosRestantes, timeoutMinutos }
```

`normalizarDoc` = strip non-digits + strip leading zeros.

#### Autenticación

El endpoint acepta dos métodos de autenticación:

| Método | Header | Quién lo usa |
|--------|--------|--------------|
| Sesión de usuario | `Authorization: Bearer <token>` | App móvil, paneles web |
| API Key | `X-API-Key: <clave>` | SIA, GeneXus, sistemas externos |

La API Key se configura en BD:
```sql
UPDATE nusispar SET nusisvalpa = 'clave-secreta-sia'
WHERE nusisgrupa = 'CREDENCIAL' AND nusistippa = 'ApiKeySistemaExterno';
```

#### Validaciones de entrada

| Parámetro | Regla | Error |
|-----------|-------|-------|
| `dni` | Solo dígitos, 6–9 caracteres | 400 BAD_REQUEST |
| `token` | Exactamente 3 dígitos | 400 BAD_REQUEST |
| Autenticación | Bearer válido **o** X-API-Key válida | 401 UNAUTHORIZED |
| Feature flag | `HabilitarValidTokenDni = S` | 503 SERVICE_UNAVAILABLE |

#### Rate limit

10 requests/minuto por IP + DNI (configurable en `nusispar`):

| Parámetro nusispar | Grupo | Default |
|--------------------|-------|---------|
| `RLTokenValidDniMaxAttempts` | SEGURIDAD_APP | 10 |
| `RLTokenValidDniWindowSec` | SEGURIDAD_APP | 60 |

#### Ejemplo de uso (sistema externo con API Key)

```http
GET /credencial/token-valido-dni?dni=28878765&token=842
X-API-Key: clave-secreta-sia
```

```json
{
  "valido": true,
  "expiraEn": "2026-04-22T15:10:00.000Z",
  "segundosRestantes": 94,
  "timeoutMinutos": 3
}
```

#### Respuesta negativa (uniforme para todos los casos de falla)

```json
{ "valido": false }
```

> **Nota de seguridad**: La respuesta nunca revela si el DNI existe o no en el sistema (OWASP API3 — Excessive Data Exposure).

---

## Algoritmo Completo

### 1. Entrada
- `AfiliadoId` (string de 30 caracteres, ej: `"000082018000000000001000082018"`)
- `FechaHora` (timestamp actual en milisegundos desde epoch)
- `TimeoutMinutos` (número entero, típicamente 3-10)

### 2. Cálculo del Bucket (Ventana Temporal)
```
bucketMs = TimeoutMinutos × 60 × 1000
bucket = floor(FechaHora / bucketMs)
```

**Explicación**: Divide el tiempo en "ventanas" de N minutos. Todos los tokens generados dentro de la misma ventana producen el mismo resultado.

**Ejemplo**:
- TimeoutMinutos = 10
- FechaHora = 1739810000000 (18/02/2026 13:46:40 UTC)
- bucketMs = 10 × 60 × 1000 = 600000
- bucket = floor(1739810000000 / 600000) = 2899683

### 3. Construcción del Payload
```
payload = AfiliadoId + ":" + bucket
```

**Ejemplo**:
```
payload = "000082018000000000001000082018:2899683"
```

### 4. Hash SHA256
```
hash = SHA256(payload)  // resultado: 32 bytes (256 bits)
```

**Ejemplo**:
```
hash = SHA256("000082018000000000001000082018:2899683")
     = 0x3f4a5b2c8d9e1f0a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a...
```

### 5. Conversión a Entero
Tomar los **primeros 4 bytes** del hash y convertir a entero sin signo (uint32, big-endian):

```
intVal = hash[0..3] como uint32 big-endian
```

**Ejemplo**:
```
primeros 4 bytes: 0x3f4a5b2c
intVal = 1062190892
```

### 6. Módulo 1000 y Padding
```
tokenNum = intVal % 1000
token = tokenNum con padding a 3 dígitos (agregar ceros a la izquierda)
```

**Ejemplo**:
```
tokenNum = 1062190892 % 1000 = 892
token = "892"
```

Si tokenNum = 5, entonces token = "005"
Si tokenNum = 42, entonces token = "042"

---

## Pseudocódigo

```javascript
FUNCIÓN GenerarToken(afiliadoId, fechaHora, timeoutMinutos):
    // 1. Calcular bucket
    bucketMs = timeoutMinutos * 60 * 1000
    bucket = FLOOR(fechaHora / bucketMs)
    
    // 2. Construir payload
    payload = afiliadoId + ":" + bucket
    
    // 3. Hash SHA256
    hash = SHA256(payload)  // 32 bytes
    
    // 4. Primeros 4 bytes a entero
    intVal = ConvertirBytesAUInt32BigEndian(hash[0..3])
    
    // 5. Módulo 1000
    tokenNum = intVal % 1000
    
    // 6. Padding a 3 dígitos
    token = PadLeft(tokenNum, 3, "0")
    
    RETORNAR token
FIN FUNCIÓN
```

---

## Implementaciones por Lenguaje

### Node.js (Backend Actual)

```javascript
const crypto = require('crypto')

function generateToken(afiliadoId, timeoutMinutes = 10, now = new Date()) {
  const bucketMs = timeoutMinutes * 60 * 1000
  const epoch = now.getTime()
  const bucket = Math.floor(epoch / bucketMs)
  
  const payload = `${afiliadoId}:${bucket}`
  const hash = crypto.createHash('sha256').update(payload).digest()
  const intVal = hash.readUInt32BE(0)  // Primeros 4 bytes, big-endian
  const tokenNum = intVal % 1000
  
  return String(tokenNum).padStart(3, '0')
}

// Ejemplo de uso
const token = generateToken('000082018000000000001000082018', 10)
console.log(token)  // "892" (depende del timestamp actual)
```

### JavaScript (Mobile/Frontend)

```javascript
import CryptoJS from 'crypto-js'

function generateToken(afiliadoId, timeoutMinutes = 10, now = new Date()) {
  const bucketMs = timeoutMinutes * 60 * 1000
  const epoch = now.getTime()
  const bucket = Math.floor(epoch / bucketMs)
  
  const payload = `${afiliadoId}:${bucket}`
  const hashHex = CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex)
  
  // Primeros 8 caracteres hex = 4 bytes
  const first8 = hashHex.slice(0, 8)
  const intVal = parseInt(first8, 16)
  const tokenNum = intVal % 1000
  
  return String(tokenNum).padStart(3, '0')
}
```

### Python

```python
import hashlib
import struct
from datetime import datetime

def generate_token(afiliado_id: str, timeout_minutes: int = 10, now: datetime = None) -> str:
    if now is None:
        now = datetime.utcnow()
    
    # 1. Calcular bucket
    bucket_ms = timeout_minutes * 60 * 1000
    epoch = int(now.timestamp() * 1000)
    bucket = epoch // bucket_ms
    
    # 2. Payload
    payload = f"{afiliado_id}:{bucket}"
    
    # 3. SHA256
    hash_bytes = hashlib.sha256(payload.encode('utf-8')).digest()
    
    # 4. Primeros 4 bytes a uint32 big-endian
    int_val = struct.unpack('>I', hash_bytes[:4])[0]
    
    # 5. Módulo 1000
    token_num = int_val % 1000
    
    # 6. Padding
    return str(token_num).zfill(3)

# Ejemplo
token = generate_token('000082018000000000001000082018', 10)
print(token)  # "892"
```

### Java

```java
import java.security.MessageDigest;
import java.time.Instant;

public class TokenGenerator {
    public static String generateToken(String afiliadoId, int timeoutMinutes) {
        try {
            // 1. Calcular bucket
            long bucketMs = (long) timeoutMinutes * 60 * 1000;
            long epoch = Instant.now().toEpochMilli();
            long bucket = epoch / bucketMs;
            
            // 2. Payload
            String payload = afiliadoId + ":" + bucket;
            
            // 3. SHA256
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload.getBytes("UTF-8"));
            
            // 4. Primeros 4 bytes a int
            long intVal = ((hash[0] & 0xFFL) << 24) |
                         ((hash[1] & 0xFFL) << 16) |
                         ((hash[2] & 0xFFL) << 8) |
                         (hash[3] & 0xFFL);
            
            // 5. Módulo 1000
            int tokenNum = (int)(intVal % 1000);
            
            // 6. Padding
            return String.format("%03d", tokenNum);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
```

### GeneXus (usando función externa o Java)

```genexus
// Opción 1: External Object (Java)
&TokenGen = new com.osep.TokenGenerator()
&Token = &TokenGen.generateToken(&AfiliadoId, &TimeoutMinutos)

// Opción 2: Implementación GeneXus nativa (requiere función SHA256)
Sub GenerarToken
    // Parámetros: &AfiliadoId (Char 30), &TimeoutMinutos (Numeric 2)
    // Retorna: &Token (Char 3)
    
    &BucketMs = &TimeoutMinutos * 60 * 1000
    &Epoch = CtoT(&Now, 1)  // Timestamp en ms
    &Bucket = Int(&Epoch / &BucketMs)
    
    &Payload = Trim(&AfiliadoId) + ":" + Str(&Bucket)
    &Hash = SHA256(&Payload)  // Debe estar disponible como función externa
    
    // Convertir primeros 4 bytes a número
    &HexParte = Substring(&Hash, 1, 8)
    &IntVal = HexToLong(&HexParte)
    
    &TokenNum = Mod(&IntVal, 1000)
    &Token = PadL(Str(&TokenNum), 3, "0")
EndSub
```

### C# (.NET)

```csharp
using System;
using System.Security.Cryptography;
using System.Text;

public class TokenGenerator
{
    public static string GenerateToken(string afiliadoId, int timeoutMinutes = 10)
    {
        // 1. Calcular bucket
        long bucketMs = (long)timeoutMinutes * 60 * 1000;
        long epoch = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        long bucket = epoch / bucketMs;
        
        // 2. Payload
        string payload = $"{afiliadoId}:{bucket}";
        
        // 3. SHA256
        using (var sha256 = SHA256.Create())
        {
            byte[] hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(payload));
            
            // 4. Primeros 4 bytes a uint32 big-endian
            if (BitConverter.IsLittleEndian)
            {
                Array.Reverse(hash, 0, 4);
            }
            uint intVal = BitConverter.ToUInt32(hash, 0);
            
            // 5. Módulo 1000
            int tokenNum = (int)(intVal % 1000);
            
            // 6. Padding
            return tokenNum.ToString("D3");
        }
    }
}
```

---

## Validación de Token (Función Inversa)

Para validar un token dado, se regenera el token para el bucket actual y se compara:

```javascript
function verifyToken(afiliadoId, tokenToCheck, timeoutMinutes = 10, toleranceBuckets = 1) {
  const now = new Date()
  
  // Verificar bucket actual y buckets adyacentes (tolerancia sincronización reloj)
  for (let delta = -toleranceBuckets; delta <= toleranceBuckets; delta++) {
    const testTime = new Date(now.getTime() + delta * timeoutMinutes * 60 * 1000)
    const testToken = generateToken(afiliadoId, timeoutMinutes, testTime)
    
    if (testToken === tokenToCheck) {
      return {
        valid: true,
        bucketDelta: delta,  // 0 = bucket actual, -1 = anterior, +1 = siguiente
        generatedAt: new Date(Math.floor(testTime.getTime() / (timeoutMinutes * 60 * 1000)) * timeoutMinutes * 60 * 1000)
      }
    }
  }
  
  return { valid: false }
}

// Uso
const result = verifyToken('000082018000000000001000082018', '892', 10)
if (result.valid) {
  console.log('Token válido, generado en bucket:', result.bucketDelta)
} else {
  console.log('Token inválido o expirado')
}
```

---

## Obtener Información del Token

### ¿Cuándo fue generado el token?

```javascript
function getTokenGenerationTime(timeoutMinutes = 10, now = new Date()) {
  const bucketMs = timeoutMinutes * 60 * 1000
  const epoch = now.getTime()
  const bucket = Math.floor(epoch / bucketMs)
  const generatedAt = new Date(bucket * bucketMs)
  const expiresAt = new Date((bucket + 1) * bucketMs)
  
  return {
    generatedAt,    // Inicio del bucket actual
    expiresAt,      // Fin del bucket actual (inicio del siguiente)
    timeRemaining: expiresAt.getTime() - now.getTime()  // ms restantes
  }
}

// Ejemplo
const info = getTokenGenerationTime(10)
console.log('Token generado a las:', info.generatedAt.toISOString())
console.log('Expira a las:', info.expiresAt.toISOString())
console.log('Tiempo restante:', Math.floor(info.timeRemaining / 1000), 'segundos')
```

### ¿Dado un AfiliadoId y Token, obtener el bucket?

⚠️ **IMPORTANTE**: NO es posible obtener el bucket o timestamp original a partir del token, ya que:
1. SHA256 es función unidireccional (no reversible)
2. El módulo 1000 descarta información (múltiples intVal producen el mismo token)

**Solución**: Validar contra buckets recientes con tolerancia:

```javascript
function findTokenBucket(afiliadoId, tokenToCheck, timeoutMinutes = 10, maxBucketsBack = 10) {
  const now = new Date()
  const bucketMs = timeoutMinutes * 60 * 1000
  const currentBucket = Math.floor(now.getTime() / bucketMs)
  
  // Buscar hacia atrás hasta maxBucketsBack
  for (let i = 0; i <= maxBucketsBack; i++) {
    const testBucket = currentBucket - i
    const testTime = new Date(testBucket * bucketMs + bucketMs / 2)  // Medio del bucket
    const testToken = generateToken(afiliadoId, timeoutMinutes, testTime)
    
    if (testToken === tokenToCheck) {
      return {
        found: true,
        bucket: testBucket,
        generatedAt: new Date(testBucket * bucketMs),
        expiresAt: new Date((testBucket + 1) * bucketMs)
      }
    }
  }
  
  return { found: false }
}

// Uso
const result = findTokenBucket('000082018000000000001000082018', '892', 10, 20)
if (result.found) {
  console.log('Token encontrado en bucket:', result.bucket)
  console.log('Generado:', result.generatedAt.toISOString())
  console.log('Expira:', result.expiresAt.toISOString())
}
```

---

## Casos de Uso

### 1. Generar token para mostrar en app móvil
```javascript
const token = generateToken(afiliadoId, 10)
const info = getTokenGenerationTime(10)
// Mostrar: token + countdown hasta info.expiresAt
```

### 2. Validar token en punto de atención (Genexus/Backend)
```javascript
// Usuario presenta credencial con token
const isValid = verifyToken(afiliadoId, tokenPresentado, 10, 1)
if (!isValid.valid) {
  // Rechazar - token inválido o expirado
}
```

### 3. Regenerar token automáticamente en frontend
```javascript
setInterval(() => {
  const newToken = generateToken(afiliadoId, timeoutMinutes)
  const info = getTokenGenerationTime(timeoutMinutes)
  updateUI({ token: newToken, expiresAt: info.expiresAt })
}, 1000)  // Actualizar cada segundo para countdown
```

---

## Características de Seguridad

### ✅ Ventajas
1. **Determinista**: Mismo AfiliadoId + timestamp → mismo token
2. **No requiere BD**: Se calcula on-the-fly
3. **Sincronizable**: Múltiples sistemas generan el mismo token
4. **Temporal**: Se regenera automáticamente cada N minutos
5. **Compacto**: Solo 3 dígitos, fácil de leer/teclear

### ⚠️ Limitaciones
1. **Colisiones posibles**: Solo 1000 valores únicos, puede haber colisión con otro AfiliadoId en el mismo bucket (probabilidad ~10% con 100 usuarios simultáneos)
2. **No criptográficamente seguro**: El token es predecible si se conoce el algoritmo
3. **Requiere sincronización de reloj**: Diferencias de tiempo >1 minuto pueden causar desincronización

### 🔒 Recomendaciones
- **NO usar como autenticación primaria** (solo como verificación adicional de credencial física)
- **Validar siempre contra AfiliadoId conocido** (no usar token solo)
- **Sincronizar relojes de servidores con NTP**
- **Tolerancia de ±1 bucket** para compensar diferencias de reloj

---

## Ejemplos Completos

### Backend validando credencial presentada por usuario

```javascript
// Usuario presenta credencial física con QR
const qrData = {
  afiliadoId: '000082018000000000001000082018',
  cuil: '20374642538',
  token: '892',
  vence: '2026-03-04'
}

// 1. Verificar vigencia
if (new Date(qrData.vence) < new Date()) {
  return { error: 'Credencial vencida' }
}

// 2. Verificar token temporal
const tokenValid = verifyToken(qrData.afiliadoId, qrData.token, 10, 1)
if (!tokenValid.valid) {
  return { error: 'Token inválido o expirado' }
}

// 3. Consultar afiliado en BD
const afiliado = await getAfiliado(qrData.afiliadoId)
if (afiliado.cuil !== qrData.cuil) {
  return { error: 'CUIL no coincide' }
}

// ✅ Credencial válida
return { valid: true, afiliado }
```

---

## Testing

### Test Cases

```javascript
// Test 1: Token se regenera cada timeout
const t1 = generateToken('000082018000000000001000082018', 10, new Date('2026-02-18T13:40:00Z'))
const t2 = generateToken('000082018000000000001000082018', 10, new Date('2026-02-18T13:45:00Z'))
const t3 = generateToken('000082018000000000001000082018', 10, new Date('2026-02-18T13:50:00Z'))
// t1 === t2 (mismo bucket), t3 diferente (siguiente bucket)

// Test 2: Diferentes AfiliadoId → diferentes tokens (probablemente)
const ta = generateToken('000000001000000000001000000001', 10)
const tb = generateToken('000000002000000000001000000002', 10)
// ta !== tb (muy probablemente)

// Test 3: Padding correcto
const token5 = generateTokenMock(5)     // "005"
const token42 = generateTokenMock(42)   // "042"
const token999 = generateTokenMock(999) // "999"

// Test 4: Validación con tolerancia
const now = new Date()
const token = generateToken('000082018000000000001000082018', 10, now)
const valid = verifyToken('000082018000000000001000082018', token, 10, 1)
// valid.valid === true
```

---

## Configuración en Producción

### Tabla `nusispar`
```sql
-- Parámetro de timeout
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa)
VALUES ('CREDENCIAL', 'TimeoutTokenCredencial', '10');

-- Actualizar timeout (ej. cambiar a 5 minutos)
UPDATE nusispar 
SET nusisvalpa = '5'
WHERE nusisgrupa = 'CREDENCIAL' AND nusistippa = 'TimeoutTokenCredencial';
```

### Recomendaciones de Timeout
- **3 minutos**: Alta seguridad, regeneración frecuente (molesto para usuario)
- **5 minutos**: Balance seguridad/usabilidad
- **10 minutos**: (Actual) Usabilidad alta, seguridad media
- **15+ minutos**: NO recomendado (token válido demasiado tiempo)

---

## Troubleshooting

### Token no coincide entre sistemas

**Causas posibles**:
1. **Desincronización de reloj**: Verificar NTP, diferencia >1 minuto
2. **Timezone diferente**: Usar siempre UTC/epoch milisegundos
3. **Timeout diferente**: Verificar mismo valor en ambos sistemas
4. **AfiliadoId diferente**: Verificar formato exacto (30 caracteres)

**Solución**:
```javascript
// Debug: Mostrar bucket y timestamp
const now = new Date()
const bucketMs = 10 * 60 * 1000
const bucket = Math.floor(now.getTime() / bucketMs)
console.log('Epoch:', now.getTime())
console.log('Bucket:', bucket)
console.log('Token:', generateToken(afiliadoId, 10, now))
```

### Token cambia antes de tiempo esperado

**Causa**: Estás cerca del límite del bucket, y el reloj avanzó al siguiente.

**Solución**: Implementar countdown para avisar cuando falta poco:
```javascript
const info = getTokenGenerationTime(10)
const secondsRemaining = Math.floor(info.timeRemaining / 1000)
if (secondsRemaining < 30) {
  console.warn('Token expira en', secondsRemaining, 'segundos')
}
```

---

## Contacto y Soporte

Para consultas sobre implementación o problemas de sincronización, contactar al equipo de desarrollo de APP_Afiliados.

**Última actualización**: 18 de febrero de 2026
