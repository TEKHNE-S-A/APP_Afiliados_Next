# Servicios SIA Implementados

## Resumen Ejecutivo

✅ **8 servicios SIA implementados** con endpoints REST + SOAP integrado  
🔐 **Autenticación requerida**: 5 de 8 servicios (usan nuusuid o AfiliadoId del usuario)  
📖 **Documentación completa**: Cada servicio con ejemplos SOAP XML reales  
🧪 **Scripts de prueba**: PowerShell individual por servicio (`test-sia-*.ps1`)  

---

## Configuración

Todos los servicios SIA leen su configuración dinámicamente desde la tabla `nusispar` con `nusisgrupa='WSSIATK'`:

| Parámetro | Descripción | Valor actual |
|-----------|-------------|--------------|
| Host | Servidor SIA | tkqa.tekhne.com.ar |
| Port | Puerto | 8700 |
| Secure | Protocolo (1=HTTPS, 0=HTTP) | 0 |
| BaseUrl | Ruta base | /PRODUCTO_SIA_QA/ |
| Servicio | Namespace SOAP | com.tekhne.asia_ws |
| User | Usuario HTTP header | mariar |
| Password | Contraseña HTTP header | ignacio11 |

**Endpoint construido:**
```
http://tkqa.tekhne.com.ar:8700/PRODUCTO_SIA_QA/com.tekhne.asia_ws
```

**Gestión de parámetros:** `http://localhost:3000/admin` (login: admin/admin123)

---

## Funciones Backend

### Funciones Helper
- `buildSoapUrlSIA(includeWSDL)` - Construye URL desde componentes en nusispar
- `getServiceEndpointSIA(servicio)` - Obtiene endpoint para un servicio específico
- `getWsdlUrlSIA()` - Obtiene URL del WSDL
- `getSoapUserSIA()` - Lee User de WSSIATK.User (lanza error si no existe)
- `getSoapPasswordSIA()` - Lee Password de WSSIATK.Password (lanza error si no existe)

### Cliente SOAP
- `initSoapClientSIA()` - Inicializa cliente SOAP SIA (automático al arrancar)
- `callSoapExecuteSIA(servicio, parametros)` - Llama un servicio SIA con headers HTTP
  * Acepta objeto JSON o string vacío `''` para servicios sin parámetros
  * Headers HTTP automáticos: USUARIO y PASSWORD desde nusispar
  * Namespace: `com.tekhne.sia`
  * Método SOAP: `SIA_WS.Execute`

---

## Endpoints REST Disponibles

| # | Servicio | Método | Ruta | Auth | Documentación |
|---|----------|--------|------|------|---------------|
| 1 | REC_SOLICITUDES_APP | POST | /sia/solicitudes | ✅ Requerida | Mode + nuusuid |
| 2 | AUTORIZACION_IMPRIMIR | POST | /sia/autorizacion-imprimir | ✅ Requerida | Delegación + Autorización |
| 3 | REC_PRESTACIONES_APP | POST | /sia/prestaciones | ❌ Sin auth | Sin parámetros |
| 4 | PAGO_COSEGURO_APP | POST | /sia/pago-coseguro | ⏳ Por definir | Por definir |
| 5 | COSEGUROS_PENDIENTES_APP | GET | /sia/coseguros-pendientes | ✅ Requerida | AfiliadoId automático |
| 6 | ENROLAMIENTOS | POST | /sia/enrolamientos | ❌ Sin auth | NroInternoPersona + Fecha |
| 7 | HISTORIAL_ATENCION_APP | GET | /sia/historial-atencion | ✅ Requerida | Paginación + fechas YYYY-MM-DD |
| 8 | AUDETALLE_CONSUMO_APP | GET | /sia/detalle-consumo | ❌ Sin auth | Delegación + Autorización |

---

## 1. REC_SOLICITUDES_APP
**Descripción:** Recibir/consultar solicitudes del usuario

**Endpoint:**
```
POST /sia/solicitudes
Authorization: Bearer <token>
Content-Type: application/json
```

**Body ejemplo:**
```json
{
  "AfiliadoId": "...",
  "FechaDesde": "DD/MM/YYYY",
  "FechaHasta": "DD/MM/YYYY"
}
```

---

### 2. AUTORIZACION_IMPRIMIR
**Descripción:** Imprimir autorizaciones

**Endpoint:**
```
POST /sia/autorizacion-imprimir
Content-Type: application/json
```

