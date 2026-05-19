# Runbook operativo — Backend APP_Afiliados

Fecha: 13/03/2026

## Objetivo
Tener un procedimiento único para detectar, diagnosticar y recuperar caídas o degradaciones del backend.

## Salud y observabilidad

### Endpoints técnicos
- `GET /health` (público): estado básico del backend.
- `GET /health/observability` (admin): métricas de requests y dependencias.
- `GET /health/alerts` (admin): resumen de alertas operativas (error rate, dependencias, timeout).

### Dependencias monitoreadas
- PostgreSQL
- SOAP Beneficiarios
- SOAP SIA
- GAM

## Diagnóstico rápido (5 minutos)

### 1) Verificar backend
```powershell
curl.exe -i http://localhost:3000/health
```
Esperado: `200 OK` + `status=ok`.

### 2) Verificar alertas técnicas
```powershell
$loginBody = @{ username = 'admin@test.local'; password = 'admin123' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri 'http://localhost:3000/admin/login' -Method POST -ContentType 'application/json' -Body $loginBody
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Uri 'http://localhost:3000/health/alerts' -Headers $headers
```
Esperado: `status=ok`. Si devuelve `status=alert`, revisar `unhealthyDependencies` y `metrics.errorRatePct`.

### 3) Ver logs de request y dependencia
- Cada request se registra como JSON (`event=http_request`).
- Cada chequeo de dependencias se registra como JSON (`event=dependency_check`).

## Recuperación

### Escenario A: backend caído
1. Reinicio seguro local:
```powershell
cd backend
.\restart-backend.ps1 -ForceRestart
```
2. Confirmar `/health` en 200.
3. Si vuelve a caer, ejecutar manualmente para traza completa:
```powershell
node server-soap.js
```

### Escenario B: dependencia externa degradada
1. Consultar `/health/observability`.
2. Identificar dependencia fallida (`postgres`, `soapBeneficiarios`, `soapSIA`, `gam`).
3. Verificar conectividad de red/credenciales/parámetros en `nusispar`.
4. Mantener backend arriba y escalar al dueño de la dependencia externa.

### Escenario C: error rate alto
1. Validar si son errores de negocio o infraestructura.
2. Correlacionar por `X-Request-Id`.
3. Si hay picos por timeout externo, aplicar mitigación temporal (retry con backoff o desactivar función vía parámetros cuando aplique).

## Monitoreo y alertas

### Ejecución manual (una pasada)
```powershell
cd backend
.\ops\monitor-backend.ps1 -BaseUrl 'http://localhost:3000'
```

### Ejecución continua
```powershell
cd backend
.\ops\monitor-backend.ps1 -Loop -IntervalSeconds 60 -WebhookUrl 'https://tu-webhook'
```

### Task Scheduler (Windows) cada 1 minuto
```powershell
cd backend
.\setup-monitor-task.ps1 -IntervalMinutes 1 -BaseUrl 'http://localhost:3000' -WebhookUrl 'https://tu-webhook'
```

Para ejecutar la tarea como `SYSTEM` (entorno productivo/no-dev), abrir PowerShell como Administrador:
```powershell
cd backend
.\setup-monitor-task.ps1 -IntervalMinutes 1 -BaseUrl 'http://localhost:3000' -WebhookUrl 'https://tu-webhook' -RunAsSystem
```

Validar tarea instalada:
```powershell
schtasks /Query /TN "APP_Afiliados_Backend_Monitor" /V /FO LIST
```

Eliminar tarea:
```powershell
cd backend
.\setup-monitor-task.ps1 -Remove
```

### Códigos de salida del monitor
- `0`: sin alertas
- `2`: alerta detectada

## Política de restart supervisado (no-dev)

### PM2 (recomendado para Node nativo)
```powershell
cd backend
.\setup-pm2.ps1 -InstallPm2 -Startup
```
Comandos útiles:
```powershell
pm2 status app-afiliados-backend
pm2 logs app-afiliados-backend
pm2 restart app-afiliados-backend
```

## Escalamiento
- Si el incidente dura más de 15 minutos, escalar a responsable de infraestructura.
- Si involucra SOAP/GAM, escalar también al equipo integrador externo.

## Evidencia mínima post-incidente
- Hora de inicio y cierre
- Causa raíz probable
- Dependencia afectada
- RequestId representativos
- Acción correctiva aplicada
