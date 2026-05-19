# Tareas — Servicios WS (invocados por otros sistemas)

Este documento define el **backlog/checklist** para implementar los servicios:
- ✅ `WS_NOTIFICACION` — implementado y testeado
- ✅ `WS_VALIDAR_AFILIADO` — implementado (8/8 tests PASS)
- ✅ `WS_USUARIO_ACTIVO` — implementado (9/10 tests PASS; T10 requiere crcredus real)
- ✅ `WS_AUTORIZACION` — implementado (11/11 tests PASS)
- ✅ `WS_TOKEN_TELECONSULTA` — implementado (8/8 tests PASS)

Decisiones confirmadas:
- ✅ Protocolo: **REST (Express)**
- ✅ Base path: **`/api/ws/...`**
- ✅ Auth: **mismo sistema que notificaciones** (Basic Auth para integraciones; si aplica, compatibilidad con Bearer/JWT como ya está implementado)

> Convención (alineada a lo ya implementado): **YAML** como formato principal (request/response) con compatibilidad **JSON** vía `Accept`.
> Nota: compartiste un ejemplo en formato **SOAP envelope** que contiene un campo `Jsonresponse` con JSON adentro. Si algún consumidor realmente requiere SOAP/WSDL, eso sería un alcance distinto (y habría que definirlo explícitamente). Por ahora las tareas asumen REST.

---

## Convenciones comunes (para todos)

### Contrato
- [ ] Definir **método HTTP** (GET/POST) y **path** (URL) final del servicio.
- [ ] Definir **Content-Type** aceptado: `application/yaml` (principal) y `application/json` (opcional).
- [ ] Definir **negociación** por `Accept`: `application/yaml` o `application/json`.
- [ ] Definir **códigos HTTP**: 200/201, 400 (validación), 401 (auth), 403 (permiso), 404 (no encontrado), 409 (conflicto), 500.
- [ ] Definir 1 request/response **de ejemplo** en YAML + JSON.

### Seguridad
- [ ] Requerir **Basic Auth** (GeneXus/sistemas externos) y documentar credenciales (solo por parámetro `nusispar` o config, nunca hardcode).
- [ ] (Opcional) Permitir Bearer Token si el WS lo consume también mobile.
- [ ] Registrar intentos fallidos (sin loguear contraseñas/tokens).

### Validaciones
- [ ] Validar campos obligatorios y tamaños máximos.
- [ ] Normalizar strings (trim) y fechas (ISO 8601) cuando aplique.

### Backend (Node/Express)
- [ ] Crear handler Express con parseo YAML/JSON y respuesta YAML/JSON.
- [ ] Agregar middleware `requireAuth` (Basic/Bearer) según patrón actual.
- [ ] Manejo de errores: respuesta consistente `{ error, message, details? }`.
- [ ] Logs con `requestId` (si existe header `x-request-id`, propagar).

### Documentación y pruebas
- [ ] Agregar doc en `backend/` o root con ejemplos de uso.
- [ ] Agregar request(s) a Postman (si se mantiene colección).
- [ ] Agregar script PowerShell de prueba (estilo `backend/test-*.ps1`).
- [ ] Agregar snippet GeneXus (YAML multiline + Basic Auth).

---

## WS_NOTIFICACION

### 1) Contrato
- [x] Método/path final: `POST /api/ws/WS_NOTIFICACION`.
- [x] Servicio distinto de `POST /api/notifications/send` (este es batch por Afiliados y mapea CrCreId → nuusuid).

Estructura recibida (GeneXus SDT — IN):

`SDT_WS_NOTIFICACION`
- `Titulo` (char, 80)
- `Mensaje` (varchar, 128)
- `Afiliados` (`SDT_NuDispositivosMensajesWS` collection)
- `NUMesId` (num, 12)
- `Messages` (`Messages`, GeneXus.Common)

`SDT_NuDispositivosMensajesWS` (collection)
- Item:
  - `NUUsuAfiliadoID` (varchar, 40)
  - `NUUsuNroAfiliado` (char, 20)

