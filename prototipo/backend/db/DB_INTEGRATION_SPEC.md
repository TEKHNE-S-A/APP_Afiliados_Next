# Especificación de Integración con Base de Datos

**Fecha**: 3 de diciembre de 2025  
**Estado**: ✅ IMPLEMENTADO  
**Base de Datos**: PostgreSQL 10.23 (`app_afiliados_genexus`)  
**Backend**: Node.js + Express + SOAP + pg

## Resumen Ejecutivo

Este documento especifica cómo la aplicación móvil interactúa con la base de datos PostgreSQL durante el proceso de **registración de usuarios**.

**Funcionalidad Principal**:
- Al registrarse exitosamente (validación SOAP OK), los datos del usuario se guardan automáticamente en la tabla `nuusuari`
- El campo `nuusuid` (PK) se autogenera mediante secuencia de PostgreSQL
- El backend combina datos del formulario de registro + respuesta SOAP para completar el registro en DB

**Archivos Implementados**:
- `backend/db/connection.js` - Módulo de conexión PostgreSQL (Pool)
- `backend/server-soap.js` - Función `saveToNuusuari()` y llamada en ruta `/register`

**Documentos Relacionados**:
- [`CRCREDEN_INTEGRATION_SPEC.md`](./CRCREDEN_INTEGRATION_SPEC.md) - Especificación de sincronización de credenciales del grupo familiar (tabla `crcreden`)

---

## Tabla: `nuusuari` (Usuarios/Afiliados)

### Descripción
Tabla principal que respaldará los datos de registración de usuarios/afiliados en la aplicación móvil.

### Campos del Registro

La tabla `nuusuari` almacenará la siguiente información obtenida durante el proceso de registro:

| Campo | Descripción | Origen de Datos |
|-------|-------------|-----------------|
| **Credencial** | Número de credencial del afiliado | Capturado en formulario de registro |
| **Fecha de Nacimiento** | Fecha de nacimiento del afiliado | Capturado en formulario de registro |
| **Sexo** | Sexo del afiliado (M/F) | Capturado en formulario de registro |
| **Email** | Correo electrónico del usuario | Capturado en formulario de registro |
| **Nombre** | Nombre del afiliado | Obtenido desde SOAP API / Capturado manualmente |
| **Apellido** | Apellido del afiliado | Obtenido desde SOAP API / Capturado manualmente |
| **Plan** | ID/Descripción del plan de salud | Obtenido desde SOAP API |
| **Es Titular** | Indicador si es titular o familiar | Obtenido desde SOAP API (campo "PARENTESCO") |
| **Número de Afiliado** | Número único de afiliado | Obtenido desde SOAP API |

### Estructura de la Tabla `nuusuari`

**Campo Clave Primaria**: `nuusuid` (autogenerado mediante secuencia)

El campo `nuusuid` será autogenerado por PostgreSQL utilizando la secuencia asociada a la tabla.

**Columnas de la tabla `nuusuari`**:

| Columna | Tipo | Nulo | Descripción | Mapeo desde Registro |
|---------|------|------|-------------|----------------------|
| `nuusuid` | bpchar(40) | NOT NULL | ID único del usuario (PK) | **AUTOGENERADO** |
| `nuusuafili` | varchar(40) | NOT NULL | ID de afiliado | `AfiliadoId` desde SOAP |
| `nuplaid` | bpchar(30) | NULL | ID del plan | `PlanId` desde SOAP |
| `nuusufecha` | date | NOT NULL | Fecha de nacimiento | `fechaNacimiento` del formulario |
| `nuusunroaf` | bpchar(20) | NOT NULL | Número de afiliado | `AfiliadoNro` desde SOAP |
| `nuususexo` | bpchar(1) | NULL | Sexo (M/F) | `sexo` del formulario |
| `nuusuapell` | bpchar(60) | NOT NULL | Apellido y Nombre | `Apellido + ', ' + Nombre` desde SOAP |
| `nuusuestit` | bpchar(1) | NULL | Es titular (S/N) | `EsTitular` desde SOAP |
| `nuusutelef` | bpchar(20) | NOT NULL | Teléfono | Del formulario o valor por defecto |
| `nuusumail` | varchar(100) | NOT NULL | Email | `email` del formulario |
| `nuusubille` | bpchar(1) | NOT NULL | Billetera electrónica | Valor por defecto 'N' |
| `nuusuidbil` | bpchar(40) | NOT NULL | ID billetera | Valor por defecto '' |
| `nuusumailf` | timestamp | NOT NULL | Fecha validación mail | NOW() |
| `nuusui_gxi` | varchar(2048) | NULL | Información extra | NULL |
| `nuusui` | bytea | NULL | Imagen/foto | NULL |
| `nuusuacept` | bpchar(1) | NULL | Aceptó términos | Valor por defecto 'S' |
| `nuusuqrbil` | text | NOT NULL | QR billetera | Valor por defecto '' |
| `nuusuultno` | int8 | NOT NULL | Última notificación | Valor por defecto 0 |
| `nuusubajaf` | timestamp | NOT NULL | Fecha de baja | Valor por defecto NOW() o NULL |
| `nuusunivel` | int2 | NOT NULL | Nivel de usuario | Valor por defecto 1 |

