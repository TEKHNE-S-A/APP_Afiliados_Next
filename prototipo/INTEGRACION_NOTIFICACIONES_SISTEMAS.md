# Integración Sistema de Notificaciones — Envío desde Sistemas Externos

Este documento explica cómo **enviar notificaciones** a usuarios de la app móvil desde sistemas externos (GeneXus, PHP, PowerShell, etc.).

---

## 📋 Información General

**Propósito**: Permitir que sistemas backend (GeneXus, scripts, servicios) envíen notificaciones push a usuarios de la app móvil.

**Tabla BD**: `notifications` (PostgreSQL)  
**Tipos disponibles**: `autorizacion`, `credencial`, `general`  
**Características**:
- ✅ Persistencia en base de datos
- ✅ Push notifications automáticas (si el dispositivo está registrado)
- ✅ Metadata YAML/JSON flexible para datos adicionales
- ✅ Consulta vía REST API desde la app mobile

---

## 📬 Estructura de Notificación

```sql
CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nuusuid           VARCHAR(100) NOT NULL REFERENCES nuusuari(nuusuid),
  tipo              VARCHAR(50) NOT NULL,
  titulo            VARCHAR(255) NOT NULL,
  mensaje           TEXT NOT NULL,
  leida             BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_leida       TIMESTAMP(3),
  metadata          JSONB
);
```

**Campos obligatorios:**
- `nuusuid`: ID del usuario destinatario (40 caracteres GUID o numérico legacy)
- `tipo`: Categoría de notificación (`autorizacion`, `credencial`, `general`)
- `titulo`: Título corto (máximo 255 caracteres)
- `mensaje`: Cuerpo del mensaje (texto completo)

**Campos opcionales:**
- `metadata`: JSON/YAML arbitrario con información adicional (autorizacionId, prestacion, etc.)

---

## 🔑 Tipos de Notificación

| Tipo           | Uso                                                  | Ejemplo                                    |
|----------------|------------------------------------------------------|--------------------------------------------|
| `autorizacion` | Cambios de estado en solicitudes de autorización    | "Autorización #12345 aprobada"             |
| `credencial`   | Actualizaciones de credencial digital               | "Tu credencial vence en 5 días"            |
| `general`      | Mensajes informativos del sistema                   | "Bienvenido a la app de OSEP"              |

---

## 🛠️ Opciones de Integración

| Sistema/Plataforma | Método | Complejidad | Push Automático | Recomendado |
|-------------------|--------|-------------|-----------------|-------------|
| **GeneXus** | SQL Directo | ⭐ Baja | ❌ No | ✅ **SÍ** (simple) |
| GeneXus | Stored Procedure | ⭐⭐ Media | ✅ Sí (con trigger) | ✅ Sí (robusto) |
| GeneXus | REST API | ⭐⭐ Media | ✅ Sí | Opcional |
| **PHP** | SQL Directo | ⭐ Baja | ❌ No | ✅ Sí |
| **PowerShell** | SQL Directo | ⭐ Baja | ❌ No | ✅ Sí |
| **Node.js** | Helper Function | ⭐ Baja | ✅ Sí | ✅ Sí |
| **Cualquier sistema** | REST API Node.js | ⭐ Baja | ✅ Sí | Opción universal |

**📌 Recomendación**: Para notificaciones simples desde GeneXus, usar **SQL Directo**. Para casos complejos con lógica adicional, usar **Stored Procedure**.

---

## GeneXus (SQL Directo) ⭐ RECOMENDADO

### Opción más simple

```genexus
// ============================================================================
// PROCEDURE: EnviarNotificacionUsuario
// ============================================================================
// Parámetros IN:
//   &UsuarioId (VarChar 100) - nuusuid del destinatario
//   &Tipo (VarChar 50) - 'autorizacion', 'credencial', 'general'
//   &Titulo (VarChar 255) - Título de la notificación
//   &Mensaje (VarChar 2000) - Mensaje completo
//   &MetadataJson (VarChar 1000) - JSON opcional (puede ser null)
// Parámetros OUT:
//   &NotificacionId (VarChar 36) - UUID de la notificación creada
//   &Exito (Boolean)
// ============================================================================
Parm(in:&UsuarioId, in:&Tipo, in:&Titulo, in:&Mensaje, in:&MetadataJson, 
     out:&NotificacionId, out:&Exito)

// Construir SQL INSERT
&SqlInsert = "INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, metadata) "
&SqlInsert += "VALUES (gen_random_uuid(), :p1, :p2, :p3, :p4, false, NOW(), "

// Agregar metadata solo si se proporciona
If &MetadataJson.IsEmpty()
    &SqlInsert += "null) "
Else
    &SqlInsert += ":p5::jsonb) "
EndIf

&SqlInsert += "RETURNING id::text"

// Ejecutar query
&GxCommand = new GxCommand()
&GxCommand.CommandText = &SqlInsert
&GxCommand.AddParameter("p1", &UsuarioId)
&GxCommand.AddParameter("p2", &Tipo)
&GxCommand.AddParameter("p3", &Titulo)
&GxCommand.AddParameter("p4", &Mensaje)

If Not &MetadataJson.IsEmpty()
    &GxCommand.AddParameter("p5", &MetadataJson)
EndIf

Try
    &NotificacionId = &GxCommand.ExecuteScalar()
    &Exito = True
    msg("✅ Notificación enviada: " + &NotificacionId)
Catch &Exception
    &Exito = False
    &NotificacionId = ""
    msg("❌ Error enviando notificación: " + &Exception.ToString())
EndTry
```

### Ejemplo de uso: Notificar autorización aprobada

```genexus
// ========================================
// EVENT: AprobarAutorizacion
// ========================================
Event 'AprobarAutorizacion'
    
    // Actualizar estado de la autorización
    &AutorizacionId = &SolicitudSeleccionada.Id
    &Estado = "APROBADA"
    
    // UPDATE en tabla de autorizaciones (tu lógica existente)
    // ...
    
    // Obtener nuusuid del afiliado
    &UsuarioId = &SolicitudSeleccionada.UsuarioId  // Debe ser el nuusuid
    
    // Preparar notificación
    &Tipo = "autorizacion"
    &Titulo = "Autorización Aprobada"
    &Mensaje = "Tu solicitud de autorización #" + Trim(Str(&AutorizacionId)) + " ha sido aprobada exitosamente."
    
    // Metadata JSON (opcional)
    &Metadata = '{"autorizacionId":' + Trim(Str(&AutorizacionId)) + ',"estado":"APROBADA"}'
    
    // Enviar notificación
    EnviarNotificacionUsuario(&UsuarioId, &Tipo, &Titulo, &Mensaje, &Metadata, &NotifId, &Ok)
    
    If &Ok
        msg("✅ Autorización aprobada y usuario notificado")
    Else
        msg("⚠️  Autorización aprobada pero falló notificación")
    EndIf
EndEvent
```

