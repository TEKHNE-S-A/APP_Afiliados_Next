# Testing Plan: Parámetro Configurable Vigencia Credenciales

## Objetivo
Validar que el sistema de vigencia de credenciales utiliza correctamente el parámetro configurable `nusispar.VigenciaCred` en lugar de un valor fijo hardcoded.

---

## Pre-requisitos

### 1. Base de Datos
- PostgreSQL corriendo en `localhost:5432`
- Base de datos: `app_afiliados_genexus`
- Tablas requeridas: `nuusuari`, `crcreden`, `crcredus`, `nusispar`

### 2. Parámetro Inicial
Ejecutar script de inserción:
```powershell
cd backend\db
psql -U postgres -d app_afiliados_genexus -f insert_parametro_vigencia_credencial.sql
```

Verificar inserción:
```sql
SELECT nusisgrupa, nusistippa, nusisvalpa 
FROM nusispar 
WHERE nusisgrupa = 'GENERALES' AND nusistippa = 'VigenciaCred';
```

Resultado esperado:
```
 nusisgrupa | nusistippa  | nusisvalpa 
------------+-------------+------------
 GENERALES  | VigenciaCred| 10
```

### 3. Backend
```powershell
cd backend
# Si puerto 3000 ocupado:
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }

# Iniciar servidor
node server-soap.js
```

---

## Test Case 1: Verificar Carga de Parámetro (Valor por Defecto)

### Pasos
1. Backend iniciado con parámetro `VigenciaCred = 10`
2. Realizar login desde app móvil con usuario existente
3. Monitorear logs del backend

### Logs Esperados
```
📊 getDiasVigenciaCredencial: Consultando parámetro VigenciaCred...
✅ Parámetro VigenciaCred encontrado: 10 días
```

### Validación BD
```sql
-- Verificar que credenciales insertadas tienen fecha vencimiento correcta
SELECT 
    crcreid,
    crcrefecvi,
    crcreifech,
    (crcrefecvi - crcreifech) AS dias_diferencia
FROM crcreden
ORDER BY crcreifech DESC
LIMIT 5;
```

Resultado esperado (ejemplo con registración 2025-01-20 lunes):
- Si `nuusufecha = 2025-01-20` (lunes)
- 10 días hábiles → `crcrefecvi = 2025-02-03` (14 días calendario incluyendo 2 fines de semana)

---

## Test Case 2: Modificar Parámetro a 15 Días

### Pasos
1. Actualizar parámetro en BD:
```sql
UPDATE nusispar 
SET nusisvalpa = '15' 
WHERE nusisgrupa = 'GENERALES' AND nusistippa = 'VigenciaCred';
```

2. Reiniciar backend:
```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
node server-soap.js
```

3. Realizar nuevo login con usuario diferente o forzar sincronización

### Logs Esperados
```
📊 getDiasVigenciaCredencial: Consultando parámetro VigenciaCred...
✅ Parámetro VigenciaCred encontrado: 15 días
```

### Validación BD
```sql
-- Verificar nuevas credenciales con 15 días hábiles
SELECT 
    crcreid,
    crcrefecvi,
    crcreifech,
    (crcrefecvi - crcreifech) AS dias_diferencia
FROM crcreden
WHERE crcreifech > NOW() - INTERVAL '5 minutes'
ORDER BY crcreifech DESC;
```

Resultado esperado (ejemplo con registración 2025-01-20 lunes):
- Si `nuusufecha = 2025-01-20` (lunes)
- 15 días hábiles → `crcrefecvi = 2025-02-10` (21 días calendario incluyendo 3 fines de semana)

---

## Test Case 3: Fallback con Parámetro Inexistente

### Pasos
1. Eliminar temporalmente el parámetro:
```sql
DELETE FROM nusispar 
WHERE nusisgrupa = 'GENERALES' AND nusistippa = 'VigenciaCred';
```

2. Reiniciar backend
3. Realizar login