**Body ejemplo:**
```json
{
  "AutorizacionId": "...",
  "AfiliadoId": "..."
}
```

---

### 3. REC_PRESTACIONES_APP
**Descripción:** Obtener listado de prestaciones disponibles (para autorizaciones sin prescripción)

**Endpoint:**
```
POST /sia/prestaciones
Content-Type: application/json
```

**Body:** No requiere parámetros (envía string vacío `''` al SOAP)

**Respuesta ejemplo:**
```json
{
  "success": true,
  "prestaciones": [
    {
      "AULPresID": 101,
      "AULPresDescripcion": "Consulta Médica General"
    },
    {
      "AULPresID": 102,
      "AULPresDescripcion": "Análisis de Laboratorio"
    },
    {
      "AULPresID": 103,
      "AULPresDescripcion": "Radiografía Simple"
    }
  ],
  "total": 3
}
```

**Uso:** Se utiliza para poblar el combo de prestaciones en autorizaciones tipo "S" (Sin Prescripción)

**Test:** `.\test-solicitud-sin-prescripcion.ps1`

---

### 4. PAGO_COSEGURO_APP
**Descripción:** Registrar pago de coseguro

**Endpoint:**
```
POST /sia/pago-coseguro
Content-Type: application/json
```

**Body ejemplo:**
```json
{
  "AfiliadoId": "...",
  "CoseguroId": "...",
  "Monto": "...",
  "FormaPago": "..."
}
```

---

### 5. COSEGUROS_PENDIENTES_APP
**Descripción:** Consultar coseguros pendientes de pago

**Endpoint:**
```
GET /sia/coseguros-pendientes?AfiliadoId=...
```

**Query params:**
- `AfiliadoId` (requerido)

---

### 6. ENROLAMIENTOS
**Descripción:** Registrar/actualizar enrolamientos

**Endpoint:**
```
POST /sia/enrolamientos
Content-Type: application/json
```

**Body ejemplo:**
```json
{
  "NroInternoPersona": "63",
  "Fecha": "12/12/2025"
}
```

**SOAP Request generado:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="com.tekhne.sia">
   <soapenv:Header/>
   <soapenv:Body>
      <com:SIA_WS.Execute>
         <com:Servicio>ENROLAMIENTOS</com:Servicio>
         <com:Parametros>{"NroInternoPersona":"63","Fecha":"12/12/2025"}</com:Parametros>
      </com:SIA_WS.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

---

### 7. HISTORIAL_ATENCION_APP
**Descripción:** Consultar historial de atenciones médicas

**Endpoint:**
```
GET /sia/historial-atencion?AfiliadoId=...&FechaDesde=...&FechaHasta=...
```

**Query params:**
- `AfiliadoId` (requerido)
- `FechaDesde` (opcional)
- `FechaHasta` (opcional)

---

### 8. AUDETALLE_CONSUMO_APP
**Descripción:** Detalle de consumo de autorizaciones

**Endpoint:**
```
GET /sia/detalle-consumo?AutorizacionId=...&AfiliadoId=...
```

**Query params:**
- `AutorizacionId` (requerido)
- `AfiliadoId` (requerido)

---

## Formato de Respuesta

### Respuesta exitosa
```json
{
  "success": true,
  "data": {
    "Resultado": "...",
    "Mensajes": [...]
  }
}
```

### Respuesta con error
```json
{
  "error": "Descripción del error",
  "mensajes": [
    {
      "Id": "...",
      "Type": 0,
      "Description": "..."
    }
  ]
}
```

---

## Headers HTTP

Todos los servicios SIA envían automáticamente los headers HTTP:
- `USUARIO`: valor dinámico desde nusispar WSSIATK.User
- `PASSWORD`: valor dinámico desde nusispar WSSIATK.Password

---

## Notas Técnicas

1. **Cliente SOAP separado:** Los servicios SIA usan `soapClientSIA` independiente de `soapClient` (Beneficiarios)
2. **Método SOAP:** SIA usa `SIA_WS.Execute` (Beneficiarios usa `BE_WS.Execute`)
3. **Namespace:** xmlns:com="com.tekhne.sia" (Beneficiarios usa "com.tekhne.beneficiarios")
4. **Inicialización automática:** El cliente SIA se inicializa al arrancar el servidor
5. **Reintentos HTTP:** Si falla con HTTPS, reintenta automáticamente con HTTP
6. **Sin valores hardcodeados:** Toda la configuración se lee de nusispar
7. **Logs detallados:** Cada llamada registra request XML y response XML en consola
8. **Formato de parámetros:** Los parámetros se envían como JSON stringify dentro del tag `<Parametros>`
9. **Servicios sin parámetros:** REC_PRESTACIONES_APP envía `<Parametros></Parametros>` vacío (string vacío `''`)
10. **Formato de fechas variable:**
    - Mayoría de servicios: DD/MM/YYYY
    - HISTORIAL_ATENCION_APP: **YYYY-MM-DD** (diferente)
    - ENROLAMIENTOS: DD/MM/YYYY