### Ejemplo: Notificar vencimiento de credencial

```genexus
// ========================================
// EVENT: NotificarVencimientoCredencial
// ========================================
// Ejecutar este procedimiento diariamente (job programado)
// ========================================

For Each
    Where CredencialFechaVencimiento >= Today()
      And CredencialFechaVencimiento <= AddDays(Today(), 7)  // Vence en 7 días o menos
      And CredencialNotificacionEnviada = false
    
    &UsuarioId = CredencialUsuarioId
    &DiasRestantes = DateDiff(CredencialFechaVencimiento, Today(), 'day')
    
    &Tipo = "credencial"
    &Titulo = "Credencial próxima a vencer"
    &Mensaje = "Tu credencial digital vence en " + Trim(Str(&DiasRestantes)) + " día(s). Actualízala desde la app."
    &Metadata = '{"diasRestantes":' + Trim(Str(&DiasRestantes)) + ',"fechaVencimiento":"' + CredencialFechaVencimiento.ToString() + '"}'
    
    EnviarNotificacionUsuario(&UsuarioId, &Tipo, &Titulo, &Mensaje, &Metadata, &NotifId, &Ok)
    
    If &Ok
        // Marcar como notificado para no enviar duplicados
        CredencialNotificacionEnviada = True
        Update Credencial
    EndIf
EndFor
```

### SQL Directo (sin procedure)

Si prefieres ejecutar SQL directamente desde un WebPanel o procedimiento:

```genexus
// SQL inline en evento
&Sql = "INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, metadata) "
&Sql += "VALUES (gen_random_uuid(), :usuario, :tipo, :titulo, :mensaje, false, NOW(), :meta::jsonb)"

&Cmd = new GxCommand()
&Cmd.CommandText = &Sql
&Cmd.AddParameter("usuario", "0000000000000000000000000000000000000024")
&Cmd.AddParameter("tipo", "autorizacion")
&Cmd.AddParameter("titulo", "Autorización Aprobada")
&Cmd.AddParameter("mensaje", "Tu solicitud #12345 fue aprobada")
&Cmd.AddParameter("meta", '{"autorizacionId":12345}')

&RowsAffected = &Cmd.ExecuteNonQuery()

If &RowsAffected > 0
    msg("✅ Notificación enviada")
Else
    msg("❌ Error al enviar")
EndIf
```

---

## GeneXus (Stored Procedure con Push) ⭐ AVANZADO

### Paso 1: Crear función PostgreSQL

Ejecutar **UNA SOLA VEZ** en la base de datos:

```sql
-- ============================================================================
-- STORED FUNCTION: crear_notificacion_con_push
-- Inserta notificación en BD y retorna ID para posterior envío de push
-- ============================================================================
CREATE OR REPLACE FUNCTION crear_notificacion_con_push(
    p_nuusuid VARCHAR(100),
    p_tipo VARCHAR(50),
    p_titulo VARCHAR(255),
    p_mensaje TEXT,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notif_id UUID;
BEGIN
    -- Validar parámetros
    IF p_nuusuid IS NULL OR p_tipo IS NULL OR p_titulo IS NULL OR p_mensaje IS NULL THEN
        RAISE EXCEPTION 'Parámetros obligatorios: nuusuid, tipo, titulo, mensaje';
    END IF;
    
    -- Validar tipo
    IF p_tipo NOT IN ('autorizacion', 'credencial', 'general') THEN
        RAISE EXCEPTION 'Tipo inválido. Debe ser: autorizacion, credencial, general';
    END IF;
    
    -- Insertar notificación
    INSERT INTO notifications (
        id,
        nuusuid,
        tipo,
        titulo,
        mensaje,
        leida,
        fecha_creacion,
        metadata
    ) VALUES (
        gen_random_uuid(),
        p_nuusuid,
        p_tipo,
        p_titulo,
        p_mensaje,
        false,
        NOW(),
        p_metadata
    ) RETURNING id INTO v_notif_id;
    
    -- Log
    RAISE NOTICE 'Notificación creada: % para usuario %', v_notif_id, p_nuusuid;
    
    RETURN v_notif_id;
END;
$$ LANGUAGE plpgsql;

-- Ejemplo de uso SQL directo:
-- SELECT crear_notificacion_con_push(
--   '0000000000000000000000000000000000000024',
--   'autorizacion',
--   'Autorización Aprobada',
--   'Tu solicitud ha sido aprobada exitosamente.',
--   '{"autorizacionId": 12345}'::jsonb
-- );
```

### Paso 2: Usar desde GeneXus

```genexus
// ============================================================================
// PROCEDURE: EnviarNotificacionConPush
// Usa stored procedure de PostgreSQL
// ============================================================================
Parm(in:&UsuarioId, in:&Tipo, in:&Titulo, in:&Mensaje, in:&MetadataJson, 
     out:&NotificacionId, out:&Exito)

&SqlQuery = "SELECT crear_notificacion_con_push(:p1, :p2, :p3, :p4, "

If &MetadataJson.IsEmpty()
    &SqlQuery += "null)"
Else
    &SqlQuery += ":p5::jsonb)"
EndIf

&GxCommand = new GxCommand()
&GxCommand.CommandText = &SqlQuery
&GxCommand.AddParameter("p1", &UsuarioId)
&GxCommand.AddParameter("p2", &Tipo)
&GxCommand.AddParameter("p3", &Titulo)
&GxCommand.AddParameter("p4", &Mensaje)

If Not &MetadataJson.IsEmpty()
    &GxCommand.AddParameter("p5", &MetadataJson)
EndIf

Try
    &NotificacionId = &GxCommand.ExecuteScalar()
    &Exito = True
    msg("✅ Notificación enviada (ID: " + &NotificacionId + ")")
Catch &Exception
    &Exito = False
    &NotificacionId = ""
    msg("❌ Error: " + &Exception.ToString())
EndTry
```

---

## GeneXus (REST API) - Con Validaciones ⭐ RECOMENDADO para Sistemas Remotos

> **📝 IMPORTANTE - Formato YAML**  
> La API de notificaciones utiliza formato **YAML** para request y response.  
> **Content-Type:** `application/yaml`  
> YAML es más legible y menos propenso a errores de formato que JSON.

