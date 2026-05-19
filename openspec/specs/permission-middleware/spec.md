## ADDED Requirements

### Requirement: Middleware de permiso por módulo
El sistema SHALL proveer una función factory `requirePermission(module)` que retorna un middleware Express para proteger endpoints por módulo.

#### Scenario: Usuario con permiso al módulo
- **WHEN** un admin con rol que incluye `"parametros"` accede a un endpoint protegido con `requirePermission('parametros')`
- **THEN** el middleware llama `next()` y la petición continúa

#### Scenario: Usuario sin permiso al módulo
- **WHEN** un admin con rol que NO incluye `"sia"` accede a un endpoint protegido con `requirePermission('sia')`
- **THEN** el middleware devuelve `403 Forbidden` con `error: "PERMISSION_DENIED"` y `module: "sia"`

#### Scenario: Admin sin rol asignado (acceso total)
- **WHEN** un admin con `nurolid = NULL` accede a cualquier endpoint con `requirePermission`
- **THEN** el middleware llama `next()` sin verificar módulo (retrocompatibilidad)

#### Scenario: Usuario no autenticado
- **WHEN** se accede a un endpoint con `requirePermission` sin sesión válida
- **THEN** el middleware devuelve `401 Unauthorized` (debe usarse después de `requireAuth`)

### Requirement: Cache de roles en memoria
El sistema SHALL mantener un Map en memoria con los roles cargados desde `nurolper`, con TTL de 5 minutos.

#### Scenario: Primer acceso carga desde BD
- **WHEN** se verifica un permiso y el cache está vacío
- **THEN** el sistema consulta `nurolper` y puebla el cache

#### Scenario: Cache expirado recarga desde BD
- **WHEN** han transcurrido más de 5 minutos desde la última carga
- **THEN** el middleware recarga el cache antes de verificar el permiso

#### Scenario: Invalidación manual del cache
- **WHEN** se ejecuta `POST /admin/roles/reload-cache`
- **THEN** el Map de cache se vacía y la siguiente consulta recarga desde BD

### Requirement: Módulos de permiso válidos
El sistema SHALL definir el conjunto fijo de módulos de permiso: `parametros`, `usuarios`, `credenciales`, `sia`, `reportes`, `salud`.

#### Scenario: Permiso de módulo válido en roles
- **WHEN** se crea o edita un rol con módulos del conjunto fijo
- **THEN** el sistema acepta y persiste los permisos sin error

#### Scenario: Módulo inválido rechazado
- **WHEN** se intenta crear un rol con un módulo fuera del conjunto fijo
- **THEN** el sistema devuelve `400 Bad Request` con la lista de módulos inválidos
