# Configuración WSDL - Servicio de Trámites

## 🔗 Endpoints Disponibles

### Endpoint 1: EA_Interfase_WS (actual, en uso)

```
http://localhost:8080/PRODUCTO_TRAMITES_DESAJavaWebPostgreSQL/com.tekhne.aea_interfase_ws
```

WSDL URL:
```
http://localhost:8080/PRODUCTO_TRAMITES_DESAJavaWebPostgreSQL/com.tekhne.aea_interfase_ws?WSDL
```

Namespace: `PRODUCTO_ENTRADAS`
Parámetros: `Nombre`, `In`
Response: `Out`

### Endpoint 2: EA_WS (alternativo, por explorar)

```
http://localhost:8080/PRODUCTO_TRAMITES_DESAJavaWebPostgreSQL/com.tekhne.aea_ws
```

WSDL URL:
```
http://localhost:8080/PRODUCTO_TRAMITES_DESAJavaWebPostgreSQL/com.tekhne.aea_ws?wsdl
```

Namespace: `PRODUCTO_TRAMITES_DESA`
Parámetros: `Servicio`, `Parametros`
Response: `Resultado`, `Mensajes`

---

## 🧪 Pruebas iniciales Endpoint 2 (EA_WS)

El servicio `EATramitePortal_Carga` fue retirado de esta guía y de la configuración operativa por decisión de seguridad (no cumple el criterio requerido de seguridad en headers para este flujo).

Este documento mantiene únicamente servicios de consulta y catálogos validados para integración.

---

## 📝 Parámetros SOAP

| Parámetro | Valor |
|-----------|-------|
| **SOAPAction** | `PRODUCTO_ENTRADASaction/AEA_INTERFASE_WS.Execute` |
| **Header: USUARIO** | `ADMIN` |
| **Header: PASSWORD** | `admin123` |
| **Content-Type** | `text/xml; charset=utf-8` |

---

## 🔐 Headers HTTP

```
USUARIO: ADMIN
PASSWORD: admin123
SOAPAction: PRODUCTO_ENTRADASaction/AEA_INTERFASE_WS.Execute
Content-Type: text/xml; charset=utf-8
```

---

## ✅ Request SOAP - EATramitePortal_Consulta (Formato Validado)

**Formato de `In` que SI devolvio datos:** array JSON de pares `Nombre`/`Valor` con claves `EntiCodigo` y `EAExpNroIn`.

```xml
<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <EA_Interfase_WS.Execute xmlns="PRODUCTO_ENTRADAS">
      <Nombre>EATramitePortal_Consulta</Nombre>
      <In>[{"Nombre":"EntiCodigo","Valor":"E1"},{"Nombre":"EAExpNroIn","Valor":"21338"}]</In>
    </EA_Interfase_WS.Execute>
  </soapenv:Body>
</soapenv:Envelope>
```

### ✅ Variante equivalente para `In` (multilinea)
```json
[
  {"Nombre":"EntiCodigo","Valor":"E1"},
  {"Nombre":"EAExpNroIn","Valor":"21338"}
]
```

### ❌ Formato que en pruebas dio parametros vacios en backend
```json
[
  {"Nombre":"EntiCodigo_de_Entidad","Valor":"E1"},
  {"Nombre":"EAExpNint","Valor":"21338"}
]
```

---

## ✅ Request SOAP - TramiteApp_GetClases

Devuelve el catálogo de clases de trámite válidas para `EAExpClaCo`.

**Parámetros de entrada:**

| Nombre | Valor | Descripción |
|--------|-------|-------------|
| `EntiCodigo` | `"E1"` | Código de entidad |

```xml
<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <EA_Interfase_WS.Execute xmlns="PRODUCTO_ENTRADAS">
      <Nombre>TramiteApp_GetClases</Nombre>
      <In>[{"Nombre":"EntiCodigo","Valor":"E1"}]</In>
    </EA_Interfase_WS.Execute>
  </soapenv:Body>
</soapenv:Envelope>
```

**SDT devuelto:** `SDT_Clases` — campo `EAExcCodig` es el valor a usar en `EAExpClaCo`.

### Clases disponibles en ambiente DESA (E1)

