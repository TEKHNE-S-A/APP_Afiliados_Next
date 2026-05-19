# Semana 11 - Modelos Prisma Cartillas + GEO

**Período:** 17/03/2026 – 23/03/2026  
**Estado:** ✅ COMPLETADA  
**Fecha real:** 27/01/2026 (adelantado)

## Resumen ejecutivo

Se definió la arquitectura de datos para el módulo de Cartillas (Prestadores/Farmacias/Delegaciones) con soporte GEO, extendiendo el modelo existente en producción.

## Objetivos cumplidos

✅ Analizar tablas existentes de cartillas en BD  
✅ Decidir arquitectura: extender modelo vs crear nuevo  
✅ Agregar campos GEO (lat/lng + estado geocoding)  
✅ Modelar en Prisma con relaciones completas  
✅ Documentar diseño y decisiones

## Decisión de diseño

**ELEGIDA: Extender modelo existente**

### Tablas analizadas (7)

1. `carubro` — Rubros (PRE/FAR/DEL)
2. `caentida` — Entidades (prestadores/farmacias/delegaciones)
3. `caendire` — Direcciones (1:N con entidades)
4. `caentele` — Teléfonos (1:N con direcciones)
5. `caespeci` — Especialidades
6. `cacartil` — Relación cartilla-entidad (por plan)
7. `camicart` — Favoritos del usuario

### Campos GEO agregados (6)

```sql
caendlat     DECIMAL(10, 7)    -- Latitud (-90 a 90)
caendlng     DECIMAL(10, 7)    -- Longitud (-180 a 180)
caendgeost   VARCHAR(20)       -- Estado: pending, success, error, manual
caendgeoer   TEXT              -- Mensaje error si falla
caendgeoup   TIMESTAMP         -- Última fecha geocoding
caendupdated TIMESTAMP         -- Última actualización (para ETL incremental)
```

### Índices creados (3)

- `idx_caendire_latlng` — Bounding box queries
- `idx_caendire_geocode_status` — Filtrar por estado
- `idx_caendire_updated` — Sync incremental

## Entregables

### 1. Documento de diseño

**[WEEK11_CARTILLAS_DESIGN.md](WEEK11_CARTILLAS_DESIGN.md)**

- Análisis completo de 7 tablas existentes
- Justificación de decisión (extender vs crear)
- Queries necesarios para filtros (básico, especialidad, GEO)
- Modelo Prisma completo con relaciones

### 2. Migración SQL

**[backend/db/add_cartillas_geo_fields.sql](backend/db/add_cartillas_geo_fields.sql)**

- ALTER TABLE con 6 nuevos campos
- 3 índices para queries GEO eficientes
- UPDATE para marcar registros existentes como 'pending'
- Validaciones y reporte de estado

### 3. Script de aplicación

**[backend/db/apply-cartillas-geo-migration.ps1](backend/db/apply-cartillas-geo-migration.ps1)**

- Wrapper PowerShell para psql
- Verificación de conexión
- Aplicación segura de migración
- Reporte de resultados

### 4. Schema Prisma

**[backend/prisma/schema.prisma](backend/prisma/schema.prisma)**

9 modelos agregados:
- `Carubro` — Rubros (con relaciones a especialidades y cartillas)
- `Caentida` — Entidades (con relaciones a direcciones, teléfonos, cartillas, favoritos)
- `Caendire` — Direcciones (con campos GEO y relaciones a entidad, localidad, teléfonos)
- `Caentele` — Teléfonos (con relación a dirección)
- `Caespeci` — Especialidades (con relaciones a rubro y cartillas)
- `Cacartil` — Cartillas (relación plan-entidad-especialidad)
- `Camicart` — Favoritos (relación usuario-entidad)
- `Nulocali` — Localidades (con relación a provincia y direcciones)
- `Nuprovin` — Provincias (con relación a localidades)

## Arquitectura resultante

```
Usuario (nuusuari)
    ↓
Favoritos (camicart)
    ↓
Entidad (caentida) ← Plan + Especialidad (cacartil)
    ↓
Direcciones (caendire) [CON CAMPOS GEO]
    ↓
├─ Teléfonos (caentele)
└─ Localidad (nulocali) → Provincia (nuprovin)
```

## Queries GEO habilitados

### 1. Listado básico
- Filtro por texto (`caentapeno ILIKE '%texto%'`)
- Ordenar por prioridad (`caentprior DESC`)

### 2. Por especialidad
- Filtro por `caespid` (con JOIN a cacartil)
- Filtro por plan del usuario (`nuplaid`)

### 3. Cerca de mí (GEO)
```sql
-- Fórmula Haversine para distancia
distancia_km = 6371 * acos(cos(radians(lat_user)) * cos(radians(caendlat)) * 
               cos(radians(caendlng) - radians(lng_user)) + 
               sin(radians(lat_user)) * sin(radians(caendlat)))

-- Con bounding box para optimización
WHERE caendlat BETWEEN :lat - :delta AND :lat + :delta
  AND caendlng BETWEEN :lng - :delta AND :lng + :delta
  AND caendgeost = 'success'
HAVING distancia_km <= :radioKm
ORDER BY distancia_km ASC
```

## Próximos pasos

### Semana 12: ETL inicial
- Script import desde BDD origen
- Upsert por `caentid`
- Registrar `last_sync`

### Semana 13: Geocoding batch
- Integración Google Geocoding API
- Batch processing para `caendgeost = 'pending'`
- Persistir lat/lng y status
- Reporte % geocodificado

### Semana 14: API v1 (sin GEO)
- `GET /cartillas?tipo=PRE&q=texto&especialidadId=123&page=1&limit=20`
- Zod validation
- Repository pattern

## Validación

✅ Schema Prisma sin errores de sintaxis  
✅ Migración SQL lista para aplicar  
✅ Script PowerShell testeado localmente  
✅ Documentación completa  
✅ Sin conflictos con modelos existentes

## Hito: En camino a H2

**H2 — Cartillas + GEO + filtros (3 módulos) completas:** Semana 20 (25/05/2026)

**Progreso actual:**
- ✅ Sem 11: Modelos Prisma + campos GEO ← **ACTUAL**
- ⏳ Sem 12: ETL inicial
- ⏳ Sem 13: Geocoding batch
- ⏳ Sem 14-15: API v1 + v2
- ⏳ Sem 16-19: Mobile (3 pantallas)
- ⏳ Sem 20: Sync incremental

**Avance:** 1/10 semanas (10%)
