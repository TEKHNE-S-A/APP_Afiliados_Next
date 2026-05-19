## Context

El backend ya tiene un sistema de autenticación dual (GAM + local) y un panel web de administración (`/admin/usuarios`) con gestión de usuarios backend. El middleware `requireAdmin` valida si el email del usuario está en la lista `SEGURIDAD_APP.BackendAdminEmails` de `nusispar`. Sin embargo, todos los admins tienen los mismos permisos totales; no existe granularidad de acceso.

**Estado actual:**
- `requireAdmin` → acceso binario: admin total o nada.
- `requireAuth` → usuario autenticado (no necesariamente admin).
- Endpoints backend grouping: `/admin/parametros`, `/admin/users`, `/admin/cartilla`, `/admin/info-util-ui`, `/sia/*`, `/health/*`.
- Persistencia: `nusispar` (parámetros) + `nuusuari`/`nuusuauth` (usuarios).

**Restricciones:**
- No romper compatibilidad con admins existentes (deben seguir funcionando con acceso total).
- Mantener `nusispar` como sistema de configuración para roles si es viable (evitar nueva tabla si la complejidad no lo justifica).
- Sin impacto en la app móvil.

## Goals / Non-Goals

**Goals:**
- Definir módulos de permiso (parametros, usuarios, credenciales, sia, reportes, salud) con acceso granular.
- Persistir roles y sus permisos en tabla `nurolper`.
- Crear middleware `requirePermission(module)` que valide el permiso requerido por el rol del usuario autenticado.
- Extender el panel web `/admin/usuarios` con sección Roles (CRUD) y asignación de rol al crear/editar usuario admin.
- Exponer endpoints REST `GET/POST/PUT/DELETE /admin/roles` y `POST /admin/users/:id/role`.
- Admins existentes sin rol asignado mantienen acceso total (retrocompatibilidad).

**Non-Goals:**
- Sistema de permisos para usuarios de la app móvil (afiliados).
- Permisos a nivel de fila/dato (row-level security).
- Integración con GAM para roles.
- UI de asignación de permisos en la app móvil.

## Decisions

### D1: Nueva tabla `nurolper` en lugar de extender `nusispar`
**Decisión:** Crear tabla `nurolper (nurolid SERIAL PK, nurolnombre VARCHAR(100) UNIQUE, nurolpermisos TEXT, nurolactivo CHAR(1))` donde `nurolpermisos` es un JSON array de módulos (`["parametros","usuarios"]`).

**Alternativa considerada:** Codificar roles como parámetros en `nusispar` (ej. `ROLES.admin_read → parametros,sia`).

**Razón para nueva tabla:** `nusispar` es clave-valor plano, no admite estructura de permiso por rol sin parseo complejo. Una tabla dedicada es semánticamente correcta, más eficiente para JOIN y escalable. El costo de una tabla pequeña es mínimo.

### D2: Columna `nurolid` en `nuusuari` para asociar rol
**Decisión:** Agregar columna `nurolid INTEGER REFERENCES nurolper(nurolid)` en `nuusuari`. Valor `NULL` = acceso total (compatibilidad retroactiva).

**Alternativa:** Tabla intermedia `usuario_roles`.

**Razón:** Los usuarios backend son pocos y tienen un único rol. Una columna directa en `nuusuari` es más simple y evita JOIN adicional.

### D3: Módulos de permiso fijos definidos en código
**Decisión:** Los módulos son un enum fijo en backend: `['parametros', 'usuarios', 'credenciales', 'sia', 'reportes', 'salud']`. No configurables en tiempo de ejecución.

**Razón:** Evita complejidad de gestionar nombres de módulos dinámicos. El conjunto de módulos cambia solo cuando el código cambia.

### D4: `requirePermission(module)` como middleware factory
**Decisión:** Función `requirePermission(module)` que retorna un middleware Express. Usa el `nurolid` en sesión para verificar `nurolpermisos` en cache.

```js
// Ejemplo uso:
app.get('/admin/parametros', requireAuth, requirePermission('parametros'), handler)
// Admins sin rol asignado (nurolid = null) pasan sin verificación de módulo.
```

**Cache:** Roles cargados en Map() con TTL 5 min (igual que parámetros).

### D5: Panel web existente extendido, sin nuevo HTML
**Decisión:** Extender `admin-usuarios.html` con nueva pestaña/sección "Roles" y dropdown de rol en formulario de usuario, en lugar de crear un archivo HTML separado.

**Razón:** Mantener un único punto de entrada admin. La sección Roles es simple (tabla + modal CRUD).

## Risks / Trade-offs

- [Riesgo] Migración `ALTER TABLE nuusuari ADD COLUMN nurolid` en prod sin downtime → **Mitigación:** columna nullable, rollback trivial con `ALTER TABLE DROP COLUMN`.
- [Riesgo] Admins con sesión activa no recargan permisos tras cambio de rol → **Mitigación:** Cache de roles con TTL 5 min + endpoint `POST /admin/roles/reload-cache`.
- [Riesgo] Endpoint sin `requirePermission` queda desprotegido si se olvida agregar el middleware → **Mitigación:** Linting/checklist de endpoints en tareas de implementación.
- [Trade-off] Roles simples (sin herencia ni jerarquías) → suficiente para el caso de uso actual. Si se necesita jerarquía en el futuro, requiere rediseño de la tabla.

## Migration Plan

1. Ejecutar `backend/db/add_roles_permissions.sql` (CREATE TABLE nurolper + ALTER TABLE nuusuari).
2. Insertar roles por defecto: `super_admin` (todos los módulos), `operador_sia` (sia, credenciales), `visor` (credenciales, reportes).
3. Deployar backend con nuevas rutas y middleware (sin asignar roles aún → retrocompatible).
4. Asignar roles a usuarios nuevos desde el panel web.
5. Rollback: eliminar columna `nurolid`, tabla `nurolper`, revertir código de middleware.

## Open Questions

- ¿Debe el rol `super_admin` reemplazar la lista `BackendAdminEmails` eventualmente, o coexisten?
  → Por ahora coexisten: `BackendAdminEmails` sigue siendo la lista de "admins totales" independiente de roles.
- ¿Necesita notificación por email al asignar/cambiar rol? → No en v1.
