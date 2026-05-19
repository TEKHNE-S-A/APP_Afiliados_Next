# Integración Token Temporal - Ejemplos por Sistema

Este documento contiene ejemplos de implementación del algoritmo de token temporal de 3 dígitos para diferentes plataformas.

## Índice de Opciones de Integración

| Sistema/Plataforma | Método | Complejidad | Rendimiento | Recomendado |
|-------------------|--------|-------------|-------------|-------------|
| **Cualquier sistema** | REST API `/token-valido-dni` (solo DNI + token) | ⭐ Muy baja | ⚡ Medio | ✅ **SÍ** (sin AfiliadoId) |
| **GeneXus** | Implementación Nativa (Encryptation) | ⭐⭐ Media | ⚡⚡ Alto | ✅ **SÍ** (standalone) |
| GeneXus | Stored Procedures SQL | ⭐ Baja | ⚡ Alto | ✅ Sí (con BD) |
| GeneXus | Java External Object | ⚠️ Media-Alta | ⚡ Medio | Opcional |
| GeneXus | REST API `/token-valido` (con AfiliadoId) | ⚠️ Baja | 🐌 Bajo | Solo si tiene AfiliadoId |
| **PHP** | Implementación nativa | ⭐ Baja | ⚡⚡ Alto | ✅ Sí |
| **PostgreSQL** | Stored Functions | ⭐ Baja | ⚡⚡⚡ Muy Alto | ✅ Sí |

**📌 Recomendación para sistemas externos (SIA, farmacia, prestadores)**: Usar **`GET /credencial/token-valido-dni`** con API Key — no requiere conocer el AfiliadoId de 30 caracteres.

---

## REST API — Validación por DNI *(recomendado para sistemas externos)*

### Endpoint `GET /credencial/token-valido-dni`

El sistema externo solo necesita:
- El **DNI** del afiliado que presenta la credencial
- El **token de 3 dígitos** visible en la credencial digital
- Una **API Key** configurada en la BD

**No requiere**:
- ❌ AfiliadoId de 30 caracteres
- ❌ Sesión de usuario
- ❌ Login previo

```http
GET https://host:3000/credencial/token-valido-dni?dni=28878765&token=842
X-API-Key: clave-secreta-sia
```

**Respuesta válida:**
```json
{
  "valido": true,
  "expiraEn": "2026-04-22T15:10:00.000Z",
  "segundosRestantes": 94,
  "timeoutMinutos": 3
}
```

**Respuesta inválida (cualquier falla):**
```json
{ "valido": false }
```

### Configuración requerida en BD

```sql
-- Habilitar el endpoint
UPDATE nusispar SET nusisvalpa = 'S'
WHERE nusisgrupa = 'CREDENCIAL' AND nusistippa = 'HabilitarValidTokenDni';

-- Configurar la API Key (usar un valor secreto propio)
UPDATE nusispar SET nusisvalpa = 'clave-secreta-para-sia-2026'
WHERE nusisgrupa = 'CREDENCIAL' AND nusistippa = 'ApiKeySistemaExterno';
```

### Ejemplo GeneXus (llamada REST)

```genexus
// Procedure: ValidarTokenAfiliado
// Parámetros IN: &DNI (VarChar 15), &Token (VarChar 3)
// Parámetros OUT: &EsValido (Boolean)

&HttpClient = new HttpClient()
&HttpClient.Host = "host-backend.osep.gob.ar"
&HttpClient.Port = 3000

&Path = "/credencial/token-valido-dni?dni=" + Trim(&DNI) + "&token=" + Trim(&Token)

&HttpClient.AddHeader("X-API-Key", "clave-secreta-para-sia-2026")
&HttpClient.Execute("GET", &Path)

If &HttpClient.StatusCode = 200
    &JsonObj = new JsonObject()
    &JsonObj.FromString(&HttpClient.ToString())
    &EsValido = &JsonObj.GetBoolean("valido")
Else
    &EsValido = false
EndIf
```

### Ejemplo PHP

```php
function validarTokenAfiliado(string $dni, string $token): bool {
    $url = "https://host:3000/credencial/token-valido-dni"
         . "?dni=" . urlencode($dni)
         . "&token=" . urlencode($token);

    $context = stream_context_create([
        'http' => [
            'header' => "X-API-Key: clave-secreta-para-sia-2026\r\n",
            'timeout' => 5,
        ]
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false) return false;

    $data = json_decode($response, true);
    return $data['valido'] === true;
}
```

### Ejemplo curl (prueba rápida)

```bash
curl -s "http://localhost:3000/credencial/token-valido-dni?dni=28878765&token=842" \
     -H "X-API-Key: clave-secreta-para-sia-2026"
```

---

## GeneXus (Implementación Nativa Standalone) ⭐ SIN DEPENDENCIAS

### Opción RECOMENDADA para sistemas aislados

Esta implementación NO requiere:
- ❌ Conexión a base de datos
- ❌ Web services o APIs
- ❌ External Objects complejos

Solo requiere:
- ✅ GeneXus con soporte SHA256 (Encryptation Standard)
- ✅ Variables y funciones básicas