Comando para consultar estructura:
```sql
\d nuusuari
```

**Nota**: La secuencia para `nuusuid` se gestiona automáticamente por la base de datos.

### Flujo de Interacción

#### 1. Proceso de Registro
```
Mobile App (RegisterScreen)
    ↓
Backend API (POST /register)
    ↓
SOAP Service (REGISTRACION)
    ↓ (Valida datos)
Backend API
    ↓ (Inserta en DB)
INSERT INTO nuusuari (...) VALUES (...)
```

#### 2. Datos a Almacenar

**Desde el formulario de registro:**
- Credencial/DNI
- Fecha de nacimiento
- Sexo
- Email
- (Opcionalmente: Nombre y Apellido si no se obtienen desde SOAP)

**Desde la respuesta SOAP (servicio `REGISTRACION`):**
- AfiliadoId
- AfiliadoNro (Número de afiliado)
- Apellido
- Nombre
- PlanId
- PlanDescripcion
- EsTitular (S/N)

#### 3. Mapeo de Campos

Mapeo entre la respuesta SOAP y los campos de la tabla `nuusuari`:

```javascript
// Ejemplo de respuesta SOAP REGISTRACION:
{
  "AfiliadoId": "000000796000000000001000000796",
  "AfiliadoNro": "123456789",
  "Apellido": "AGUIRRE",
  "Nombre": "SERGIO DANIEL",
  "PlanId": "1",
  "PlanDescripcion": "AMPLIO",
  "EsTitular": "S",
  "ErrorDsc": ""
}

// Datos del formulario:
{
  credencial: "12345678",
  fechaNacimiento: "1980-05-15",
  sexo: "M",
  email: "usuario@example.com",
  telefono: "1234567890" // opcional
}

// Mapeo a INSERT en nuusuari:
INSERT INTO nuusuari (
  nuusuid,           -- AUTOGENERADO por secuencia
  nuusuafili,        -- response.AfiliadoId
  nuplaid,           -- response.PlanId
  nuusufecha,        -- form.fechaNacimiento
  nuusunroaf,        -- response.AfiliadoNro
  nuususexo,         -- form.sexo
  nuusuapell,        -- response.Apellido + ', ' + response.Nombre
  nuusuestit,        -- response.EsTitular
  nuusutelef,        -- form.telefono || '0000000000'
  nuusumail,         -- form.email
  nuusubille,        -- 'N' (por defecto)
  nuusuidbil,        -- '' (por defecto)
  nuusumailf,        -- NOW()
  nuusui_gxi,        -- NULL
  nuusui,            -- NULL
  nuusuacept,        -- 'S' (por defecto)
  nuusuqrbil,        -- '' (por defecto)
  nuusuultno,        -- 0 (por defecto)
  nuusubajaf,        -- NOW()
  nuusunivel         -- 1 (por defecto)
) VALUES (
  DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8, $9, 'N', '', NOW(), NULL, NULL, 'S', '', 0, NOW(), 1
) RETURNING nuusuid;
```

### Operaciones CRUD

#### CREATE - Registro de nuevo usuario
**Endpoint**: `POST /register`

**Funcionalidad**:
Al completar exitosamente el proceso de registro (validación SOAP exitosa), el sistema debe:

1. Recibir datos del formulario de registro (credencial, fecha_nac, sexo, email)
2. Validar contra el servicio SOAP `REGISTRACION`
3. Si la validación es exitosa, insertar un nuevo registro en `nuusuari`
4. El campo `nuusuid` será autogenerado por la secuencia de PostgreSQL
5. Retornar confirmación de registro exitoso