11. **Paginación:** HISTORIAL_ATENCION_APP soporta paginación con `Pagina` y `RegistrosXPagina`
12. **Conversión de tipos:** Números convertidos con `parseInt()` antes de enviar a SOAP
13. **Validación de parámetros:** Endpoints validan parámetros requeridos y retornan error 400 si faltan

---

## Testing

**Scripts de prueba disponibles:**
```powershell
cd backend

# Verificar configuración WSBENEFTK y WSSIATK
.\test-sin-hardcoded.ps1

# Test individual por servicio
.\test-sia-solicitudes.ps1              # REC_SOLICITUDES_APP
.\test-sia-autorizacion-imprimir.ps1    # AUTORIZACION_IMPRIMIR
.\test-sia-prestaciones.ps1             # REC_PRESTACIONES_APP
.\test-sia-coseguros-pendientes.ps1     # COSEGUROS_PENDIENTES_APP
.\test-sia-enrolamientos.ps1            # ENROLAMIENTOS
.\test-sia-historial-atencion.ps1       # HISTORIAL_ATENCION_APP
.\test-sia-detalle-consumo.ps1          # AUDETALLE_CONSUMO_APP
```

**Test completo (todos los servicios):**
```powershell
# Ejecutar todos los tests en secuencia
Get-ChildItem .\test-sia-*.ps1 | ForEach-Object { & $_.FullName; Write-Host "`n---`n" }
```

**Reiniciar backend:**
```powershell
.\restart-backend.ps1
```

---

## Integración con App Móvil

Para consumir servicios SIA desde la app móvil:

1. **Importar servicio API:**
   ```typescript
   import { apiPost, apiGet } from '../services/api';
   ```

2. **Llamar endpoint con autenticación:**
   ```typescript
   // Ejemplo: COSEGUROS_PENDIENTES_APP
   const response = await apiGet('/sia/coseguros-pendientes');
   ```

3. **Llamar endpoint con body:**
   ```typescript
   // Ejemplo: ENROLAMIENTOS
   const response = await apiPost('/sia/enrolamientos', {
     NroInternoPersona: "63",
     Fecha: "12/12/2025"
   });
   ```

4. **Manejo de errores:**
   ```typescript
   try {
     const response = await apiGet('/sia/historial-atencion', {
       params: { DesdeFecha: '2025-01-01', HastaFecha: '2025-12-31' }
     });
     console.log(response.data);
   } catch (error) {
     console.error('Error SIA:', error.message);
   }
   ```

---

## Logs y Debugging

El backend registra información completa de cada request SOAP:

```
📥 POST /sia/solicitudes - REC_SOLICITUDES_APP
   Mode: DSP
   AUSolIdExt (nuusuid): 02f2e08e-c185-4846-992a-8baa2a23afbe

📤 SOAP SIA REQUEST XML:
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SIA_WS.Execute xmlns="com.tekhne.sia">
      <Servicio>REC_SOLICITUDES_APP</Servicio>
      <Parametros>{"Mode":"DSP","AUSolIdExt":"..."}</Parametros>
    </SIA_WS.Execute>
  </soap:Body>
</soap:Envelope>
---

📥 SOAP SIA RESPONSE:
...
---
```

Revisar logs del backend para verificar XML SOAP generado y respuestas del servicio.

---

## Tipos de Autorizaciones (AUSolTipo)

### Parámetro de Habilitación

**Tabla:** `nusispar`  
**Grupo:** `FUNCIONES_APP`  
**Tipo:** `HabilitarAutorizSinOrden`  
**Valores posibles:**
- `S` = Habilitado (app muestra opción de autorizaciones sin prescripción)
- `N` = Deshabilitado (app solo permite autorizaciones con prescripción)

**Endpoint:**
```
GET /parametros/funciones-app/habilitar-autoriz-sin-orden
```

**Respuesta:**
```json
{
  "habilitado": true,
  "valor": "S"
}
```

---

### Tipo "P" - Con Prescripción (Fotos)