### Endpoint Backend

**URL:** `POST /api/notifications/send`  
**Autenticación:** Basic Auth (usuario:contraseña) o Bearer Token (JWT)  
**Content-Type:** application/yaml

> Nota: si abrís `http://localhost:3000/api/notifications/send` en el navegador, el navegador hace **GET** y este endpoint es **solo POST**.
> Por eso vas a ver **405 Method Not Allowed** (o **Cannot GET** si el backend no tiene handler para GET). Para probar conectividad, usar `GET /health`.

Este endpoint ya está implementado en `backend/server-soap.js` con las siguientes validaciones:

**Validaciones automáticas:**
- ✅ Usuario (nuusuid) existe en la base de datos
- ✅ Tipo es válido: `autorizacion`, `credencial`, `general`
- ✅ Título no vacío (max 255 caracteres)
- ✅ Mensaje no vacío (max 5000 caracteres)
- ✅ Metadata es YAML/JSON válido (opcional)

**Funcionalidad automática:**
- 📱 Envío de push notification si el usuario tiene dispositivos registrados
- 💾 Persistencia en base de datos PostgreSQL
- 📝 Logging de operaciones
- 🔒 Control de permisos (requiere autenticación)

**Request Body:**
```yaml
nuusuid: "0000000000000000000000000000000000000024"
tipo: autorizacion
titulo: Autorización Aprobada
mensaje: Tu solicitud #12345 ha sido aprobada exitosamente.
metadata:
  autorizacionId: 12345
  prestacion: Consulta médica
  estado: APROBADA
```

**Response Success (201):**
```yaml
success: true
notification:
  id: 821b27aa-91da-4ae2-ac41-92fae41e6418
  nuusuid: "0000000000000000000000000000000000000024"
  tipo: autorizacion
  titulo: Autorización Aprobada
  mensaje: Tu solicitud #12345 ha sido aprobada exitosamente.
  fecha_creacion: 2026-02-18T10:30:00.000Z
```

**Response Error (400 - Validación):**
```yaml
error: VALIDATION_ERROR
message: Parámetros requeridos: nuusuid, tipo, titulo, mensaje
```

**Response Error (404 - Usuario no existe):**
```yaml
error: USER_NOT_FOUND
message: El usuario especificado no existe en la base de datos
```

### Consumo desde GeneXus

> **⚠️ BUG FRECUENTE**: `AddAuthentication(0, ...)` = Sin autenticación. Usar **`1`** para Basic Auth.

```genexus
// ============================================================================
// PROCEDURE: EnviarNotificacionViaAPI
// VALIDADO: 23/02/2026 ✅
// ============================================================================
Parm(in:&UsuarioId, in:&Tipo, in:&Titulo, in:&Mensaje, in:&MetadataJson, 
     out:&NotificacionId, out:&Exito, out:&MensajeError)

// Configurar HTTP Client
// Nota: en algunas versiones de GeneXus no compila `new HttpClient()`.
// En ese caso usar `new()` y declarar &HttpClient como variable HttpClient.
&HttpClient = new()
// En GX Java/Tomcat suele ser más estable usar BaseURL con / final y Execute sin / inicial
&HttpClient.BaseURL = "http://127.0.0.1:3000/"  // Cambiar por URL/IP accesible desde el runtime de GeneXus

// ✅ CORRECTO: tipo 1 = Basic Auth
// ❌ INCORRECTO: tipo 0 = Sin autenticación (no envía credenciales)
&HttpClient.AddAuthentication(1, !"", !"admin@test.local", !"admin123")

&HttpClient.AddHeader("Content-Type", "application/yaml")

// ✅ YAML multilínea → usar SOLO Chr(10) (LF), NO Chr(13)+Chr(10) (CRLF)
&RequestBody = "nuusuid: '" + &UsuarioId + "'" + Chr(10)
&RequestBody += "tipo: " + &Tipo + Chr(10)
&RequestBody += "titulo: " + EscapeYaml(&Titulo) + Chr(10)
&RequestBody += "mensaje: " + EscapeYaml(&Mensaje)

If Not &MetadataJson.IsEmpty()
    &RequestBody += Chr(10) + "metadata:" + Chr(10)
    &RequestBody += ConvertirJsonAYaml(&MetadataJson, "  ")
EndIf

// Agregar body y ejecutar
&HttpClient.AddString(&RequestBody)
&HttpClient.Execute(!"POST", "api/notifications/send")

// Capturar respuesta (aunque sea error HTTP). Nota: si ErrCode <> 0 puede venir vacía.
&Response = &HttpClient.ToString()

// Logging recomendado (dejarlo siempre, ayuda a diagnosticar sin mirar el backend)
msg("StatusCode=" + Trim(Str(&HttpClient.StatusCode)) + " ErrCode=" + Trim(Str(&HttpClient.ErrCode)) + " ErrDesc=" + &HttpClient.ErrDescription)
msg(&Response)

If &HttpClient.ErrCode <> 0
    // Error de red/conexión
    &Exito = False
    &NotificacionId = ""
    &MensajeError = "Error de red: " + &HttpClient.ErrDescription
    msg("❌ Error conexión: " + &MensajeError)
ElseIf &HttpClient.StatusCode = 201
    // Éxito - parsear id de la respuesta YAML
    // Extraer id de la línea "  id: <uuid>"
    &NotificacionId = &Response  // Guardar respuesta completa o parsear
    &Exito = True
    &MensajeError = ""
    // Evitar `.ToString()` en números si tu GX no lo soporta
    msg("✅ Notificación enviada. Status: " + Trim(Str(&HttpClient.StatusCode)))
ElseIf &HttpClient.StatusCode = 401
    &Exito = False
    &NotificacionId = ""
    &MensajeError = "No autorizado - verificar credenciales y tipo auth (debe ser 1)"
    msg("❌ 401 Unauthorized: " + &MensajeError)
ElseIf &HttpClient.StatusCode = 404
    &Exito = False
    &NotificacionId = ""
    &MensajeError = "Usuario no encontrado en la base de datos"
    msg("❌ 404: " + &MensajeError)
Else
    &Exito = False
    &NotificacionId = ""
    &MensajeError = "Error HTTP " + Trim(Str(&HttpClient.StatusCode)) + " - " + &Response
    msg("❌ Error API: " + &MensajeError)
EndIf
```

**Variante alternativa (GeneXus Java/Tomcat): `Host`/`Port`/`Secure`**

