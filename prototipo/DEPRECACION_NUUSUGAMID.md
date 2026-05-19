# Deprecación del Campo nuusugamid

**Fecha:** 18 de diciembre de 2025  
**Estado:** ✅ Completado

---

## 🎯 Problema Identificado

El campo `nuusugamid` en la tabla `nuusuari` era **redundante** con `nuusuid`:

- **`nuusuid`** (PK, VARCHAR 100): Ya almacena DIRECTAMENTE el UserID de GAM (string) o ID legacy (numérico)
- **`nuusugamid`** (VARCHAR 100): Almacenaba duplicadamente el UserID de GAM

**Decisión:** Deprecar `nuusugamid` y usar **`nuusuid`** como única fuente de verdad.

---

## 📋 Cambios Realizados

### 1. ✅ Migración GAM - `backend/db/migrate_gam_integration.sql`

#### Cambios en comentarios y documentación:

```sql
-- 2. Agregar columnas para información de GAM
-- NOTA: nuusugamid está DEPRECADO - nuusuid es el campo único que almacena UserID de GAM
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusugamid VARCHAR(100);
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusugamtok TEXT;
ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusugamexp TIMESTAMP;

COMMENT ON COLUMN nuusuari.nuusugamid IS 'DEPRECADO - No usar. nuusuid almacena el UserID de GAM directamente';
```

**Razón:** Mantener el campo por compatibilidad pero marcar como deprecado.

---

### 2. ✅ Vista `v_usuarios_tipo` - Detección por formato de `nuusuid`

**ANTES (basado en `nuusugamid`):**
```sql
CREATE OR REPLACE VIEW v_usuarios_tipo AS
SELECT 
  nuusuid,
  CASE 
    WHEN nuusugamid IS NOT NULL THEN 'GAM'
    WHEN nuusuid ~ '^[0-9]+$' THEN 'LOCAL'
    ELSE 'DESCONOCIDO'
  END AS tipo_autenticacion,
  nuusugamid,
  ...
FROM nuusuari;
```

**DESPUÉS (basado en formato de `nuusuid`):**
```sql
CREATE OR REPLACE VIEW v_usuarios_tipo AS
SELECT 
  nuusuid,
  CASE 
    -- Usuario GAM: nuusuid NO es numérico (UserID es string UUID)
    WHEN nuusuid !~ '^[0-9]+$' AND nuusuid IS NOT NULL THEN 'GAM'
    -- Usuario legacy: nuusuid es numérico autogenerado
    WHEN nuusuid ~ '^[0-9]+$' THEN 'LOCAL'
    ELSE 'DESCONOCIDO'
  END AS tipo_autenticacion,
  nuusugamexp,
  ...
FROM nuusuari;
```

**Beneficios:**
- ✅ Detección automática sin depender de campo adicional
- ✅ Más eficiente (un campo menos en SELECT)
- ✅ Coherente con arquitectura (nuusuid es la PK única)

---

### 3. ✅ `server-soap.js` - Línea 1953

**ANTES (guardaba redundantemente en `nuusugamid`):**
```javascript
await db.query(
  'UPDATE nuusuari SET nuusugamid = $1, nuusugamtok = $2, nuusugamexp = $3 WHERE nuusuid = $4',
  [
    gamUserData.userId || gamUserData.UserGUID,
    gamUserData.access_token,
    new Date(Date.now() + (gamUserData.expires_in || 3600) * 1000),
    nuusuid
  ]
)
```

**DESPUÉS (solo actualiza token y expiración):**
```javascript
// NOTA: nuusuid ya contiene el UserID de GAM, solo actualizamos token y expiración
await db.query(
  'UPDATE nuusuari SET nuusugamtok = $1, nuusugamexp = $2 WHERE nuusuid = $3',
  [
    gamUserData.access_token,
    new Date(Date.now() + (gamUserData.expires_in || 3600) * 1000),
    nuusuid
  ]
)
```

**Beneficios:**
- ✅ Elimina escritura redundante
- ✅ Query más eficiente (menos parámetros)
- ✅ Menos riesgo de inconsistencia

---

### 4. ✅ `server-soap.js` - Línea 4789 (Desactivación GAM)

**ANTES (verificaba `nuusugamid`):**
```javascript
const userInfo = await db.pool.query(
  'SELECT nuusugamid, nuusumail FROM nuusuari WHERE nuusuid = $1',
  [nuusuid]
)

if (userInfo.rows.length > 0 && userInfo.rows[0].nuusugamid) {
  console.log('🔐 Desactivando usuario en GAM...')
  // await gamService.deactivateUserGAM(userInfo.rows[0].nuusugamid)
}
```

**DESPUÉS (detecta por formato de `nuusuid`):**
```javascript
const userInfo = await db.pool.query(
  'SELECT nuusuid, nuusumail FROM nuusuari WHERE nuusuid = $1',
  [nuusuid]
)

// Usuario GAM si nuusuid NO es numérico (UserID de GAM es string)
const isGamUser = userInfo.rows.length > 0 && !/^[0-9]+$/.test(userInfo.rows[0].nuusuid)

if (isGamUser) {
  console.log('🔐 Usuario GAM detectado, desactivando en GAM...')
  // await gamService.deactivateUserGAM(userInfo.rows[0].nuusuid)
}
```

