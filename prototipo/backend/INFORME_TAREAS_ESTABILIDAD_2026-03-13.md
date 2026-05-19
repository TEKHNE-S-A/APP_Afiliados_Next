# Informe de avance — Estabilidad y operación backend

Fecha: 13/03/2026  
Proyecto: APP_Afiliados

## Alcance de las últimas 2 tareas

Se completaron dos bloques de trabajo:

1. **Observabilidad mínima de producción**
2. **Cierre de pendientes operativos de estabilidad**

## Servicios y capacidades implementadas

### 1) Observabilidad por API
- `GET /health` (público): estado básico del backend + datos de observabilidad resumidos.
- `GET /health/observability` (protegido): snapshot técnico completo de métricas y dependencias.
- `GET /health/alerts` (protegido): estado agregado de alertas operativas (error rate, timeouts, dependencias).

### 2) Métricas y trazabilidad
- Correlation ID por request (`X-Request-Id`).
- Logs estructurados JSON por request (`event=http_request`).
- Logs de chequeo de dependencias (`event=dependency_check`).
- Métricas en memoria:
  - requests totales y en vuelo,
  - errores 5xx,
  - latencia promedio y máxima,
  - conteo por status y por ruta,
  - últimos errores.

### 3) Dependencias monitoreadas
- PostgreSQL
- SOAP Beneficiarios
- SOAP SIA
- GAM

### 4) Operación y monitoreo
- Script de monitoreo: `ops/monitor-backend.ps1` (modo una corrida o loop).
- Alertas por webhook/email en el monitor.
- Política de restart supervisado no-dev con PM2 (`ecosystem.config.js`, `setup-pm2.ps1`).
- Tarea programada Windows para monitoreo periódico (`setup-monitor-task.ps1`).

## Documentación generada
- `RUNBOOK_OPERATIVO_BACKEND.md`
- `ALERTAS_OPERATIVAS.md`
- Backlog actualizado con pendientes cerrados en estabilidad.

## Estado actual
- Implementación funcional en entorno local/dev.
- Monitoreo agendado y endpoints técnicos operativos.
- Configuración como `SYSTEM` pendiente de sesión PowerShell elevada (Administrador), solo requerida para escenarios no-dev.

## Próximo paso sugerido
- Continuar con **P1 Rate limiting y endurecimiento de endpoints sensibles** por impacto rápido y bajo riesgo.