Si en tu versión estás usando `&HttpClient.Host`, `&HttpClient.Port` y `&HttpClient.Secure`, usá **una sola** forma de autenticación:
- O bien `AddAuthentication(1, ...)` (Basic)
- O bien `AddHeader("Authorization", "Basic ...")` (manual)

No mezclar `AddAuthentication(0, ...)` con Basic manual: `0` significa “sin autenticación” y suele confundir el diagnóstico.

Ejemplo (Basic manual):

```genexus
&HttpClient = new()
&HttpClient.Host = "localhost"
&HttpClient.Port = 3000
&HttpClient.Secure = 0
// Opcional (según versión): si usás Host/Port/Secure, BaseURL puede omitirse.
&HttpClient.BaseURL = "http://localhost:3000"

&HttpClient.AddHeader("Authorization", "Basic YWRtaW5AdGVzdC5sb2NhbDphZG1pbjEyMw==")
&HttpClient.AddHeader("Content-Type", "application/yaml")

&RequestBody = "nuusuid: '0000000000000000000000000000000000000027'" + Chr(10)
&RequestBody += "tipo: autorizacion" + Chr(10)
&RequestBody += "titulo: 'Autorización Aprobada desde GeneXus'" + Chr(10)
&RequestBody += "mensaje: Tu solicitud fue aprobada"

&HttpClient.AddString(&RequestBody)
&HttpClient.Execute(HttpMethod.Post, "/api/notifications/send")

// Si tu instalación se cuelga o no llega al backend, probar estas variantes:
// 1) &HttpClient.Execute(HttpMethod.Post, "api/notifications/send")
// 2) &HttpClient.BaseURL = "http://localhost:3000/" y Execute("api/notifications/send")

// Logging recomendado
msg("StatusCode=" + Trim(Str(&HttpClient.StatusCode)) + " ErrCode=" + Trim(Str(&HttpClient.ErrCode)) + " ErrDesc=" + &HttpClient.ErrDescription)
msg(&HttpClient.ToString())
```

#### Si se queda colgado en `Execute()` (debug: llega a “ANTES EXECUTE”)

Si tu log llega hasta `ANTES EXECUTE` pero **nunca** escribe “DESPUÉS EXECUTE”, el problema suele ser **conectividad** (el backend no es alcanzable desde donde corre GeneXus) o cómo GeneXus arma la URL.

Pruebas rápidas (en orden):

1) **Probar URL completa en Execute** (sin BaseURL):

```genexus
&HttpClient = new()
&HttpClient.Execute(!"GET", "http://127.0.0.1:3000/health")
```

1B) **Variante de slash (algunas versiones lo requieren)**:

```genexus
&HttpClient = new()
&HttpClient.BaseURL = "http://127.0.0.1:3000/"  // nota el / final
&HttpClient.Execute(!"GET", "health")          // nota: SIN / inicial
```

1C) **Variante localhost vs 127.0.0.1**:

```genexus
&HttpClient = new()
&HttpClient.Execute(!"GET", "http://localhost:3000/health")
```

2) **Probar con IP/hostname real del backend** (muy común si GeneXus corre en IIS/Tomcat en otro server):

```genexus
&HttpClient = new()
&HttpClient.Execute(!"GET", "http://<IP_DEL_BACKEND>:3000/health")
```

3) **Verificar desde el servidor GeneXus con PowerShell** (mismo host donde se ejecuta el runtime):

```powershell
Test-NetConnection -ComputerName <IP_DEL_BACKEND> -Port 3000
Invoke-WebRequest -Uri "http://<IP_DEL_BACKEND>:3000/health" -Method Get
```

### Ejemplo de uso completo

```genexus
// ========================================
// EVENT: AprobarAutorizacion
// ========================================
Event 'AprobarAutorizacion'
    
    // 1. Actualizar estado de la autorización (tu lógica existente)
    &AutorizacionId = &SolicitudSeleccionada.Id
    &AfiliadoId = &SolicitudSeleccionada.AfiliadoId
    &Estado = "APROBADA"
    
    // UPDATE autorizaciones SET estado = 'APROBADA' WHERE id = &AutorizacionId
    // ...
    
    // 2. Obtener nuusuid del afiliado (desde tabla nuusuari)
    &UsuarioId = GetUsuarioIdPorAfiliado(&AfiliadoId)  // Tu función
    
    If &UsuarioId.IsEmpty()
        msg("⚠️  Afiliado no tiene usuario registrado en la app")
        Return
    EndIf
    
    // 3. Preparar notificación
    &Tipo = "autorizacion"
    &Titulo = "Autorización Aprobada"
    &Mensaje = "Tu solicitud de autorización #" + Trim(Str(&AutorizacionId)) + " para " + &SolicitudSeleccionada.Prestacion + " ha sido aprobada exitosamente."
    
    // 4. Metadata (JSON interno, se convertirá a YAML en la API)
    &Metadata = '{'
    &Metadata += '"autorizacionId":' + Trim(Str(&AutorizacionId)) + ','
    &Metadata += '"prestacion":"' + EscapeJson(&SolicitudSeleccionada.Prestacion) + '",'
    &Metadata += '"estado":"APROBADA",'
    &Metadata += '"fechaAprobacion":"' + Now().ToString() + '"'
    &Metadata += '}'
    
    // 5. Enviar notificación vía API
    EnviarNotificacionViaAPI(&UsuarioId, &Tipo, &Titulo, &Mensaje, &Metadata, 
                            &NotifId, &Ok, &Error)
    
    If &Ok
        msg("✅ Autorización aprobada y usuario notificado" + CRLF + "Notificación ID: " + &NotifId)
        // Log en tabla de auditoría
        RegistrarLog("NOTIFICACION_ENVIADA", &UsuarioId, &NotifId)
    Else
        msg("⚠️  Autorización aprobada pero falló notificación" + CRLF + "Error: " + &Error)
        // Log del error
        RegistrarLog("NOTIFICACION_FALLIDA", &UsuarioId, &Error)
    EndIf
EndEvent
```

### Configuración de parámetros en nusispar

Debes crear estos registros en la tabla `nusispar` para la autenticación Basic Auth:

```sql
-- Usuario API (testing)
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr)
VALUES ('API_BACKEND', 'Usuario', 'admin@test.local', 'Usuario para autenticación API notificaciones');

-- Password API (testing)
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr)
VALUES ('API_BACKEND', 'Password', 'admin123', 'Contraseña para autenticación API notificaciones');
```

