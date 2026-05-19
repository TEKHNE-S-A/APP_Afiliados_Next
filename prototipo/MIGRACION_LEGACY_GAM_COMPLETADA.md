# ✅ Migración LEGACY → GAM Completada

**Fecha**: 18 de febrero de 2026  
**Estado**: ✅ COMPLETADA EXITOSAMENTE  
**Usuarios migrados**: 5/5 usuarios reales

---

## 📊 Resultado Final

### ✅ Usuarios Reales Migrados (5)

| Email | LEGACY nuusuid | GAM GUID | Estado |
|-------|----------------|----------|--------|
| nuevo@test.com | `...0023` | `5e9535f4-...` | ✅ Migrado |
| nuevo1@test.com | `...0024` | `bf127edf-...` | ✅ Migrado |
| nuevo2@test.com | `...0029` | `a39e9621-...` | ✅ Migrado |
| nuevo3@test.com | `...0030` | `24025437-...` | ✅ Migrado |
| ybañez@gmail.com | `...0028` | `f5c75815-...` | ✅ Migrado |

**Password universal de prueba**: `12345678`

### ⚠️ Usuarios Admin - No Migrados (3)

Permanecen en LEGACY (usuarios administrativos locales):
- admin@osep.gob.ar
- admin@test.local
- superadmin@osep.gob.ar

**Justificación**: No existen en GAM, solo son usuarios backend para administración.

---

## 🛠️ Scripts Disponibles

### Verificación de Estado
```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados\backend

# Listar todos los usuarios (LEGACY vs GAM)
node list-users-migration-status.js

# Verificar usuario específico (todas las tablas)
node check-user-status.js nuevo2@test.com

# Probar login y ver migración
node test-login-user.js nuevo2@test.com 12345678
```

### Migración (si es necesario)
```powershell
# Migrar todos los usuarios LEGACY
node migrate-all-legacy-users.js

# Migrar un usuario específico (batch)
cd scripts
node sync-users-from-gam.js --email=usuario@test.com

# Revertir a LEGACY (solo testing)
node revert-user-to-legacy.js usuario@test.com
```

---

## 🎯 Cómo Funciona

### Migración Automática en Login

Implementada en `backend/server-soap.js` (función `migrateUserToGAM`):

1. Usuario hace login con `/gam/login`
2. Backend detecta `nuusuid` numérico (LEGACY)
3. Obtiene GUID de GAM mediante OAuth2
4. Actualiza 5 tablas en transacción atómica:
   - nuusuari
   - nuusuauth
   - crcredus (todas las credenciales del grupo familiar)
   - notifications (si existen)
   - push_tokens (si existen)
5. Login continúa normalmente con nuevo GUID

**Ventaja**: Transparente, no requiere conocer passwords previamente.

### Foreign Keys DEFERRABLE

**Requisito crítico** para migración exitosa:

```sql
-- Permite actualizar FKs circulares en una transacción
SET CONSTRAINTS ALL DEFERRED;
UPDATE nuusuari SET nuusuid = '...';
UPDATE nuusuauth SET nuusuid = '...';
UPDATE crcredus SET nuusuid = '...';
-- etc.
COMMIT;
```

**Archivos aplicados**:
- `backend/db/make-fk-deferrable-for-gam-sync.sql`
- `backend/db/make-icrcred2-deferrable.sql`
- `backend/db/make-all-fks-deferrable-final.sql`

---

## 📱 Testing con App Móvil

### Setup
```powershell
# 1. Backend corriendo
cd E:\MisProyectos\appmovil\APP_Afiliados\backend
node server-soap.js

# 2. App móvil (en otra terminal)
cd E:\MisProyectos\appmovil\APP_Afiliados\mobile
npx expo start
# Presionar 'a' para Android AVD
```

### Configuración App
Verificar `mobile/.env`:
```env
USE_MOCK=false
API_BASE_URL_ANDROID=http://10.0.2.2:3000
```

### Usuarios de Prueba
Login en la app con cualquiera de estos:
- Email: `nuevo2@test.com` / Password: `12345678`
- Email: `nuevo1@test.com` / Password: `12345678`
- Email: `ybañez@gmail.com` / Password: `12345678`

**Resultado esperado**:
✅ Login exitoso  
✅ Credenciales del grupo familiar cargadas  
✅ QR generado correctamente  
✅ Tokens temporales visibles

---

## ✅ Checklist de Verificación

Post-migración, verificar:

- [x] Usuarios LEGACY reducidos de 8 a 3 (5 migrados)
- [x] Usuarios GAM aumentados a 5
- [x] Login en app móvil funciona con usuarios migrados
- [x] Credenciales visibles en app
- [x] QR se genera correctamente
- [x] Tablas relacionadas (nuusuauth, crcredus) actualizadas
- [x] FK constraints íntegras (sin violaciones)

---

## 🔍 Troubleshooting

### Usuario no migra

**Síntoma**: Login funciona pero `nuusuid` sigue siendo numérico  
**Causa probable**: App usando `/auth/login` en vez de `/gam/login`  
**Solución**: Verificar que app use endpoint correcto o migrar manualmente:
```powershell
node test-login-user.js usuario@test.com password
```

### Error FK constraint

**Síntoma**: `ERROR: update or delete on table violates foreign key constraint`  
**Causa**: FKs no son DEFERRABLE  
**Solución**: Aplicar migraciones SQL:
```powershell
psql -d app_afiliados_genexus -f backend/db/make-all-fks-deferrable-final.sql
```

### Usuario no existe en GAM

**Síntoma**: Error código 18 "El usuario o la contraseña no es correcta"  
**Causa**: Usuario no registrado en GAM  
**Solución**: Registrar primero en GAM o mantener como LEGACY (caso admins)

---

## 📚 Referencias

### Documentación
- [GAM_INTEGRATION.md](GAM_INTEGRATION.md) - Integración completa con GAM
- [REGLAS_GAM_BDD.md](REGLAS_GAM_BDD.md) - Reglas de negocio GAM
- [PROJECT_BACKLOG_2026.md](PROJECT_BACKLOG_2026.md#-migración-legacy--gam-completada-18022026) - Documentación completa

### Scripts Backend
- `backend/server-soap.js` - Función `migrateUserToGAM()` línea ~1203
- `backend/scripts/sync-users-from-gam.js` - Script batch original
- `backend/list-users-migration-status.js` - Ver estado migración
- `backend/check-user-status.js` - Diagnóstico completo usuario
- `backend/test-login-user.js` - Test login con detección migración
- `backend/migrate-all-legacy-users.js` - Migración masiva vía API
- `backend/revert-user-to-legacy.js` - Revertir a LEGACY (testing)

### Base de Datos
- `backend/db/make-fk-deferrable-for-gam-sync.sql`
- `backend/db/make-icrcred2-deferrable.sql`
- `backend/db/make-all-fks-deferrable-final.sql`

---

## 🎉 Conclusión

La migración LEGACY → GAM se completó exitosamente con:
- ✅ **5 usuarios reales** migrados de numérico a GUID GAM
- ✅ **5 tablas normalizadas** (nuusuari, nuusuauth, crcredus, notifications, push_tokens)
- ✅ **App móvil funcionando** sin modificaciones
- ✅ **Sistema de migración automática** operativo para futuros usuarios
- ✅ **Scripts de utilidad** para mantenimiento y troubleshooting

**Próximo paso en producción**: Aplicar migraciones FK DEFERRABLE y activar migración automática en login.