```genexus
// ============================================================================
// PROCEDURE: GenerarTokenTemporal
// ============================================================================
// Parámetros IN:
//   &AfiliadoId (VarChar 30)
//   &TimeoutMinutos (Numeric 4.0) - Default 10
// Parámetros OUT:
//   &Token (VarChar 3)
// ============================================================================
Parm(in:&AfiliadoId, in:&TimeoutMinutos, out:&Token)

// Variables locales
&Now = Now()
&Epoch = &Now.ToUnixTimestamp()  // Segundos desde 1970
&EpochMs = &Epoch * 1000  // Convertir a milisegundos

// 1. Calcular bucket
&BucketMs = &TimeoutMinutos * 60 * 1000
&Bucket = Int(&EpochMs / &BucketMs)

// 2. Construir payload
&Payload = &AfiliadoId + ":" + Trim(Str(&Bucket))

// 3. Hash SHA256
&Hash = Encryptation(&Payload, "SHA256")  // Retorna hex string (64 caracteres)

// 4. Convertir primeros 8 caracteres hex a número (primeros 4 bytes)
&Hex4Bytes = SubStr(&Hash, 1, 8)  // 8 caracteres hex = 4 bytes
&IntVal = HexToInt(&Hex4Bytes)

// 5. Módulo 1000
&TokenNum = Mod(&IntVal, 1000)

// 6. Padding a 3 dígitos
&Token = PadL(Trim(Str(&TokenNum)), 3, "0")
```

### Función auxiliar: HexToInt

```genexus
// ============================================================================
// FUNCTION: HexToInt
// Convierte string hexadecimal a entero
// ============================================================================
// Parámetros IN:
//   &HexString (VarChar 8) - Máximo 8 caracteres hex
// Retorna: Numeric (entero)
// ============================================================================
Parm(in:&HexString)

&Result = 0
&Len = Len(&HexString)

For &i = 1 To &Len
    &Char = SubStr(&HexString, &i, 1)
    &Digit = 0
    
    Do Case
        Case &Char >= "0" And &Char <= "9"
            &Digit = Val(&Char)
        Case &Char = "A" Or &Char = "a"
            &Digit = 10
        Case &Char = "B" Or &Char = "b"
            &Digit = 11
        Case &Char = "C" Or &Char = "c"
            &Digit = 12
        Case &Char = "D" Or &Char = "d"
            &Digit = 13
        Case &Char = "E" Or &Char = "e"
            &Digit = 14
        Case &Char = "F" Or &Char = "f"
            &Digit = 15
    EndCase
    
    &Result = &Result * 16 + &Digit
EndFor

Return &Result
```

### Procedure completo de validación

```genexus
// ============================================================================
// PROCEDURE: ValidarTokenTemporal
// ============================================================================
// Parámetros IN:
//   &AfiliadoId (VarChar 30)
//   &TokenPresentado (VarChar 3)
//   &TimeoutMinutos (Numeric 4.0) - Default 10
//   &Tolerancia (Numeric 2.0) - Default 1 (±1 bucket)
// Parámetros OUT:
//   &EsValido (Boolean)
//   &MensajeError (VarChar 200)
// ============================================================================
Parm(in:&AfiliadoId, in:&TokenPresentado, in:&TimeoutMinutos, in:&Tolerancia, out:&EsValido, out:&MensajeError)

&EsValido = False
&Now = Now()
&Epoch = &Now.ToUnixTimestamp()
&EpochMs = &Epoch * 1000

// Probar bucket actual y buckets adyacentes
For &Delta = -&Tolerancia To &Tolerancia
    // Calcular tiempo de test
    &OffsetMs = &Delta * &TimeoutMinutos * 60 * 1000
    &TestEpochMs = &EpochMs + &OffsetMs
    
    // Calcular bucket para este tiempo
    &BucketMs = &TimeoutMinutos * 60 * 1000
    &TestBucket = Int(&TestEpochMs / &BucketMs)
    
    // Generar token para este bucket
    &Payload = &AfiliadoId + ":" + Trim(Str(&TestBucket))
    &Hash = Encryptation(&Payload, "SHA256")
    &Hex4Bytes = SubStr(&Hash, 1, 8)
    &IntVal = HexToInt(&Hex4Bytes)
    &TokenNum = Mod(&IntVal, 1000)
    &TestToken = PadL(Trim(Str(&TokenNum)), 3, "0")
    
    // Comparar
    If &TestToken = &TokenPresentado
        &EsValido = True
        &MensajeError = "Token válido (delta bucket: " + Trim(Str(&Delta)) + ")"
        Return
    EndIf
EndFor

&MensajeError = "Token inválido o expirado"
```

### Ejemplo de uso en pantalla

```genexus
// ============================================================================
// EVENT: ValidarCredencial (Botón en pantalla)
// ============================================================================
Event 'ValidarCredencial'
    
    // Variables de entrada (desde controles de pantalla)
    // &AfiliadoIdIngresado - TextBlock o Edit
    // &TokenIngresado - Edit de 3 caracteres
    
    // Validar que no estén vacíos
    If &AfiliadoIdIngresado.IsEmpty() Or &TokenIngresado.IsEmpty()
        msg("⚠️  Debe ingresar AfiliadoId y Token")
        Return
    EndIf
    
    // Validar formato token
    If Len(&TokenIngresado) <> 3
        msg("⚠️  El token debe tener exactamente 3 dígitos")
        Return
    EndIf
    
    // Llamar a validación
    &TimeoutMin = 10  // Mismo timeout que la app móvil
    &Tolerancia = 1   // ±1 bucket
    
    ValidarTokenTemporal(&AfiliadoIdIngresado, &TokenIngresado, &TimeoutMin, &Tolerancia, &EsValido, &Mensaje)
    
    If &EsValido
        msg("✅ CREDENCIAL VERIFICADA" + CRLF + &Mensaje)
        // Aquí continuar con la lógica de atención
        // Cargar datos del afiliado, habilitar campos, etc.
    Else
        msg("❌ VERIFICACIÓN FALLIDA" + CRLF + &Mensaje + CRLF + CRLF + "Solicite al afiliado que actualice su credencial en la app")
    EndIf
EndEvent
```

### Consideraciones importantes

