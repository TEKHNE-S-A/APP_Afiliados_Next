# Sincronización de Autorizaciones con SIA

Documentación de las mejoras implementadas para la sincronización bidireccional entre la base de datos local (`ausolici`) y el servicio SOAP SIA (`REC_SOLICITUDES_APP`).

**Fecha:** Diciembre 2025

---

## 1. Actualización Automática desde SOAP (GET /mis-autorizaciones)

### Descripción
El endpoint `/mis-autorizaciones` ahora detecta cambios en el servicio SIA y actualiza automáticamente la base de datos local.

### Flujo de Sincronización

```
1. Usuario consulta sus autorizaciones
   ↓
2. Backend lee tabla ausolici local
   ↓
3. Por cada solicitud:
   - Consulta estado actual en SIA (Mode: DSP)
   - Compara datos locales vs SOAP
   - Si hay cambios → Actualiza BD local
   ↓
4. Devuelve datos actualizados al usuario
```

### Campos Comparados

- `ausolestad` - Estado de la autorización (PEN, APR, REC, etc.)
- `ausoldescr` - Descripción/referencia
- `ausolautnu` - Número de autorización

### Logs Generados

Cuando hay cambios:
```
🔄 CAMBIOS DETECTADOS en solicitud abc123:
   Estado: "PEN" → "APR"
   Descripción: "Consulta" → "Consulta aprobada"
   Autorización: "" → "AUTH-2025-12345"
✅ BD ACTUALIZADA: 1 fila(s) modificada(s)
```

Sin cambios:
```
ℹ️  Sin cambios detectados en solicitud abc123
```

### Archivo
- `backend/server-soap.js` líneas 3805-3995

---

## 2. Guardado de Respuesta SIA al Crear Solicitud (POST /sia/crear-solicitud)

### Descripción
Al crear una nueva solicitud, todos los datos devueltos por SIA se guardan automáticamente en la tabla `ausolici`.

### Flujo de Creación

```
1. Usuario crea solicitud (con/sin fotos)
   ↓
2. Backend guarda en BD local → COMMIT
   ↓
3. Envía a SIA (REC_SOLICITUDES_APP, Mode: INS)
   ↓
4. SIA responde con:
   - AUSolId: ID numérico asignado
   - AUSolIdExt: UUID de la solicitud
   - AUSolEstado: Estado inicial
   - AUAutNumero: Número de autorización (si existe)
   - Otros campos...
   ↓
5. Backend actualiza BD local con TODOS los datos de SIA
   ↓
6. Devuelve respuesta al usuario
```

### Campos Actualizados desde SIA

| Campo BD | Campo SIA | Descripción |
|----------|-----------|-------------|
| `ausolextid` | `AUSolId` | ID numérico de SIA |
| `ausolestad` | `AUSolEstado` | Estado (PEN/APR/REC) |
| `ausolautnu` | `AUAutNumero` | Número autorización |
| `ausoldescr` | `AUSolRefAfiliado` | Descripción |
| `ausolfecal` | `AUSolFecha` | Fecha alta |
| `ausolfecor` | `AUSolFechaOrden` | Fecha orden |
| `ausolcantp` | `AUSolPresCant` | Cantidad prestaciones |
| `ausolpsoco` | `AUSolObsPref` | Profesional/Observaciones |
| `autippreid` | `AUSolPresId` | ID prestación |

### Logs Generados

```
📤 SOAP SIA REQUEST XML:
   <soapenv:Envelope>...</soapenv:Envelope>

📥 ========== RESPUESTA REC_SOLICITUDES_APP ==========
📥 Estado: EXITOSO
📥 Payload completo: {
  "Resultado": "{\"AUSolId\":12345,\"AUSolIdExt\":\"abc-123\",...}",
  "Mensajes": []
}
📥 ====================================================

   📝 AUSolId devuelto por SIA: 12345
   📝 AUSolIdExt devuelto por SIA: abc-123
   📝 Estado: APR
   📝 Número Autorización: AUTH-2025-12345
   ✅ 9 campos actualizados en BD local con datos de SIA
   ✅ Filas afectadas: 1
```

### Respuesta JSON Enriquecida

```json
{
  "success": true,
  "message": "Solicitud de autorización creada correctamente",
  "data": {
    "solicitudId": "abc-123-uuid-local",
    "fechaSolicitud": "2025-12-23",
    "estado": "PENDIENTE",
    "fotosAdjuntas": 2,
    "ausolIdSIA": 12345,
    "ausolIdExtSIA": "abc-123-uuid-sia"
  }
}
```

### Archivo
- `backend/server-soap.js` líneas 4422-4850

---

## 3. Envío de UUID Local como AUSolIdExt

### Descripción
El campo `AUSolIdExt` ahora envía el UUID generado localmente (`ausolicid`) en lugar de `0`, permitiendo que SIA vincule el registro con nuestro ID local.

### Payload SIA Actualizado

**Antes:**
```json
{
  "Mode": "INS",
  "AUSolId": 0,
  "AUSolIdExt": 0,  // ❌ Enviaba 0
  ...
}
```

**Ahora:**
```json
{
  "Mode": "INS",
  "AUSolId": 0,
  "AUSolIdExt": "13d87ffd-95be-433e-9998-c78ef850188e",  // ✅ UUID local
  ...
}
```

### Ventajas

1. **Trazabilidad bidireccional**: SIA puede referenciar nuestro ID local
2. **Sincronización simplificada**: Facilita la consulta posterior por UUID
3. **Auditoría**: Mejor seguimiento del ciclo de vida de cada solicitud

### Log Generado