`Messages` (collection)
- Item:
  - `Id` (varchar, 128)
  - `Type` (MessageTypes)
  - `Description` (varchar, 256)

`MessageTypes` enum:
- `Warning` (0)
- `Error` (1)
- `Info` (2)
- `Debug` (3)

Ejemplo request YAML (propuesto):
```yaml
Titulo: "Autorización aprobada"
Mensaje: "Tu solicitud fue aprobada"
NUMesId: 1
Afiliados:
  - NUUsuAfiliadoID: "0000000000000000000000000000000000000027"
    NUUsuNroAfiliado: "20123456789012345678"
  - NUUsuAfiliadoID: "0000000000000000000000000000000000000031"
    NUUsuNroAfiliado: "20123456789012345679"
```

Ejemplo response YAML (final: **mismo SDT que request** + `Messages`):
```yaml
Titulo: "Autorización aprobada"
Mensaje: "Tu solicitud fue aprobada"
NUMesId: 1
Afiliados:
  - NUUsuAfiliadoID: "0000000000000000000000000000000000000027"
    NUUsuNroAfiliado: "20123456789012345678"
  - NUUsuAfiliadoID: "0000000000000000000000000000000000000031"
    NUUsuNroAfiliado: "20123456789012345679"
Messages:
  - Id: "0000000000000000000000000000000000000027"
    Type: 2
    Description: "OK - Notificación creada para nuusuid=..."
  - Id: "0000000000000000000000000000000000000031"
    Type: 1
    Description: "No se encontró usuario para el CrCreId indicado (crcredus)"
  - Id: "WS_NOTIFICACION"
    Type: 2
    Description: "Procesados 2 afiliados. OK=1 ERROR=1"
```

Pendiente para cerrar contrato:
- [x] `NUUsuAfiliadoID` **no es `nuusuid`**: es **`CrCreId` = `crcreden.crcreid` (AfiliadoId credencial)**.
- [x] `NUUsuNroAfiliado` es **obligatorio** para guardar/procesar.
- [x] Validar `NUUsuNroAfiliado` contra `crcreden.crcrenroaf` cuando existe el `CrCreId`.
- [x] `NUMesId` se persiste en `metadata.numesId`.
- [x] `Messages`: **solo salida** (GeneXus.Common). Resultado por afiliado se informa en `Messages` (Id=CrCreId).

Validaciones específicas (propuestas):
- [x] `Titulo` requerido, `len <= 80`.
- [x] `Mensaje` requerido, `len <= 128`.
- [x] `NUMesId` requerido, numérico, `<= 12 dígitos`.
- [x] `Afiliados` requerido, `count >= 1`.
- [x] Cada item: `NUUsuAfiliadoID` requerido (CrCreId), `len <= 40` (normalizar con trim); `NUUsuNroAfiliado` requerido, `len <= 20`.
- [x] Normalizar `CrCreId`: `trim()` y usarlo para buscar en `crcredus.crcreid` (en BD es `bpchar(30)`).
- [x] Validar `NUUsuNroAfiliado` vs `crcreden.crcrenroaf` cuando `crcreid` existe.

### 2) Implementación backend
- [x] Resolver destinatario(s) desde `CrCreId`:
  - Query: `SELECT nuusuid FROM crcredus WHERE TRIM(crcreid) = TRIM($1) LIMIT 1`
  - Validación `crcreden` para `crcrenroaf`.
- [x] Por cada `nuusuid` resuelto: crear notificación (mismo patrón que `POST /api/notifications/send`).
- [x] Guardar `NUMesId` en `metadata` (`metadata.numesId`).
- [x] Response: mismo SDT de entrada + `Messages` con 1 mensaje por afiliado + 1 resumen.

### 3) Docs/Tests
- [ ] Incluir ejemplo GeneXus validado (Basic + YAML).
- [x] Agregar test PowerShell para `POST /api/ws/WS_NOTIFICACION` (YAML request + JSON response).

