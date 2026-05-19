# Semana 11 - Análisis y Diseño Cartillas

**Fecha:** 27/01/2026  
**Estado:** En análisis

## Estructura existente en BD

### Tablas identificadas

**1. carubro** — Rubros de cartilla
```sql
CREATE TABLE public.carubro (
  carubid bpchar(30) NOT NULL PRIMARY KEY,
  carubdescr bpchar(40) NOT NULL,
  carubtipor bpchar(3) NOT NULL  -- Tipo de rubro (¿PRE=Prestadores, FAR=Farmacias, DEL=Delegaciones?)
)
```

**2. caentida** — Entidades (prestadores/farmacias/delegaciones)
```sql
CREATE TABLE public.caentida (
  caentid bpchar(30) NOT NULL PRIMARY KEY,
  caentapeno bpchar(50) NOT NULL,  -- Nombre/Apellido
  caentmail varchar(100) NOT NULL,
  caentweb varchar(1000) NOT NULL,
  caentmarca bool NOT NULL,        -- ¿Destacado?
  caentprior int2 NOT NULL         -- Prioridad para ordenar
)
```

**3. caendire** — Direcciones de entidades
```sql
CREATE TABLE public.caendire (
  caentid bpchar(30) NOT NULL,
  caendid bpchar(30) NOT NULL,
  nulocid bpchar(30) NOT NULL,         -- FK a nulocali (localidad)
  caendirecc varchar(1024) NOT NULL,   -- Dirección completa
  caendirpri bpchar(1) NOT NULL,       -- ¿Dirección principal? (S/N)
  caendgeolo bpchar(50) NOT NULL,      -- ¿Campo GEO existente? (¿formato?)
  caendhorat varchar(100) NOT NULL,    -- Horarios de atención
  caendpenge bpchar(1) NOT NULL,       -- ¿Pendiente geocoding?
  PRIMARY KEY (caentid, caendid)
)
```

**4. caentele** — Teléfonos de entidades
```sql
CREATE TABLE public.caentele (
  caentid bpchar(30) NOT NULL,
  caendid bpchar(30) NOT NULL,
  caenteleid bpchar(30) NOT NULL,
  caentelefo bpchar(20) NOT NULL,
  caentelepr bpchar(1) NOT NULL,  -- ¿Teléfono principal? (S/N)
  PRIMARY KEY (caentid, caendid, caenteleid)
)
```

**5. caespeci** — Especialidades
```sql
CREATE TABLE public.caespeci (
  caespid bpchar(30) NOT NULL,
  carubid bpchar(30) NOT NULL,     -- FK a carubro
  caespdescr bpchar(40) NOT NULL,  -- Descripción especialidad
  PRIMARY KEY (caespid, carubid)
)
```

**6. cacartil** — Relación cartilla-entidad (¿qué plan cubre qué entidad?)
```sql
CREATE TABLE public.cacartil (
  cacarid bpchar(36) NOT NULL PRIMARY KEY,
  nuplaid bpchar(30) NOT NULL,  -- FK a nuplan (planes de salud)
  carubid bpchar(30) NOT NULL,  -- FK a carubro
  caespid bpchar(30) NOT NULL,  -- FK a caespeci
  caentid bpchar(30) NOT NULL,  -- FK a caentida
  -- Indices: por entidad, por especialidad+rubro, unique compuesto
)
```

**7. camicart** — Mis cartillas favoritas (por usuario)
```sql
CREATE TABLE public.camicart (
  nuusuid bpchar(40) NOT NULL,
  caentid bpchar(30) NOT NULL,
  camictipoc bpchar(1) NOT NULL,  -- Tipo de interacción? (F=Favorito?)
  PRIMARY KEY (nuusuid, caentid)
)
```

### Tablas relacionadas

**nulocali** — Localidades
```sql
CREATE TABLE public.nulocali (
  nulocid bpchar(30) NOT NULL PRIMARY KEY,
  nuprovcod bpchar(2) NOT NULL,
  nulocdescr bpchar(50) NOT NULL
)
```

**nuprovin** — Provincias
```sql
CREATE TABLE public.nuprovin (
  nuprovcod bpchar(2) NOT NULL PRIMARY KEY,
  nupais bpchar(2) NOT NULL,
  nuprovdesc bpchar(50) NOT NULL
)
```

## Análisis

### ✅ Ventajas del modelo existente

