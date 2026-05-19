# Script de Sincronización Automática GAM → BD Local

## Descripción

Este script automatiza el proceso de sincronización de usuarios desde GAM (GeneXus Access Manager) hacia la base de datos local, preparando el sistema para una migración masiva de datos.

## Propósito

Garantizar que todos los usuarios con cuentas GAM estén correctamente sincronizados en la base de datos local antes de realizar una migración masiva de la tabla `nuusuari`.

## Flujo de Sincronización

Para cada usuario en la base de datos:

1. **Verificar en GAM** - Autenticación OAuth2 con credenciales de prueba
2. **Obtener GUID** - Consultar `/oauth/userinfo` para obtener el ID único de GAM
3. **Actualizar BD Local** - Si el usuario tiene `nuusuid` numérico (legacy) o diferente al GUID:
   - Actualizar `nuusuari.nuusuid` con el GUID de GAM
   - Actualizar `nuusuauth.nuusuid` (si existe)
   - Actualizar `crcredus.nuusuid` (si existe)
4. **Sincronizar Credenciales** - Llamar servicio SOAP `APPDATOSCREDENCIALES` y guardar en `crcreden`

## Requisitos Previos

### 1. Backend Ejecutándose

```powershell
cd backend
node server-soap.js
```

O usar el script de reinicio:

```powershell
.\restart-backend.ps1
```

### 2. Conexión a GAM

Verificar que `backend/config.json` tenga las credenciales correctas:

```json
{
  "gamClientId": "valor_correcto",
  "gamClientSecret": "valor_correcto",
  "gamBaseUrl": "https://test17.osep.gob.ar/APP_OSEP_TEST"
}
```

### 3. PostgreSQL

Verificar conexión a la base de datos `app_afiliados_genexus`.

## Uso

### Modo Simulación (DRY-RUN)

**Recomendado para primera ejecución.** Muestra qué cambios se realizarían sin modificar la base de datos:

```powershell
cd backend\scripts
.\sync-users-from-gam.ps1 -DryRun
```

O directamente con Node.js:

```powershell
node sync-users-from-gam.js --dry-run
```

### Sincronizar Todos los Usuarios

```powershell
.\sync-users-from-gam.ps1
```

**⚠️ ADVERTENCIA**: Este comando modificará la base de datos. El script pedirá confirmación.

### Sincronizar Un Solo Usuario

```powershell
.\sync-users-from-gam.ps1 -Email marianr@tekhne.com.ar
```

### Saltar Sincronización de Credenciales

Si solo quieres actualizar los `nuusuid` sin sincronizar credenciales SOAP:

```powershell
.\sync-users-from-gam.ps1 -SkipCredentials
```

### Opciones Combinadas

```powershell
# Simulación de usuario específico
.\sync-users-from-gam.ps1 -Email user@test.com -DryRun

# Actualizar solo GUID, sin credenciales
.\sync-users-from-gam.ps1 -Email user@test.com -SkipCredentials
```

## Parámetros

### Script PowerShell (`sync-users-from-gam.ps1`)

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `-Email` | String | Email del usuario a sincronizar (opcional) |
| `-DryRun` | Switch | Simular sin realizar cambios |
| `-SkipCredentials` | Switch | No sincronizar credenciales SOAP |
| `-Help` | Switch | Mostrar ayuda |

### Script Node.js (`sync-users-from-gam.js`)

