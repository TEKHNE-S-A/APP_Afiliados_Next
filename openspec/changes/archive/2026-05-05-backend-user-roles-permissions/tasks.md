## 1. Base de Datos

- [x] 1.1 Crear script `backend/db/add_roles_permissions.sql` con `CREATE TABLE nurolper` (nurolid, nurolnombre, nurolpermisos TEXT, nurolactivo, nurolcrea, nurolultm)
- [x] 1.2 Agregar en el mismo script `ALTER TABLE nuusuari ADD COLUMN nurolid INTEGER REFERENCES nurolper(nurolid)`
- [x] 1.3 Insertar roles por defecto: `super_admin` (todos los módulos), `operador_sia` (sia, credenciales), `visor` (credenciales, reportes)
- [x] 1.4 Crear script `backend/db/rollback_roles_permissions.sql` que revierte la columna y la tabla

## 2. Backend — Lógica de roles y middleware

- [x] 2.1 Definir constante `PERMISSION_MODULES = ['parametros','usuarios','credenciales','sia','reportes','salud']` en `server-soap.js`
- [x] 2.2 Implementar Map cache de roles con TTL 5 min: funciones `loadRolesCache()` y `getRoleById(id)` en `server-soap.js`
- [x] 2.3 Implementar función factory `requirePermission(module)` que devuelve middleware Express; admins con `nurolid = NULL` pasan sin verificación
- [x] 2.4 Agregar campo `nurolid` al SELECT en `userRepository.findForLogin()` y en `GET /auth/me` para incluirlo en sesión

## 3. Backend — Endpoints CRUD de roles

- [x] 3.1 Implementar `GET /admin/roles` (requireAuth + requireAdmin) — devuelve roles activos con permisos
- [x] 3.2 Implementar `POST /admin/roles` (requireAuth + requireAdmin) — valida módulos, inserta en `nurolper`, invalida cache
- [x] 3.3 Implementar `PUT /admin/roles/:id` (requireAuth + requireAdmin) — actualiza nombre/permisos, invalida cache
- [x] 3.4 Implementar `DELETE /admin/roles/:id` (requireAuth + requireAdmin) — soft delete (`nurolactivo = 'N'`), verifica rol en uso
- [x] 3.5 Implementar `POST /admin/roles/reload-cache` (requireAuth + requireAdmin) — vacía el Map de cache

## 4. Backend — Endpoint asignación de rol a usuario

- [x] 4.1 Implementar `POST /admin/users/:id/role` (requireAuth + requireAdmin) — valida que el usuario sea admin backend, actualiza `nuusuari.nurolid`
- [x] 4.2 Extender `GET /admin/users/:id` para incluir `role: { id, nombre, permisos }` en la respuesta (JOIN con `nurolper`)
- [x] 4.3 Extender `GET /admin/users` (lista paginada) para incluir columna `rolNombre` en cada usuario

## 5. Backend — Aplicar requirePermission a endpoints existentes

- [x] 5.1 Agregar `requirePermission('parametros')` a todos los endpoints `/admin/parametros/*`
- [x] 5.2 Agregar `requirePermission('usuarios')` a los endpoints `/admin/users/*` y `/admin/backend-admins/*`
- [x] 5.3 Agregar `requirePermission('sia')` a todos los endpoints `/sia/*`
- [x] 5.4 Agregar `requirePermission('salud')` a los endpoints `/health/*`
- [x] 5.5 Agregar `requirePermission('credenciales')` a `GET /credencial` y endpoints relacionados

## 6. Frontend — Panel web admin-usuarios.html

- [x] 6.1 Agregar pestaña/sección "Roles" en `admin-usuarios.html` con tabla de roles (Nombre, Permisos como chips, Usuarios asignados, Acciones)
- [x] 6.2 Implementar modal "Nuevo Rol" con campo nombre y checkboxes de módulos de permiso
- [x] 6.3 Implementar modal "Editar Rol" que precarga los permisos existentes
- [x] 6.4 Implementar botón "Eliminar Rol" con confirmación y mensaje de error si está en uso
- [x] 6.5 Agregar columna "Rol" en la grilla de usuarios con badge "Acceso Total" para `nurolid = NULL`
- [x] 6.6 Agregar dropdown "Rol" en el formulario de alta de admin backend (cargado desde `GET /admin/roles`)
- [x] 6.7 Agregar botón "Cambiar Rol" en el modal de detalle de usuario existente

## 7. Validación y pruebas

- [x] 7.1 Probar en BD local: ejecutar `add_roles_permissions.sql` y verificar roles por defecto
- [x] 7.2 Probar `POST /admin/roles` con módulo inválido → debe retornar 400
- [x] 7.3 Probar `POST /admin/users/:id/role` con roleId válido y luego con null
- [x] 7.4 Probar que admin con rol `visor` (solo credenciales, reportes) recibe 403 al acceder a `/admin/parametros`
- [x] 7.5 Probar que admin sin rol (`nurolid = NULL`) sigue teniendo acceso total a todos los endpoints
- [x] 7.6 Probar rollback: ejecutar `rollback_roles_permissions.sql` y verificar que el backend sigue funcionando