**Función `Encryptation()` en GeneXus:**
- Disponible en GeneXus Evolution 3 y superiores
- Sintaxis: `Encryptation(string, "SHA256")` → retorna hash hex (64 chars)
- Si no está disponible, usar External Object con Java MessageDigest (ver sección opcional)

**Alternativa si no tienes `Encryptation()`:**
```genexus
// Usar Hash() function (GeneXus 16+)
&Hash = Hash(&Payload, Hash.SHA256, HashResult.Hexadecimal)
```

**Alternativa para `ToUnixTimestamp()` (GeneXus < 17):**
```genexus
// Calcular manualmente
&BaseDate = YMDtoD(1970, 1, 1)
&BaseDT = DtoC(&BaseDate) + " 00:00:00"
&Diff = Now() - &BaseDT
&Epoch = &Diff.TotalSeconds
```

### Testing del algoritmo

```genexus
// ============================================================================
// PROCEDURE: TestTokenAlgoritmo
// ============================================================================
// Test de verificación
&AfiliadoIdTest = "000082018000000000001000082018"
&TimeoutTest = 10

// Generar token
GenerarTokenTemporal(&AfiliadoIdTest, &TimeoutTest, &TokenGenerado)
msg("Token generado: " + &TokenGenerado)

// Validar inmediatamente (debería ser válido)
ValidarTokenTemporal(&AfiliadoIdTest, &TokenGenerado, &TimeoutTest, 1, &EsValido, &Mensaje)
msg("Validación inmediata: " + If(&EsValido, "✅ VÁLIDO", "❌ INVÁLIDO") + CRLF + &Mensaje)

// Validar con token incorrecto (debería ser inválido)
ValidarTokenTemporal(&AfiliadoIdTest, "999", &TimeoutTest, 1, &EsValido, &Mensaje)
msg("Validación token 999: " + If(&EsValido, "⚠️  VÁLIDO (casualidad)", "✅ INVÁLIDO (correcto)") + CRLF + &Mensaje)
```

---

## Desarmar Token - Extraer Información (Reverse Engineering)

### ⚠️ IMPORTANTE: El token NO contiene información codificada

El token de 3 dígitos **NO es una codificación** que puedas "desarmar". Es un **hash derivado** de:
- AfiliadoId
- Bucket temporal (window de tiempo)

### ¿Qué información PUEDES obtener del token?

**SIN el AfiliadoId**: ❌ NADA
- El token solo es un número de 000 a 999
- No puedes extraer fecha, usuario, ni nada sin el AfiliadoId

**CON el AfiliadoId**: ✅ Puedes determinar:
1. Si el token es válido para el bucket actual
2. Cuándo expira el token vigente
3. En qué bucket temporal fue generado (con búsqueda)

### Ejemplo: Obtener información del token (GeneXus)

```genexus
// ============================================================================
// PROCEDURE: ObtenerInfoToken
// Desarma un token válido para mostrar información
// ============================================================================
// Parámetros IN:
//   &AfiliadoId (VarChar 30)
//   &TokenPresentado (VarChar 3)
//   &TimeoutMinutos (Numeric 4.0)
// Parámetros OUT:
//   &EsValido (Boolean)
//   &BucketGeneracion (Numeric) - Bucket donde se generó
//   &FechaGeneracion (DateTime) - Inicio del bucket
//   &FechaExpiracion (DateTime) - Fin del bucket
//   &SegundosRestantes (Numeric) - Tiempo hasta expiración
// ============================================================================
Parm(in:&AfiliadoId, in:&TokenPresentado, in:&TimeoutMinutos, 
     out:&EsValido, out:&BucketGeneracion, out:&FechaGeneracion, 
     out:&FechaExpiracion, out:&SegundosRestantes)

&EsValido = False
&Now = Now()
&Epoch = &Now.ToUnixTimestamp()
&EpochMs = &Epoch * 1000
&BucketMs = &TimeoutMinutos * 60 * 1000

// Buscar en buckets adyacentes (±2 para estar seguros)
For &Delta = -2 To 2
    &TestEpochMs = &EpochMs + (&Delta * &BucketMs)
    &TestBucket = Int(&TestEpochMs / &BucketMs)
    
    // Generar token para este bucket
    &Payload = &AfiliadoId + ":" + Trim(Str(&TestBucket))
    &Hash = Encryptation(&Payload, "SHA256")
    &Hex4Bytes = SubStr(&Hash, 1, 8)
    &IntVal = HexToInt(&Hex4Bytes)
    &TokenNum = Mod(&IntVal, 1000)
    &TestToken = PadL(Trim(Str(&TokenNum)), 3, "0")
    
    If &TestToken = &TokenPresentado
        &EsValido = True
        &BucketGeneracion = &TestBucket
        
        // Calcular fechas del bucket
        &BucketStartMs = &TestBucket * &BucketMs
        &BucketEndMs = (&TestBucket + 1) * &BucketMs
        
        // Convertir a DateTime (desde epoch)
        &BaseDateTime = YMDHMStoD(1970,1,1,0,0,0)
        &FechaGeneracion = AddSeconds(&BaseDateTime, &BucketStartMs / 1000)
        &FechaExpiracion = AddSeconds(&BaseDateTime, &BucketEndMs / 1000)
        
        // Segundos restantes
        &SegundosRestantes = Int((&BucketEndMs - &EpochMs) / 1000)
        
        Return
    EndIf
EndFor
```

### Ejemplo de uso: Mostrar info del token

