# Estructura objetivo — Prisma + Zod (backend)

Documento de acuerdo para ir migrando el backend actual (centrado en `server-soap.js`) a una estructura mantenible, sin hacer un refactor big-bang.

## Objetivo

- Prisma como acceso principal a BD (o `$queryRaw` **documentado** cuando sea necesario por performance/joins complejos).
- Zod como validación estándar de `body/query/params` en endpoints.
- Rutas/servicios/repositorios separados para reducir acoplamiento.

## Propuesta de estructura

Sin imponer refactor inmediato, el objetivo es converger a:

```
backend/
  prisma/
    schema.prisma
    migrations/
  src/
    app.ts                  # bootstrap express
    server.ts               # listen + wiring
    routes/
      auth.routes.ts
      credenciales.routes.ts
      adminParam.routes.ts
    middleware/
      requireAuth.ts
      validateBody.ts
      validateQuery.ts
      validateParams.ts
    validators/
      auth.schemas.ts
      credenciales.schemas.ts
    repositories/
      nuusuari.repo.ts
      credenciales.repo.ts
      parametros.repo.ts
    services/
      soapBenef.service.ts
      soapSia.service.ts
      gam.service.ts
      token.service.ts
    errors/
      httpErrors.ts         # formato estándar 400/401/403/500
```

## Convenciones

- `routes/*`: solo parsea request/response y llama a `services/*`.
- `validators/*`: define Zod schemas por endpoint.
- `repositories/*`: acceso a BD (Prisma).
- `services/*`: lógica de negocio (SOAP, GAM, sync credenciales, etc.).

## Estrategia de migración incremental

1. Agregar infraestructura mínima (Prisma + validadores + middleware) sin tocar flujos críticos.
2. Migrar 1–2 endpoints como ejemplo (Semana 2–3).
3. Ir moviendo consultas críticas a `repositories/` (Semana 7+).

## Formato estándar de errores (referencia)

- `400`: errores de validación Zod (detalle por campo)
- `401`: no autenticado / token inválido
- `403`: autenticado pero sin permiso / usuario desactivado
- `500`: error interno (sin filtrar secretos)
