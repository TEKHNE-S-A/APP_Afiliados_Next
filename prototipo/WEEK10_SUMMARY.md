# Semana 10 - Parámetros con Prisma + Zod

**Período:** 10/03/2026 – 16/03/2026  
**Estado:** ✅ COMPLETADA  
**Fecha real:** 27/01/2026 (adelantado)

## Objetivos cumplidos

✅ Migrar endpoints `/admin/parametros*` a Prisma usando Repository Pattern  
✅ Aplicar validación Zod en todos los endpoints ABM  
✅ Mantener redacción de parámetros sensibles  
✅ Mantener cache + recarga automática

## Entregables

### 1. parametrosRepository.js

**Ubicación:** `backend/repositories/parametrosRepository.js`

**Métodos implementados:**
- `listAll()` — Todos los parámetros ordenados por grupo/tipo
- `listByGrupo(grupo)` — Parámetros de un grupo específico
- `findOne(grupo, tipo)` — Parámetro específico (sin redacción)
- `update(grupo, tipo, valor)` — Actualizar valor
- `create(grupo, tipo, valor)` — Crear nuevo parámetro
- `remove(grupo, tipo)` — Eliminar parámetro
- `count()` — Contador total (para estadísticas)

**Características:**
- Prisma Client encapsulado
- Normalización con `trim()` en strings
- Manejo de errores Prisma (P2025 not found, P2002 duplicate)
- Sin lógica de redacción (delegada al controller)

### 2. Endpoints refactorizados

**Ubicación:** `backend/server-soap.js`

**5 endpoints migrados:**

```javascript
// GET /admin/parametros
app.get('/admin/parametros', requireAuth, async (req, res) => {
  const parametros = await parametrosRepository.listAll()
  // Aplica redacción de sensibles + responde
})

// GET /admin/parametros/:grupo
app.get('/admin/parametros/:grupo', requireAuth, validateParams(AdminGrupoParamsSchema), ...)

// GET /admin/parametros/:grupo/:tipo
app.get('/admin/parametros/:grupo/:tipo', requireAuth, validateParams(AdminGrupoTipoParamsSchema), ...)

// PUT /admin/parametros/:grupo/:tipo
app.put('/admin/parametros/:grupo/:tipo', requireAuth, validateParams(...), validateBody(...), ...)

// POST /admin/parametros
app.post('/admin/parametros', requireAuth, validateBody(AdminParametroCreateBodySchema), ...)

// DELETE /admin/parametros/:grupo/:tipo
app.delete('/admin/parametros/:grupo/:tipo', requireAuth, validateParams(...), ...)
```

### 3. Validación Zod

**Schemas definidos:**
- `AdminGrupoParamsSchema` — Valida `{ grupo: string }`
- `AdminGrupoTipoParamsSchema` — Valida `{ grupo: string, tipo: string }`
- `AdminParametroValorBodySchema` — Valida `{ valor: string }`
- `AdminParametroCreateBodySchema` — Valida `{ grupo, tipo, valor }`

**Middleware aplicado:**
- `validateParams()` para route params
- `validateBody()` para request body

### 4. Redacción de parámetros sensibles

**Función:** `esParametroSensible(grupo, tipo)`

**Parámetros redactados:**
- `WSBENEFTK.Password`
- `WSSIATK.Password`
- `GAM.ClientSecret`
- `GAM.ClientId`

**Comportamiento:**
- Endpoints GET list: reemplazan valor con `<redacted>`
- Endpoint GET detail: NO redacta (para admin que necesita ver/editar)
- Logs: redactan valores en consola

### 5. Cache + recarga automática

**Función:** `recargarParametros()`

**Llamada en:**
- PUT update
- POST create
- DELETE remove

**Comportamiento:**
- Fuerza recarga inmediata del cache interno
- Garantiza consistencia después de mutaciones

## Arquitectura

```
Cliente HTTP
    ↓
server-soap.js (routes)
    ├─ requireAuth (middleware)
    ├─ validateParams/validateBody (Zod middleware)
    ↓
parametrosRepository.js
    ↓
Prisma Client
    ↓
PostgreSQL (nusispar table)
```

## Testing

**Admin Web Panel:**
- URL: `http://localhost:3000/admin`
- Login: `admin` / `admin123`
- Funcionalidades: Listar, filtrar, crear, editar, eliminar parámetros
- UI: HTML/CSS/JS vanilla con búsqueda, paginación, estadísticas

**Backend validation:**
- Servidor corriendo en puerto 3000 ✅
- Endpoint `/health` responde 200 ✅
- Admin panel funcional ✅
- CRUD completo operativo ✅

## Hito alcanzado

✅ **H1 — Prisma+Zod (BD completa) estable**

**Semanas 1-10 completadas (adelantadas):**
- ✅ Sem 1: Setup desarrollo
- ✅ Sem 2: Middleware Zod
- ✅ Sem 3: Prisma init
- ✅ Sem 4-5: Baseline schema
- ✅ Sem 6: Migraciones
- ✅ Sem 7: Repositories pattern
- ✅ Sem 8: Auth con Prisma
- ✅ Sem 9: Credenciales con Prisma
- ✅ Sem 10: Parámetros con Prisma ← **ACTUAL**

## Próximos pasos (Semana 11)

**Tema:** Modelos Prisma cartillas + tablas

**Tareas:**
- Definir 3 tablas o 1 unificada por `tipo` (prestadores/farmacias/delegaciones)
- Campos: `id_origen`, `descripcion`, `especialidad_id`, `direccion`, `localidad`, `lat`, `lng`, `geocode_status`, `updated_at`
- Crear migración Prisma
- Documentar estrategia de import

**Objetivo:** Sentar base de datos para sistema de cartillas con GEO