```genexus
Event 'MostrarInfoToken'
    
    ObtenerInfoToken(&AfiliadoId, &TokenIngresado, 10, 
                     &Valido, &Bucket, &FechaGen, &FechaExp, &Segundos)
    
    If &Valido
        &Info = "✅ TOKEN VÁLIDO" + CRLF + CRLF
        &Info += "Afiliado: " + &AfiliadoId + CRLF
        &Info += "Token: " + &TokenIngresado + CRLF
        &Info += "Bucket: " + Trim(Str(&Bucket)) + CRLF
        &Info += "Generado: " + DToC(&FechaGen) + " " + TToC(&FechaGen) + CRLF
        &Info += "Expira: " + DToC(&FechaExp) + " " + TToC(&FechaExp) + CRLF
        &Info += "Tiempo restante: " + Trim(Str(&Segundos)) + " segundos"
        
        If &Segundos < 60
            &Info += CRLF + "⚠️  EXPIRANDO PRONTO"
        EndIf
        
        msg(&Info)
    Else
        msg("❌ Token inválido o configuración incorrecta")
    EndIf
EndEvent
```

### Salida de ejemplo

```
✅ TOKEN VÁLIDO

Afiliado: 000082018000000000001000082018
Token: 972
Bucket: 2952395
Generado: 18/02/2026 14:30:00
Expira: 18/02/2026 14:40:00
Tiempo restante: 378 segundos
```

### Ejemplo en JavaScript (Node.js / navegador)

```javascript
function obtenerInfoToken(afiliadoId, tokenPresentado, timeoutMinutos) {
  const ahora = Date.now()
  const bucketMs = timeoutMinutos * 60 * 1000
  
  // Buscar en buckets adyacentes
  for (let delta = -2; delta <= 2; delta++) {
    const testTime = ahora + (delta * bucketMs)
    const bucket = Math.floor(testTime / bucketMs)
    
    // Generar token para este bucket
    const payload = `${afiliadoId}:${bucket}`
    const hash = crypto.createHash('sha256').update(payload).digest()
    const intVal = hash.readUInt32BE(0)
    const tokenNum = intVal % 1000
    const token = String(tokenNum).padStart(3, '0')
    
    if (token === tokenPresentado) {
      const bucketStartMs = bucket * bucketMs
      const bucketEndMs = (bucket + 1) * bucketMs
      
      return {
        valido: true,
        bucket,
        generadoEn: new Date(bucketStartMs),
        expiraEn: new Date(bucketEndMs),
        segundosRestantes: Math.floor((bucketEndMs - ahora) / 1000),
        deltaMinutos: delta * timeoutMinutos
      }
    }
  }
  
  return { valido: false }
}

// Uso
const info = obtenerInfoToken('000082018000000000001000082018', '972', 10)
console.log(info)
// {
//   valido: true,
//   bucket: 2952395,
//   generadoEn: 2026-02-18T14:30:00.000Z,
//   expiraEn: 2026-02-18T14:40:00.000Z,
//   segundosRestantes: 378,
//   deltaMinutos: 0
// }
```

### Limitaciones del "desarme"

1. **No se puede sin AfiliadoId**: El algoritmo es unidireccional (hash)
2. **No se puede obtener el usuario**: El token solo depende del AfiliadoId
3. **No se puede saber quién lo generó**: No hay información del dispositivo
4. **Búsqueda por fuerza bruta**: Para determinar el bucket, debes probar buckets adyacentes

### ¿Por qué es seguro?

- **No reversible**: SHA256 es unidireccional
- **Requiere AfiliadoId**: Sin él, el token es solo un número aleatorio
- **Temporal**: Expira automáticamente
- **No predecible**: Cambiar 1 carácter del AfiliadoId cambia completamente el token



---

## SQL / PostgreSQL (Stored Procedure)

```sql
-- Función para generar token temporal
CREATE OR REPLACE FUNCTION generar_token_temporal(
    p_afiliado_id VARCHAR(30),
    p_timeout_minutos INTEGER DEFAULT 10,
    p_timestamp TIMESTAMP DEFAULT NOW()
) RETURNS VARCHAR(3) AS $$
DECLARE
    v_bucket_ms BIGINT;
    v_epoch_ms BIGINT;
    v_bucket BIGINT;
    v_payload TEXT;
    v_hash BYTEA;
    v_int_val BIGINT;
    v_token_num INTEGER;
BEGIN
    -- 1. Calcular bucket
    v_bucket_ms := p_timeout_minutos * 60 * 1000;
    v_epoch_ms := EXTRACT(EPOCH FROM p_timestamp) * 1000;
    v_bucket := FLOOR(v_epoch_ms / v_bucket_ms);
    
    -- 2. Construir payload
    v_payload := p_afiliado_id || ':' || v_bucket::TEXT;
    
    -- 3. Hash SHA256
    v_hash := digest(v_payload, 'sha256');
    
    -- 4. Primeros 4 bytes a int (big-endian)
    -- PostgreSQL: get_byte(bytea, offset) devuelve el byte en esa posición
    v_int_val := (get_byte(v_hash, 0)::BIGINT << 24) |
                 (get_byte(v_hash, 1)::BIGINT << 16) |
                 (get_byte(v_hash, 2)::BIGINT << 8) |
                 get_byte(v_hash, 3)::BIGINT;
    
    -- 5. Módulo 1000
    v_token_num := v_int_val % 1000;
    
    -- 6. Padding a 3 dígitos
    RETURN LPAD(v_token_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para validar token
CREATE OR REPLACE FUNCTION validar_token_temporal(
    p_afiliado_id VARCHAR(30),
    p_token VARCHAR(3),
    p_timeout_minutos INTEGER DEFAULT 10,
    p_tolerancia_buckets INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
    v_bucket_ms BIGINT;
    v_now TIMESTAMP;
    v_delta INTEGER;
    v_test_time TIMESTAMP;
    v_test_token VARCHAR(3);
BEGIN
    v_now := NOW();
    v_bucket_ms := p_timeout_minutos * 60 * 1000;
    
    -- Probar bucket actual y buckets adyacentes
    FOR v_delta IN -p_tolerancia_buckets..p_tolerancia_buckets LOOP
        v_test_time := v_now + (v_delta * p_timeout_minutos || ' minutes')::INTERVAL;
        v_test_token := generar_token_temporal(p_afiliado_id, p_timeout_minutos, v_test_time);
        
        IF v_test_token = p_token THEN
            RETURN TRUE;
        END IF;
    END LOOP;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Uso
SELECT generar_token_temporal('000082018000000000001000082018', 10);
-- Retorna: "972"

SELECT validar_token_temporal('000082018000000000001000082018', '972', 10, 1);
-- Retorna: true/false
```

