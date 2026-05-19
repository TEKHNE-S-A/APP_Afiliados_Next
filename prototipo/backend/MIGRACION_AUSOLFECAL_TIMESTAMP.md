# Migración de ausolfecal DATE → TIMESTAMP

## Propósito
Cambiar los campos `ausolfecal` y `ausolfecor` de la tabla `ausolici` de tipo `DATE` a `TIMESTAMP` para permitir ordenamiento eficiente con precisión de hora.

## Fecha
23 de diciembre de 2025

---

## Razones del Cambio

### Problema Actual
- Tipo `DATE` solo almacena fecha (YYYY-MM-DD)
- Múltiples solicitudes creadas el mismo día no se pueden ordenar correctamente
- No se registra la hora exacta de creación

### Solución
- Tipo `TIMESTAMP` almacena fecha y hora (YYYY-MM-DD HH:MI:SS)
- Permite ordenamiento preciso por hora de creación
- Facilita auditoría y seguimiento temporal

---

## Cambios en Base de Datos

### Campos Afectados

| Campo | Tipo Anterior | Tipo Nuevo | Descripción |
|-------|---------------|------------|-------------|
| `ausolfecal` | `DATE` | `TIMESTAMP` | Fecha y hora de alta |
| `ausolfecor` | `DATE` | `TIMESTAMP` | Fecha y hora de orden |

### Índices

**Índice eliminado:**
```sql
DROP INDEX IF EXISTS uausoli1;
```

**Índice nuevo:**
```sql
CREATE INDEX idx_ausolici_user_fecha 
  ON ausolici (nuusuid, ausolfecal DESC, ausolfecor DESC, ausolicid);
```

**Ventajas:**
- Optimizado para consultas con ORDER BY ausolfecal DESC
- Incluye columnas adicionales para evitar table scans
- Mejor performance en consultas paginadas

---

## Cambios en Backend

### Archivo: `server-soap.js`

**Línea 4498 - Creación de solicitudes:**

**Antes:**
```javascript
const fechaActual = new Date().toISOString().split('T')[0] // YYYY-MM-DD
```

**Después:**
```javascript
const fechaActual = new Date().toISOString() // YYYY-MM-DDTHH:mm:ss.sssZ
```

**Beneficios:**
- Timestamp completo con hora, minutos, segundos y milisegundos
- Compatible con formato ISO 8601
- PostgreSQL lo convierte automáticamente a TIMESTAMP

---

## Proceso de Migración

### 1. Ejecutar Script SQL

```powershell
cd backend
.\migrate-ausolfecal-timestamp.ps1
```

El script:
- ✅ Crea backup automático (`ausolici_backup_20251223`)
- ✅ Convierte DATE → TIMESTAMP (mantiene datos existentes)
- ✅ Recrea índices optimizados
- ✅ Verifica integridad de datos

### 2. Verificar Resultado

```sql
-- Ver tipos de dato
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns
WHERE table_name = 'ausolici' 
  AND column_name IN ('ausolfecal', 'ausolfecor');

-- Ver registros con timestamps
SELECT 
  ausolicid,
  ausolfecal,
  ausolfecor,
  ausoldescr
FROM ausolici
ORDER BY ausolfecal DESC
LIMIT 5;
```

### 3. Reiniciar Backend

```powershell
cd backend
.\restart-backend.ps1
```

### 4. Probar Funcionalidad

```powershell
# Crear nueva solicitud
.\test-crear-solicitud-simple.ps1

# Consultar autorizaciones (verifica ordenamiento)
.\test-mis-autorizaciones-simple.ps1
```

---

## Compatibilidad

### Datos Existentes
- ✅ Los registros existentes con DATE se convierten automáticamente
- ✅ Fechas antiguas quedan con hora 00:00:00 (no se pierde información)
- ✅ Nuevos registros tendrán timestamp completo

### Consultas SQL
- ✅ `ORDER BY ausolfecal DESC` funciona igual
- ✅ Comparaciones `WHERE ausolfecal > '2025-01-01'` compatibles
- ✅ Se puede usar `DATE(ausolfecal)` para extraer solo la fecha

### API Response
Las respuestas JSON incluyen timestamps completos:

**Antes:**
```json
{
  "fecha_alta": "2025-12-23"
}
```

**Después:**
```json
{
  "fecha_alta": "2025-12-23T15:30:45.123Z"
}
```

---

## Rollback (en caso necesario)

Si algo sale mal, restaurar desde backup:

```sql
BEGIN;
DROP TABLE IF EXISTS ausolici CASCADE;
ALTER TABLE ausolici_backup_20251223 RENAME TO ausolici;
COMMIT;
```

---

## Cleanup

Una vez verificado que todo funciona (después de 1-2 días):

```sql
-- Eliminar tabla de backup
DROP TABLE IF EXISTS ausolici_backup_20251223;
```

---

## Validación Final

### Checklist

- [ ] Script SQL ejecutado sin errores
- [ ] Verificado que no se perdieron registros
- [ ] Tipos de dato cambiados a TIMESTAMP
- [ ] Índice `idx_ausolici_user_fecha` creado
- [ ] Backend reiniciado
- [ ] Nueva solicitud creada exitosamente
- [ ] Fechas incluyen hora en logs
- [ ] Consulta `/mis-autorizaciones` ordena correctamente
- [ ] Frontend muestra fechas correctamente
- [ ] Performance de consultas igual o mejor

### Métricas de Performance

**Consulta de prueba:**
```sql
EXPLAIN ANALYZE
SELECT ausolicid, ausolfecal, ausoldescr 
FROM ausolici 
WHERE nuusuid = 'test-uuid'
ORDER BY ausolfecal DESC 
LIMIT 20;
```

**Resultado esperado:**
- Usa `idx_ausolici_user_fecha`
- Execution time < 5ms
- No full table scan

---

## Referencias

- **Script SQL:** `backend/db/migrate_ausolfecal_to_timestamp.sql`
- **Script PowerShell:** `backend/migrate-ausolfecal-timestamp.ps1`
- **Código Backend:** `backend/server-soap.js` línea 4498
- **Documentación Sync:** `backend/SINCRONIZACION_AUTORIZACIONES_SIA.md`

---

## Notas Adicionales

### Frontend (Mobile)
- La app móvil usa `formatFecha()` que maneja tanto DATE como TIMESTAMP
- No requiere cambios en el código de la app
- Los timestamps se muestran solo con fecha (DD/MM/AAAA)

### Performance
- TIMESTAMP ocupa 8 bytes vs 4 bytes de DATE
- Impacto mínimo en storage (4 bytes * 2 campos * N registros)
- Mejora significativa en ordenamiento y auditoría

### Zona Horaria
- PostgreSQL almacena TIMESTAMP en UTC
- Backend usa `.toISOString()` que genera UTC
- Conversión a zona local se hace en frontend

---

**Última actualización:** 23 de diciembre de 2025