---

## WS_VALIDAR_AFILIADO

### 1) Contrato
- [x] Definir request: `SDT_WSEstadoAfiliado` — `NUUsuAfiliadoID` (varchar 40 = CrCreId).
- [x] Definir response: `NUUsuAfiliadoID` (mirror) + `EstadoAfiliado` (char 1): `E`=activo y vigente, `I`=inactivo/vencido, `N`=no encontrado. HTTP 400 en error de validación del request.
- [x] Fuente de datos: **BD local** — tablas `crcredus` (JOIN `nuusuari`) + `crcreden` (fecha vencimiento).

### 2) Implementación backend
- [x] Endpoint `POST /api/ws/WS_VALIDAR_AFILIADO` con `requireAuth` en `server-soap.js`.
- [x] `GET /api/ws/WS_VALIDAR_AFILIADO` → 405 con `Allow: POST`.
- [x] Validación `NUUsuAfiliadoID` requerido, ≤40 chars → HTTP 400 (sin campo `EstadoAfiliado` en cuerpo).
- [x] Consulta `crcredus JOIN nuusuari` para obtener `nuusuid` + `nuusubajaf`.
- [x] Check baja: si `nuusubajaf` es fecha real (año > 1) → `"I"`.
- [x] Check vigencia: si `crcreden.crcrefecvi` < hoy → `"I"`; si no existe → `"N"`; si OK → `"E"`.
- [x] Formato dual JSON/YAML (Accept header).

### 3) Docs/Tests
- [x] Script PowerShell `backend/test-ws-validar-afiliado.ps1` (T00-T07, incluyendo campo vacío/ausente/largo, not found, real CrCreId, sin auth).
- [ ] Snippet GeneXus para request YAML.

---

## WS_USUARIO_ACTIVO

### 1) Contrato
- [x] Definir request: `SDT_WSValidaUsuario` — `WSUsuario` (char 20), `WSPassword` (char 50), `IdAfiliado` (char 40 = CrCreId).
- [x] Definir response: `RespuestaItem` — `RespuestaCodigo` (char 3), `RespuestaDescripcion` (char 150). Mirror SDT request + RespuestaItem.
- [x] Definir reglas:
  - Buscar usuario por email exacto → CUIL/nroaf → DNI LIKE en `nuusuari`.
  - Verificar contraseña contra `nuusuauth` (pbkdf2Sync).
  - Verificar que `IdAfiliado` (CrCreId) pertenezca al usuario en `crcredus`.
  - Verificar que `nuusubajaf` sea null o fecha mínima (año ≤ 1 = activo).
  - Códigos: `000` OK | `001` user not found | `002` wrong password | `003` affiliate mismatch | `004` inactive | `010` param error | `099` internal.

### 2) Implementación backend
- [x] Endpoint `POST /api/ws/WS_USUARIO_ACTIVO` con `requireAuth` en `server-soap.js`.
- [x] `GET /api/ws/WS_USUARIO_ACTIVO` → 405 con `Allow: POST`.
- [x] Validación de campos (longitud, requeridos) → código `010`.
- [x] Consulta `nuusuari` multi-criterio (email → cuil → DNI LIKE).
- [x] Verificación `nuusuauth` con `verifyPassword()` (pbkdf2Sync).
- [x] Verificación `crcredus` (TRIM crcreid = TRIM $1 AND nuusuid = $2).
- [x] Verificación estado activo (nuusubajaf null o año ≤ 1).
- [x] Formato dual JSON/YAML (Accept header).

### 3) Docs/Tests
- [x] Script PowerShell `backend/test-ws-usuario-activo.ps1` (T00-T09 PASS, T10 requiere usuario con crcredus real).
- [ ] Snippet GeneXus + logging post-Execute.

---

## WS_AUTORIZACION

