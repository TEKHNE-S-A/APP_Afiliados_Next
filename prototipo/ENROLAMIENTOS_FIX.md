# Fix de Servicio ENROLAMIENTOS - Diciembre 2025

## Problema Inicial

El servicio SIA `ENROLAMIENTOS` no mostraba datos en el frontend, aunque el backend recibía respuestas válidas del servicio SOAP.

**Síntomas:**
- Request al servicio completaba exitosamente
- Response contenía datos de coberturas (ej: "TRASPLANTES - RENAL")
- Frontend no renderizaba ninguna tarjeta de enrolamiento
- Console log mostraba: `✅ 0 enrolamientos cargados`

## Causas Raíz

### 1. Formato de Fecha Incorrecto

**Problema:** 
El frontend enviaba fechas en formato **DD/MM/YYYY** (ej: `19/12/2025`), pero el servicio SIA esperaba formato **YYYY-MM-DD** (ej: `2025-12-19`).

**Evidencia:**
```javascript
// ANTES (mobile/src/screens/EnrolamientosScreen.tsx línea 71-75)
const fechaActual = new Date().toLocaleDateString('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
// Generaba: "19/12/2025" ❌
```

**Log SOAP:**
```xml
<Parametros>{"NroInternoPersona":"000029286","Fecha":"19/12/2025"}</Parametros>
```

**Respuesta del servicio:**
```json
{"Mensajes":[{"Id":" 0","Type":1,"Description":"El afiliado no tiene enrolamientos vigentes"}]}
```

El mensaje de "no tiene enrolamientos" era **falso** - era un rechazo silencioso por formato de fecha inválido.

### 2. Response.data.Resultado es String JSON

**Problema:**
El servicio SOAP devuelve el campo `Resultado` como **string JSON**, no como objeto JavaScript parseado.

**Estructura real de la respuesta:**
```javascript
{
  success: true,
  data: {
    Resultado: '{"Coberturas":[{...}]}'  // ← STRING, no objeto
  }
}
```

**Código original (líneas 88-103):**
```javascript
// ANTES
if (response.success && response.data) {
  const enrolamientosData = Array.isArray(response.data)
    ? response.data
    : [response.data]
  
  // ❌ response.data no tiene array Coberturas directamente
  // ❌ response.data.Resultado es string, no objeto
  
  setEnrolamientos(enrolamientosFiltrados)
}
```

### 3. Interfaz y Renderizado Incorrectos

**Problema:**
La interfaz `Enrolamiento` esperaba campos genéricos (`Vigencia`, `Estado`, `Descripcion`) pero la respuesta real contiene campos específicos de coberturas médicas.

**Estructura real de Coberturas:**
```typescript
interface Cobertura {
  CodigoCobertura: number
  DescripcionCobertura: string         // ej: "TRASPLANTES"
  CodigoCaracteristica: string
  DescripcionCaracteristica: string    // ej: "TIPO DE TRASPLANTE"
  CodigoSubcaracteristica: string
  DescripcionSubcaracteristica: string // ej: "RENAL"
  FechaVigenciaDesde: string          // "2023-06-21"
  FechaVigenciaHasta: string          // "0000-00-00"
}
```

## Solución Aplicada

### Fix 1: Formato de Fecha YYYY-MM-DD

**Archivo:** `mobile/src/screens/EnrolamientosScreen.tsx` (líneas 71-75)

```typescript
// DESPUÉS
// Fecha en formato YYYY-MM-DD (requerido por servicio SIA ENROLAMIENTOS)
const now = new Date()
const fechaActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
// Genera: "2025-12-19" ✅
```

**Nota Importante:**
- **ENROLAMIENTOS**: Requiere **YYYY-MM-DD**
- **REGISTRACION**: Requiere **DD/MM/YYYY**

Cada servicio SIA tiene su propio formato de fecha.

### Fix 2: Parseo de String JSON

**Archivo:** `mobile/src/screens/EnrolamientosScreen.tsx` (líneas 88-107)