**IMPORTANTE**: Estas son credenciales de testing. Cambiar por credenciales reales en producción.

```

### Función auxiliar: ObtenerParametro

```genexus
// ============================================================================
// FUNCTION: ObtenerParametro
// Obtiene valor de parámetro desde nusispar
// ============================================================================
Parm(in:&Grupo, in:&Tipo, out:&Valor)

For Each nusispar
    Where nusisgrupa = &Grupo
      And nusistippa = &Tipo
    
    &Valor = nusisvalpa
    Return
EndFor

&Valor = ""  // No encontrado
```

### Función auxiliar: ToBase64

```genexus
// ============================================================================
// FUNCTION: ToBase64
// Convierte string a Base64 para Basic Auth
// ============================================================================
Parm(in:&Texto)

// GeneXus 17+: usar función nativa
&Resultado = Base64Encode(&Texto)

// GeneXus 16 o anterior: usar External Object
// &Encoder = new System.Text.Encoding.UTF8()
// &Bytes = &Encoder.GetBytes(&Texto)
// &Resultado = System.Convert.ToBase64String(&Bytes)

Return &Resultado
```

### Función auxiliar: EscapeYaml

```genexus
// ============================================================================
// FUNCTION: EscapeYaml
// Escapa caracteres especiales para YAML
// ============================================================================
Parm(in:&Texto)

&Resultado = &Texto

// Si contiene caracteres especiales, envolver en comillas
If &Texto.Contains(":") Or &Texto.Contains("#") Or &Texto.Contains("{") Or &Texto.Contains("[") Or &Texto.Contains(CRLF)
    &Resultado = &Resultado.Replace('"', '\"')     // Escape comillas
    &Resultado = '"' + &Resultado + '"'            // Envolver en comillas
EndIf

Return &Resultado
```

### Función auxiliar: ConvertirJsonAYaml

```genexus
// ============================================================================
// FUNCTION: ConvertirJsonAYaml
// Convierte JSON simple a formato YAML
// ============================================================================
Parm(in:&JsonString, in:&Indent)

// Parsear JSON (simplificado - para casos complejos usar biblioteca)
&JsonString = &JsonString.Trim()
&JsonString = &JsonString.Replace("{", "").Replace("}", "")

&Resultado = ""
&Pairs = &JsonString.Split(",")

For &I = 1 To &Pairs.Count()
    &Pair = &Pairs.Item(&I).Trim()
    &KeyValue = &Pair.Split(":")
    
    If &KeyValue.Count() = 2
        &Key = &KeyValue.Item(1).Replace('"', '').Trim()
        &Value = &KeyValue.Item(2).Replace('"', '').Trim()
        
        &Resultado += &Indent + &Key + ": " + &Value
        
        If &I < &Pairs.Count()
            &Resultado += CRLF
        EndIf
    EndIf
EndFor

Return &Resultado
```

### Función auxiliar: ParsearYaml

```genexus
// ============================================================================
// FUNCTION: ParsearYaml
// Parsea respuesta YAML a objeto navegable (simplificado)
// ============================================================================
Parm(in:&YamlString)

// Para GeneXus, convertir YAML a JSON y usar FromJsonString
// O usar biblioteca externa de parsing YAML
&JsonString = ConvertirYamlAJson(&YamlString)

&Obj = new GxSimpleCollection()
&Obj.FromJsonString(&JsonString)

Return &Obj
```

### Función auxiliar: ObtenerValorYaml

```genexus
// ============================================================================
// FUNCTION: ObtenerValorYaml
// Obtiene valor de un objeto YAML parseado
// ============================================================================
Parm(in:&YamlObj, in:&Path)

Return &YamlObj.Get(&Path)
```

---

## PHP (Integración Directa)

### Usando PDO (PostgreSQL)

```php
<?php
/**
 * Enviar notificación a usuario
 * @param PDO $pdo Conexión a PostgreSQL
 * @param string $nuusuid ID del usuario destinatario
 * @param string $tipo Tipo: 'autorizacion', 'credencial', 'general'
 * @param string $titulo Título de la notificación
 * @param string $mensaje Cuerpo del mensaje
 * @param array|null $metadata Datos adicionales (opcional)
 * @return string UUID de la notificación creada
 */
function enviarNotificacion($pdo, $nuusuid, $tipo, $titulo, $mensaje, $metadata = null) {
    $sql = "INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, metadata)
            VALUES (gen_random_uuid(), :nuusuid, :tipo, :titulo, :mensaje, false, NOW(), :metadata)
            RETURNING id";
    
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':nuusuid', $nuusuid);
    $stmt->bindParam(':tipo', $tipo);
    $stmt->bindParam(':titulo', $titulo);
    $stmt->bindParam(':mensaje', $mensaje);
    $stmt->bindValue(':metadata', $metadata ? json_encode($metadata) : null, PDO::PARAM_STR);
    
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return $result['id'];
}

// Uso
try {
    $pdo = new PDO(
        'pgsql:host=localhost;port=5432;dbname=app_afiliados_genexus',
        'postgres',
        'tu_password'
    );
    
    $notifId = enviarNotificacion(
        $pdo,
        '0000000000000000000000000000000000000024',
        'autorizacion',
        'Autorización Aprobada',
        'Tu solicitud #12345 ha sido aprobada exitosamente.',
        [
            'autorizacionId' => 12345,
            'prestacion' => 'Consulta médica'
        ]
    );
    
    echo "✅ Notificación enviada: $notifId\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
```

### Usando función PostgreSQL

```php
<?php
$sql = "SELECT crear_notificacion_con_push(:nuusuid, :tipo, :titulo, :mensaje, :metadata::jsonb)";

$stmt = $pdo->prepare($sql);
$stmt->bindParam(':nuusuid', $nuusuid);
$stmt->bindParam(':tipo', $tipo);
$stmt->bindParam(':titulo', $titulo);
$stmt->bindParam(':mensaje', $mensaje);
$stmt->bindValue(':metadata', json_encode($metadata), PDO::PARAM_STR);

$stmt->execute();
$notifId = $stmt->fetchColumn();

echo "✅ Notificación ID: $notifId\n";
?>
```

---

## PowerShell (Scripts Administrativos)

### Usando módulo PostgreSQL

```powershell
# Requiere: Install-Module -Name PostgreSql
Import-Module PostgreSql

$connectionString = "Host=localhost;Port=5432;Database=app_afiliados_genexus;Username=postgres;Password=tu_password"

function Enviar-Notificacion {
    param(
        [string]$UsuarioId,
        [string]$Tipo,
        [string]$Titulo,
        [string]$Mensaje,
        [hashtable]$Metadata = $null
    )
    
    $metadataJson = if ($Metadata) { ($Metadata | ConvertTo-Json -Compress) } else { $null }
    
    $query = @"
INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, metadata)
VALUES (gen_random_uuid(), @nuusuid, @tipo, @titulo, @mensaje, false, NOW(), @metadata::jsonb)
RETURNING id
"@
    
    $params = @{
        nuusuid = $UsuarioId
        tipo = $Tipo
        titulo = $Titulo
        mensaje = $Mensaje
        metadata = $metadataJson
    }
    
    try {
        $result = Invoke-PgQuery -ConnectionString $connectionString -Query $query -Parameters $params
        Write-Host "✅ Notificación enviada: $($result.id)" -ForegroundColor Green
        return $result.id
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        return $null
    }
}

