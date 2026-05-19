# Reparación de Usuarios GAM sin nuusuauth

## Problema

Cuando se migran usuarios a GAM manualmente (sin pasar por `/gam/register`), puede ocurrir que:
- ✅ El usuario tiene GUID en `nuusuari`
- ❌ NO tiene entrada en `nuusuauth` (tabla de autenticación)
- ❌ Login falla con: `"Contraseña no configurada para este usuario"`

## Causa

La función `migrateUserToGAM()` **solo actualiza** `nuusuauth` si ya existe, no lo crea si falta.

## Solución

### ✅ Solución 1: Reparación Masiva (Usuarios Existentes)

Script: `repair-missing-nuusuauth.js` + wrapper `repair-missing-nuusuauth.ps1`

**Paso 1: Dry Run (ver usuarios afectados)**
```powershell
cd backend
.\repair-missing-nuusuauth.ps1 -DryRun
# O directamente:
node repair-missing-nuusuauth.js --dry-run
```

**Paso 2: Ejecutar Reparación**
```powershell
.\repair-missing-nuusuauth.ps1
# O directamente:
node repair-missing-nuusuauth.js
```

**Resultado:**
- Crea entrada en `nuusuauth` para cada usuario sin autenticación
- Password por defecto: `123456`
- Solo usuarios activos (`nuusubajaf IS NULL` o `<= año 1900`)

**Ejemplo de ejecución:**
```
🔧 REPARACIÓN MASIVA DE NUUSUAUTH FALTANTES
====================================================
Password por defecto: 123456
====================================================

📊 Encontrados: 9 usuarios sin nuusuauth

Usuarios a reparar:
1. patricio.pinetta@tekhne.com.ar
   nuusuid: eb7aa016-f924-4114-aba8-fc30b27f13ad
   Tipo: DESCONOCIDO (GAM GUID)
   
✅ 9/9 reparados exitosamente
```

### ✅ Solución 2: Reparación Individual

Script: `fix-user-password.js`

```powershell
cd backend
node fix-user-password.js <email> <password>
```

**Ejemplo:**
```powershell
node fix-user-password.js ppinetta@gmail.com ppinetta26
```

### ✅ Solución 3: Prevención (Futuras Migraciones)

**Modificación en `server-soap.js` → `migrateUserToGAM()`:**

```javascript
// ANTES (solo actualizaba si existía):
if (authCheck.rows.length > 0) {
  await client.query('UPDATE nuusuauth SET nuusuid = $1 WHERE nuusuid = $2', [...])
}

// DESPUÉS (crea si no existe):
if (authCheck.rows.length > 0) {
  await client.query('UPDATE nuusuauth SET nuusuid = $1 WHERE nuusuid = $2', [...])
} else {
  // Crear con password por defecto
  const passwordHash = hashPassword('123456')
  await client.query(`INSERT INTO nuusuauth (nuusuid, nuusupass, ...) VALUES (...)`)
}
```

**Beneficio:** Todas las migraciones automáticas (al hacer login GAM con usuario LEGACY) crearán `nuusuauth` si falta.

## Verificación

Después de reparar, verificar con:

```powershell
node verify-user-migration.js <email>
```

**Resultado esperado:**
```
✅ nuusuari        - Tipo: DESCONOCIDO (GAM GUID)
✅ nuusuauth       - OK
⚠️ crcredus        - 0 registros (se sincronizan al login)
```

## Flujo Completo Post-Reparación

1. **Reparación ejecutada** → Usuario tiene `nuusuauth` con password `123456`
2. **Login en app** → Valida contraseña, sincroniza credenciales SOAP
3. **Credenciales disponibles** → Usuario puede ver credenciales del grupo familiar

## Notas Técnicas

### bpchar(40) Padding

- `nuusuid` es `bpchar(40)` → **40 caracteres exactos** con espacios
- ❌ NO usar `trim()` antes de comparar FK
- ✅ Preservar espacios para queries de BD
- ✅ Solo `trim()` para mostrar al usuario

**Ejemplo:**
```javascript
// ✅ CORRECTO
const nuusuid = user.nuusuid; // "eb7aa016-...    " (40 chars)
await db.query('SELECT * FROM nuusuauth WHERE nuusuid = $1', [nuusuid])

// ❌ INCORRECTO
const nuusuid = user.nuusuid.trim(); // "eb7aa016-..." (36 chars)
await db.query(...) // FK violation - no encontrará el registro
```

### Fechas Inválidas

Usuarios con `nuusubajaf = '0001-01-01'` se consideran ACTIVOS:

```sql
WHERE (nuusubajaf IS NULL OR EXTRACT(YEAR FROM nuusubajaf) <= 1900)
```

## Scripts Disponibles

| Script | Propósito | Modo |
|--------|-----------|------|
| `repair-missing-nuusuauth.js` | Reparación masiva | Dry-run / Full |
| `repair-missing-nuusuauth.ps1` | Wrapper PowerShell | Dry-run / Full |
| `fix-user-password.js` | Reparación individual | Full |
| `verify-user-migration.js` | Verificación 6 tablas | Read-only |
| `sync-credentials.js` | Forzar sync credenciales | Full |

## Casos de Uso

### Caso 1: Usuario migrado manualmente
- **Síntoma:** Login falla con "contraseña no configurada"
- **Solución:** `repair-missing-nuusuauth.js` (crea password por defecto)

### Caso 2: Usuario migrado pero sin credenciales
- **Síntoma:** Login OK pero no ve credenciales
- **Diagnóstico:** Verificar que `nuusuafili` (AfiliadoId) está en BD
- **Solución:** `sync-credentials.js` (fuerza sincronización SOAP)

### Caso 3: AfiliadoId no existe en SOAP
- **Síntoma:** Login OK pero SOAP retorna "No existe el Afiliado"
- **Respuesta SOAP:** `code: "AFILIADO_NO_EXISTE"`
- **Solución:** Problema de datos, el AfiliadoId no está en el padrón SOAP

## Resultado Final

Después de ejecutar `repair-missing-nuusuauth.js` en este proyecto:

```
✅ 9 usuarios reparados
❌ 0 errores
🔑 Password: 123456 (todos los usuarios)
```

**Usuarios reparados (18/Feb/2026):**
1. franb@gmail.com
2. albertodahbar1@gmail.com
3. alfredofalletto@gmail.com
4. ppinetta2012@gmail.com
5. marianofu10@gmail.com
6. rubenpennise@gmail.com
7. **patricio.pinetta@tekhne.com.ar** ✅
8. alvaro.santillan@tekhne.com.ar
9. rubenpennise@hotmail.com

Todos pueden hacer login en la app con password `123456`.