1. **Normalizado:** Separa entidades, direcciones, teléfonos, especialidades
2. **Flexible:** Múltiples direcciones y teléfonos por entidad
3. **Multiplan:** cacartil relaciona planes con entidades (un prestador puede estar en varios planes)
4. **Favoritos:** camicart permite marcar favoritos por usuario
5. **Ordenable:** caentprior permite priorizar prestadores destacados

### ⚠️ Puntos a resolver

1. **Campo GEO existente confuso:** `caendgeolo bpchar(50)` — ¿Es lat/lng? ¿Formato?
2. **Sin lat/lng separados:** Necesitamos campos numéricos para calcular distancias
3. **Sin status geocoding:** No hay forma de rastrear qué fue geocodificado exitosamente
4. **Sin timestamp actualización:** No se puede hacer sync incremental por fecha

### 🎯 Decisión de diseño

**OPCIÓN ELEGIDA: Extender modelo existente + agregar campos GEO**

**Razones:**
- ✅ Modelo ya probado en producción
- ✅ Relaciones complejas ya resueltas (entidad → direcciones → teléfonos)
- ✅ No rompe código legacy
- ✅ Permite migración incremental

**Modificaciones necesarias:**

```sql
ALTER TABLE caendire ADD COLUMN caendlat DECIMAL(10, 7) NULL;
ALTER TABLE caendire ADD COLUMN caendlng DECIMAL(10, 7) NULL;
ALTER TABLE caendire ADD COLUMN caendgeost VARCHAR(20) NULL;  -- 'pending', 'success', 'error', 'manual'
ALTER TABLE caendire ADD COLUMN caendgeoer TEXT NULL;          -- Error message si falla geocoding
ALTER TABLE caendire ADD COLUMN caendgeoup TIMESTAMP NULL;     -- Last geocoded at
ALTER TABLE caendire ADD COLUMN caendupdated TIMESTAMP DEFAULT NOW();  -- Last updated

CREATE INDEX idx_caendire_latlng ON caendire(caendlat, caendlng) WHERE caendlat IS NOT NULL AND caendlng IS NOT NULL;
CREATE INDEX idx_caendire_geocode_status ON caendire(caendgeost);
```

**Campos deprecados:**
- `caendgeolo` — Mantener por compatibilidad, no usar en nuevas features
- `caendpenge` — Reemplazado por `caendgeost`

## Modelos Prisma objetivo

