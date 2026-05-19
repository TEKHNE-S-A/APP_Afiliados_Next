## ADDED Requirements

### Requirement: Listar roles existentes
El sistema SHALL exponer un endpoint `GET /admin/roles` que devuelva todos los roles activos con sus permisos.

#### Scenario: Consulta lista de roles como admin
- **WHEN** un usuario admin autenticado realiza `GET /admin/roles`
- **THEN** el sistema devuelve `200 OK` con array `[{ id, nombre, permisos: string[], activo }]`

#### Scenario: Consulta sin autenticación
- **WHEN** se realiza `GET /admin/roles` sin Bearer token válido
- **THEN** el sistema devuelve `401 Unauthorized`

### Requirement: Crear rol con permisos
El sistema SHALL exponer `POST /admin/roles` para crear un nuevo rol con nombre único y lista de módulos permitidos.

#### Scenario: Creación exitosa de rol
- **WHEN** un admin envía `POST /admin/roles` con `{ nombre: "operador_sia", permisos: ["sia", "credenciales"] }`
- **THEN** el sistema inserta en `nurolper`, devuelve `201 Created` con el rol creado incluyendo `id`

#### Scenario: Nombre de rol duplicado
- **WHEN** se envía `POST /admin/roles` con un nombre que ya existe en `nurolper`
- **THEN** el sistema devuelve `409 Conflict` con `error: "ROLE_EXISTS"`

#### Scenario: Permiso inválido en la lista
- **WHEN** se envía `POST /admin/roles` con `permisos: ["parametros", "modulo_inexistente"]`
- **THEN** el sistema devuelve `400 Bad Request` con `error: "INVALID_PERMISSION"` listando los módulos inválidos

### Requirement: Actualizar rol
El sistema SHALL exponer `PUT /admin/roles/:id` para modificar nombre y/o permisos de un rol existente.

#### Scenario: Actualización exitosa
- **WHEN** un admin envía `PUT /admin/roles/2` con `{ permisos: ["sia", "credenciales", "reportes"] }`
- **THEN** el sistema actualiza `nurolper`, invalida cache de roles, devuelve `200 OK` con rol actualizado

#### Scenario: Rol no encontrado
- **WHEN** se envía `PUT /admin/roles/9999` con un id inexistente
- **THEN** el sistema devuelve `404 Not Found`

### Requirement: Eliminar rol
El sistema SHALL exponer `DELETE /admin/roles/:id` para desactivar (soft delete) un rol.

#### Scenario: Desactivación exitosa
- **WHEN** un admin envía `DELETE /admin/roles/2`
- **THEN** el sistema establece `nurolactivo = 'N'` en `nurolper`, devuelve `200 OK`

#### Scenario: Eliminar rol asignado a usuarios activos
- **WHEN** se intenta eliminar un rol que tiene usuarios con `nurolid = :id`
- **THEN** el sistema devuelve `409 Conflict` con `error: "ROLE_IN_USE"` y cantidad de usuarios afectados

### Requirement: Invalidar cache de roles
El sistema SHALL exponer `POST /admin/roles/reload-cache` para forzar recarga del cache de roles.

#### Scenario: Recarga manual del cache
- **WHEN** un admin envía `POST /admin/roles/reload-cache`
- **THEN** el sistema vacía el Map de cache de roles y devuelve `200 OK` con `{ message: "Cache recargado" }`