# Uso
Enviar-Notificacion `
    -UsuarioId "0000000000000000000000000000000000000024" `
    -Tipo "autorizacion" `
    -Titulo "Autorización Aprobada" `
    -Mensaje "Tu solicitud #12345 ha sido aprobada exitosamente." `
    -Metadata @{
        autorizacionId = 12345
        estado = "APROBADA"
    }
```

### Script batch para notificar múltiples usuarios

```powershell
# notify-users-batch.ps1
# Notificar a múltiples usuarios desde CSV

param(
    [Parameter(Mandatory=$true)]
    [string]$CsvPath
)

Import-Module PostgreSql

$connectionString = "Host=localhost;Port=5432;Database=app_afiliados_genexus;Username=postgres;Password=tu_password"

# Leer CSV con columnas: UsuarioId,Tipo,Titulo,Mensaje
$usuarios = Import-Csv -Path $CsvPath

$total = $usuarios.Count
$exitosos = 0
$fallidos = 0

foreach ($user in $usuarios) {
    Write-Host "Procesando usuario $($user.UsuarioId)..." -NoNewline
    
    $query = "INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion) 
              VALUES (gen_random_uuid(), :uid, :tipo, :titulo, :mensaje, false, NOW())"
    
    try {
        Invoke-PgQuery -ConnectionString $connectionString -Query $query -Parameters @{
            uid = $user.UsuarioId
            tipo = $user.Tipo
            titulo = $user.Titulo
            mensaje = $user.Mensaje
        } | Out-Null
        
        Write-Host " ✅ OK" -ForegroundColor Green
        $exitosos++
    } catch {
        Write-Host " ❌ ERROR: $_" -ForegroundColor Red
        $fallidos++
    }
}

Write-Host "`n📊 Resumen:" -ForegroundColor Cyan
Write-Host "   Total: $total" -ForegroundColor White
Write-Host "   Exitosos: $exitosos" -ForegroundColor Green
Write-Host "   Fallidos: $fallidos" -ForegroundColor Red
```

---

## Node.js (Backend Integration)

### Función helper (ya implementada)

```javascript
const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'app_afiliados_genexus',
  user: 'postgres',
  password: 'tu_password'
})

/**
 * Crear notificación para usuario
 * @param {string} nuusuid - ID del usuario
 * @param {string} tipo - Tipo: autorizacion, credencial, general
 * @param {string} titulo - Título de la notificación
 * @param {string} mensaje - Mensaje completo
 * @param {object|null} metadata - Datos adicionales (opcional)
 * @returns {Promise<object>} Notificación creada
 */
async function crearNotificacion(nuusuid, tipo, titulo, mensaje, metadata = null) {
  const query = `
    INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, metadata)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, false, NOW(), $5)
    RETURNING *
  `
  
  const values = [
    nuusuid,
    tipo,
    titulo,
    mensaje,
    metadata ? JSON.stringify(metadata) : null
  ]
  
  try {
    const result = await pool.query(query, values)
    console.log('✅ Notificación creada:', result.rows[0].id)
    return result.rows[0]
  } catch (error) {
    console.error('❌ Error creando notificación:', error)
    throw error
  }
}

// Uso
crearNotificacion(
  '0000000000000000000000000000000000000024',
  'autorizacion',
  'Autorización Aprobada',
  'Tu solicitud #12345 ha sido aprobada exitosamente.',
  { autorizacionId: 12345, prestacion: 'Consulta médica' }
)
  .then(notif => console.log('ID:', notif.id))
  .catch(err => console.error('Error:', err))
```

---

## 🧪 Testing

### Script de prueba (PowerShell)

```powershell
# test-enviar-notificacion.ps1
Import-Module PostgreSql

$connectionString = "Host=localhost;Port=5432;Database=app_afiliados_genexus;Username=postgres;Password=admin"

Write-Host "🧪 Test: Enviar notificación de prueba" -ForegroundColor Cyan

# Obtener primer usuario de la BD
$userQuery = "SELECT nuusuid, nuusuapell FROM nuusuari WHERE nuusuid IS NOT NULL LIMIT 1"
$user = Invoke-PgQuery -ConnectionString $connectionString -Query $userQuery

if (-not $user) {
    Write-Host "❌ No hay usuarios en la BD" -ForegroundColor Red
    exit 1
}

Write-Host "Usuario seleccionado: $($user.nuusuapell) ($($user.nuusuid))" -ForegroundColor Yellow

# Crear notificación de prueba
$query = @"
INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, metadata)
VALUES (gen_random_uuid(), @uid, @tipo, @titulo, @mensaje, false, NOW(), @meta::jsonb)
RETURNING id, tipo, titulo, fecha_creacion
"@

$params = @{
    uid = $user.nuusuid
    tipo = 'general'
    titulo = 'Test desde PowerShell'
    mensaje = 'Esta es una notificación de prueba enviada desde script PowerShell.'
    meta = '{"test": true, "timestamp": "' + (Get-Date -Format "o") + '"}'
}

try {
    $result = Invoke-PgQuery -ConnectionString $connectionString -Query $query -Parameters $params
    
    Write-Host "`n✅ Notificación creada exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($result.id)" -ForegroundColor White
    Write-Host "   Tipo: $($result.tipo)" -ForegroundColor White
    Write-Host "   Título: $($result.titulo)" -ForegroundColor White
    Write-Host "   Fecha: $($result.fecha_creacion)" -ForegroundColor White
    
    # Verificar en BD
    $verifyQuery = "SELECT COUNT(*) as total FROM notifications WHERE nuusuid = @uid AND leida = false"
    $count = (Invoke-PgQuery -ConnectionString $connectionString -Query $verifyQuery -Parameters @{ uid = $user.nuusuid }).total
    
    Write-Host "`n📬 Total notificaciones no leídas: $count" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    exit 1
}
```

---

## 📊 Casos de Uso Comunes

### 1. Notificar cuando se aprueba una autorización

```genexus
// En el evento de aprobar autorización
&UsuarioId = GetUsuarioIdDelAfiliado(&AfiliadoId)  // Tu lógica
&Metadata = '{"autorizacionId":' + Trim(Str(&AutorizacionId)) + '}'