| `EAExcCodig` | `EAExcDescr` |
|--------------|--------------|
| `ECO` | E-EXPEDIENTE CONFIDENCIAL |
| `EC3` | E-CONFIDTEST03 |
| `EC4` | E-CONFIDTEST04 |
| `TC1` | T-CONFIDTEST01 |
| `EJO` | E-JUBILACION ORDINARIA |
| `TLE` | T-LEGAL |
| `E  ` | EXP |
| `NTA` | NOTA - |
| `EC1` | E-CONFIDTEST01 |
| `TCO` | T-TRAMITE CONFIDENCIAL |
| `TC ` | T-CLASE TEST CERRADO |
| `ITC` | E-INSUMOS CIRUGIA TRAUMATO |
| `ET ` | E-CLASE TEST EXP |
| `TO ` | T-CLASE TEST OBLIGATORIO |
| `RCI` | REQUIERE COMPROBANTE AL INICIO |
| `PR ` | E-CLASE DE PRUEBA |
| `TLB` | T-LIBRE |
| `TI ` | TRAMITE SIMPLE |
| `CT ` | E-CLASE TEST LIBRE |
| `TM ` | T-CLASE TEST MINIMO |
| `PC3` | T-CONFIDTEST02 |
| `PC1` | E-PRUEBA COFIDENCIAL 01 |
| `PR9` | T-TRIBUNAL DE CUENTAS |
| `FCO` | CPTE OTROS |
| `EPJ` | EXP PODER JUDICIAL |
| `TN ` | T-NOTA |
| `CDO` | CARTA DOCUMENTO MOD |
| `FCP` | CPTE. PROVEEDOR |
| `CFM` | CPTE. PRESTADOR |
| `JU ` | JUBILACION |

> **Nota:** algunos códigos tienen espacios al final (ej. `"NTA"` se almacena como `"NTA"` exacto de 3 chars, pero `"E  "` tiene dos espacios). Enviar el valor exacto como figura en `EAExcCodig`.

---

## ✅ Request SOAP - EATramite_Consulta (Formato Validado)

Mismo endpoint. Devuelve `SDT_ExpedienteTramite` con datos del expediente y un array de `Mensajes`.

**Parámetros de entrada:**

| Nombre | Valor ejemplo | Descripción |
|--------|---------------|-------------|
| `EntiCodigo` | `"E1"` | Código de entidad (2 chars) |
| `EAExpNroIn` | `"206"` | Número de expediente en sistema |

**Observación:** este servicio acepta tanto el XML con prefijo `prod:` como sin prefijo en `Nombre`/`In`. Ambos formatos devuelven datos.

### Request recomendado (sin prefijo, consistente con los demás)
```xml
<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <EA_Interfase_WS.Execute xmlns="PRODUCTO_ENTRADAS">
      <Nombre>EATramite_Consulta</Nombre>
      <In>[{"Nombre":"EntiCodigo","Valor":"E1"},{"Nombre":"EAExpNroIn","Valor":"206"}]</In>
    </EA_Interfase_WS.Execute>
  </soapenv:Body>
</soapenv:Envelope>
```

### Respuesta real obtenida en pruebas
```json
[
  {
    "Nombre": "SDT_ExpedienteTramite",
    "Valor": "[{
      \"EntiCodigo_de_Entidad\": \"E1\",
      \"EAExpNroIn\": 206,
      \"EAExpNint\": 21338,
      \"EAExpEstDe\": \"GENERADO\",
      \"Mensajes\": [
        {
          \"Descripcion\": \"hola\",
          \"VigenciaDesde\": \"2026-05-08\",
          \"VigenciaHasta\": \"2026-06-30\"
        }
      ]
    }]"
  }
]
```

### Diferencias respecto a EATramitePortal_Consulta

| Aspecto | EATramitePortal_Consulta | EATramite_Consulta |
|---------|--------------------------|---------------------|
| SDT devuelto | `SDT_ExpedientePortal` | `SDT_ExpedienteTramite` |
| Incluye Mensajes | No | Sí (array con descripción y vigencia) |
| Tolerancia namespace | Solo sin prefijo | Con y sin prefijo `prod:` |

---

## 📤 Response Esperada (Ejemplo real) — EATramitePortal_Consulta

