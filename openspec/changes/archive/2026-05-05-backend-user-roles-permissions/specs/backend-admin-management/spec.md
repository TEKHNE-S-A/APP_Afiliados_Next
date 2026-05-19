## MODIFIED Requirements

### Requirement: Alta de usuario administrador backend
El flujo de alta de usuario administrador backend SHALL incluir un campo opcional de selección de rol al crear o editar el usuario desde el panel web.

- **WHEN** el operador abre el formulario de "Agregar Admin" en `/admin/usuarios`
- **THEN** el formulario muestra un dropdown "Rol" cargado desde `GET /admin/roles`, con opción vacía "Sin rol (acceso total)"

#### Scenario: Alta admin sin rol seleccionado
- **WHEN** el operador completa el formulario sin seleccionar rol y confirma
- **THEN** se crea el usuario en `nuusuari` con `nurolid = NULL` y acceso total retrocompatible

#### Scenario: Alta admin con rol seleccionado
- **WHEN** el operador selecciona un rol del dropdown y confirma
- **THEN** se crea el usuario en `nuusuari` con `nurolid` del rol elegido, y se refleja en la grilla de usuarios con el nombre del rol

## ADDED Requirements

### Requirement: Sección de Roles en panel web de administración
El panel web `/admin/usuarios` SHALL incluir una pestaña o sección "Roles" que permita gestionar roles y sus permisos asignados.

#### Scenario: Navegación a sección Roles
- **WHEN** el admin hace clic en la pestaña "Roles" del panel
- **THEN** se muestra tabla de roles activos con columnas: Nombre, Permisos (chips), Usuarios asignados, Acciones

#### Scenario: Crear nuevo rol desde panel
- **WHEN** el admin hace clic en "Nuevo Rol", completa nombre y selecciona módulos en checkboxes y guarda
- **THEN** aparece el nuevo rol en la tabla con sus permisos como chips de colores

#### Scenario: Editar permisos de rol existente
- **WHEN** el admin hace clic en "Editar" de un rol y modifica los módulos seleccionados
- **THEN** los cambios se persisten y la grilla se actualiza; el cache de permisos se invalida

### Requirement: Columna Rol en grilla de usuarios
La grilla de usuarios en el panel web SHALL mostrar el rol asignado a cada usuario admin.

#### Scenario: Usuario con rol en grilla
- **WHEN** se carga la grilla de usuarios
- **THEN** la columna "Rol" muestra el nombre del rol o el badge "Acceso Total" si `nurolid = NULL`