EnviarNotificacionUsuario(
    &UsuarioId,
    "autorizacion",
    "Autorización Aprobada",
    "Tu solicitud de autorización #" + Trim(Str(&AutorizacionId)) + " ha sido aprobada.",
    &Metadata,
    &NotifId,
    &Ok
)
```

### 2. Recordatorio de credencial próxima a vencer

```genexus
// Job diario programado
For Each Credencial
    Where CredencialFechaVencimiento BETWEEN Today() AND AddDays(Today(), 7)
      And CredencialNotificacionVencimientoEnviada = False
    
    &DiasRestantes = DateDiff(CredencialFechaVencimiento, Today(), 'day')
    
    EnviarNotificacionUsuario(
        CredencialUsuarioId,
        "credencial",
        "Credencial próxima a vencer",
        "Tu credencial vence en " + Trim(Str(&DiasRestantes)) + " día" + If(&DiasRestantes > 1, "s", "") + ". Actualízala desde la app.",
        '{"diasRestantes":' + Trim(Str(&DiasRestantes)) + '}',
        &NotifId,
        &Ok
    )
    
    If &Ok
        CredencialNotificacionVencimientoEnviada = True
        Update Credencial
    EndIf
EndFor
```

### 3. Mensaje de bienvenida al registrarse

```genexus
// Después del registro exitoso
EnviarNotificacionUsuario(
    &NuevoUsuarioId,
    "general",
    "Bienvenido a OSEP",
    "Gracias por registrarte. Tu credencial digital ya está disponible en la app.",
    null,
    &NotifId,
    &Ok
)
```

### 4. Notificación masiva (mantenimiento del sistema)

```powershell
# Script para notificar a TODOS los usuarios
$query = @"
INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion)
SELECT 
    gen_random_uuid(),
    nuusuid,
    'general',
    'Mantenimiento Programado',
    'La app estará en mantenimiento el sábado 10/02 de 00:00 a 06:00 hs. Disculpe las molestias.',
    false,
    NOW()
FROM nuusuari
WHERE nuusuid IS NOT NULL
RETURNING id
"@

$result = Invoke-PgQuery -ConnectionString $connectionString -Query $query
Write-Host "✅ Enviadas $($result.Count) notificaciones"
```

---

## 🔒 Seguridad y Buenas Prácticas

### ✅ DO (Hacer)

- **Validar `nuusuid`**: Verificar que el usuario existe antes de enviar
- **Escapar texto**: Usar parámetros SQL preparados (`:p1`, `:p2`), NUNCA concatenar strings
- **Limitar tamaño**: Título max 255 chars, mensaje max 5000 chars
- **Metadata estructurado**: Usar YAML/JSON válido en campo metadata
- **Tipos correctos**: Usar solo `autorizacion`, `credencial`, `general`
- **Formato YAML**: Para API REST, usar `Content-Type: application/yaml`

### ❌ DON'T (No hacer)

- **NO usar SQL injection**: ❌ `"... VALUES ('" + &Texto + "')"` → ✅ usar `:p1`
- **NO enviar HTML**: El texto debe ser plano, sin tags HTML
- **NO abusar de notificaciones**: Máximo 1 notificación del mismo tipo por día por usuario
- **NO hardcodear mensajes**: Usar parámetros de sistema para textos configurables
- **NO olvidar logs**: Registrar envíos para auditoría

### Logs recomendados

```genexus
// Loguear envíos de notificaciones
&LogQuery = "INSERT INTO notificaciones_log (fecha, nuusuid, tipo, titulo, exito) VALUES (NOW(), :p1, :p2, :p3, :p4)"
&Cmd = new GxCommand()
&Cmd.CommandText = &LogQuery
&Cmd.AddParameter("p1", &UsuarioId)
&Cmd.AddParameter("p2", &Tipo)
&Cmd.AddParameter("p3", &Titulo)
&Cmd.AddParameter("p4", &Exito)
&Cmd.ExecuteNonQuery()
```

---

## � Troubleshooting (Resolución de Problemas)

### ❌ Error 401: Unauthorized

**Síntoma:**
```yaml
error: unauthorized
message: Token de autorización inválido o faltante
```

**Causas y soluciones:**

1. **`AddAuthentication` con tipo incorrecto:** ⭐ ERROR MÁS COMÚN
   ```genexus
   // ❌ MAL - tipo 0 = Sin autenticación (no envía credenciales)
   &HttpClient.AddAuthentication(0, !"", !"admin@test.local", !"admin123")
   
   // ✅ BIEN - tipo 1 = Basic Auth
   &HttpClient.AddAuthentication(1, !"", !"admin@test.local", !"admin123")
   ```

2. **Header Authorization manual mal formado:**
   ```genexus
   // ❌ MAL (falta "Basic ")
   &HttpClient.AddHeader("Authorization", &Base64Token)
   
   // ✅ BIEN (si se construye manualmente)
   &HttpClient.AddHeader("Authorization", "Basic " + &Base64Token)
   // PERO preferir AddAuthentication(1,...) que es más simple
   ```

3. **Usuario/contraseña inválidos:**
   - Verificar que el usuario existe en tabla `nuusuari`
   - Verificar que la contraseña es correcta (hash en `nuusuauth`)
   - Usar usuario de prueba validado: `admin@test.local` / `admin123`

### ❌ Error 400: Bad Request

**Síntoma:**
```yaml
error: bad_request
message: Error parseando YAML
```

**Causas y soluciones:**

1. **Indentación incorrecta:**
   ```genexus
   // ❌ MAL (tabuladores)
   &Body = "nuusuid: 123" + Chr(13) + Chr(10)
   &Body += "	metadata:" + Chr(13) + Chr(10)  // tab ❌
   
   // ✅ BIEN (2 espacios)
   &Body = "nuusuid: 123" + Chr(13) + Chr(10)
   &Body += "metadata:" + Chr(13) + Chr(10)
   &Body += "  key: value" + Chr(13) + Chr(10)  // 2 espacios ✅
   ```

2. **Comillas en valores:**
   ```genexus
   // ❌ MAL (texto sin comillas con caracteres especiales)
   &Body += "titulo: Error: Fallo" + CRLF
   
   // ✅ BIEN (texto con comillas)
   &Body += 'titulo: "Error: Fallo"' + CRLF
   ```

3. **Header Content-Type faltante:**
   ```genexus
   // ✅ OBLIGATORIO
   &HttpClient.AddHeader("Content-Type", "application/yaml")
   ```

### ❌ Error de conexión (no responde)

**Causas comunes:**

1. **Backend no está corriendo:**
   ```powershell
   cd backend
   .\restart-backend.ps1
   ```

2. **Firewall bloquea puerto 3000:**
   - Verificar: `netstat -ano | findstr :3000`
   - Revisar reglas de firewall de Windows

3. **URL incorrecta:**
   ```genexus
   // ❌ MAL
   &Url = "http://localhost:3000/notificaciones/send"
   
   // ✅ BIEN
   &Url = "http://localhost:3000/api/notifications/send"
   ```

### 🧪 Test rápido de conectividad

**PowerShell (desde servidor GeneXus):**

```powershell
# Test 1: Verificar puerto abierto
Test-NetConnection -ComputerName localhost -Port 3000

