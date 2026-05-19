## ADDED Requirements

### Requirement: Asignar rol a usuario admin
El sistema SHALL exponer `POST /admin/users/:id/role` para asignar un rol a un usuario administrador backend.

#### Scenario: Asignación exitosa de rol
- **WHEN** un admin envía `POST /admin/users/abc-guid/role` con `{ roleId: 2 }`
- **THEN** el sistema actualiza `nuusuari.nurolid = 2` para ese usuario, invalida sesiones activas del usuario y devuelve `200 OK`

#### Scenario: Asignación de rol a usuario no admin
- **WHEN** se intenta asignar rol a un usuario que no está en `BackendAdminEmails`
- **THEN** el sistema devuelve `400 Bad Request` con `error: "NOT_BACKEND_ADMIN"`

#### Scenario: Rol inexistente o inactivo
- **WHEN** se envía `roleId` que no existe o tiene `nurolactivo = 'N'`
- **THEN** el sistema devuelve `404 Not Found` con `error: "ROLE_NOT_FOUND"`

### Requirement: Remover rol de usuario admin
El sistema SHALL permitir `POST /admin/users/:id/role` con `{ roleId: null }` para quitar el rol asignado (volviendo al acceso total).

#### Scenario: Remoción de rol
- **WHEN** un admin envía `POST /admin/users/abc-guid/role` con `{ roleId: null }`
- **THEN** el sistema establece `nuusuari.nurolid = NULL`, devuelve `200 OK`

### Requirement: Mostrar rol en detalle de usuario
El sistema SHALL incluir el campo `role` (id, nombre, permisos) en la respuesta de `GET /admin/users/:id`.

#### Scenario: Usuario con rol asignado
- **WHEN** se consulta `GET /admin/users/:id` y el usuario tiene `nurolid` asignado
- **THEN** la respuesta incluye `role: { id, nombre, permisos: string[] }`

#### Scenario: Usuario sin rol (acceso total)
- **WHEN** se consulta `GET /admin/users/:id` y el usuario tiene `nurolid = NULL`
- **THEN** la respuesta incluye `role: null` y el campo `isFullAdmin: true`

### Requirement: Selector de rol en alta de usuario admin
El panel web SHALL mostrar un dropdown de roles disponibles al crear o editar un usuario administrador backend.

#### Scenario: Crear usuario admin con rol
- **WHEN** el operador completa el formulario de nuevo admin con rol seleccionado y guarda
- **THEN** se crea el usuario en `nuusuari`/`nuusuauth`, se asigna `nurolid` y aparece con el rol en la grilla

#### Scenario: Crear usuario admin sin rol (acceso total)
- **WHEN** el operador deja el campo rol en blanco y guarda
- **THEN** se crea el usuario sin `nurolid` (NULL), con acceso total retrocompatible
