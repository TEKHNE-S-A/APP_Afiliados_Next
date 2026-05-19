# Alertas operativas mínimas — APP_Afiliados backend

Fecha: 13/03/2026

## Umbrales definidos
- **Caída backend**: `/health` no responde o responde != 200.
- **Error rate alto**: `errors5xx / requests.total >= 20%`.
- **Timeout externo**: cualquier dependencia con mensaje de timeout.
- **Latencia alta dependencia**: `latencyMs >= 8000`.

## Fuente de datos
- Endpoint `GET /health/alerts` (admin auth).
- Endpoint `GET /health/observability` (detalle completo).

## Canal de alerta
- Webhook HTTP (recomendado): configurable en `ops/monitor-backend.ps1`.
- Email SMTP (opcional): configurable en `ops/monitor-backend.ps1`.

## Ejemplo webhook
```powershell
cd backend
.\ops\monitor-backend.ps1 `
  -BaseUrl 'http://localhost:3000' `
  -WebhookUrl 'https://hooks.example.com/ops' `
  -ErrorRateThresholdPct 20 `
  -MaxDependencyLatencyMs 8000
```

## Integración con scheduler
- Ejecutar cada 1 minuto en Task Scheduler o pipeline de monitoreo.
- Si el script devuelve código `2`, tratarlo como incidente activo.

## Recomendación de operación
- Empezar con webhook a canal técnico.
- Luego incorporar email para guardia pasiva.