# Test 2: Test HTTP básico
Invoke-WebRequest -Uri "http://localhost:3000/health" -Method Get

# Test 3: Test Basic Auth completo
$user = "admin@test.local"
$pass = "admin123"
$base64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${user}:${pass}"))

$headers = @{
    "Authorization" = "Basic $base64"
    "Content-Type" = "application/yaml"
}

$body = @"
nuusuid: "0000000000000000000000000000000000000024"
tipo: general
titulo: Test desde PowerShell
mensaje: Mensaje de prueba
"@

Invoke-RestMethod -Uri "http://localhost:3000/api/notifications/send" `
    -Method Post `
    -Headers $headers `
    -Body $body
```

**GeneXus (desde el mismo server donde corre GeneXus):**

> Importante:
> - Un `Sub` **no se ejecuta solo**: hay que invocarlo con `Do 'NombreSub'` (o `Call` según tu objeto).
> - Si estás en un Web Server (IIS/Tomcat), `debug.txt` se escribe en el **filesystem del server**. Usar un path absoluto ayuda a encontrarlo.
> - En GeneXus **Java/Tomcat**, suele funcionar mejor: `BaseURL` con `/` final y `Execute` **sin** `/` inicial (ej: `BaseURL="http://127.0.0.1:3000/"` + `Execute("health")`).

```genexus
// Ejemplo: llamar el Sub desde Start/Event
// Event Start
//     Do 'TestHealth'
// EndEvent

Sub 'TestHealth'
    &DebugPath = "C:\\temp\\gx_debug_health.txt"  // ajustar si tu server no es Windows
    FUDebug(&DebugPath, "01 - BEGIN TestHealth")

    // En GeneXus, declarar &HttpClient como variable de tipo HttpClient y crearla con new()
    &HttpClient = new()
    FUDebug(&DebugPath, "02 - CREE HttpClient")
    // Para GeneXus Java/Tomcat: BaseURL con / final
    &HttpClient.BaseURL = "http://127.0.0.1:3000/"
    FUDebug(&DebugPath, "03 - BaseURL OK -> " + &HttpClient.BaseURL)

    // Si tu GX soporta Timeout (si no existe, quitar esta línea)
    // &HttpClient.Timeout = 15000

    // Opción A (recomendada en Java/Tomcat): BaseURL + path SIN / inicial
    FUDebug(&DebugPath, "04 - ANTES EXECUTE (BaseURL + path)")

    &HttpClient.Execute(!"GET", "health")

    // Si se cuelga acá (no aparece la siguiente línea), casi seguro es conectividad/host incorrecto
    FUDebug(&DebugPath, "05 - DESPUES EXECUTE")

    // Evitar .ToString() en números si tu GX no lo soporta
    FUDebug(&DebugPath, "HEALTH StatusCode -> " + Trim(Str(&HttpClient.StatusCode)))
    FUDebug(&DebugPath, "HEALTH ErrCode -> " + Trim(Str(&HttpClient.ErrCode)))
    FUDebug(&DebugPath, "HEALTH ErrDesc -> " + &HttpClient.ErrDescription)
    FUDebug(&DebugPath, "HEALTH Response -> " + &HttpClient.ToString())

    // Opción B (alternativa): URL completa (útil para aislar si falla el armado BaseURL+path)
    // &HttpClient = new()
    // FUDebug(&DebugPath, "04B - ANTES EXECUTE (URL completa)")
    // &HttpClient.Execute(!"GET", "http://127.0.0.1:3000/health")
    // FUDebug(&DebugPath, "05B - DESPUES EXECUTE (URL completa)")
EndSub
```

### 📋 Checklist de verificación

Antes de reportar un error, verificar:

- [ ] Backend corriendo en puerto 3000
- [ ] Usuario existe en BD: `SELECT * FROM nuusuari WHERE nuusuemail = 'usuario@email.com'`
- [ ] Contraseña válida en `nuusuauth`
- [ ] Header `Authorization: Basic <base64>` correctamente formado
- [ ] Header `Content-Type: application/yaml` presente
- [ ] Body YAML con indentación de 2 espacios (NO tabs)
- [ ] Valores de texto con caracteres especiales entre comillas
- [ ] nuusuid existe en tabla `nuusuari`

---

## �📞 Soporte y Referencias

**Documentación relacionada:**
- 📂 API REST completa: `backend/API_NOTIFICACIONES.md`
- 🧪 Script de prueba: `backend/test-notif-quick.ps1`
- 🔧 Backend: `backend/server-soap.js` (líneas 4307-4450)

**Consultas SQL útiles:**

```sql
-- Ver últimas 10 notificaciones
SELECT id, nuusuid, tipo, titulo, leida, fecha_creacion
FROM notifications
ORDER BY fecha_creacion DESC
LIMIT 10;

-- Contar notificaciones por tipo
SELECT tipo, COUNT(*) as total
FROM notifications
GROUP BY tipo;

-- Usuarios con más notificaciones no leídas
SELECT nuusuid, COUNT(*) as no_leidas
FROM notifications
WHERE leida = false
GROUP BY nuusuid
ORDER BY no_leidas DESC
LIMIT 10;
```

---

**Última actualización:** 19 de febrero de 2026  
**Versión:** 2.0 - Migración a formato YAML para API REST
