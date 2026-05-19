# Semana 12 — ETL Cartilla Externa (COMPLETADA)

**Período:** 24/03–30/03/2026  
**Estado:** ✅ **COMPLETADO**

## Objetivos de la Semana
- [x] Implementar script import con UPSERT por `id_origen`
- [x] Registrar `last_sync` (auditoría de sincronización)
- [x] Importar datos de cartilla externa (2771 registros)

---

## Resultados Finales

### Importación Producción
```
Total líneas:     2771
Procesadas:       2771 (100%)
Insertadas:       2669 (nuevas)
Actualizadas:     102 (existentes)
Bajas lógicas:    0
Errores:          0
```

### Distribución por Rubro
| Rubro | Cantidad |
|-------|----------|
| MEDICO | 1964 |
| INSTITUTO | 40 |
| CENTRO | 32 |
| SANATORIO | 26 |
| CLINICA | 10 |
| LABORATORIO | 5 |
| COLEGIO | 2 |

### Estado de Geocodificación
- **Todos los registros** tienen `caendpenge='N'` (pendiente)
- **Listos para Semana 13**: Batch geocoding con Google Maps API

---

## Componentes Implementados

### 1. Servicio ETL
**Archivo:** `backend/services/cartillaImportService.js`

**Funcionalidades:**
- Streaming JSONL para archivos grandes
- Procesamiento por lotes (batch 100 registros)
- UPSERT por `caentid` (ID origen)
- Manejo de relaciones:
  - `caentida` (entidad principal)
  - `caendire` (direcciones)
  - `caentele` (teléfonos)
  - `carubro` (rubros)
  - `caespeci` (especialidades)
  - `cacartil` (relación entidad-rubro-especialidad)
- Detección de cambios (hash SHA-256)
- Auditoría completa (fecha actualización)

**Patrones técnicos:**
- `findFirst()` + `updateMany()` para compound PKs
- Substring limits para compliance con schema DB
- Triple compound PK para `caentele` (caentid, caendid, caenteleid)
- Manejo de campos NULL (caentprior, caendhorat, caendgeolo)

### 2. Scripts PowerShell

#### `import-cartilla-external.ps1`
- Wrapper principal para importación
- Parámetros: `-FilePath`, `-DryRun`, `-BatchSize`
- Logs detallados con códigos de color
- Estadísticas finales (JSON)

#### `test-import-cartilla-sample.ps1`
- Test harness con muestras pequeñas
- Copia N líneas de archivo producción
- Validación incremental (2-3-5-10 líneas)

#### `analyze-cartilla-file.ps1`
- Análisis pre-import sin escritura DB
- Reporte movimientos (A/B/M)
- Distribución de rubros
- Guía de field mappings

### 3. Schema Prisma

**Modelos introspectados (7 tablas):**
```prisma
model Carubro {
  carubid      String      @id @db.VarChar(10)
  carubdescr   String?     @db.VarChar(60)
  carubtipor   String?     @db.Char(1)
}

model Caespeci {
  caespid      String      @db.VarChar(10)
  carubid      String      @db.VarChar(10)
  caespdescr   String?     @db.VarChar(60)
  @@id([caespid, carubid])
}

model Caentida {
  caentid      String      @id @db.VarChar(10)
  caentapeno   String?     @db.VarChar(100)
  caentmail    String?     @db.VarChar(100)
  caentweb     String?     @db.VarChar(100)
  caentmarca   String?     @db.Char(1)
  caentprior   Decimal?    @db.Decimal(5,2)
}

model Caendire {
  caentid      String      @db.VarChar(10)
  caendid      Decimal     @db.Decimal(3,0)
  nulocid      String?     @db.VarChar(5)
  caendirecc   String?     @db.VarChar(100)
  caendirpri   String?     @db.Char(1)
  caendgeolo   String?     @db.VarChar(100)
  caendhorat   String?     @db.VarChar(100)
  caendpenge   String?     @db.Char(1)
  caendlat     Decimal?    @db.Decimal(10,7)
  caendlng     Decimal?    @db.Decimal(10,7)
  caendgeost   String?     @db.Char(1)
  caendgeoer   String?     @db.VarChar(500)
  caendgeoup   DateTime?   @db.Timestamp(6)
  caendupdated DateTime?   @db.Timestamp(6)
  @@id([caentid, caendid])
}

model Caentele {
  caentid      String      @db.VarChar(10)
  caendid      Decimal     @db.Decimal(3,0)
  caenteleid   Decimal     @db.Decimal(3,0)
  caentelefo   String?     @db.VarChar(50)
  caentelepr   String?     @db.Char(1)
  @@id([caentid, caendid, caenteleid])
}

model Cacartil {
  cacarid      String      @id @db.VarChar(36)
  nuplaid      String?     @db.VarChar(9)
  carubid      String?     @db.VarChar(10)
  caespid      String?     @db.VarChar(10)
  caentid      String?     @db.VarChar(10)
}

model Camicart {
  camicid      Decimal     @id @db.Decimal(10,0)
  cacarid      String?     @db.VarChar(36)
  camicdescr   String?     @db.VarChar(100)
}
```