---

## GeneXus (usando Stored Procedures SQL) ⭐ RECOMENDADO

### Opción A: Ejecutar función SQL directamente

```genexus
// ========================================
// VALIDAR TOKEN (Opción más simple)
// ========================================
&SqlStatement = "SELECT validar_token_temporal(:afiliadoId, :token, :timeout, 1)"
&GxCommand = new GxCommand()
&GxCommand.CommandText = &SqlStatement
&GxCommand.AddParameter("afiliadoId", &AfiliadoId)    // VarChar(30)
&GxCommand.AddParameter("token", &TokenPresentado)    // VarChar(3)
&GxCommand.AddParameter("timeout", 10)                // Integer

&EsValido = &GxCommand.ExecuteScalar()  // Retorna Boolean

if &EsValido
    msg("✅ Token válido - Continuar con atención")
    // Aquí va tu lógica de negocio
else
    msg("❌ Token inválido o expirado - Solicitar renovación")
    // Rechazar la operación
endif
```

### Opción B: Usar Data Provider (más robusto)

```genexus
// ========================================
// VALIDAR TOKEN CON DATA PROVIDER
// ========================================
For each
    Where TokenValidado = validar_token_temporal(:AfiliadoId, :TokenPresentado, :TimeoutMinutos, 1)
    
    // TokenValidado es una variable Boolean definida como:
    // &TokenValidado = validar_token_temporal(&AfiliadoId, &TokenPresentado, &TimeoutMinutos, 1)
    
    if &TokenValidado
        msg("✅ Token válido")
        // Lógica de negocio
    else
        msg("❌ Token inválido")
    endif
EndFor
```

### Opción C: Procedure completo de validación

```genexus
// ========================================
// PROCEDURE: ValidarTokenAfiliado
// ========================================
// Parámetros IN:
//   &AfiliadoId (VarChar 30)
//   &TokenPresentado (VarChar 3)
//   &TimeoutMinutos (Numeric 2.0) - Default 10
// Parámetros OUT:
//   &EsValido (Boolean)
//   &MensajeError (VarChar 100)
// ========================================

&TimeoutMinutos = 10 if &TimeoutMinutos = 0

// Ejecutar validación SQL
&SqlStatement = "SELECT validar_token_temporal(:p1, :p2, :p3, 1)"
&GxCommand = new GxCommand()
&GxCommand.CommandText = &SqlStatement
&GxCommand.AddParameter("p1", &AfiliadoId)
&GxCommand.AddParameter("p2", &TokenPresentado)
&GxCommand.AddParameter("p3", &TimeoutMinutos)

&ResultadoSQL = &GxCommand.ExecuteScalar()

if &ResultadoSQL = Null
    &EsValido = false
    &MensajeError = "Error ejecutando validación de token"
else
    &EsValido = &ResultadoSQL
    if &EsValido
        &MensajeError = "Token válido"
    else
        &MensajeError = "Token inválido o expirado"
    endif
endif
```

### Ejemplo de uso en pantalla de punto de atención

```genexus
// ========================================
// PANTALLA: AtencionAfiliado
// ========================================
Event 'ValidarCredencial'
    // Usuario ingresa:
    //   &AfiliadoIdIngresado - desde credencial escaneada o manual
    //   &TokenIngresado - 3 dígitos que ve en la app del afiliado
    
    if &AfiliadoIdIngresado.IsEmpty() or &TokenIngresado.IsEmpty()
        msg("Debe ingresar AfiliadoId y Token")
        return
    endif
    
    // Validar formato
    if len(&TokenIngresado) <> 3
        msg("El token debe tener exactamente 3 dígitos")
        return
    endif
    
    // Llamar a validación SQL
    &SqlCmd = "SELECT validar_token_temporal(:afil, :tok, :timeout, 1)"
    &Cmd = new GxCommand()
    &Cmd.CommandText = &SqlCmd
    &Cmd.AddParameter("afil", &AfiliadoIdIngresado)
    &Cmd.AddParameter("tok", &TokenIngresado)
    &Cmd.AddParameter("timeout", 10)
    
    &TokenValido = &Cmd.ExecuteScalar()
    
    if &TokenValido
        msg("✅ CREDENCIAL VERIFICADA" + CRLF + "Puede continuar con la atención")
        // Cargar datos del afiliado
        // Continuar con el flujo
    else
        msg("❌ TOKEN INVÁLIDO O EXPIRADO" + CRLF + "Solicite al afiliado que actualice su credencial en la app")
    endif
EndEvent
```

### Instalación de funciones PostgreSQL

**Ejecutar UNA SOLA VEZ en la base de datos:**

```sql
-- Copiar y ejecutar todo el bloque de la sección "SQL / PostgreSQL" arriba
-- Incluye:
--   1. CREATE FUNCTION generar_token_temporal(...)
--   2. CREATE FUNCTION validar_token_temporal(...)
```

### Tips de implementación

✅ **DO (Hacer)**:
- Validar SIEMPRE contra el AfiliadoId conocido
- Usar timeout de 10 minutos (mismo que la app móvil)
- Mostrar mensajes claros al usuario del punto de atención
- Loguear intentos fallidos para auditoría