### Logs Esperados
```
📊 getDiasVigenciaCredencial: Consultando parámetro VigenciaCred...
⚠️  Parámetro VigenciaCred no encontrado, usando fallback: 10 días
```

### Validación
- Sistema debe continuar funcionando con 10 días por defecto
- NO debe lanzar error que bloquee la sincronización

### Limpieza
Restaurar parámetro:
```powershell
psql -U postgres -d app_afiliados_genexus -f insert_parametro_vigencia_credencial.sql
```

---

## Test Case 4: Validar Fecha Base (nuusufecha vs fecha actual)

### Escenario A: Usuario con fecha registración antigua
```sql
-- Crear usuario de prueba con fecha registración antigua
INSERT INTO nuusuari (nuusuid, nuusumail, nuusupass, nuusuusna, nuusuapel, nuusucuil, nuusudocu, nuususexo, nuusunace, nuusufecha)
VALUES (9999, 'test@example.com', 'hash_test', 'Usuario', 'Prueba', '20123456789', '12345678', 'M', '1990-01-01', '2024-12-01');
```

### Validación
Credenciales deben calcularse desde `2024-12-01` + N días hábiles (no desde fecha actual)

### Escenario B: Usuario sin nuusufecha
Si `nuusufecha` es NULL, sistema debe usar fecha actual como fallback.

---

## Test Case 5: Cálculo Correcto Días Hábiles

### Validar exclusión de fines de semana
Ejemplo manual:
- Fecha base: viernes 2025-01-17
- 10 días hábiles:
  * Semana 1 (20-24 enero): 5 días → llega al viernes 24
  * Semana 2 (27-31 enero): 5 días → llega al viernes 31
  * **Resultado**: `2025-01-31`

Días calendario: 14 días (incluye 2 sábados + 2 domingos)

### Query Verificación
```sql
SELECT 
    crcreid,
    TO_CHAR(crcreifech, 'Day DD/MM/YYYY') AS fecha_insercion,
    TO_CHAR(crcrefecvi, 'Day DD/MM/YYYY') AS fecha_vencimiento,
    (crcrefecvi - crcreifech) AS dias_calendario
FROM crcreden
WHERE crcreifech::date = '2025-01-17'::date;
```

---

## Checklist Final

- [ ] Parámetro `VigenciaCred` insertado en `nusispar`
- [ ] Backend carga parámetro correctamente (logs visibles)
- [ ] Credenciales insertadas usan fecha vencimiento correcta (base + días hábiles)
- [ ] Modificar parámetro a 15 días funciona sin reiniciar código
- [ ] Fallback a 10 días cuando parámetro no existe
- [ ] Cálculo usa `nuusufecha` como fecha base (no fecha actual)
- [ ] Días hábiles excluyen correctamente sábados y domingos
- [ ] Sistema estable sin errores en logs

---

## Rollback / Troubleshooting

### Error: "relation nusispar does not exist"
DDL no aplicado completo. Ejecutar:
```powershell
psql -U postgres -d app_afiliados_genexus -f backend\db\dll_estructura_app_final2.sql
```

### Error: "Cannot query nusispar"
Verificar permisos usuario PostgreSQL:
```sql
GRANT SELECT ON nusispar TO tu_usuario;
```

### Logs no muestran consulta parámetro
Verificar que función `getDiasVigenciaCredencial()` es llamada (debe aparecer en logs al sincronizar credenciales).

### Fechas incorrectas
- Validar zona horaria servidor
- Verificar que `addBusinessDays()` excluye sábados/domingos correctamente
- Revisar que `nuusufecha` no es NULL o tiene fecha futura

---

## Próximos Pasos Post-Testing

1. Documentar resultados en PR
2. Agregar tests unitarios para `addBusinessDays()` y `getDiasVigenciaCredencial()`
3. Considerar agregar endpoint admin para modificar parámetros sin acceso directo a BD
4. Evaluar agregar más parámetros configurables (ej: vigencia documentación, timeout SOAP)

---

**Autor**: Sistema AI  
**Fecha**: 2025-01-20  
**Versión**: 1.0
