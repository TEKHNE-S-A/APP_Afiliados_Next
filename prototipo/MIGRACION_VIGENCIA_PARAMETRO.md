# Migración: Vigencia Credenciales desde Parámetro Configurable

## Resumen
Se migró el sistema de cálculo de fecha de vencimiento de credenciales (`crcrefecvi`) desde un valor fijo hardcoded (10 días hábiles) a un parámetro configurable almacenado en la tabla `nusispar`.

---

## Cambios Implementados

### 1. Backend - Funciones Helper (`server-soap.js`)

#### Nueva función: `getDiasVigenciaCredencial()`
- **Ubicación**: Líneas ~105-125
- **Propósito**: Consultar parámetro de vigencia desde tabla `nusispar`
- **Query SQL**: 
  ```sql
  SELECT nusisvalpa FROM nusispar 
  WHERE nusisgrupa='GENERALES' AND nusistippa='VigenciaCred'
  ```
- **Retorno**: `parseInt(nusisvalpa)` o fallback `10` días
- **Logs**: 
  - `📊 getDiasVigenciaCredencial: Consultando parámetro VigenciaCred...`
  - `✅ Parámetro VigenciaCred encontrado: N días`
  - `⚠️ Parámetro VigenciaCred no encontrado, usando fallback: 10 días`

#### Función modificada: `getDefaultVencimiento(fechaRegistracion)`
- **Cambio**: De función sync → async
- **Parámetro nuevo**: `fechaRegistracion` (opcional)
- **Lógica**:
  1. Llama `await getDiasVigenciaCredencial()` para obtener días vigencia
  2. Calcula fecha base: `fechaRegistracion || new Date()`
  3. Suma días hábiles con `addBusinessDays(fechaBase, diasVigencia)`
- **Fecha base**: Prioriza `nuusufecha` (fecha registración usuario) sobre fecha actual

#### Función existente: `addBusinessDays(date, days)`
- **Sin cambios** (ya existía)
- **Propósito**: Sumar días hábiles excluyendo sábados y domingos
- **Ejemplo**: 
  - Fecha base: lunes 2025-01-20
  - 10 días hábiles → viernes 2025-01-31 (14 días calendario)

---

### 2. Backend - Funciones de Persistencia

#### `insertCredencial(client, cred, hash, fechaRegistracion)`
- **Parámetro agregado**: `fechaRegistracion = null`
- **Cambio línea ~421**: 
  ```javascript
  // Antes
  const fechaVencimiento = getDefaultVencimiento()
  
  // Ahora
  const fechaVencimiento = await getDefaultVencimiento(fechaRegistracion)
  ```
- **Comentario actualizado**: "calcular desde fecha registración + días vigencia (parámetro)"

#### `updateCredencial(client, cred, hash, fechaRegistracion)`
- **Cambios simétricos** a `insertCredencial()`
- **Línea ~459**: Usa `await getDefaultVencimiento(fechaRegistracion)`

---

### 3. Backend - Sincronización SOAP

#### `syncCredencialesGrupoFamiliar(nuusuid, afiliadoId)`
- **Nuevo paso inicial (líneas ~494-505)**:
  ```javascript
  // 0. Obtener fecha de registración del usuario (nuusufecha)
  let fechaRegistracion = null
  try {
    const userResult = await client.query(
      'SELECT nuusufecha FROM nuusuari WHERE nuusuid = $1',
      [nuusuid]
    )
    if (userResult.rows.length > 0) {
      fechaRegistracion = userResult.rows[0].nuusufecha
      console.log(`📅 Fecha registración usuario: ${fechaRegistracion}`)
    }
  } catch (err) {
    console.warn('⚠️  No se pudo obtener nuusufecha, usando fecha actual como base')
  }
  ```

- **Loop credenciales modificado (líneas ~568-570, ~573-575)**:
  ```javascript
  // INSERT
  await insertCredencial(client, cred, hash, fechaRegistracion)
  
  // UPDATE
  await updateCredencial(client, cred, hash, fechaRegistracion)
  ```

