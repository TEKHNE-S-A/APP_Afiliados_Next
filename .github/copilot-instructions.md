# APP Afiliados Next - Migracion Fase 2

## Convenciones

### Base de Datos
- Objetivo de esta etapa: migrar prototipo funcional a Next.js + Prisma + PostgreSQL sin reinventar flujos.
- Evitar N+1 con include en relaciones Prisma.
- Usar paginacion con take, skip y orderBy en listados.

### Almacenamiento de Archivos
- Archivos siempre en filesystem local; en BD solo ruta relativa.

### API Routes
- Reemplazar mocks por API real.
- Validar inputs con Zod en API routes.
- Sanitizar texto de usuario antes de persistir.
- En cada API route: llamar await auth() y responder 401 sin sesion.
- En operaciones sensibles/admin: verificar session.user.role y responder 403.
- Usar $transaction cuando haya 2+ escrituras.

### Frontend
- Mantener UI y navegacion existentes.
- No agregar funcionalidades fuera del alcance del prototipo.

### React Query (Cache)
- Query keys centralizadas en src/lib/queryKeys.ts.
- staleTime: 0 global en TanStack Query.

### Arquitectura y Codigo
- Tipos compartidos en src/types/index.ts.
- Cliente Prisma singleton en src/lib/prisma.ts.

### IA
- Si el modulo usa IA, mantener servicio separado y fallback seguro en errores.

## Reglas Criticas
1. Mantener fidelidad funcional y visual al prototipo existente.
2. No reinventar flujos ni nombres cuando ya estan definidos en el proyecto.
3. Todas las rutas API deben verificar sesion al inicio con await auth().
4. Toda operacion sensible debe validar rol y responder 403 si corresponde.

## Logica Protegida
| Archivo | Funcion | Descripcion |
|---------|---------|-------------|
| src/lib/auth.ts | Validacion de sesion y rol | Cambios pueden romper contrato de autenticacion y autorizacion |
| middleware.ts | Proteccion de rutas de navegacion y callbackUrl | Cambios pueden abrir acceso no autorizado o redirecciones inseguras |
| src/lib/require-auth.ts | Guards estandarizados 401/403 | Cambios pueden omitir controles de sesion o rol en API routes |
| src/lib/prisma.ts | Cliente Prisma singleton | Cambios pueden romper acceso a datos y ciclo de conexiones |
| prisma/schema.prisma | Contrato de datos y relaciones | Cambios pueden desalinear ORM con BD y romper migraciones |
| prisma/migrations/20260518_add_version_modular_tables/migration.sql | Migracion controlada de version en tablas modulares | Cambios incorrectos pueden afectar datos existentes en produccion |
| src/lib/queryKeys.ts | Claves de cache | Cambios impactan invalidaciones y coherencia de datos en frontend |
| app/api/auth/[...nextauth]/route.ts | Entry point de Auth.js | Cambios pueden romper login/sesion global |
| app/api/admin/users/route.ts | CRUD admin de usuarios | Endpoint sensible con requerimiento estricto de rol admin |
| app/api/admin/cartilla/entidades/route.ts | CRUD admin de cartilla | Endpoint sensible con modificaciones de datos operativos |
| app/api/admin/notifications/broadcast/route.ts | Envio masivo de notificaciones | Operacion sensible multi-write, requiere transaccion y control de acceso |
| app/api/admin/noticias/route.ts | Alta/listado de noticias y manejo de archivos | Cambios pueden romper integridad de archivos en filesystem o seguridad |
| app/api/credencial/constancia.pdf/route.ts | Proxy autenticado de PDF | Cambios pueden exponer documentos o romper autorizacion de descarga |

## Errores Comunes
| Error | Solucion |
|-------|----------|
| API route sin await auth() | Agregar guard explicito al inicio del handler y devolver 401 |
| Operacion admin sin validacion de rol | Validar session.user.role y devolver 403 |
| Listados sin paginacion | Aplicar take, skip y orderBy |
| N+1 en Prisma | Agregar include en relaciones necesarias |
| Persistir archivos en BD | Guardar en filesystem y almacenar solo ruta relativa |

