## Why

El panel web de administración (`/admin/usuarios`) actualmente solo gestiona usuarios existentes pero no permite crear nuevos usuarios con roles y permisos diferenciados. Los operadores del sistema necesitan poder incorporar usuarios administradores asignándoles permisos granulares sobre las distintas funcionalidades del backend (gestión de parámetros, gestión de usuarios, visualización de credenciales, autorización SIA, etc.) sin necesidad de acceso directo a la base de datos.

## What Changes

- **Nueva sección "Gestión de Roles"** en el panel web `/admin` que permite definir roles con permisos seleccionables.
- **Incorporación de usuarios** con asignación de rol en el flujo de alta (desde `/admin/backend-admins/add` extendido o nueva UI dedicada).
- **Sistema de permisos** estructurado en módulos: `parametros`, `usuarios`, `credenciales`, `sia`, `reportes`.
- **Middleware de autorización** granular en backend que valida el permiso requerido por endpoint antes de procesar la solicitud.
- **Tabla/parámetro de roles y permisos** en `nusispar` (o nueva tabla `nurolper`) para persistir la configuración.
- **API endpoints** para CRUD de roles: `GET/POST/PUT/DELETE /admin/roles` y asignación `POST /admin/users/:id/role`.

## Capabilities

### New Capabilities

- `role-management`: CRUD de roles con permisos granulares desde el panel web.
- `user-role-assignment`: Asignación de rol al crear o editar un usuario administrador backend.
- `permission-middleware`: Middleware Express que valida permisos por endpoint según el rol del usuario autenticado.
- `roles-permissions-store`: Persistencia de roles y permisos (tabla `nurolper` o extensión de `nusispar`).

### Modified Capabilities

- `backend-admin-management`: El flujo de alta de admin backend incorpora selección de rol y muestra permisos asignados en el detalle de usuario.

## Impact

- **Backend**: `backend/server-soap.js` — nuevos endpoints `/admin/roles` y middleware `requirePermission(module)`.
- **BD**: Nueva tabla `nurolper` (o parámetros en `nusispar`) para roles y sus permisos.
- **Frontend admin**: `backend/public/admin-usuarios.html` — nueva sección Roles, columna Rol en grilla, selector en modal de usuario.
- **Middleware auth**: `requireAdmin` se extiende con `requirePermission` para validación granular.
- **Sin impacto en app móvil** — esta funcionalidad es exclusiva del panel web de administración.