**Campos GEO en `caendire`:**
- `caendlat`: Decimal(10,7) — latitud
- `caendlng`: Decimal(10,7) — longitud
- `caendgeost`: Char(1) — status geocoding (N=pendiente, S=ok, E=error)
- `caendgeoer`: VarChar(500) — mensaje de error
- `caendgeoup`: Timestamp — fecha último geocoding
- `caendupdated`: Timestamp — fecha última actualización

### 4. Correcciones de Schema

**Descubrimientos críticos:**
- Field names en DB ≠ diseño inicial
- Compound PKs requieren `findFirst()` + `updateMany()`
- Triple compound PK en `caentele`: (caentid, caendid, caenteleid)
- Substring limits: `cacarid` max 36 chars

**Soluciones aplicadas:**
```javascript
// Antes (FALLA - compound PK no soportado en upsert)
await prisma.caespeci.upsert({
  where: { caespid_carubid: { caespid, carubid } }
});

// Después (FUNCIONA)
const existing = await prisma.caespeci.findFirst({
  where: { caespid, carubid }
});
if (existing) {
  await prisma.caespeci.updateMany({
    where: { caespid, carubid },
    data: { caespdescr }
  });
} else {
  await prisma.caespeci.create({
    data: { caespid, carubid, caespdescr }
  });
}
```

---

## Proceso de Importación

### Flujo ETL Completo

1. **Lectura Streaming**
   - Archivo JSONL de 2771 líneas
   - Parser con escape de comillas dobles `""`
   - Buffer batch de 100 registros

2. **Procesamiento Entidad**
   - UPSERT `caentida` por `caentid`
   - Hash SHA-256 para detectar cambios
   - Auditoría: `caendupdated = NOW()`

3. **Procesamiento Direcciones**
   - UPSERT `caendire` por (caentid, caendid)
   - Campos GEO inicializados: `caendpenge='N'`, lat/lng NULL
   - Geocodificación pendiente para Semana 13

4. **Procesamiento Teléfonos**
   - UPSERT `caentele` por (caentid, caendid, caenteleid)
   - Triple compound PK manejado correctamente

5. **Procesamiento Rubro/Especialidad**
   - UPSERT `carubro` por `carubid`
   - UPSERT `caespeci` por (caespid, carubid) - compound PK
   - CREATE `cacartil` (relación entidad-rubro-especialidad)

6. **Estadísticas Finales**
   - Conteo por movimiento (I/U/B/E)
   - Distribución por rubro
   - Reporte JSON + log colorizado

---

## Testing y Validación

### Test Incremental
```powershell
# Test 2 líneas
.\test-import-cartilla-sample.ps1 -NumLineas 2

# Test 3 líneas
.\test-import-cartilla-sample.ps1 -NumLineas 3

# Test 5 líneas
.\test-import-cartilla-sample.ps1 -NumLineas 5

# Test 10 líneas
.\test-import-cartilla-sample.ps1 -NumLineas 10
```

**Resultados:** ✅ Todos los tests pasaron con 0 errores