**Características:**
- ✅ Permite adjuntar **hasta 5 fotos** (prescripción médica)
- ✅ El máximo efectivo se controla con el parámetro `FUNCIONES_APP.MaxFotosAutorizacion` (valores válidos: `1` a `5`)
- ✅ Requiere campo `cobertura` (ID de cobertura/enrolamiento)
- ✅ Campos en payload SIA:
  * `AUSolTipo`: `"P"`
  * `AUSolGravCodigo`: ID cobertura (número, común a ambos tipos)
  * `AUSolPresId`: ID prestación (string, fijo)
  * `AUSolPresCant`: `1` (fijo)
  * `Foto`: Array de objetos foto (si existen)

**Endpoint:**
```
POST /sia/crear-solicitud
Authorization: Bearer <token>
Content-Type: application/json
```

**Body ejemplo:**
```json
{
  "AfiliadoId": "123456789012345678901234567890",
  "AUSolTipo": "P",
  "cobertura": "101",
  "referencia": "Consulta cardiología",
  "profesional": "Dr. Juan Pérez",
  "fotosBase64": [
    "data:image/jpeg;base64,/9j/4AAQ...",
    "data:image/jpeg;base64,/9j/4AAQ...",
    "data:image/jpeg;base64,/9j/4AAQ..."
  ]
}
```

**Validaciones:**
- `cobertura` es requerido
- `fotosBase64` es opcional para tipo `P`
- Si se envían fotos, la cantidad no puede superar `FUNCIONES_APP.MaxFotosAutorizacion`
- Si hay fotos, se guardan en tabla `ausoaufo`
- Base64 puede incluir prefijo `data:image/jpeg;base64,` (se limpia automáticamente)

---

### Tipo "S" - Sin Prescripción (Combo Prestaciones)

**Características:**
- ❌ **NO permite adjuntar fotos** (validación: rechaza si existen fotos adjuntas)
- ✅ Requiere campo `cobertura` (ID de cobertura/enrolamiento, **común a ambos tipos**)
- ✅ Requiere campo `AULPresID` (ID de prestación desde combo `REC_PRESTACIONES_APP`)
- ✅ Campo `AUSolPresCant` **editable por usuario** (cantidad de prestaciones)
- ✅ Campos en payload SIA:
  * `AUSolTipo`: `"S"`
  * `AUSolGravCodigo`: ID cobertura (número, común a ambos tipos)
  * `AULPresID`: ID prestación (número, desde combo)
  * `AUSolPresCant`: cantidad editable (número)
  * Sin campo `Foto` (no se incluye)

**Endpoint:**
```
POST /sia/crear-solicitud
Authorization: Bearer <token>
Content-Type: application/json
```

**Body ejemplo:**
```json
{
  "AfiliadoId": "123456789012345678901234567890",
  "AUSolTipo": "S",
  "cobertura": "101",
  "AULPresID": 102,
  "AUSolPresCant": 3,
  "referencia": "Análisis de rutina",
  "profesional": "Dra. María García"
}
```

**Validaciones:**
- `cobertura` es requerido (común a ambos tipos)
- `AULPresID` es requerido (debe existir en listado de `REC_PRESTACIONES_APP`)
- `AUSolPresCant` debe ser número > 0
- Si `fotosBase64` o cualquier slot legacy de fotos existe → Error 400 "Las autorizaciones sin prescripción no admiten fotos"

**Flujo UI Mobile:**
1. App llama `GET /parametros/funciones-app/habilitar-autoriz-sin-orden`
2. Si `habilitado: true` → Mostrar radio/toggle "Con Prescripción" vs "Sin Prescripción"
3. Usuario selecciona "Sin Prescripción":
   - App llama `POST /sia/prestaciones` → obtiene array de prestaciones
   - Muestra Picker/Combo con `AULPresDescripcion`
   - Habilita input numérico para `AUSolPresCant`
   - Oculta botones de adjuntar fotos
4. Usuario envía solicitud → backend valida y crea en SIA

---

### Comparativa Tipo "P" vs Tipo "S"