❌ **DON'T (No hacer)**:
- NO validar solo el token sin el AfiliadoId (posibles colisiones)
- NO usar timeout diferente al configurado en la app
- NO asumir que el token es único sin validar AfiliadoId
- NO hardcodear el timeout (leerlo de nusispar si es posible)

---

## GeneXus (alternativa con Java External Object) ⚠️ OPCIONAL

### Paso 1: Crear clase Java

```java
// Archivo: TokenGenerator.java
package com.osep.credenciales;

import java.security.MessageDigest;
import java.time.Instant;

public class TokenGenerator {
    
    /**
     * Genera token temporal de 3 dígitos
     * @param afiliadoId ID del afiliado (30 caracteres)
     * @param timeoutMinutos Timeout en minutos
     * @return Token de 3 dígitos con padding
     */
    public static String generateToken(String afiliadoId, int timeoutMinutos) {
        try {
            // 1. Calcular bucket
            long bucketMs = (long) timeoutMinutos * 60 * 1000;
            long epoch = Instant.now().toEpochMilli();
            long bucket = epoch / bucketMs;
            
            // 2. Payload
            String payload = afiliadoId + ":" + bucket;
            
            // 3. SHA256
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload.getBytes("UTF-8"));
            
            // 4. Primeros 4 bytes a int (unsigned)
            long intVal = ((hash[0] & 0xFFL) << 24) |
                         ((hash[1] & 0xFFL) << 16) |
                         ((hash[2] & 0xFFL) << 8) |
                         (hash[3] & 0xFFL);
            
            // 5. Módulo 1000
            int tokenNum = (int)(intVal % 1000);
            
            // 6. Padding
            return String.format("%03d", tokenNum);
            
        } catch (Exception e) {
            throw new RuntimeException("Error generando token: " + e.getMessage());
        }
    }
    
    /**
     * Valida un token temporal
     * @param afiliadoId ID del afiliado
     * @param tokenToCheck Token a validar
     * @param timeoutMinutos Timeout en minutos
     * @return true si el token es válido
     */
    public static boolean verifyToken(String afiliadoId, String tokenToCheck, int timeoutMinutos) {
        return verifyTokenWithTolerance(afiliadoId, tokenToCheck, timeoutMinutos, 1);
    }
    
    /**
     * Valida un token temporal con tolerancia
     * @param afiliadoId ID del afiliado
     * @param tokenToCheck Token a validar
     * @param timeoutMinutos Timeout en minutos
     * @param toleranceBuckets Tolerancia en buckets (default 1)
     * @return true si el token es válido
     */
    public static boolean verifyTokenWithTolerance(String afiliadoId, String tokenToCheck, 
                                                   int timeoutMinutos, int toleranceBuckets) {
        try {
            long bucketMs = (long) timeoutMinutos * 60 * 1000;
            long now = Instant.now().toEpochMilli();
            
            for (int delta = -toleranceBuckets; delta <= toleranceBuckets; delta++) {
                long testTime = now + (delta * bucketMs);
                String testToken = generateTokenAtTime(afiliadoId, timeoutMinutos, testTime);
                
                if (testToken.equals(tokenToCheck)) {
                    return true;
                }
            }
            
            return false;
            
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Genera token para un timestamp específico
     */
    private static String generateTokenAtTime(String afiliadoId, int timeoutMinutos, long epochMs) {
        try {
            long bucketMs = (long) timeoutMinutos * 60 * 1000;
            long bucket = epochMs / bucketMs;
            
            String payload = afiliadoId + ":" + bucket;
            
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload.getBytes("UTF-8"));
            
            long intVal = ((hash[0] & 0xFFL) << 24) |
                         ((hash[1] & 0xFFL) << 16) |
                         ((hash[2] & 0xFFL) << 8) |
                         (hash[3] & 0xFFL);
            
            int tokenNum = (int)(intVal % 1000);
            
            return String.format("%03d", tokenNum);
            
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
    
    /**
     * Obtiene información del token actual
     * @param timeoutMinutos Timeout en minutos
     * @return JSON con información del token
     */
    public static String getTokenInfo(int timeoutMinutos) {
        long bucketMs = (long) timeoutMinutos * 60 * 1000;
        long epoch = Instant.now().toEpochMilli();
        long bucket = epoch / bucketMs;
        
        long generatedAt = bucket * bucketMs;
        long expiresAt = (bucket + 1) * bucketMs;
        long timeRemaining = expiresAt - epoch;
        
        return String.format(
            "{\"bucket\":%d,\"generatedAt\":%d,\"expiresAt\":%d,\"timeRemainingSeconds\":%d}",
            bucket, generatedAt, expiresAt, timeRemaining / 1000
        );
    }
}
```

### Paso 2: Configurar External Object en GeneXus

1. Crear External Object: `TokenGenerator`
2. Configuración:
   - Language: Java
   - Class name: `com.osep.credenciales.TokenGenerator`
3. Definir métodos:

```
Method: GenerateToken
  Parameters:
    &AfiliadoId (VarChar 30) - Input
    &TimeoutMinutos (Numeric 2.0) - Input
  Returns: VarChar 3

Method: VerifyToken
  Parameters:
    &AfiliadoId (VarChar 30) - Input
    &Token (VarChar 3) - Input
    &TimeoutMinutos (Numeric 2.0) - Input
  Returns: Boolean

Method: GetTokenInfo
  Parameters:
    &TimeoutMinutos (Numeric 2.0) - Input
  Returns: VarChar 200 (JSON)
```

### Paso 3: Uso en GeneXus