```xml
<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <EA_Interfase_WS.ExecuteResponse xmlns="PRODUCTO_ENTRADAS">
      <Out xmlns="PRODUCTO_ENTRADAS">[{"Nombre":"SDT_ExpedientePortal","Valor":"[{\"EntiCodigo_de_Entidad\":\"E1\",\"EAExpNroIn\":403,\"EAExpNint\":0,\"EAExpEstDe\":\"GENERADO\"}]"}]</Out>
    </EA_Interfase_WS.ExecuteResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

---

## 🧪 Variantes para Testing

### Variante recomendada (la que funciono)
```xml
<In>[{"Nombre":"EntiCodigo","Valor":"E1"},{"Nombre":"EAExpNroIn","Valor":"21338"}]</In>
```

### Cambiar expediente
```xml
<In>[{"Nombre":"EntiCodigo","Valor":"E1"},{"Nombre":"EAExpNroIn","Valor":"38482"}]</In>
```

### Formato alternativo JSON objeto (aceptado, pero sin datos en pruebas)
```xml
<In>{"EntiCodigo_de_Entidad":"E1","EAExpNint":"38482"}</In>
```

---

## ℹ️ Servicio Retirado

Se eliminó de esta documentación toda referencia operativa a `EATramitePortal_Carga`.

Motivo: no cumple el criterio de seguridad en headers definido para la integración actual.

---

## ✅ Servicio Operativo - EATramiteAPP_Carga (EA_WS)

Servicio habilitado para carga de trámite en el endpoint `EA_WS.Execute`, con autenticación obligatoria por headers HTTP.

### WSDL relevante (EA_WS)

- `targetNamespace`: `PRODUCTO_TRAMITES_DESA`
- Operación: `EA_WS.Execute`
- Entrada:
  - `Servicio` (string)
  - `Parametros` (string JSON)
- Salida:
  - `Resultado` (string)
  - `Mensajes` (string)
- SOAPAction: `PRODUCTO_TRAMITES_DESAaction/AEA_WS.Execute`
- Address publicado: `https://localhost:8080/PRODUCTO_TRAMITES_DESAJavaWebPostgreSQL/com.tekhne.aea_ws`

### Headers requeridos

```http
USUARIO: ADMIN
PASSWORD: admin123
```

### Request SOAP funcional (confirmado)

```xml
<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:prod="PRODUCTO_TRAMITES_DESA">

    <soapenv:Header/>

    <soapenv:Body>

        <prod:EA_WS.Execute>

            <prod:Servicio>EATramiteAPP_Carga</prod:Servicio>

            <prod:Parametros>
{
    "EntiCodigo": "E1",
    "EAExpSecAc": "ME",
    "EAExpDesBr": "Test carga portal con seguridad",
    "EAExpFecEn": "2026-05-08T10:00:00",
    "EAExpClaCo": "NTA",
    "EAExpOriTi": "A",
    "EAExpOriCo": "16147388",
    "EAExpSexo": "M",
    "EAExpNint": "5532",
    "EAExpNomOr": "Juan Perez",
    "EAExpObser": "Observacion de prueba",
    "SDT_EACuCab": {
        "EntiCodigo_de_Entidad": "E1",
        "CUGruCodigo": "BEN",
        "CUCueCodigo": 1,
        "CUCueDescri": "Cuestionario",
        "EAExpNroIn": 0,
        "EAExpClaCo": "NTA",
        "EAExpClaDe": "NOTA -",
        "EAExpInfo": "",
        "EACuCFecha": "2026-05-08T00:00:00",
        "EACuOrgCodigo": 1,
        "EACuOrgDescripcion": "OBRA SOCIAL",
        "EACuCNroIn": 0,
        "EACuCExUsuario": "5532",
        "EACuCExDescripcion": "Solicitante",
        "EACuCFAlta": "2026-05-08T00:00:00",
        "EACuCTerminalAlta": "TERMINAL01",
        "EACuCUsuarioAlta": "ADMIN",
        "Detalle": [],
        "Documentos": [],
        "Comprobantes": []
    }
}
            </prod:Parametros>

        </prod:EA_WS.Execute>

    </soapenv:Body>

</soapenv:Envelope>
```

### Nota de uso

- El campo `Parametros` debe enviarse como string con JSON válido.
- Mantener diferenciación de servicios:
  - `EATramitePortal_Carga`: retirado por seguridad.
  - `EATramiteAPP_Carga`: operativo en `EA_WS` con headers obligatorios.

---
## ✅ Servicio Operativo - EATramiteAPP_Consulta (EA_WS)

Servicio de consulta de trámites en el endpoint `EA_WS.Execute`. Devuelve datos del expediente/trámite.

### Parámetros de entrada

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `EntiCodigo` | string | Sí | Código de entidad (ej: `"E1"`) |
| `EAExpNint` | string | Sí | Número interno del expediente (ej: `"5532"`) |

### Request SOAP

```xml
<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:prod="PRODUCTO_TRAMITES_DESA">

    <soapenv:Header/>

    <soapenv:Body>

        <prod:EA_WS.Execute>

            <prod:Servicio>EATramiteAPP_Consulta</prod:Servicio>

            <prod:Parametros>
{
    "EntiCodigo": "E1",
    "EAExpNint": "5532"
}
            </prod:Parametros>

        </prod:EA_WS.Execute>

    </soapenv:Body>

</soapenv:Envelope>
```

### Headers requeridos

```http
USUARIO: ADMIN
PASSWORD: admin123
SOAPAction: PRODUCTO_TRAMITES_DESAaction/AEA_WS.Execute
```

### Respuesta esperada

Devuelve array JSON con datos de todos los expedientes/trámites asociados al número interno consultado. STATUS: 200

**Estructura típica:**