**Query SQL (ejemplo)**:
```sql
INSERT INTO nuusuari (
    nuusuafili,        -- AfiliadoId desde SOAP
    nuplaid,           -- PlanId desde SOAP
    nuusufecha,        -- Fecha de nacimiento del formulario
    nuusunroaf,        -- AfiliadoNro desde SOAP
    nuususexo,         -- Sexo del formulario
    nuusuapell,        -- Apellido + ', ' + Nombre desde SOAP
    nuusuestit,        -- EsTitular desde SOAP
    nuusutelef,        -- Teléfono del formulario
    nuusumail,         -- Email del formulario
    nuusubille,        -- Billetera electrónica (default 'N')
    nuusuidbil,        -- ID billetera (default '')
    nuusumailf,        -- Fecha validación mail
    nuusuacept,        -- Aceptó términos (default 'S')
    nuusuqrbil,        -- QR billetera (default '')
    nuusuultno,        -- Última notificación (default 0)
    nuusubajaf,        -- Fecha de baja
    nuusunivel         -- Nivel usuario (default 1)
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, 'N', '', NOW(), 'S', '', 0, NOW(), 1
) RETURNING nuusuid;
```

**Parámetros**:
- `$1`: AfiliadoId (string)
- `$2`: PlanId (string)
- `$3`: FechaNacimiento (date)
- `$4`: AfiliadoNro (string)
- `$5`: Sexo (char)
- `$6`: ApellidoNombre (string, formato: "APELLIDO, NOMBRE")
- `$7`: EsTitular (char 'S' o 'N')
- `$8`: Teléfono (string)
- `$9`: Email (string)

**Implementación en Backend**:
- Archivo: `backend/server-soap.js` (ruta `/register`)
- Módulo DB: `backend/db/connection.js` (conexión PostgreSQL mediante `pg`)
- Función: `saveToNuusuari(formData, soapResponse)` (línea ~120)
- Flujo:
  1. Usuario completa formulario de registro en app móvil
  2. Backend valida datos contra servicio SOAP `REGISTRACION`
  3. Si validación SOAP exitosa, backend llama `saveToNuusuari()`
  4. Se inserta registro en tabla `nuusuari` con `nuusuid` autogenerado
  5. Backend retorna confirmación con `{ success, data: { nuusuid, afiliadoId, ... } }`
- Transacción: Validar SOAP → Insertar en DB → Confirmar registro
- Manejo de errores: Si falla la inserción en DB, se loguea el error pero no se falla el registro (SOAP exitoso se mantiene)

**Estado de Implementación**: ✅ IMPLEMENTADO
- Conexión PostgreSQL configurada
- Función `saveToNuusuari()` creada
- Integración en ruta `/register` completada
- Paquete `pg` instalado
- Backend reiniciado con nueva funcionalidad

```sql
INSERT INTO nuusuari (
  afiliado_id,
  numero_afiliado,
  apellido,
  nombre,
  plan_id,
  plan_descripcion,
  es_titular,
  email,
  fecha_nacimiento,
  sexo,
  credencial,
  created_at,
  updated_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
);
```

#### READ - Consulta de usuario
**Endpoint**: `GET /auth/me`

```sql
SELECT 
  afiliado_id,
  numero_afiliado,
  apellido,
  nombre,
  plan_id,
  plan_descripcion,
  es_titular,
  email,
  fecha_nacimiento,
  sexo,
  credencial,
  created_at,
  updated_at
FROM nuusuari
WHERE afiliado_id = $1;
```

#### UPDATE - Actualización de perfil
**Endpoint**: `PUT /profile`

```sql
UPDATE nuusuari
SET 
  email = $2,
  updated_at = NOW()
WHERE afiliado_id = $1;
```

#### DELETE - No implementado
Por políticas de negocio, no se permitirá eliminar usuarios. Solo se podrá marcar como inactivo.

### Consideraciones de Seguridad

1. **Password**: La tabla `nuusuari` NO debe almacenar contraseñas. El backend actual usa SOAP para autenticación.
2. **Tokens**: Los tokens de sesión se almacenan en la tabla `nuusutok` (tabla separada).
3. **Datos sensibles**: Email y fecha de nacimiento deben ser tratados como información sensible.

### Próximos Pasos

1. [ ] Verificar estructura actual de `nuusuari` en la base de datos
2. [ ] Documentar campos faltantes o adicionales
3. [ ] Implementar capa de acceso a datos en backend (pg, Sequelize, o TypeORM)
4. [ ] Crear endpoints REST para interactuar con `nuusuari`
5. [ ] Integrar mobile app con nuevos endpoints

---

**Última actualización**: 3 de diciembre de 2025  
**Estado**: Borrador inicial - Pendiente revisión de estructura real de tabla