```genexus
// Generar token
&Token = TokenGenerator.GenerateToken(&AfiliadoId, &TimeoutMinutos)
msg("Token generado: " + &Token)

// Validar token
&EsValido = TokenGenerator.VerifyToken(&AfiliadoId, &TokenPresentado, &TimeoutMinutos)
if &EsValido
    msg("✅ Token válido")
else
    msg("❌ Token inválido o expirado")
endif

// Obtener información
&InfoJson = TokenGenerator.GetTokenInfo(&TimeoutMinutos)
// Parsear JSON para obtener timeRemainingSeconds, etc.
```

---

## PHP (para integración web)

```php
<?php
/**
 * Genera token temporal de 3 dígitos
 * @param string $afiliadoId ID del afiliado
 * @param int $timeoutMinutes Timeout en minutos
 * @param DateTime|null $now Timestamp (null = now)
 * @return string Token de 3 dígitos con padding
 */
function generateToken($afiliadoId, $timeoutMinutes = 10, $now = null) {
    if ($now === null) {
        $now = new DateTime();
    }
    
    // 1. Calcular bucket
    $bucketMs = $timeoutMinutes * 60 * 1000;
    $epoch = $now->getTimestamp() * 1000 + (int)($now->format('u') / 1000);
    $bucket = floor($epoch / $bucketMs);
    
    // 2. Payload
    $payload = $afiliadoId . ':' . $bucket;
    
    // 3. SHA256
    $hash = hash('sha256', $payload, true);
    
    // 4. Primeros 4 bytes a int
    $bytes = unpack('N', substr($hash, 0, 4));
    $intVal = $bytes[1];
    
    // 5. Módulo 1000
    $tokenNum = $intVal % 1000;
    
    // 6. Padding
    return str_pad($tokenNum, 3, '0', STR_PAD_LEFT);
}

/**
 * Valida un token temporal
 */
function verifyToken($afiliadoId, $tokenToCheck, $timeoutMinutes = 10, $toleranceBuckets = 1) {
    $now = new DateTime();
    $bucketMs = $timeoutMinutes * 60 * 1000000; // microsegundos
    
    for ($delta = -$toleranceBuckets; $delta <= $toleranceBuckets; $delta++) {
        $testTime = clone $now;
        $testTime->modify(($delta * $timeoutMinutes) . ' minutes');
        $testToken = generateToken($afiliadoId, $timeoutMinutes, $testTime);
        
        if ($testToken === $tokenToCheck) {
            return true;
        }
    }
    
    return false;
}

// Uso
$token = generateToken('000082018000000000001000082018', 10);
echo "Token: $token\n";

$isValid = verifyToken('000082018000000000001000082018', $token, 10);
echo "Válido: " . ($isValid ? 'SÍ' : 'NO') . "\n";
?>
```

---

## REST API para validación centralizada

Si prefieres mantener el algoritmo en el backend Node.js y que otros sistemas lo consuman vía API:

### Endpoint Backend (ya implementado)

```javascript
// En server-soap.js (ya existe en tokenService.js)
const tokenService = require('./tokenService')

// Generar token
app.post('/api/token/generate', async (req, res) => {
  try {
    const { afiliadoId, timeoutMinutes = 10 } = req.body
    
    if (!afiliadoId) {
      return res.status(400).json({ error: 'afiliadoId requerido' })
    }
    
    const token = await tokenService.generateTokenFor(afiliadoId, new Date())
    const timeout = timeoutMinutes || await tokenService.getTimeoutMinutes()
    
    const bucketMs = timeout * 60 * 1000
    const epoch = Date.now()
    const bucket = Math.floor(epoch / bucketMs)
    const generatedAt = new Date(bucket * bucketMs)
    const expiresAt = new Date((bucket + 1) * bucketMs)
    
    res.json({
      token,
      afiliadoId,
      timeout,
      generatedAt: generatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      timeRemainingSeconds: Math.floor((expiresAt.getTime() - Date.now()) / 1000)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Validar token
app.post('/api/token/verify', async (req, res) => {
  try {
    const { afiliadoId, token, timeoutMinutes = 10 } = req.body
    
    if (!afiliadoId || !token) {
      return res.status(400).json({ error: 'afiliadoId y token requeridos' })
    }
    
    // Implementar validación (similar a verifyToken en test-token-algorithm.js)
    const isValid = verifyTokenViaAPI(afiliadoId, token, timeoutMinutes)
    
    res.json({
      valid: isValid,
      afiliadoId,
      token,
      checkedAt: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

### Consumo desde GeneXus (HTTP Client) - Alternativa si SQL no es posible

**⚠️ NOTA**: Si tienes acceso a la misma base de datos PostgreSQL, usar **Stored Procedures SQL** es más eficiente (ver sección anterior).

```genexus
// ========================================
// VALIDAR TOKEN VÍA REST API
// Solo usar si no tienes acceso directo a la BD
// ========================================
// Nota: en algunas versiones de GeneXus no compila `new HttpClient()`.
// En ese caso usar `new()` y declarar &HttpClient como variable HttpClient.
&HttpClient = new()
&HttpClient.BaseURL = "http://localhost:3000"  // URL de tu backend Node.js
&HttpClient.AddHeader("Content-Type", "application/json")

// Construir request JSON
&RequestBody = '{"afiliadoId":"' + &AfiliadoId + '","token":"' + &TokenPresentado + '","timeoutMinutes":10}'

// POST a /api/token/verify
&Response = &HttpClient.Post("/api/token/verify", &RequestBody)

if &HttpClient.StatusCode = 200
    // Parsear respuesta JSON
    &JsonObj.FromJsonString(&Response)
    &ValidStr = &JsonObj.Get("valid")
    
    if &ValidStr = "true"
        msg("✅ Token válido")
        // Continuar con atención
    else
        msg("❌ Token inválido o expirado")
    endif