### Anexo - Contenido previo (sin modificar)
Objetivo:
- Migrar prototipo funcional a Next.js + Prisma + PostgreSQL sin reinventar flujos.

Reglas obligatorias previas:
- Mantener UI y navegacion existentes.
- No agregar funcionalidades fuera del alcance del prototipo.
- Reemplazar mocks por API real.
- Validar inputs con Zod en API routes.
- Sanitizar texto de usuario antes de persistir.
- En cada API route: llamar await auth() y responder 401 sin sesion.
- En operaciones sensibles/admin: verificar session.user.role y responder 403.
- Usar paginacion (take, skip, orderBy) en listados.
- Evitar N+1 con include en relaciones Prisma.
- Usar $transaction cuando haya 2+ escrituras.
- Archivos siempre en filesystem local; en BD solo ruta relativa.

Convenciones previas:
- Query keys centralizadas en src/lib/queryKeys.ts.
- staleTime: 0 global en TanStack Query.
- Tipos compartidos en src/types/index.ts.
- Cliente Prisma singleton en src/lib/prisma.ts.

Estrategia formal para tablas legadas (sin romper produccion):
- Mantener tablas legadas con PK historica mientras existan integraciones externas dependientes.
- Aplicar estandar id UUID + version primero en tablas modulares/nuevas.
- Usar migraciones SQL idempotentes (IF EXISTS / IF NOT EXISTS) para cambios sobre BD existente.
- No convertir PK de tablas legadas en esta fase; planificar normalizacion en fase posterior con doble escritura y ventana de corte.
- Documentar cada excepcion de modelo legado en schema y en revisiones de PR.

Matriz de trazabilidad (requerimiento inicial -> estado actual):
- Next.js App Router configurado -> Completo: app/layout.tsx, app/(dashboard)/layout.tsx, app/(auth)/layout.tsx
- Prisma schema con modelos principales -> Completo: prisma/schema.prisma
- id UUID como PK en todas las tablas -> Parcial: aplicado en tablas modulares/nuevas; legado mantiene PK historica
- Claves de negocio UNIQUE (no PK) -> Parcial: aplicado donde corresponde en modelos nuevos; legado preservado
- Campo version en cada modelo -> Parcial: aplicado en tablas modulares via migration 20260518_add_version_modular_tables
- FK con onDelete explicito -> Parcial: cubierto en modelos activos; revisar completitud en legado
- API Routes con validacion Zod -> Parcial: presente en endpoints nuevos/sensibles; falta cobertura total en todos los dominios
- await auth() en cada API route -> Completo en rutas Next actuales: app/api/**/route.ts
- Verificacion de rol en operaciones sensibles -> Completo en rutas admin via requireAdmin
- Paginacion server-side en listados -> Completo en rutas listadas implementadas (take/skip/orderBy)
- Transacciones $transaction en multi-write -> Completo en operaciones identificadas (ej: broadcast)
- Errores HTTP + JSON estructurado -> Completo en rutas nuevas con fail()/ok()
- include para evitar N+1 -> Completo en cartilla/credenciales/admin implementados
- Enums BD sincronizados con TypeScript -> Parcial: pendiente auditoria completa de enums legacy
- Archivos en filesystem local (no BD) -> Completo: app/api/admin/noticias/route.ts
- Auth.js configurado -> Completo: src/lib/auth.ts + app/api/auth/[...nextauth]/route.ts
- Componentes migrados -> Parcial: credenciales y cartilla migradas; faltan modulos restantes del prototipo
- React Query staleTime 0 + query keys centralizadas -> Completo: src/components/providers.tsx + src/lib/queryKeys.ts
- Servicio IA con registro de uso -> No aplica por ahora (sin modulo IA activo en Next)
- copilot-instructions.md creado -> Completo: .github/copilot-instructions.md