### 1) Contrato
- [x] Definir request: `SDT_AUSolic_WS` — 17 campos (AUSolIdExt requerido char 40; campos opcionales: estado, números autorización, fechas, proveedor, texto libre).
- [x] Definir response: `Messages` Collection — `[{Id (varchar 128), Type (MessageTypes), Description (varchar 256)}]`.
- [x] Objetivo: **callback de GeneXus/SIA** — notifica resultado de autorización procesada. La app recibe, persiste (UPSERT) y responde `SUCCESS`.

### 2) Implementación backend
- [x] Endpoint `POST /api/ws/WS_AUTORIZACION` con `requireAuth` en `server-soap.js`.
- [x] `GET /api/ws/WS_AUTORIZACION` → 405 con `Allow: POST`.
- [x] Validación `AUSolIdExt` requerido, ≤40 chars → HTTP 400 + `Messages[{Type:"ERROR"}]`.
- [x] Validaciones de longitud para todos los campos char/varchar del SDT.
- [x] Validación `AUSolRechazoDef` ∈ {S, N}.
- [x] Validaciones numéricas (rango 0–max) para `AUSolAutDCodigo`, `AUSolAutNumero`, `AUSolAutCodGra`, `AUSolAutProv`, `AUSolAutSuc`.
- [x] UPSERT en tabla `sia_autorizaciones` (PK=`ausol_id_ext`); si tabla no existe (42P01), responde igual con `SUCCESS` sin crash.
- [x] DDL: `backend/db/create_sia_autorizaciones.sql` (tabla + 3 índices + comentarios).
- [x] Formato dual JSON/YAML (Accept header).

### 3) Docs/Tests
- [x] Script PowerShell `backend/test-ws-autorizacion.ps1` (T00-T10, 11/11 PASS: GET→405, sin IdExt→400, vacío→400, largo→400, estado largo→400, rechazoDef inválido→400, numérico inválido→400, sin auth→401, payload completo→SUCCESS, mínimo→SUCCESS, UPSERT idempotente→SUCCESS).
- [ ] Snippet GeneXus para request YAML.

---

## WS_TOKEN_TELECONSULTA

### 1) Contrato
- [x] Definir request: `SDT_TokenTeleConsWS` — `NroAfiliado` (varchar 20 = nroafiliado en `crcreden`).
- [x] Definir response: `token` (char 6) + `fechaHora` (ISO 8601 datetime).
- [x] Token **aleatorio 6 chars** de charset seguro (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, sin O/0/I/1). Cache en memoria con TTL configurable. **No se guarda en BD** (in-memory Map).

### 2) Implementación backend
- [x] Endpoint `POST /api/ws/WS_TOKEN_TELECONSULTA` con `requireAuth` en `server-soap.js`.
- [x] `GET /api/ws/WS_TOKEN_TELECONSULTA` → 405 con `Allow: POST`.
- [x] Validación `NroAfiliado` requerido, ≤20 chars → HTTP 400.
- [x] Verificación `NroAfiliado` en `crcreden.crcrenroaf` → HTTP 404 si no existe.
- [x] Cache en `_tokenTeleConsultaCache` (Map): reutiliza token si aún vigente, genera nuevo si expiró.
- [x] TTL configurable: parámetro `CREDENCIAL.TIMEOUTTOKENTELE` en `nusispar` (default 30 min).
- [x] Helper `generateTeleConsultaToken()` + `getTeleConsultaTimeoutMinutes()` definidos a nivel módulo.
- [x] Formato dual JSON/YAML (Accept header).

### 3) Docs/Tests
- [x] Script PowerShell `backend/test-ws-token-teleconsulta.ps1` (T00-T07: GET→405, vacío→400, ausente→400, largo→400, not found→404, sin auth→401, token real 6 chars válidos, cache).
- [ ] Snippet GeneXus que consuma token y loguee respuesta.

---

## Información faltante (para que pueda completar contratos)

Para cada WS, pegá (aunque sea en borrador) esto:
- **Método + URL/path** esperado
- **Request YAML** de ejemplo
- **Response YAML** de ejemplo
- Reglas de negocio principales (2–5 bullets)
