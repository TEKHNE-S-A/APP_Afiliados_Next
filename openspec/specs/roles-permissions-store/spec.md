## ADDED Requirements

### Requirement: Tabla nurolper para persistir roles
El sistema SHALL crear la tabla `nurolper` en PostgreSQL para almacenar roles y sus permisos.

#### Scenario: Creación de tabla en BD vacía
- **WHEN** se ejecuta el script DDL `add_roles_permissions.sql`
- **THEN** la tabla `nurolper` existe con columnas `nurolid SERIAL PK`, `nurolnombre VARCHAR(100) UNIQUE NOT NULL`, `nurolpermisos TEXT NOT NULL`, `nurolactivo CHAR(1) DEFAULT 'S'`, `nurolcrea TIMESTAMP DEFAULT NOW()`, `nurolultm TIMESTAMP DEFAULT NOW()`

#### Scenario: Roles por defecto insertados
- **WHEN** se ejecuta el script DDL completo
- **THEN** existen 3 roles iniciales: `super_admin` (todos los módulos), `operador_sia` (sia, credenciales), `visor` (credenciales, reportes)

### Requirement: Columna nurolid en nuusuari
El sistema SHALL agregar la columna `nurolid INTEGER REFERENCES nurolper(nurolid)` en `nuusuari` para asociar un rol a cada usuario administrador.

#### Scenario: Migración sin datos existentes afectados
- **WHEN** se ejecuta `ALTER TABLE nuusuari ADD COLUMN nurolid INTEGER REFERENCES nurolper(nurolid)`
- **THEN** todos los registros existentes quedan con `nurolid = NULL` sin error

#### Scenario: Integridad referencial al eliminar rol
- **WHEN** se intenta eliminar (físicamente) un rol que tiene usuarios con `nurolid` asignado
- **THEN** la BD lanza `FOREIGN KEY CONSTRAINT` (razón adicional para usar soft delete)

### Requirement: Script de rollback disponible
El sistema SHALL proveer un script SQL de rollback que revierta los cambios de esquema.

#### Scenario: Rollback limpio
- **WHEN** se ejecuta `rollback_roles_permissions.sql`
- **THEN** se elimina la columna `nurolid` de `nuusuari` y se elimina la tabla `nurolper` sin afectar otros datos

### Requirement: Permisos como JSON array en texto plano
El sistema SHALL almacenar los permisos de cada rol como JSON array serializado en el campo `nurolpermisos TEXT`.

#### Scenario: Lectura y deserialización de permisos
- **WHEN** se carga un rol desde `nurolper`
- **THEN** `JSON.parse(nurolpermisos)` devuelve un array válido de strings sin error