```
📋 Payload SIA:
   Mode: INS
   AUSolIdExt: 13d87ffd-95be-433e-9998-c78ef850188e  ← UUID local
   AUSolNroAfiliado: 000193582...
   ...
```

### Archivo
- `backend/server-soap.js` línea 4662

---

## 4. Logs Detallados de Respuesta SIA

### Descripción
Se agregó logging completo de la respuesta del servicio `REC_SOLICITUDES_APP` para facilitar debugging y auditoría.

### Formato del Log

```
📥 ========== RESPUESTA REC_SOLICITUDES_APP ==========
📥 Estado: EXITOSO
📥 Payload completo: {
  "Resultado": "...",
  "Mensajes": []
}
📥 ====================================================
```

En caso de error:
```
📥 ========== RESPUESTA REC_SOLICITUDES_APP ==========
📥 Estado: ERROR
📥 Error: Campo requerido faltante
📥 Mensajes:
   [1] AUSolGravCodigo es requerido (Type: 1)
   [2] AUSolPresId es requerido (Type: 1)
📥 ====================================================
```

### Información Mostrada

- ✅ Estado de la operación (EXITOSO/ERROR)
- ✅ Payload completo con todos los campos devueltos
- ✅ Lista de mensajes de error (si existen)
- ✅ JSON formateado para fácil lectura

### Archivo
- `backend/server-soap.js` líneas 4735-4751

---

## Tests de Validación

### Test 1: Actualización Automática
```powershell
cd backend
.\test-actualizacion-autorizaciones.ps1
```

**Resultado esperado:**
- Consulta inicial muestra estado actual
- Segunda consulta detecta cambios (si los hay en SIA)
- Log muestra campos actualizados

### Test 2: Creación de Solicitud
```powershell
cd backend
.\test-crear-solicitud-simple.ps1
```

**Resultado esperado:**
- Solicitud creada en BD local
- Enviada a SIA exitosamente
- Log muestra respuesta completa de SIA
- BD actualizada con datos de SIA
- Respuesta JSON incluye IDs local y SIA

### Test 3: Consulta de Autorizaciones
```powershell
cd backend
.\test-mis-autorizaciones-simple.ps1
```

**Resultado esperado:**
- Lista de autorizaciones sincronizadas
- Datos actualizados desde SIA
- Log muestra comparaciones y cambios

---

## Configuración de Parámetros

Los servicios SIA se configuran dinámicamente desde la tabla `nusispar`, grupo `WSSIATK`:

```sql
SELECT * FROM nusispar WHERE nusisgrupa = 'WSSIATK';
```

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| Host | tkqa.tekhne.com.ar | Host del servicio |
| Port | 8700 | Puerto |
| Secure | N | HTTP/HTTPS |
| BaseUrl | /PRODUCTO_SIA_QA/com.tekhne.asia_ws | Path base |
| Servicio | SIA_WS.Execute | Método SOAP |
| User | mariar | Usuario HTTP |
| Password | ignacio11 | Password HTTP |

---

## Estructura de Tablas

### Tabla ausolici (Solicitudes)

```sql
CREATE TABLE public.ausolici (
  ausolicid bpchar(36) NOT NULL,          -- UUID local (PK)
  nuusuid bpchar(40) NOT NULL,            -- Usuario
  ausoldescr bpchar(40) NOT NULL,         -- Descripción
  ausolfecal date NOT NULL,               -- Fecha alta
  ausolfecor date NOT NULL,               -- Fecha orden
  ausoltipo bpchar(1) NOT NULL,           -- Tipo (P/S)
  ausolestad bpchar(3) NOT NULL,          -- Estado
  ausolautnu bpchar(40) NOT NULL,         -- Número autorización
  ausolextid bpchar(30) NOT NULL,         -- ID SIA
  ausolcantp int2 NOT NULL,               -- Cantidad
  ausolpsoco bpchar(40) NOT NULL,         -- Profesional
  autippreid bpchar(30) NULL,             -- ID prestación
  ...
  CONSTRAINT ausolici_pkey PRIMARY KEY (ausolicid)
);
```

### Tabla ausoaufo (Fotos adjuntas)

```sql
CREATE TABLE public.ausoaufo (
  ausolicid bpchar(36) NOT NULL,          -- FK → ausolici
  ausolfotid bpchar(36) NOT NULL,         -- UUID foto
  ausolf bytea NOT NULL,                  -- Foto en base64
  CONSTRAINT ausoaufo_pkey PRIMARY KEY (ausolicid, ausolfotid)
);
```

---

## Resumen de Mejoras

| # | Funcionalidad | Estado | Archivo | Líneas |
|---|---------------|--------|---------|--------|
| 1 | Actualización automática desde SOAP | ✅ | server-soap.js | 3805-3995 |
| 2 | Guardado de respuesta SIA | ✅ | server-soap.js | 4735-4830 |
| 3 | Envío de UUID local | ✅ | server-soap.js | 4662 |
| 4 | Logs detallados respuesta SIA | ✅ | server-soap.js | 4735-4751 |

---

## Próximos Pasos

- [ ] Agregar retry automático si SIA falla
- [ ] Sincronización periódica en background (cron job)
- [ ] Endpoint para forzar sincronización manual
- [ ] Historial de cambios (tabla de auditoría)
- [ ] Notificaciones push cuando cambia estado

---

## Referencias

- **Documentación SOAP:** `backend/SIA_SOAP_EXAMPLES.md`
- **Servicios SIA:** `backend/SIA_SERVICES.md`
- **Reglas GAM:** `REGLAS_GAM_BDD.md`
- **Admin Web:** `http://localhost:3000/admin`

---

**Última actualización:** 23 de diciembre de 2025