```prisma
model Carubro {
  carubid     String       @id @db.Char(30)
  carubdescr  String       @db.Char(40)
  carubtipor  String       @db.Char(3)  // PRE, FAR, DEL
  
  especialidades Caespeci[]
  cartillas      Cacartil[]
  
  @@map("carubro")
}

model Caentida {
  caentid     String       @id @db.Char(30)
  caentapeno  String       @db.Char(50)
  caentmail   String       @db.VarChar(100)
  caentweb    String       @db.VarChar(1000)
  caentmarca  Boolean
  caentprior  Int          @db.SmallInt
  
  direcciones  Caendire[]
  telefonos    Caentele[]
  cartillas    Cacartil[]
  favoritos    Camicart[]
  
  @@map("caentida")
}

model Caendire {
  caentid      String    @db.Char(30)
  caendid      String    @db.Char(30)
  nulocid      String    @db.Char(30)
  caendirecc   String    @db.VarChar(1024)
  caendirpri   String    @db.Char(1)
  caendgeolo   String    @db.Char(50)     // DEPRECATED
  caendhorat   String    @db.VarChar(100)
  caendpenge   String    @db.Char(1)      // DEPRECATED
  
  // Nuevos campos GEO
  caendlat     Decimal?  @db.Decimal(10, 7)
  caendlng     Decimal?  @db.Decimal(10, 7)
  caendgeost   String?   @db.VarChar(20)  // pending, success, error, manual
  caendgeoer   String?   @db.Text
  caendgeoup   DateTime? @db.Timestamp(6)
  caendupdated DateTime? @default(now()) @db.Timestamp(6)
  
  entidad      Caentida  @relation(fields: [caentid], references: [caentid])
  localidad    Nulocali  @relation(fields: [nulocid], references: [nulocid])
  telefonos    Caentele[]
  
  @@id([caentid, caendid])
  @@index([nulocid])
  @@index([caendlat, caendlng])
  @@index([caendgeost])
  @@map("caendire")
}

model Caentele {
  caentid     String  @db.Char(30)
  caendid     String  @db.Char(30)
  caenteleid  String  @db.Char(30)
  caentelefo  String  @db.Char(20)
  caentelepr  String  @db.Char(1)
  
  direccion   Caendire @relation(fields: [caentid, caendid], references: [caentid, caendid])
  
  @@id([caentid, caendid, caenteleid])
  @@map("caentele")
}

model Caespeci {
  caespid     String   @db.Char(30)
  carubid     String   @db.Char(30)
  caespdescr  String   @db.Char(40)
  
  rubro       Carubro  @relation(fields: [carubid], references: [carubid])
  cartillas   Cacartil[]
  
  @@id([caespid, carubid])
  @@index([carubid])
  @@map("caespeci")
}

model Cacartil {
  cacarid  String   @id @db.Char(36)
  nuplaid  String   @db.Char(30)
  carubid  String   @db.Char(30)
  caespid  String   @db.Char(30)
  caentid  String   @db.Char(30)
  
  entidad       Caentida @relation(fields: [caentid], references: [caentid])
  rubro         Carubro  @relation(fields: [carubid], references: [carubid])
  especialidad  Caespeci @relation(fields: [caespid, carubid], references: [caespid, carubid])
  
  @@index([caentid])
  @@index([caespid, carubid])
  @@unique([nuplaid, carubid, caespid, caentid])
  @@map("cacartil")
}

model Camicart {
  nuusuid    String   @db.Char(40)
  caentid    String   @db.Char(30)
  camictipoc String   @db.Char(1)
  
  usuario    Nuusuari @relation(fields: [nuusuid], references: [nuusuid])
  entidad    Caentida @relation(fields: [caentid], references: [caentid])
  
  @@id([nuusuid, caentid])
  @@index([caentid])
  @@map("camicart")
}

model Nulocali {
  nulocid    String  @id @db.Char(30)
  nuprovcod  String  @db.Char(2)
  nulocdescr String  @db.Char(50)
  
  provincia  Nuprovin @relation(fields: [nuprovcod], references: [nuprovcod])
  direcciones Caendire[]
  
  @@map("nulocali")
}

model Nuprovin {
  nuprovcod  String  @id @db.Char(2)
  nupais     String  @db.Char(2)
  nuprovdesc String  @db.Char(50)
  
  localidades Nulocali[]
  
  @@map("nuprovin")
}
```

## Queries necesarias para filtros

### 1. Listado básico (sin GEO)
```sql
SELECT e.*, d.*, t.caentelefo
FROM caentida e
JOIN caendire d ON e.caentid = d.caentid
LEFT JOIN caentele t ON d.caentid = t.caentid AND d.caendid = t.caendid AND t.caentelepr = 'S'
WHERE d.caendirpri = 'S'
  AND e.caentapeno ILIKE '%texto%'
ORDER BY e.caentprior DESC, e.caentapeno;
```

### 2. Filtro por especialidad
```sql
... JOIN cacartil c ON e.caentid = c.caentid
WHERE c.caespid = :especialidadId
  AND c.nuplaid = :planUsuario
```

### 3. Filtro GEO (cerca de mí)
```sql
SELECT e.*, d.*,
  (6371 * acos(cos(radians(:lat)) * cos(radians(d.caendlat)) * 
   cos(radians(d.caendlng) - radians(:lng)) + 
   sin(radians(:lat)) * sin(radians(d.caendlat)))) AS distancia_km
FROM caentida e
JOIN caendire d ON e.caentid = d.caentid
WHERE d.caendlat IS NOT NULL
  AND d.caendlng IS NOT NULL
  AND d.caendgeost = 'success'
  -- Bounding box optimization
  AND d.caendlat BETWEEN :lat - :delta AND :lat + :delta
  AND d.caendlng BETWEEN :lng - :delta AND :lng + :delta
HAVING distancia_km <= :radioKm
ORDER BY distancia_km ASC;
```

## Próximos pasos (en orden)

1. ✅ **Migración SQL:** Agregar campos GEO a `caendire`
2. ✅ **Schema Prisma:** Agregar modelos completos con relaciones
3. ✅ **Migración Prisma:** `prisma migrate dev --name baseline_cartillas_geo`
4. ⏳ **Seed inicial:** Marcar registros existentes como `caendgeost = 'pending'`
5. ⏳ **Repository:** `backend/repositories/cartillasRepository.js`

## Evidencia

- Análisis completo: Este documento
- Modelos Prisma: Por definir en `schema.prisma`
- Migración SQL: Por crear como `backend/db/add_cartillas_geo_fields.sql`