| Argumento | Descripción |
|-----------|-------------|
| `--email=EMAIL` | Usuario específico |
| `--dry-run` | Modo simulación |
| `--skip-credentials` | Saltar credenciales |
| `--backend-url=URL` | URL del backend (default: http://localhost:3000) |

## Salida del Script

### Durante la Ejecución

```
╔════════════════════════════════════════════════════════════════╗
║   Script de Sincronización Automática GAM → BD Local          ║
╚════════════════════════════════════════════════════════════════╝

🔍 Verificando backend en http://localhost:3000...
✅ Backend disponible

📊 Total de usuarios a procesar: 3

════════════════════════════════════════════════════════════════

🔄 Procesando usuario: marianr@tekhne.com.ar
   nuusuid actual: 00000000000000000000000000000029
   tipo: LEGACY (numérico)
   📡 Verificando en GAM (login)...
   ✅ Login GAM exitoso
   📡 Obteniendo userinfo de GAM...
   ✅ GUID obtenido: ca87f1be-ac8c-46b8-9652-7cc2e6e58eda
   🔄 Actualizando nuusuid: 00000000000000000000000000000029 → ca87f1be-ac8c-46b8-9652-7cc2e6e58eda
   ✅ Actualizado nuusuari
   ✅ Actualizado nuusuauth
   ✅ Actualizado crcredus (7 registros)
   ✅ Usuario migrado exitosamente
   🎫 Sincronizando credenciales (AfiliadoId: 123456789123456789123456789123)...
   ✅ Credenciales sincronizadas: 7 credenciales
```

### Resumen Final

```
════════════════════════════════════════════════════════════════

📊 RESUMEN DE SINCRONIZACIÓN:

   Total procesados:  3
   ✅ Actualizados:    2
   ⏭️  Sin cambios:     1
   ⏭️  Saltados:        0 (no existen en GAM)
   ❌ Errores:         0

════════════════════════════════════════════════════════════════

✅ Sincronización completada con éxito
```

## Casos de Uso

### 1. Preparación para Migración Masiva

```powershell
# Paso 1: Simular para ver impacto
.\sync-users-from-gam.ps1 -DryRun

# Paso 2: Revisar resultados y confirmar

# Paso 3: Ejecutar sincronización
.\sync-users-from-gam.ps1

# Paso 4: Verificar resultados en BD
```

### 2. Arreglar Usuario Específico con Problemas

```powershell
# Usuario reportó problemas de login
.\sync-users-from-gam.ps1 -Email usuario@problema.com

# Verificar que ahora pueda loguearse
```

### 3. Actualización Rápida de GUIDs (sin credenciales)

```powershell
# Solo actualizar nuusuid, sin llamar a SOAP
.\sync-users-from-gam.ps1 -SkipCredentials
```

## Manejo de Errores

### Error: Backend no disponible

```
❌ Error: El backend no está corriendo en http://localhost:3000

💡 Inicia el backend con:
   cd backend
   node server-soap.js
```

**Solución**: Iniciar el backend antes de ejecutar el script.

### Error 236: Aplicación cliente no encontrada

```
❌ Error GAM config (236): clientId/clientSecret incorrectos
```

**Solución**: Verificar `backend/config.json` y corregir credenciales GAM.

### Error 11: Usuario/contraseña incorrecta

```
⏭️  Usuario no existe en GAM o contraseña desconocida (error 11)
```

**Causa**: El usuario no está registrado en GAM o la contraseña "123456" no es la correcta.

**Acción**: Usuario marcado como "saltado", no es un error crítico.

### Usuario sin GUID

```
❌ No se pudo extraer GUID de GAM
```

**Causa**: La respuesta de GAM no contiene los campos esperados (`GUID`, `Id`, `user_id`).

**Solución**: Verificar respuesta de `/oauth/userinfo` en logs del backend.

## Limitaciones

### Contraseña de Prueba

El script usa la contraseña genérica "123456" para intentar login en GAM. Esto funciona para usuarios de testing, pero para usuarios reales en producción se requeriría:

1. Contraseña proporcionada por el usuario (requiere intervención manual)
2. Token de servicio de GAM con permisos de administrador
3. Proceso de migración asistida donde el usuario proporciona credenciales

### Solo Usuarios Activos

El script solo procesa usuarios donde `nuusubajaf IS NULL` (no dados de baja).

### Requiere Backend Online

El script NO accede directamente a GAM, sino a través de los endpoints del backend (`/gam/login`, `/gam/userinfo`, `/credencial/sync-manual`).

## Endpoint Backend Utilizado

### POST /credencial/sync-manual

**Descripción**: Sincroniza credenciales de un usuario específico llamando a SOAP.

**Acceso**: Solo desde localhost o con Bearer token válido.

**Request**:
```json
{
  "nuusuid": "ca87f1be-ac8c-46b8-9652-7cc2e6e58eda",
  "afiliadoId": "123456789123456789123456789123"
}
```

**Response**:
```json
{
  "success": true,
  "credenciales": [...],
  "sync": {
    "total": 7,
    "inserted": 0,
    "updated": 2,
    "unchanged": 5
  },
  "timestamp": "2026-02-13T19:30:00.000Z"
}
```

## Verificación Post-Sincronización

### Consulta SQL para verificar usuarios GAM

```sql
-- Usuarios con GUID de GAM (no numéricos)
SELECT 
  nuusuid,
  nuusumail,
  nuusuapell,
  nuusuafili,
  CASE 
    WHEN nuusuid ~ '^[0-9]+$' THEN 'LEGACY'
    ELSE 'GAM'
  END AS tipo_usuario
FROM nuusuari
WHERE nuusubajaf IS NULL
ORDER BY tipo_usuario, nuusumail;
```

### Verificar relaciones actualizadas

```sql
-- Verificar que crcredus sigue apuntando correctamente
SELECT 
  u.nuusumail,
  u.nuusuid,
  COUNT(cr.crcreid) as total_credenciales
FROM nuusuari u
LEFT JOIN crcredus cus ON cus.nuusuid = u.nuusuid
LEFT JOIN crcreden cr ON cr.crcreid = cus.crcreid
WHERE u.nuusubajaf IS NULL
GROUP BY u.nuusumail, u.nuusuid
ORDER BY u.nuusumail;
```

## Troubleshooting

### Script se detiene en medio de ejecución

**Causa**: Timeout de conexión o backend caído.

**Solución**: 
1. Verificar que el backend siga corriendo
2. Reiniciar backend si es necesario
3. Volver a ejecutar el script (es idempotent, puede ejecutarse múltiples veces)

### Credenciales no se sincronizan

**Causa**: `nuusuafili` vacío o AfiliadoId inválido.

**Solución**: Verificar que el usuario tenga `nuusuafili` válido (30 caracteres).

### Muchos usuarios "saltados"

**Causa**: Usuarios no existen en GAM o contraseña incorrecta.

**Acción**: Esto es esperado. Solo usuarios con cuentas GAM activas se sincronizan.

## Logs Detallados

Para ver logs completos del backend durante la sincronización:

```powershell
# Terminal 1: Iniciar backend en modo verbose
cd backend
$env:DEBUG="*"
node server-soap.js

# Terminal 2: Ejecutar script
cd backend\scripts
.\sync-users-from-gam.ps1
```

## Soporte

Para problemas o dudas:

1. Revisar logs del backend en consola
2. Verificar `backend/config.json`
3. Verificar conectividad a PostgreSQL
4. Verificar conectividad a GAM
5. Consultar documentación de GAM en `GAM_INTEGRATION.md`

## Archivos Relacionados

- `backend/scripts/sync-users-from-gam.js` - Script Node.js principal
- `backend/scripts/sync-users-from-gam.ps1` - Wrapper PowerShell
- `backend/server-soap.js` - Backend con endpoint `/credencial/sync-manual`
- `backend/gamService.js` - Servicios de integración con GAM
- `backend/config.json` - Configuración de credenciales GAM

## Changelog

### v1.0.0 (2026-02-13)
- ✅ Versión inicial
- ✅ Sincronización automática de GUID desde GAM
- ✅ Actualización de tablas relacionadas (nuusuari, nuusuauth, crcredus)
- ✅ Sincronización de credenciales SOAP
- ✅ Modo dry-run para simulación
- ✅ Soporte para usuario único
- ✅ Wrapper PowerShell con confirmación