```typescript
// DESPUÉS
if (response.success && response.data) {
  // El Resultado viene como string JSON, hay que parsearlo
  let parsedData = response.data
  if (typeof response.data.Resultado === 'string') {
    try {
      parsedData = JSON.parse(response.data.Resultado)
      console.log('📊 Datos parseados:', parsedData)
    } catch (e) {
      console.error('❌ Error parseando Resultado:', e)
    }
  }

  // Extraer Coberturas del objeto parseado
  const coberturas = parsedData.Coberturas || []
  
  setEnrolamientos(coberturas)
  console.log(`✅ ${coberturas.length} enrolamientos cargados`)
} else {
  setEnrolamientos([])
}
```

**Flujo de datos:**
1. `response.data.Resultado` → String JSON
2. `JSON.parse(response.data.Resultado)` → Objeto con propiedad `Coberturas`
3. `parsedData.Coberturas` → Array de objetos Cobertura
4. `setEnrolamientos(coberturas)` → Renderiza tarjetas

### Fix 3: Interfaz Actualizada

**Archivo:** `mobile/src/screens/EnrolamientosScreen.tsx` (líneas 20-29)

```typescript
// DESPUÉS
interface Enrolamiento {
  CodigoCobertura?: number
  DescripcionCobertura?: string
  CodigoCaracteristica?: string
  DescripcionCaracteristica?: string
  CodigoSubcaracteristica?: string
  DescripcionSubcaracteristica?: string
  FechaVigenciaDesde?: string
  FechaVigenciaHasta?: string
  [key: string]: any
}
```

### Fix 4: Renderizado con Campos Correctos

**Archivo:** `mobile/src/screens/EnrolamientosScreen.tsx` (líneas 140-185)

```typescript
// DESPUÉS
<View style={styles.enrolamientoBody}>
  {enrolamiento.DescripcionCobertura && (
    <View style={styles.enrolamientoRow}>
      <Text style={styles.enrolamientoLabel}>Cobertura:</Text>
      <Text style={styles.enrolamientoValue}>
        {enrolamiento.DescripcionCobertura.trim()}
      </Text>
    </View>
  )}

  {enrolamiento.DescripcionCaracteristica && (
    <View style={styles.enrolamientoRow}>
      <Text style={styles.enrolamientoLabel}>Característica:</Text>
      <Text style={styles.enrolamientoValue}>
        {enrolamiento.DescripcionCaracteristica.trim()}
      </Text>
    </View>
  )}

  {enrolamiento.DescripcionSubcaracteristica && (
    <View style={styles.enrolamientoRow}>
      <Text style={styles.enrolamientoLabel}>Tipo:</Text>
      <Text style={styles.enrolamientoValue}>
        {enrolamiento.DescripcionSubcaracteristica.trim()}
      </Text>
    </View>
  )}

  {enrolamiento.FechaVigenciaDesde && (
    <View style={styles.enrolamientoRow}>
      <Text style={styles.enrolamientoLabel}>Vigente desde:</Text>
      <Text style={[styles.enrolamientoValue, styles.vigenciaText]}>
        {formatFecha(enrolamiento.FechaVigenciaDesde)}
      </Text>
    </View>
  )}

  {enrolamiento.FechaVigenciaHasta && enrolamiento.FechaVigenciaHasta !== '0000-00-00' && (
    <View style={styles.enrolamientoRow}>
      <Text style={styles.enrolamientoLabel}>Vigente hasta:</Text>
      <Text style={[styles.enrolamientoValue, styles.vigenciaText]}>
        {formatFecha(enrolamiento.FechaVigenciaHasta)}
      </Text>
    </View>
  )}
</View>
```

**Mejoras:**
- `.trim()` en textos para eliminar espacios en blanco del backend
- `formatFecha()` para mostrar fechas en formato DD/MM/AAAA al usuario
- Validación `!== '0000-00-00'` para no mostrar fechas vacías

## Resultado Final

### Request SOAP (Logs Backend)

```
🔗 URL SOAP SIA construida: https://test17.osep.gob.ar:443/OSEP_SIA17_TEST_WS/com.tekhne.asia_ws
📤 SOAP SIA REQUEST XML:
<Parametros>{"NroInternoPersona":"000029286","Fecha":"2025-12-19"}</Parametros>
```

### Response SOAP

```xml
<Resultado>
  {
    "Coberturas": [
      {
        "CodigoCobertura": 7,
        "DescripcionCobertura": "TRASPLANTES",
        "CodigoCaracteristica": "16",
        "DescripcionCaracteristica": "TIPO DE TRASPLANTE",
        "CodigoSubcaracteristica": "1",
        "DescripcionSubcaracteristica": "RENAL",
        "FechaVigenciaDesde": "2023-06-21",
        "FechaVigenciaHasta": "0000-00-00"
      }
    ]
  }
</Resultado>
```