### Importación Producción
```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados\backend
.\import-cartilla-external.ps1 -BatchSize 100
```

**Duración:** ~2 minutos  
**Performance:** ~23 registros/segundo  
**Errores:** 0

---

## Lecciones Aprendidas

### 1. Introspección de Schema es Esencial
**Problema:** Diseño inicial vs realidad de DB  
**Solución:** `npx prisma db pull --force` para sincronizar schema  
**Aprendizaje:** Siempre introspeccionar BD legacy antes de escribir código

### 2. Compound PKs Requieren Workarounds
**Problema:** Prisma `upsert()` no soporta compound PKs  
**Solución:** Patrón `findFirst()` + `updateMany()` / `create()`  
**Aprendizaje:** Documentar patterns para compound PKs en guías

### 3. Field Length Limits son Críticos
**Problema:** `cacarid` acepta strings ilimitadas en JS, pero DB tiene limit 36  
**Solución:** `substring(0, 36)` en todos los inserts  
**Aprendizaje:** Validar limits ANTES de importar datos

### 4. Batch Processing es Necesario
**Problema:** 2771 registros en memoria = crash potencial  
**Solución:** Streaming JSONL + batches de 100  
**Aprendizaje:** Siempre diseñar ETL para escalabilidad

---

## Preparación para Semana 13

### Registros Pendientes de Geocodificación
```sql
SELECT COUNT(*) FROM caendire WHERE caendpenge = 'N';
-- Resultado: 2771 direcciones pendientes
```

### Próximos Pasos
1. **Servicio de Geocoding:**
   - Integración Google Maps Geocoding API
   - Batch processing con rate limiting (cuotas API)
   - Retry logic para errores transitorios
   - Persistencia de lat/lng y status

2. **Panel de Monitoreo:**
   - Estadísticas: % geocodificado, errores, pendientes
   - Botón manual "Procesar batch"
   - Log de errores geocoding

3. **Optimizaciones:**
   - Índices en campos GEO (lat/lng/status)
   - Query por bounding box para filtros geográficos
   - Distancia Haversine para "cerca de mí"

---

## Archivos Generados

### Scripts
- `backend/services/cartillaImportService.js` (ETL service - 450 líneas)
- `backend/import-cartilla-external.ps1` (main script - 80 líneas)
- `backend/test-import-cartilla-sample.ps1` (test harness - 60 líneas)
- `backend/analyze-cartilla-file.ps1` (analyzer - 90 líneas)

### Utilitarios
- `backend/check-cartillas-schema.js` (schema checker)
- `backend/check-caentele-schema.js` (PK validator)

### Data
- `backend/data/cartilla_test_sample.jsonl` (test samples)
- Archivo producción: `E:\MisProyectos\ophtha-antifraud-platform\src\cartilla\7900_CARTILLA_PRESTADORES.txt`

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Líneas procesadas | 2771 |
| Entidades insertadas | 2669 |
| Entidades actualizadas | 102 |
| Direcciones creadas | 2771 |
| Teléfonos creados | 2771 |
| Rubros únicos | 7 |
| Especialidades únicas | ~40 |
| Relaciones cartilla | 2771 |
| Tiempo procesamiento | ~2 min |
| Performance | ~23 reg/s |
| Errores | 0 |

---

## Estado Final

✅ **Semana 12 COMPLETADA**

**Hito alcanzado:** ETL funcional para importación completa de cartilla externa con auditoría y detección de cambios.

**Pendiente para Semana 13:** Geocodificación batch de 2771 direcciones con Google Maps API.

---

## Comandos Útiles

```powershell
# Importación producción
.\import-cartilla-external.ps1 -BatchSize 100

# Test con muestra
.\test-import-cartilla-sample.ps1 -NumLineas 10

# Análisis sin escritura
.\analyze-cartilla-file.ps1

# Check schema
node check-cartillas-schema.js

# Regenerar Prisma client
npx prisma generate

# Introspeccionar BD
npx prisma db pull --force
```

---

**Próxima reunión:** Revisión de diseño geocoding batch (Semana 13)
