# API Sync Incremental Cartillas - Contrato v1

## Objetivo
Reducir tiempos de carga y consumo de datos soportando actualización incremental (delta) de cartillas, manteniendo compatibilidad con los 3 módulos mobile (Prestadores, Farmacias, Delegaciones).

## Endpoint

```
GET /api/cartilla/changes
```

### Query Parameters

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `since` | string (ISO 8601) | No | null | Timestamp de última sincronización. Si se omite, devuelve listado completo (fallback) |
| `rubroId` | string | No | null | Filtrar por rubro específico (ej: `000000008` farmacias, `000000009` delegaciones) |
| `page` | number | No | 1 | Página actual (para paginado del delta) |
| `limit` | number | No | 50 | Items por página (máximo 200) |
| `excludeRubroId` | string | No | null | Excluir rubro específico (ej: cartilla prestadores excluye farmacias) |

### Ejemplos de Query

```
# Sync completo inicial (sin since)
GET /api/cartilla/changes?limit=100

# Sync incremental (solo cambios desde timestamp)
GET /api/cartilla/changes?since=2026-02-10T14:30:00.000Z

# Sync incremental de farmacias
GET /api/cartilla/changes?since=2026-02-10T14:30:00.000Z&rubroId=000000008

# Sync incremental prestadores (sin farmacias)
GET /api/cartilla/changes?since=2026-02-10T14:30:00.000Z&excludeRubroId=000000008
```

## Response Schema

### Success Response (200 OK)

```json
{
  "items": [
    {
      "caentid": "00303",
      "caentapeno": "ANDALGALA",
      "carubdescr": "DELEGACION",
      "caespecial": null,
      "caendirecc": "SAN MARTIN Nro 578",
      "nulocalnombre": "ANDALGALA",
      "lat": "-27.5833",
      "lng": "-66.3167",
      "distancia_km": null,
      "caentactivo": true,
      "caentupdated": "2026-02-10T15:30:00.000Z",
      "changeType": "modified"
    }
  ],
  "deleted": [
    {
      "caentid": "00001",
      "caentapeno": "CENTRAL",
      "deletedAt": "2026-02-09T10:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "totalPages": 3,
    "hasMore": true
  },
  "sync": {
    "serverTime": "2026-02-10T16:00:00.000Z",
    "nextSince": "2026-02-10T15:30:00.000Z",
    "lastModified": "2026-02-10T15:30:00.000Z",
    "totalChanges": 125,
    "newItems": 10,
    "modifiedItems": 110,
    "deletedItems": 5
  }
}
```

### Fields Description

#### `items[]` - Cambios y nuevas entidades
Array de entidades nuevas o modificadas desde `since`. Incluye:
- Todos los campos de `/api/cartilla` (mantiene compatibilidad)
- `caentactivo`: boolean - indica si está activa
- `caentupdated`: ISO timestamp - última modificación
- `changeType`: string - "new" (alta) o "modified" (actualización)

#### `deleted[]` - Bajas lógicas
Array de entidades dadas de baja lógicamente (`caentactivo=false`).
- `caentid`: ID de la entidad (trimmed)
- `caentapeno`: Nombre (para logs/debugging)
- `deletedAt`: ISO timestamp del marcado de baja

#### `pagination`
Paginación del delta (mismo formato que `/api/cartilla`).

#### `sync`
Metadata para tracking en mobile:
- `serverTime`: timestamp del servidor (ahora)
- `nextSince`: valor a guardar para próximo sync (`max(caentupdated)` de items devueltos)
- `lastModified`: último cambio detectado en este batch
- `totalChanges`: total de cambios desde `since`
- `newItems`: contador de altas
- `modifiedItems`: contador de modificaciones
- `deletedItems`: contador de bajas

### Error Responses

#### 400 Bad Request - Parámetro inválido
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid since parameter",
  "context": "query",
  "issues": [
    {
      "path": "since",
      "message": "Expected ISO 8601 timestamp"
    }
  ]
}
```

#### 500 Internal Server Error
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Error fetching changes"
}
```

## Comportamiento

### Modo Full (sin `since`)
Si no se proporciona `since`, el endpoint funciona como `/api/cartilla`:
- Devuelve listado completo paginado
- `deleted[]` vacío
- `changeType` = "new" para todos
- Mobile puede usar como fallback si falla sync incremental

### Modo Delta (con `since`)
- Devuelve **solo** items con `caentupdated > since`
- Incluye bajas lógicas (`caentactivo=false`)
- Ordena por `caentupdated ASC` (más antiguos primero)
- `nextSince` = `max(caentupdated)` de items en respuesta

### Filtros Combinables
Todos los filtros de `/api/cartilla` son compatibles:
- `rubroId` + `since`: sync deltafarmacias
- `excludeRubroId` + `since`: sync delta prestadores (sin farmacias)
- `lat/lng/radioKm` + `since`: NO soportado (solo en modo full)
- `q` (texto) + `since`: NO soportado (solo en modo full)

## Reglas de Negocio

1. **IDs trimmed**: Todos los `caentid` devueltos SIN espacios trailing
2. **Timestamps UTC**: Todos en formato ISO 8601 con zona horaria
3. **Consistencia**: Un item NO puede aparecer en `items[]` y `deleted[]` simultáneamente
4. **Order**: Items ordenados por `caentupdated ASC` (aplicar cambios en orden cronológico)
5. **Límite paginado**: Máximo 200 items por request (prevenir timeouts)

## Mobile Usage Pattern

```typescript
// 1. Primera sincronización (full)
const response1 = await apiGet('/api/cartilla/changes?limit=100');
await storageManager.saveCartilla(response1.items);
await storageManager.saveLastSync(response1.sync.nextSince);

// 2. Sincronización incremental (delta)
const lastSync = await storageManager.getLastSync();
const response2 = await apiGet(`/api/cartilla/changes?since=${lastSync}`);

// Aplicar cambios
for (const item of response2.items) {
  await storageManager.upsertCartilla(item);
}

// Aplicar bajas
for (const deleted of response2.deleted) {
  await storageManager.deleteCartilla(deleted.caentid);
}

// Guardar nuevo timestamp
await storageManager.saveLastSync(response2.sync.nextSince);
```

## Validación Zod

```typescript
const CartillaChangesQuerySchema = z.object({
  since: z.string().datetime().optional(),
  rubroId: z.string().length(9).optional(),
  excludeRubroId: z.string().length(9).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});
```

## Notas de Implementación

1. **Performance**: Usar índices `idx_caentida_activo_updated` y `idx_caendire_updated`
2. **Timezone**: PostgreSQL devuelve timestamps sin zona, agregar 'Z' en backend
3. **Nulls**: `caentupdated` puede ser NULL en registros legacy → tratar como "muy antiguo" o excluir
4. **Transaccionalidad**: Query en transacción READ COMMITTED para consistencia
5. **Cache**: NO cachear responses de sync (datos dinámicos)

## Compatibilidad

- ✅ Mantiene formato de `/api/cartilla` en `items[]`
- ✅ Mobile existente funciona sin cambios (usa modo full)
- ✅ Soporta los 3 módulos: Prestadores, Farmacias, Delegaciones
- ✅ Fallback a full si `since` inválido
