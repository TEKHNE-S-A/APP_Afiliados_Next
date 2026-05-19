# Desarrollo local — APP_Afiliados (Windows)

Esta guía consolida los pasos para correr **backend** + **mobile**, y ejecutar validaciones antes de pushear.

## Reglas rápidas

- No editar manualmente `build/*` (se genera con scripts en `scripts/`).
- Un cambio = un propósito (PR chico).
- Si tocás endpoints o auth, dejá evidencia reproducible (script PowerShell o ejemplo en doc).

---

## Backend (Node + Express + SOAP + PostgreSQL)

### Prerrequisitos

- PostgreSQL accesible (por defecto el backend usa `app_afiliados_genexus`).
- Variables por defecto (si no definís env vars):
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=5432`
  - `DB_USER=postgres`
  - `DB_PASSWORD=12345678`
  - `DB_NAME=app_afiliados_genexus`

> Si tu entorno usa otros valores, definilos como variables de entorno antes de iniciar.

### Iniciar backend

En PowerShell:

```powershell
cd backend
node server-soap.js
# escucha en http://0.0.0.0:3000
```

Si el puerto 3000 está ocupado:

```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess |
  Sort-Object -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
```

### Verificación rápida

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/dashboard" | ConvertTo-Json -Depth 4
```

### GAM opcional por parámetro

El backend permite habilitar o deshabilitar la integración con GAM en tiempo real usando:

- Grupo: `SEGURIDAD_APP`
- Tipo: `HabilitarGAM`
- Valor: `S` (habilitado) o `N` (deshabilitado)

Script para crear el parámetro:

```powershell
cd backend
node .\scripts\apply-habilitar-gam-param.js
```

Smoke test automático ON/OFF:

```powershell
cd backend
.\test-gam-optional.ps1
```

Resultado esperado del smoke test:

- Con `HabilitarGAM=S`: `/gam/userinfo` responde `401` (guard habilitado, falta token)
- Con `HabilitarGAM=N`: `/gam/userinfo` responde `410` con `code=GAM_DISABLED`
- Con `HabilitarGAM=N`: `/auth/login` responde controlado (ej. `401` para usuario inexistente), no `500`
- El test restaura automáticamente el valor original al final

Nota operativa:

- En el arranque del backend se asegura automáticamente la existencia del parámetro `SEGURIDAD_APP.HabilitarGAM` con default `S` si no existe.

---

## Prisma (conexión + generate) — Windows

Prisma usa `DATABASE_URL`. En este repo también existe compatibilidad legacy con `DB_*` (el backend puede derivar `DATABASE_URL` desde `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`).

### Opción A (recomendada): definir `DATABASE_URL`

- Tomar el ejemplo de `backend/.env.example` y definir variables de entorno equivalentes en tu sesión (o copiar a un `.env` local no versionado).

Ejemplo (PowerShell):

```powershell
cd backend
$env:DATABASE_URL = 'postgresql://USER:PASSWORD@127.0.0.1:5432/DB?schema=public'
```

### Opción B (legacy): definir `DB_*`

```powershell
cd backend
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='5432'
$env:DB_USER='postgres'
$env:DB_PASSWORD='12345678'
$env:DB_NAME='app_afiliados_genexus'
```

### Check reproducible

```powershell
cd backend
.
	est-prisma-connection.ps1
```

Si aparece `EPERM` en `prisma generate` (Windows): suele ser un lock del engine porque hay un proceso Node en ejecución.

- Detener backend (puerto 3000) y reintentar el script.

```powershell
$pids = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
if($pids){ $pids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }
.
	est-prisma-connection.ps1
```

---

## Mobile (Expo + TypeScript)

### Instalar dependencias

```powershell
cd mobile
npm install --legacy-peer-deps
```

### Ejecutar Expo

```powershell
npx expo start
# Presionar 'a' para abrir en Android AVD
```

### Configurar API base

Editar `mobile/.env`:

- `API_BASE_URL_ANDROID=http://10.0.2.2:3000` (AVD)
- `USE_MOCK=false`
- `USE_MOCK_LOCATION=false`

Notas:

- Android físico por USB: ejecutar `adb reverse tcp:3000 tcp:3000`.
- En dispositivo físico, la app normaliza `10.0.2.2/10.0.3.2` a `127.0.0.1`.
- En release, la ubicación mock queda desactivada automáticamente.

---

## Validaciones antes de push

Desde la raíz del repo:

```powershell
.\pre-push-validation.ps1
```

Para exigir validaciones de integración (incluye test de GAM opcional y falla si no puede ejecutarse):

```powershell
.\pre-push-validation.ps1 -StrictIntegration
```

Si estás en Linux/macOS:

```bash
./pre-push-validation.sh
```

---

## Estructura objetivo (Prisma + Zod)

Ver [backend/PRISMA_ZOD_TARGET.md](backend/PRISMA_ZOD_TARGET.md).

## Migraciones (Prisma)

Runbook: [backend/PRISMA_MIGRATIONS.md](backend/PRISMA_MIGRATIONS.md)