---

### 4. Base de Datos - Scripts SQL

#### Nuevo archivo: `insert_parametro_vigencia_credencial.sql`
- **Ubicación**: `backend/db/insert_parametro_vigencia_credencial.sql`
- **Contenido**:
  - Verifica si parámetro ya existe (DO block con IF NOT EXISTS)
  - Inserta: `('GENERALES', 'VigenciaCred', '10')`
  - Query verificación final
- **Uso**:
  ```powershell
  psql -U postgres -d app_afiliados_genexus -f backend/db/insert_parametro_vigencia_credencial.sql
  ```

#### Estructura tabla `nusispar` (ya existente en DDL)
```sql
CREATE TABLE nusispar (
    nusisgrupa bpchar(30) NOT NULL,
    nusistippa bpchar(30) NOT NULL,
    nusisvalpa text,
    CONSTRAINT nusispar_pkey PRIMARY KEY (nusisgrupa, nusistippa)
);
```

---

### 5. Documentación Actualizada

#### `backend/db/README.md`
- **Sección agregada**: `nusispar - Parámetros Sistema`
  ```markdown
  ### `nusispar` - Parámetros Sistema  
  **Configuración vigencia**: Controla días hábiles de vigencia para credenciales  
  **Setup**: `psql -U postgres -d app_afiliados_genexus -f insert_parametro_vigencia_credencial.sql`  
  **Parámetro clave**: `GENERALES.VigenciaCred` → valor por defecto: `10` días hábiles
  ```

#### `.github/copilot-instructions.md`
- **Actualizado bloque Backend SOAP**:
  ```markdown
  - Fecha vencimiento: fecha registración usuario + días configurables en `nusispar` (GENERALES.VigenciaCred)
  - Días vigencia configurable: query `SELECT nusisvalpa FROM nusispar WHERE nusisgrupa='GENERALES' AND nusistippa='VigenciaCred'`, fallback 10 días
  - Script inicial: `backend/db/insert_parametro_vigencia_credencial.sql` (inserta valor por defecto 10 días)
  ```

- **Sección Patrones de Integración**:
  ```markdown
  - Fecha vencimiento configurable:
    * Query a `nusispar`: WHERE nusisgrupa='GENERALES' AND nusistippa='VigenciaCred'
    * Fecha base: `nuusufecha` (fecha registración usuario) o fecha actual si no disponible
    * Días hábiles: valor de `nusisvalpa` (excluye sábados/domingos), fallback 10 días
    * Funciones: `getDiasVigenciaCredencial()` async, `getDefaultVencimiento(fechaRegistracion)` async
  ```

#### Nuevo documento: `TESTING_VIGENCIA_PARAMETRO.md`
- **Ubicación**: `backend/db/TESTING_VIGENCIA_PARAMETRO.md`
- **Contenido**: 5 test cases completos con queries, logs esperados, ejemplos de cálculo

---

## Flujo Completo

### Registro Usuario → Login → Sincronización Credenciales

1. **Registro**: Usuario se registra → tabla `nuusuari` almacena `nuusufecha = NOW()`
2. **Login**: POST `/auth/login` → dispara `syncCredencialesGrupoFamiliar()`
3. **Query fecha registración**: `SELECT nuusufecha FROM nuusuari WHERE nuusuid = $1`
4. **Query días vigencia**: `SELECT nusisvalpa FROM nusispar WHERE nusisgrupa='GENERALES' AND nusistippa='VigenciaCred'`
5. **Cálculo fecha vencimiento**: `fechaRegistracion + addBusinessDays(diasVigencia)`
6. **Persistencia**: INSERT/UPDATE en `crcreden` con `crcrefecvi = fechaVencimiento`

### Diagrama Simplificado
```
nuusuari.nuusufecha (2025-01-20 lunes)
           ↓
getDiasVigenciaCredencial() → nusispar.nusisvalpa = '10'
           ↓
addBusinessDays(2025-01-20, 10) → 2025-01-31 viernes
           ↓
crcreden.crcrefecvi = '2025-01-31'
```