**Beneficios:**
- ✅ Usa `nuusuid` directamente como parámetro GAM (es el UserID)
- ✅ Detección automática por patrón regex
- ✅ No depende de campo adicional

---

### 5. ✅ Documentación - `VERIFICACION_REGLA_1_ARQUITECTURA.md`

Actualizado para reflejar:
- `nuusuid` es el **único campo** que almacena ID de usuario
- `nuusugamid` está **deprecado**
- Detección de tipo de usuario por **formato de nuusuid**

---

## 🔍 Lógica de Detección Usuario GAM vs Legacy

### Por Formato de `nuusuid`

```javascript
// Usuario GAM: nuusuid NO cumple patrón numérico
const isGamUser = !/^[0-9]+$/.test(nuusuid)

// Ejemplos:
// GAM:    "a1b2c3d4-e5f6-7890-abcd-ef1234567890" → true (contiene guiones)
// GAM:    "ABC123XYZ456"                          → true (contiene letras)
// Legacy: "12345"                                  → false (solo dígitos)
// Legacy: "98765432"                               → false (solo dígitos)
```

### En SQL

```sql
-- Usuarios GAM
SELECT * FROM nuusuari WHERE nuusuid !~ '^[0-9]+$' AND nuusuid IS NOT NULL;

-- Usuarios Legacy
SELECT * FROM nuusuari WHERE nuusuid ~ '^[0-9]+$';
```

---

## ⚠️ Campos Afectados en `nuusuari`

| Campo | Estado | Uso |
|-------|--------|-----|
| `nuusuid` | ✅ **ACTIVO** | PK - Almacena UserID GAM (string) o ID legacy (numérico) |
| `nuusugamid` | ⚠️ **DEPRECADO** | Redundante - NO usar en código nuevo |
| `nuusugamtok` | ✅ **ACTIVO** | access_token temporal de GAM |
| `nuusugamexp` | ✅ **ACTIVO** | Fecha expiración token GAM |

---

## 📊 Impacto en Otros Archivos

### Archivos que aún referencian `nuusugamid` (requieren actualización futura):

1. `backend/apply-gam-migration.js` - Script de migración
2. `backend/db/migrate_logical_deletion.sql` - Migración eliminación lógica
3. `backend/apply-logical-deletion-simple.js` - Script eliminación lógica
4. `backend/update-to-use-bajaf.js` - Script update bajaf
5. `backend/db/migrate-to-nuusubajaf-complete.js` - Migración completa bajaf
6. `backend/delete-users-without-gam.js` - Script limpieza usuarios

**Acción Recomendada:** Actualizar estos scripts para usar detección por formato de `nuusuid` en lugar de `nuusugamid`.

---

## ✅ Verificación

### Queries de Prueba

```sql
-- 1. Verificar usuarios GAM (nuusuid NO numérico)
SELECT nuusuid, nuusumail, nuusuapell
FROM nuusuari
WHERE nuusuid !~ '^[0-9]+$' AND nuusuid IS NOT NULL;

-- 2. Verificar usuarios Legacy (nuusuid numérico)
SELECT nuusuid, nuusumail, nuusuapell
FROM nuusuari
WHERE nuusuid ~ '^[0-9]+$';

-- 3. Usar vista actualizada
SELECT nuusuid, nuusumail, tipo_autenticacion
FROM v_usuarios_tipo;

-- 4. Verificar inconsistencias (nuusugamid diferente de nuusuid)
SELECT nuusuid, nuusugamid, nuusumail
FROM nuusuari
WHERE nuusugamid IS NOT NULL 
  AND nuusugamid != nuusuid;
```

---

## 🎯 Resumen de Beneficios

1. ✅ **Simplicidad:** Un solo campo (`nuusuid`) para ID de usuario
2. ✅ **Consistencia:** PK es la única fuente de verdad
3. ✅ **Eficiencia:** Menos campos, menos actualizaciones, menos joins
4. ✅ **Mantenibilidad:** Menos posibilidad de inconsistencia entre campos
5. ✅ **Claridad:** Arquitectura más limpia y entendible
6. ✅ **Detección automática:** No requiere campo adicional para identificar tipo

---

## 📝 Conclusión

El campo `nuusugamid` era **redundante** desde el inicio. La migración original (`migrate_gam_integration.sql`) cambió `nuusuid` a VARCHAR(100) para **almacenar directamente** el UserID de GAM, por lo que crear un campo adicional `nuusugamid` con el mismo valor era innecesario.

**Estado Final:**
- ✅ `nuusuid` = UserID de GAM (string) o ID legacy (numérico) - **ÚNICO CAMPO**
- ⚠️ `nuusugamid` = DEPRECADO (mantener por compatibilidad pero no usar)
- ✅ Detección de tipo por formato de `nuusuid` (regex `^[0-9]+$`)
- ✅ Código actualizado en archivos críticos (`server-soap.js`, migración, vista)

---

**Documentado por:** GitHub Copilot  
**Aprobado por:** Usuario  
**Fecha:** 18 de diciembre de 2025
