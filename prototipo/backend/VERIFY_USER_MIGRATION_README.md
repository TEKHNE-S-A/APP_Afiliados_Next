# Script de Verificación de Migración de Usuarios GAM

## Descripción

Este script verifica que un usuario migrado a GAM tenga todos sus datos correctamente actualizados en todas las tablas relacionadas de la base de datos.

## Archivos

1. **`verify-user-migration.js`** — Script principal Node.js
2. **`verify-user-migration.ps1`** — Wrapper PowerShell para facilitar el uso

## ¿Qué Verifica?

El script revisa las siguientes 6 tablas:

### 1. **nuusuari** (Tabla Principal)
- ✅ `nuusuid` en formato GUID de GAM (vs. LEGACY numérico)
- ✅ Datos del usuario: nombre, AfiliadoId, PlanId, fecha de alta
- ✅ Estado activo/inactivo

### 2. **nuusuauth** (Autenticación)
- ✅ `nuusuid` coincide con el de `nuusuari`
- ✅ Fechas de creación y última modificación

### 3. **crcredus** (Relación Usuario-Credenciales)
- ✅ `nuusuid` actualizado en todos los registros
- ✅ Tipo de credencial (PROPIA vs COMPARTIDA)
- ✅ Conteo de credenciales asociadas

### 4. **crcreden** (Datos de Credenciales)
- ✅ Credenciales del grupo familiar (via JOIN con `crcredus`)
- ✅ Datos completos: AfiliadoId, CUIL, DNI, sexo, vencimiento
- ✅ Diferenciación titular vs familiares

### 5. **notifications** (Notificaciones)
- ✅ Conteo de notificaciones del usuario
- ✅ Últimas 3 notificaciones con estado (leída/no leída)
- ✅ Adaptación automática a diferentes esquemas

### 6. **push_tokens** (Tokens Push)
- ✅ Tokens de notificaciones push registrados
- ✅ Tipo de dispositivo y estado activo/inactivo

## Uso

### Opción 1: Script Node.js directo

```powershell
cd backend
node verify-user-migration.js nuevo@test.com
```

### Opción 2: Wrapper PowerShell (⭐ Recomendado)

```powershell
cd backend
.\verify-user-migration.ps1 nuevo@test.com
```

## Ejemplos

### Verificar usuario migrado a GAM

```powershell
.\verify-user-migration.ps1 nuevo@test.com
```

**Resultado esperado**:
```
╔════════════════════════════════════════════════════════════════╗
║   VERIFICACIÓN DE MIGRACIÓN COMPLETA - TODAS LAS TABLAS        ║
╚════════════════════════════════════════════════════════════════╝

📧 Email: nuevo@test.com

1️⃣  NUUSUARI (tabla principal)
──────────────────────────────────────────────────────────────────────
   nuusuid:     5e9535f4-44c8-4e76-b74e-c8b68c186b1f
   Tipo:        GAM (GUID) ✅
   Nombre:      CEJAS, PATRICIA MURIEL
   AfiliadoId:  000000072000000000001000000072
   Estado:      ACTIVO ✅

2️⃣  NUUSUAUTH (autenticación)
──────────────────────────────────────────────────────────────────────
   nuusuid:     5e9535f4-44c8-4e76-b74e-c8b68c186b1f ✅

3️⃣  CRCREDUS (relación usuario-credenciales)
──────────────────────────────────────────────────────────────────────
   Total registros: 1
   [1] crcreid: 000000072000000000001000000072, tipo: PROPIA, nuusuid: ✅

...

╔════════════════════════════════════════════════════════════════╗
║                      RESUMEN DE VERIFICACIÓN                   ║
╚════════════════════════════════════════════════════════════════╝

   ✅ nuusuari        - Tipo: GAM (GUID)
   ✅ nuusuauth       - OK
   ✅ crcredus        - 1 registros
   ✅ crcreden (JOIN) - 1 credenciales

✅ Usuario correctamente migrado a GAM (GUID presente)
```

### Verificar usuario con grupo familiar

```powershell
.\verify-user-migration.ps1 nuevo2@test.com
```

**Resultado**: Muestra titular + familiares (2 credenciales en total)

### Verificar usuario LEGACY (no migrado)