---

## Testing Requerido

### Setup Inicial
```powershell
# 1. Insertar parámetro
cd backend\db
psql -U postgres -d app_afiliados_genexus -f insert_parametro_vigencia_credencial.sql

# 2. Reiniciar backend
cd ..
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
node server-soap.js
```

### Validación
1. Login desde app móvil → revisar logs backend:
   ```
   📊 getDiasVigenciaCredencial: Consultando parámetro VigenciaCred...
   ✅ Parámetro VigenciaCred encontrado: 10 días
   📅 Fecha registración usuario: 2025-01-20
   ```

2. Query BD:
   ```sql
   SELECT crcreid, crcrefecvi, crcreifech, (crcrefecvi - crcreifech) AS dias_calendario
   FROM crcreden
   ORDER BY crcreifech DESC
   LIMIT 5;
   ```

3. Cambiar parámetro:
   ```sql
   UPDATE nusispar SET nusisvalpa = '15' 
   WHERE nusisgrupa='GENERALES' AND nusistippa='VigenciaCred';
   ```

4. Reiniciar backend y validar nuevas credenciales usan 15 días

---

## Archivos Modificados

### Backend
- ✅ `backend/server-soap.js` (6 modificaciones)
  - Nueva función `getDiasVigenciaCredencial()`
  - Modificada `getDefaultVencimiento()` a async
  - Modificada `insertCredencial()` con parámetro `fechaRegistracion`
  - Modificada `updateCredencial()` con parámetro `fechaRegistracion`
  - Modificada `syncCredencialesGrupoFamiliar()` para obtener `nuusufecha`
  - Modificadas llamadas a `insertCredencial/updateCredencial` en loop

### Base de Datos
- ✅ `backend/db/insert_parametro_vigencia_credencial.sql` (nuevo)
- ✅ `backend/db/README.md` (actualizado con sección `nusispar`)
- ✅ `backend/db/TESTING_VIGENCIA_PARAMETRO.md` (nuevo)

### Documentación
- ✅ `.github/copilot-instructions.md` (2 secciones actualizadas)

---

## Rollback (si necesario)

### Código
Revertir funciones a versión anterior:
```javascript
// getDefaultVencimiento() - versión anterior sync
function getDefaultVencimiento() {
  const hoy = new Date()
  return addBusinessDays(hoy, 10) // hardcoded 10 días
}

// insertCredencial() - sin parámetro fechaRegistracion
async function insertCredencial(client, cred, hash) {
  const fechaVencimiento = getDefaultVencimiento() // sync
  // ...
}
```

### Base de Datos
Eliminar parámetro:
```sql
DELETE FROM nusispar 
WHERE nusisgrupa='GENERALES' AND nusistippa='VigenciaCred';
```

Sistema usará fallback automático de 10 días.

---

## Beneficios

1. **Flexibilidad**: Cambiar vigencia sin modificar código
2. **Auditoría**: Parámetros en BD permiten tracking de cambios
3. **Escalabilidad**: Fácil agregar más parámetros (ej: vigencia documentación)
4. **Fecha correcta**: Usa fecha registración usuario (no fecha actual)
5. **Resiliencia**: Fallback automático si parámetro no existe

---

## Próximas Mejoras Sugeridas

1. Agregar endpoint admin: `POST /admin/parametros` para modificar sin acceso directo a BD
2. Tests unitarios: `addBusinessDays()`, `getDiasVigenciaCredencial()`
3. Histórico: Tabla `nusispar_historico` para auditar cambios de parámetros
4. Validación: Constraint CHECK en `nusisvalpa` para asegurar valores numéricos positivos
5. UI Admin: Pantalla en app para gestión de parámetros (solo para administradores)

---

**Estado**: ✅ Implementación completa  
**Pendiente**: Testing end-to-end  
**Fecha**: 2025-01-20