else
    msg("❌ Error comunicación con backend: " + &HttpClient.ReasonLine)
endif
```

**Generar token vía API** (raramente necesario en punto de atención):

```genexus
// Generar token vía API
// Nota: en algunas versiones de GeneXus no compila `new HttpClient()`.
// En ese caso usar `new()` y declarar &HttpClient como variable HttpClient.
&HttpClient = new()
&HttpClient.BaseURL = "http://localhost:3000/api"
&HttpClient.AddHeader("Content-Type", "application/json")

&RequestBody = '{"afiliadoId":"' + &AfiliadoId + '","timeoutMinutes":10}'
&Response = &HttpClient.Post("/token/generate", &RequestBody)

if &HttpClient.StatusCode = 200
    // Parsear JSON response
    &TokenObj.FromJsonString(&Response)
    &Token = &TokenObj.Get("token")
    msg("Token: " + &Token)
else
    msg("Error generando token: " + &HttpClient.ReasonLine)
endif
```

---

## Validación Offline (Sincronización de algoritmo)

Para sistemas que necesitan validar tokens sin conexión al backend:

### Estrategia 1: Replicar algoritmo localmente (recomendado)
- Implementar `generateToken()` en el sistema objetivo
- Validar comparando token generado con token presentado

### Estrategia 2: Pre-generar tokens válidos (NO recomendado)
⚠️ **No recomendado**: Tokens son temporales, pre-generarlos derrota el propósito

### Estrategia 3: Cache de validaciones recientes
- Backend valida y cachea (Redis, etc.)
- Sistema offline consulta cache con fallback a algoritmo local

---

## Troubleshooting en Producción

### Logs de Auditoría

```sql
-- Tabla de auditoría de validaciones
CREATE TABLE token_validations (
    id SERIAL PRIMARY KEY,
    afiliado_id VARCHAR(30) NOT NULL,
    token_presentado VARCHAR(3) NOT NULL,
    token_esperado VARCHAR(3),
    validacion_exitosa BOOLEAN,
    bucket_calculado BIGINT,
    timestamp_validacion TIMESTAMP DEFAULT NOW(),
    sistema_origen VARCHAR(50),
    usuario_origen VARCHAR(100)
);

-- Función de validación con log
CREATE OR REPLACE FUNCTION validar_y_auditar_token(
    p_afiliado_id VARCHAR(30),
    p_token VARCHAR(3),
    p_timeout_minutos INTEGER,
    p_sistema VARCHAR(50),
    p_usuario VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
    v_esperado VARCHAR(3);
    v_valido BOOLEAN;
    v_bucket BIGINT;
BEGIN
    v_esperado := generar_token_temporal(p_afiliado_id, p_timeout_minutos);
    v_valido := validar_token_temporal(p_afiliado_id, p_token, p_timeout_minutos, 1);
    
    v_bucket := FLOOR((EXTRACT(EPOCH FROM NOW()) * 1000) / (p_timeout_minutos * 60 * 1000));
    
    INSERT INTO token_validations 
        (afiliado_id, token_presentado, token_esperado, validacion_exitosa, 
         bucket_calculado, sistema_origen, usuario_origen)
    VALUES 
        (p_afiliado_id, p_token, v_esperado, v_valido, 
         v_bucket, p_sistema, p_usuario);
    
    RETURN v_valido;
END;
$$ LANGUAGE plpgsql;
```

### Dashboard de Monitoreo

```sql
-- Estadísticas de validaciones
SELECT 
    DATE_TRUNC('hour', timestamp_validacion) as hora,
    COUNT(*) as total_validaciones,
    SUM(CASE WHEN validacion_exitosa THEN 1 ELSE 0 END) as exitosas,
    SUM(CASE WHEN NOT validacion_exitosa THEN 1 ELSE 0 END) as fallidas,
    ROUND(100.0 * SUM(CASE WHEN validacion_exitosa THEN 1 ELSE 0 END) / COUNT(*), 2) as tasa_exito
FROM token_validations
WHERE timestamp_validacion >= NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1 DESC;

-- Top afiliados con validaciones fallidas
SELECT 
    afiliado_id,
    COUNT(*) as intentos_fallidos,
    MAX(timestamp_validacion) as ultimo_intento
FROM token_validations
WHERE NOT validacion_exitosa
  AND timestamp_validacion >= NOW() - INTERVAL '1 hour'
GROUP BY afiliado_id
HAVING COUNT(*) > 3
ORDER BY intentos_fallidos DESC;
```

---

## Preguntas Frecuentes (FAQ)

**P: ¿Por qué usar SHA256 y no un hash más simple?**
R: SHA256 es ampliamente disponible en todas las plataformas y suficientemente seguro para este propósito.

**P: ¿Puedo usar timeout de 1 minuto?**
R: Técnicamente sí, pero NO recomendado. El token cambiaría muy rápido (cada 1 min) y causaría frustración al usuario.

**P: ¿Qué pasa si dos afiliados tienen el mismo token?**
R: Es posible (colisión por módulo 1000), por eso SIEMPRE debes validar contra el AfiliadoId conocido, no usar el token solo.

**P: ¿Cómo sincronizar relojes entre sistemas?**
R: Usar protocolos NTP (Network Time Protocol) en todos los servidores. Tolerancia de ±1 bucket compensa diferencias menores.

**P: ¿Puedo cambiar SHA256 por MD5?**
R: Técnicamente sí funciona, pero NO recomendado. SHA256 es estándar moderno y ampliamente soportado.

---

## Contacto

Para soporte técnico o consultas de implementación, contactar al equipo de desarrollo de APP_Afiliados.

---

**Última actualización**: 18 de febrero de 2026