| Aspecto | Tipo "P" (Con Prescripción) | Tipo "S" (Sin Prescripción) |
|---------|-----------------------------|-----------------------------|
| **Fotos** | ✅ Hasta 5 fotos (según parámetro) | ❌ Sin fotos |
| **Campo cobertura** | ✅ Requerido | ✅ Requerido (común) |
| **Campo AUSolPresId** | ✅ Usado (fijo) | ❌ No se usa |
| **Campo AULPresID** | ❌ No se usa | ✅ Requerido (desde combo) |
| **Campo AUSolPresCant** | Fijo (1) | ✅ Editable (número) |
| **Campos SIA** | AUSolGravCodigo, AUSolPresId, Foto[] | AUSolGravCodigo, AULPresID, AUSolPresCant |
| **Tabla ausoaufo** | Guarda fotos | Sin registros de fotos |
| **Habilitar en app** | Siempre disponible | Controlado por parámetro |

---

### Ejemplos de Payload SIA

**Tipo "P" con fotos:**
```json
{
  "Mode": "INS",
  "AUSolId": 0,
  "AUSolTipo": "P",
  "AUSolUsuAfiliadoId": "123456789012345678901234567890",
  "AUSolIdExt": 0,
  "AUSolNroAfiliado": "123456789012345678901234567890",
  "AUSolFecha": "2025-12-22",
  "AUSolPresTipo": "A",
  "AUSolRefAfiliado": "Consulta cardiología",
  "AUSolObsPref": "Dr. Juan Pérez",
  "AUSolGravCodigo": 101,
  "AUSolPresId": "101",
  "AUSolPresCant": 1,
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
    },
    {
      "AUSoFId": 3,
      "AUSoFIdExt": "3",
      "AUSoFFileName": "f3.jpg",
      "AUSoFFotoBase64": "/9j/4AAQ..."
    }
  ]
}
```

**Tipo "S" sin fotos:**
```json
{
  "Mode": "INS",
  "AUSolId": 0,
  "AUSolTipo": "S",
  "AUSolUsuAfiliadoId": "123456789012345678901234567890",
  "AUSolIdExt": 0,
  "AUSolNroAfiliado": "123456789012345678901234567890",
  "AUSolFecha": "2025-12-22",
  "AUSolPresTipo": "A",
  "AUSolRefAfiliado": "Análisis de rutina",
  "AUSolObsPref": "Dra. María García",
  "AUSolGravCodigo": 101,
  "AULPresID": 102,
  "AUSolPresCant": 3
}
```

**Observación:** 
- Campo `Foto` NO se incluye en tipo "S"
- Campo `AUSolGravCodigo` (cobertura) es **común a ambos tipos**
- Endpoint auxiliar mobile: `GET /parametros/funciones-app/max-fotos-autorizacion`

---

### Tests

**Script completo:**
```powershell
.\test-solicitud-sin-prescripcion.ps1
```

**Flujo del test:**
1. ✅ Verificar parámetro `FUNCIONES_APP.HabilitarAutorizSinOrden`
2. ✅ Login y obtener token
3. ✅ Obtener prestaciones (`REC_PRESTACIONES_APP`)
4. ✅ Crear solicitud tipo "S" (sin fotos)
5. ✅ Crear solicitud tipo "P" (con foto) para comparar

---

## Referencias

- **Documentación SOAP:** `SIA_SOAP_EXAMPLES.md` (ejemplos XML completos)
- **Fix de fotos:** `SIA_SOLICITUDES_FOTOS_FIX.md` (límites de caracteres 20)
- **Configuración dinámica:** Tabla `nusispar`, grupo `WSSIATK`
- **Admin Web:** `http://localhost:3000/admin` (gestión de parámetros)
- **Sistema Beneficiarios:** `WSBENEFTK` (servicios REGISTRACION, APPDATOSCREDENCIALES, etc.)

**Test manual de cualquier endpoint:**
```powershell
# POST endpoint
curl -X POST http://localhost:3000/sia/enrolamientos `
  -H "Content-Type: application/json" `
  -d '{"NroInternoPersona":"63","Fecha":"12/12/2025"}'

# GET endpoint
curl http://localhost:3000/sia/coseguros-pendientes?AfiliadoId=123456789
```

**Verificar logs SOAP en tiempo real:**
Los logs del backend muestran el XML SOAP completo:
- `📤 SOAP SIA REQUEST XML:` - Request enviado
- `📥 SOAP SIA RESPONSE:` - Response recibido

---

## Próximos Pasos

Los servicios están listos para ser consumidos desde la app móvil. Cada endpoint:
- ✅ Lee configuración dinámica de nusispar
- ✅ Envía headers HTTP correctos
- ✅ Parsea respuestas SOAP
- ✅ Maneja errores
- ✅ Log completo de requests/responses

Para agregar lógica específica de negocio, editar las funciones en `server-soap.js` líneas 3070-3260.