```json
[
  {
    "Nombre": "SDT_ExpedienteAPP",
    "Valor": "[{\"EntiCodigo_de_Entidad\":\"E1\",\"EAExpNroIn\":125,\"EAExpNint\":5532,\"EAExpEstDe\":\"RECIBIDO\",\"EAExpFecAl\":\"2020-05-19T14:54:09\",\"EAExpClaDe\":\"E-JUBILACION ORDINARIA\",\"EAExpFeVto\":\"0000-00-00\",\"EAExpEstSe\":\"R\",\"EAExpSecAc\":\"CAP\"},{\"EntiCodigo_de_Entidad\":\"E1\",\"EAExpNroIn\":128,\"EAExpNint\":5532,\"EAExpEstDe\":\"GENERADO\",\"EAExpFecAl\":\"2020-06-11T15:10:20\",\"EAExpClaDe\":\"E-JUBILACION ORDINARIA\",\"EAExpFeVto\":\"0000-00-00\",\"EAExpEstSe\":\"G\",\"EAExpSecAc\":\"ME \"}]"
  }
]
```

**Campos devueltos por expediente:**

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `EntiCodigo_de_Entidad` | Código de entidad | `E1` |
| `EAExpNroIn` | Número de expediente en sistema | `125` |
| `EAExpNint` | Número interno (afiliado/solicitante) | `5532` |
| `EAExpEstDe` | Estado descripción | RECIBIDO, GENERADO, ANULADO, ENVIADO |
| `EAExpFecAl` | Fecha de última actualización | `2020-05-19T14:54:09` |
| `EAExpClaDe` | Clase descripción | E-JUBILACION ORDINARIA, NOTA |
| `EAExpFeVto` | Fecha vencimiento | `0000-00-00` |
| `EAExpEstSe` | Estado secuencia | R, G, X, E |
| `EAExpSecAc` | Sector actual | CAP, ME |

---
## ⚠️ Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| **Connection refused: connect** | Endpoint incorrecto (HTTPS, puerto, localhost vs IP) | Verificar que uses `http://localhost:8080/PRODUCTO_TRAMITES_DESAJavaWebPostgreSQL/com.tekhne.aea_interfase_ws` |
| **SSL connection could not be established** | Intentado por HTTPS | Usar HTTP, no HTTPS |
| **Valor devuelto vacío (`[]`)** | Se usaron claves no esperadas en `In` o no hay datos para el filtro | Usar `EntiCodigo` + `EAExpNroIn` en formato `Nombre/Valor` |
| **SOAP Fault - Error reading** | Se envio XML dentro de `In` (no string) | `In` debe ser texto (string) con JSON, no XML anidado |

---

## 🎯 Checklist Rápido

- [ ] Endpoint: `http://localhost:8080/PRODUCTO_TRAMITES_DESAJavaWebPostgreSQL/com.tekhne.aea_interfase_ws`
- [ ] SOAPAction: `PRODUCTO_ENTRADASaction/AEA_INTERFASE_WS.Execute`
- [ ] Header USUARIO: `ADMIN`
- [ ] Header PASSWORD: `admin123`
- [ ] Namespace en Execute: `xmlns="PRODUCTO_ENTRADAS"`
- [ ] Parámetro Nombre: `EATramitePortal_Consulta`
- [ ] Parámetro In: JSON string con pares `Nombre/Valor`
- [ ] Claves internas: `EntiCodigo` y `EAExpNroIn`
- [ ] NO usar HTTPS en localhost:8080

---

## 📌 Nota sobre Resultados Vacíos

Si el servicio devuelve `"Valor":"[]"`:

1. **Primero validar formato**: usar `EntiCodigo` y `EAExpNroIn` en `In`
2. **Verificar en BD**: que exista info para el `EAExpNroIn` consultado
3. **Revisar debug**: confirmar que el parser interno toma esos dos nombres exactos
4. **Validar entidad**: confirmar que `EntiCodigo="E1"` aplica al expediente

---

## 🔗 Ubicación de Documentación

- WSDL Completo: Acceder a http://localhost:8080/PRODUCTO_TRAMITES_DESAJavaWebPostgreSQL/com.tekhne.aea_interfase_ws?WSDL
- Servicios Disponibles: Execute (con parámetros Nombre e In)
- Response: Elemento Out de tipo xsd:string con JSON interno

---

## 📞 Contacto de Soporte

Si experimentas Connection refused o errores de SSL, verifica:
1. Puerto 8080 abierto: `Test-NetConnection -ComputerName localhost -Port 8080`
2. WSDL accesible: `curl http://localhost:8080/PRODUCTO_TRAMITES_DESAJavaWebPostgreSQL/com.tekhne.aea_interfase_ws?WSDL`
3. Headers presentes en request

---