### Logs Frontend (Consola React Native)

```
LOG  📤 Consultando enrolamientos: {
  "miembro": "CORDOBA, MATIAS ARNALDO",
  "AfiliadoId": "000193582000000000001000029286",
  "NroInternoPersona": "000029286",
  "Fecha": "2025-12-19"
}

LOG  📥 Respuesta enrolamientos: {
  "success": true,
  "data": {
    "Resultado": "{\"Coberturas\":[...]}"
  }
}

LOG  📊 Datos parseados: {
  "Coberturas": [...]
}

LOG  ✅ 1 enrolamientos cargados
```

### UI Final

Tarjeta renderizada con:

```
┌─────────────────────────────────────┐
│ Cobertura:      TRASPLANTES         │
│ Característica: TIPO DE TRASPLANTE  │
│ Tipo:          RENAL                │
│ Vigente desde: 21/06/2023           │
└─────────────────────────────────────┘
```

## Archivos Modificados

### `mobile/src/screens/EnrolamientosScreen.tsx`

**Cambios:**
1. Líneas 20-29: Interface `Enrolamiento` actualizada con campos de Coberturas
2. Líneas 71-75: Formato de fecha cambiado a YYYY-MM-DD
3. Líneas 88-107: Parseo de `response.data.Resultado` (string JSON)
4. Líneas 140-185: Renderizado con campos reales (DescripcionCobertura, etc.)

**Total de líneas modificadas:** ~60 líneas

## Lecciones Aprendidas

1. **Formatos de fecha variables por servicio:**
   - ENROLAMIENTOS: `YYYY-MM-DD`
   - REGISTRACION: `DD/MM/YYYY`
   - No asumir que todos los servicios SIA usan el mismo formato

2. **Response SOAP puede contener JSON anidado:**
   - Campo `Resultado` puede ser string JSON, no objeto
   - Siempre verificar con `typeof` antes de parsear
   - Agregar try-catch al parsear para evitar crashes

3. **Mensajes de error pueden ser engañosos:**
   - "No tiene enrolamientos vigentes" ≠ realmente sin datos
   - Puede significar: parámetros inválidos, formato incorrecto, etc.
   - Verificar logs SOAP completos antes de asumir

4. **Trim espacios en blanco del backend:**
   - Servicios legacy pueden devolver strings con padding
   - Usar `.trim()` consistentemente en campos de texto
   - Ejemplo: `"TRASPLANTES                   "` → `"TRASPLANTES"`

## Testing

### Casos de Prueba

✅ **Caso 1: Miembro con enrolamientos**
- Seleccionar: "CORDOBA, MATIAS ARNALDO"
- Resultado: 1 tarjeta con cobertura TRASPLANTES - RENAL
- Fecha vigencia: 21/06/2023

✅ **Caso 2: Miembro sin enrolamientos**
- Seleccionar: Miembro sin coberturas especiales
- Resultado: Mensaje "No se encontraron enrolamientos"
- Sin errores en consola

✅ **Caso 3: Cambio de miembro**
- Cambiar selector entre múltiples miembros
- Resultado: Recarga automática de enrolamientos por miembro
- Log: `📤 Consultando enrolamientos` con NroInternoPersona correcto

✅ **Caso 4: Pull to refresh**
- Arrastrar pantalla hacia abajo
- Resultado: Reconsulta enrolamientos del miembro actual
- Spinner muestra y oculta correctamente

## Compatibilidad

- ✅ **ENROLAMIENTOS**: Fecha YYYY-MM-DD, parseo de Resultado
- ✅ **REGISTRACION**: Fecha DD/MM/YYYY (sin cambios)
- ✅ **Otros servicios SIA**: No afectados

## Estado

**COMPLETADO** - 19 de Diciembre 2025

Servicio ENROLAMIENTOS totalmente funcional:
- ✅ Formato de fecha correcto
- ✅ Parseo de response
- ✅ Interfaz actualizada
- ✅ UI renderiza coberturas correctamente
- ✅ Testing completo en móvil

---

*Documentación generada como parte del desarrollo de APP_Afiliados*