```powershell
.\verify-user-migration.ps1 admin@osep.gob.ar
```

**Resultado esperado**:
```
   nuusuid:     0000000000000000000000000000000000000026
   Tipo:        LEGACY (numérico) ⚠️

⚠️  Usuario aún en formato LEGACY (numérico)
   Para migrar, ejecutar login con credentials válidas de GAM
```

## Usuarios de Prueba

### ✅ Usuarios ya migrados a GAM (6)

| Email | nuusuid | Credenciales | Estado |
|-------|---------|--------------|--------|
| nuevo@test.com | `5e9535f4...` | 1 | ✅ Migrado |
| nuevo1@test.com | `bf127edf...` | ? | ✅ Migrado |
| nuevo2@test.com | `a39e9621...` | 2 (titular + familiar) | ✅ Migrado |
| nuevo3@test.com | `24025437...` | ? | ✅ Migrado |
| ybañez@gmail.com | `f5c75815...` | ? | ✅ Migrado |
| ppinetta@gmail.com | `ad0325d3...` | ? | ✅ Migrado |

**Contraseña universal**: `12345678`

### ⚠️ Usuarios LEGACY (3)

| Email | Tipo | Razón |
|-------|------|-------|
| admin@osep.gob.ar | Admin backend | No migrado (solo local) |
| admin@test.local | Admin backend | No migrado (solo local) |
| superadmin@osep.gob.ar | Admin backend | No migrado (solo local) |

**Contraseña**: `admin123`

## Características Técnicas

### Autodescubrimiento de Columnas

El script detecta automáticamente qué columnas existen en la BD para evitar errores:

- ✅ `nuusucuil` vs `nuusudni` → DNI/CUIL del usuario
- ✅ `leida` vs `leido` → Estado de notificaciones
- ✅ `token` vs `push_token` → Tokens de notificaciones
- ✅ `fecha_creacion` vs `creado_en` → Fechas de creación

### Trimming Automático

Todas las columnas `bpchar` (character padding) se limpian automáticamente con `.trim()` para comparaciones correctas.

### Manejo de Errores

- ⚠️ Tabla no existe → Mensaje informativo (no falla el script)
- ⚠️ Columna no existe → Autodescubrimiento de alternativas
- ❌ Usuario no encontrado → Error claro con exit code 1

## Solución de Problemas

### Error: "Usuario no encontrado"

**Causa**: El email no existe en la BD  
**Solución**: Verificar el email con `node list-users-migration-status.js`

### Error: "No se encontró verify-user-migration.js"

**Causa**: Ejecutando desde directorio incorrecto  
**Solución**:
```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados\backend
.\verify-user-migration.ps1 usuario@test.com
```

### Advertencia: "No existe registro en nuusuauth"

**Causa**: Usuario registrado directamente en GAM sin pasar por el registro local  
**Solución**: Normal para algunos usuarios GAM. Verificar que el resto de tablas estén correctas.

### Advertencia: "No hay credenciales asociadas"

**Causa**: Usuario sin credenciales sincronizadas desde SOAP  
**Solución**: Ejecutar login para forzar sincronización automática:
```powershell
# Desde backend
node test-login-user.js usuario@test.com password
```

## Scripts Relacionados

| Script | Propósito |
|--------|-----------|
| `list-users-migration-status.js` | Listar todos los usuarios (LEGACY vs GAM) |
| `scripts/sync-users-from-gam.js` | Migración masiva batch |
| `test-login-user.js` | Probar login y ver migración automática |
| `check-user-status.js` | Verificar usuario específico (alternativa simple) |

## Referencias

- **Documentación GAM**: `GAM_INTEGRATION.md`
- **Reglas BD**: `REGLAS_GAM_BDD.md`
- **Migración completada**: `MIGRACION_LEGACY_GAM_COMPLETADA.md`
- **Guía de pruebas**: `PRUEBA_MIGRACION_APP.md`
- **Backlog del proyecto**: `PROJECT_BACKLOG_2026.md` (Semana 4)

---

**Creado**: 18 de febrero de 2026  
**Última actualización**: 18 de febrero de 2026  
**Autor**: Sistema de verificación automática de migración GAM
