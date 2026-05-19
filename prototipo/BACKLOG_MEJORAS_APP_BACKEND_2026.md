# Backlog de mejoras futuras — APP Afiliados

Fecha: 12/03/2026

Objetivo: consolidar un backlog corto, priorizado y editable a partir de las funciones actuales de la app mobile, backend SOAP/GAM, paneles admin, cartilla, info útil, notificaciones y modo offline.

Uso sugerido:
- Eliminar tareas que no apliquen.
- Reordenar por capacidad del equipo.
- Mover a sprint solo cuando tenga criterio de aceptación claro.

## Criterio de prioridad
- P0: estabilidad o riesgo operativo inmediato
- P1: alto impacto para afiliados o admins
- P2: mejora valiosa, no urgente
- P3: optimización o expansión futura

## Candidatas para próximo corte
- [x] P0. Estabilizar arranque del backend y diagnóstico de fallas
- [x] P0. Implementar observabilidad mínima de producción
- [x] P1. Endurecer autenticación y sesiones
- [x] P1. Push notifications transaccionales reales
- [x] P1. Timeline de autorizaciones
- [x] P1. Cola offline para acciones pendientes (❌ Descartada)
- [x] P1. Favoritos y recientes en cartilla
- [x] P1. Auditoría de acciones administrativas
- [x] P1. Bitácora de cambios funcionales para soporte
- [x] P1. Alineación visual y sesión compartida entre paneles admin

---

## P0 — Estabilidad y operación

### 1. Estabilizar arranque del backend
Impacto: Alto
Esfuerzo: M
Dependencias: ninguna
Estado: ✅ Completada (alcance operativo local) — 13/03/2026

Descripción:
- Investigar por qué `backend/server-soap.js` está saliendo con código 1.
- Agregar chequeo explícito al inicio para PostgreSQL, SOAP Beneficiarios, SOAP SIA y GAM.
- Separar errores fatales de errores tolerables.
- Mejorar `restart-backend.ps1` para reinicio confiable y logs útiles.

Evidencia de implementación:
- Causa raíz identificada: `EADDRINUSE` por segunda instancia en puerto `3000`.
- Script actualizado: `backend/restart-backend.ps1`.
- Comportamiento agregado: detección de backend ya activo (sin error), `-ForceRestart`, autodetección de `node.exe`, verificación `/health` con espera por polling.
- Validación: reinicio forzado exitoso y `health` respondiendo en `http://localhost:3000/health`.

Pendientes para estabilidad de producción (fuera de alcance de este cierre):
- [x] Instrumentar logs estructurados con `requestId` y contexto de dependencia externa.
- [x] Exponer métricas de salud/latencia por PostgreSQL, GAM, SOAP Beneficiarios y SOAP SIA.
- [x] Definir alertas automáticas por caída de `/health`, error rate y timeout de servicios externos.
- [x] Incorporar política de restart supervisado (servicio Windows/PM2) para entornos no dev.
- [x] Documentar runbook operativo con pasos de diagnóstico y recuperación.

Evidencia adicional (13/03/2026):
- Endpoint `GET /health/alerts` (admin auth) con estado agregado de alertas operativas.
- Métricas por dependencia persistidas en memoria y trazas `event=dependency_check`.
- Script de monitoreo y alertas: `backend/ops/monitor-backend.ps1` (webhook/email, modo loop, exit code para scheduler).
- Política de supervisión no-dev: `backend/ecosystem.config.js` + `backend/setup-pm2.ps1`.
- Runbook operativo: `backend/RUNBOOK_OPERATIVO_BACKEND.md` y `backend/ALERTAS_OPERATIVAS.md`.

Criterios de aceptación:
- El backend arranca con mensaje claro cuando falta una dependencia.
- Si falla un WS externo, el servidor no cae si la falla es tolerable.
- Existe un script reproducible de smoke test de arranque.

### 2. Observabilidad mínima de producción
Impacto: Alto
Esfuerzo: M
Dependencias: tarea 1 recomendada
Estado: ✅ Completada (alcance mínimo operativo) — 13/03/2026

Descripción:
- Incorporar logs estructurados por request.
- Medir latencia y tasa de error en endpoints críticos.
- Exponer métricas de salud para DB, GAM, SOAP y colas internas.
- Registrar correlation id por request.

Evidencia de implementación:
- `backend/server-soap.js`: middleware de `requestId` (`X-Request-Id`) y logs estructurados JSON por request (`event=http_request`).
- Métricas en memoria: total requests, en vuelo, errores 5xx, latencia promedio/máxima, conteo por status y ruta, últimos errores.
- Endpoint técnico `GET /health/observability` (admin auth) con snapshot de observabilidad y chequeos de dependencias (`postgres`, `soapBeneficiarios`, `soapSIA`, `gam`).
- `GET /health` extendido con `requestId` y resumen de observabilidad.

Criterios de aceptación:
- Cada request crítico queda trazable por id.
- Hay un endpoint o panel técnico con estado de dependencias.
- Se distinguen errores de negocio vs errores de infraestructura.

### 3. Alertas operativas básicas
Impacto: Alto
Esfuerzo: S
Dependencias: tarea 2
Estado: ✅ Completada — 17/03/2026

Descripción:
- Definir umbrales para caída de backend, error SOAP y tiempo alto de respuesta.
- Preparar un canal simple de alerta por email o webhook.

Implementado:
- 9 parámetros en `nusispar` grupo `ALERTAS_OPS`: `Enabled`, `ErrorRatePct`, `MaxLatencyMs`, `IntervalSeconds`, `SmtpServer`, `SmtpPort`, `MailFrom`, `MailTo`, `WebhookUrl`.
- Seed: `backend/db/insert_parametros_alertas_ops.sql`.
- `/health/alerts` lee umbrales desde `nusispar` (ya no hardcodeado en 20%).
- Nuevo endpoint `GET /health/alerts/config` (admin auth): expone toda la config de alertas desde `nusispar`.
- `backend/ops/monitor-backend.ps1` consulta `/health/alerts/config` al arrancar y aplica los valores de `nusispar` (parámetros de PS quedan como fallback).
- Para configurar: `PUT /admin/parametros/ALERTAS_OPS/MailTo` con el email de aviso. No requiere reinicio.

Criterios de aceptación:
- ✅ Existe documentación de alertas mínimas (ALERTAS_OPERATIVAS.md).
- ✅ Se genera alerta ante caída o degradación grave (monitor-backend.ps1 + /health/alerts).
- ✅ Todo configurable desde `nusispar` sin redeployar: umbrales, email, webhook, intervalo.

---

## P1 — Seguridad, sesiones y autenticación

### 4. Refresh token y renovación de sesión
Impacto: Alto
Esfuerzo: M
Dependencias: ninguna
Estado: ✅ Completada (alcance backend) — 13/03/2026

Descripción:
- Separar access token y refresh token.
- Permitir renovación segura de sesión sin relogin frecuente.
- Guardar metadata de sesión por dispositivo.

Evidencia de implementación:
- `backend/server-soap.js`: emisión de `refresh_token` para sesiones locales/admin y reutilización de `refresh_token` OAuth2 para sesiones GAM.
- `POST /auth/refresh-token` ampliado para soportar renovación de sesión local y GAM.
- Metadata de sesión guardada por dispositivo: `sessionId`, `deviceId`, `platform`, `appVersion`, `userAgent`, `ip`, timestamps.
- Logouts consistentes con revocación del refresh token asociado cuando aplica.
- Validación manual: login admin → refresh token → acceso a `/health/observability` con nuevo access token (`200`).

Criterios de aceptación:
- La app puede renovar sesión sin reingresar credenciales.
- Un refresh token puede invalidarse sin afectar todos los dispositivos.

### 5. Gestión de sesiones por dispositivo
Impacto: Alto
Esfuerzo: M
Dependencias: tarea 4 recomendada
Estado: ✅ Completada (alcance backend) — 13/03/2026

Descripción:
- Mostrar dispositivos activos.
- Permitir cerrar sesión en otros dispositivos.
- Registrar plataforma, última actividad y versión de app.

Evidencia de implementación:
- `backend/server-soap.js`: tracking de metadata de sesión por dispositivo (`sessionId`, `deviceId`, `platform`, `appVersion`, `userAgent`, `ip`, `lastActivityAt`, `lastRefreshedAt`).
- Endpoint `GET /auth/sessions` para listar sesiones activas del usuario actual.
- Endpoint `DELETE /auth/sessions/:id` para revocar una sesión puntual.
- Endpoint `POST /auth/sessions/revoke-others` para cerrar las demás sesiones del usuario.
- `GET /auth/me` enriquecido con información de la sesión actual.
- Validación manual: login en 2 dispositivos simulados → listado de 2 sesiones → revocación de la otra sesión → listado final de 1 sesión.

Criterios de aceptación:
- El usuario ve sus sesiones activas.
- Puede revocar una sesión remota.

### 6. Rate limiting y endurecimiento de endpoints sensibles
Impacto: Alto
Esfuerzo: S
Dependencias: ninguna
Estado: ✅ Completada (alcance backend) — 13/03/2026

Descripción:
- Aplicar rate limit a login, registro, recuperación de contraseña y diagnósticos admin.
- Registrar intentos fallidos y sospechosos.

Evidencia de implementación:
- Middleware configurable por parámetros en `backend/server-soap.js`.
- Endpoints protegidos con límite: `/auth/login`, `/admin/login`, `/register`, `/auth/recover-password`, `/auth/verify-recovery-code`, `/auth/reset-password`, `/gam/login`, `/health/observability`, `/health/alerts`, `/health/ws-connectivity`, `/health/connectivity-suite`.
- Configuración vía `SEGURIDAD_APP.*` con defaults seguros (`RateLimitEnabled`, `RateLimitLoginMaxAttempts`, `RateLimitLoginWindowSec`, etc.).
- Respuesta estándar `429` con `Retry-After` y headers `X-RateLimit-*`.
- Log estructurado de bloqueos: `event=rate_limit_blocked`.

Criterios de aceptación:
- Login y recovery tienen límite configurable.
- Queda registro auditable de bloqueos temporales.

---

## P1 — Experiencia del afiliado

### 8. Timeline de autorizaciones SIA
Impacto: Alto
Esfuerzo: M
Dependencias: integración con endpoints SIA disponibles
Estado: ✅ Completada — 19/03/2026

Descripción:
- Mostrar estado de solicitud, cobertura, prestación y documentos adjuntos.
- Permitir reintento o aporte de documentación faltante cuando aplique.

Implementado:
- `MisAutorizacionesScreen` — listado con estados ENV/AUD/AUT/REC/PEN/CON, badge coloreado, fecha, prestación, profesional, número de autorización
- `AutorizacionDetalleScreen` — detalle individual + botón **"Reintentar solicitud"** cuando estado=REC (rechazada); navega a SolicitudAutorizacion con tipo, referencia y profesional pre-rellenados
- Detalle enriquecido con `AUDETALLE_CONSUMO_APP`: prioriza `GET /sia/detalle-consumo` para prácticas y totales de coseguro. ✅
- El usuario puede reintentar **solo** cuando el envío falló por conexión (estado ERR), no cuando SIA rechazó la solicitud. ✅
- Backend: `GET /mis-autorizaciones/:ausolicid/fotos` para recuperar adjuntos de órdenes médicas por solicitud (con validación de pertenencia por usuario). ✅
- Mobile: sección `Imágenes adjuntas` en detalle para solicitudes tipo `P`, con modal fullscreen y zoom por gesto (pinch/pan + swipe down para cerrar). ✅
- Mobile: en creación de solicitud se reactivó opción `Tomar foto` además de galería. ✅

### 9. Favoritos y recientes en cartilla
Impacto: Alto
Esfuerzo: S
Dependencias: ninguna
Estado: ✅ Completada — 17/03/2026

Descripción:
- Marcar prestadores/farmacias/delegaciones como favoritos.
- Mostrar búsquedas recientes y prestadores consultados recientemente.
- Permitir acceso rápido desde Home.

Implementado:
- Backend: `favoritosRepository.js` enriquecido con JOIN a `caentida` y `caendire` para devolver `nombre` y `direccion` junto al favorito/reciente.
- Mobile: Interface `Favorito` actualizada con campos `nombre?` y `direccion?`.
- Mobile: `FavoritosTab` y `RecientesTab` muestran nombre del prestador y dirección en lugar del `caentid` crudo.
- Mobile: `HomeScreen` muestra sección "⭐ Favoritos" + "🕒 Recientes" con acceso directo debajo del botón de cartilla (solo visible si hay datos). Cada ítem navega a `PrestadorDetalle`.
- Infraestructura preexistente: tabla `nu_favoritos_prestadores`, endpoints `/api/me/favoritos` y `/api/me/recientes`, componentes `FavoritoButton`, tabs en `CartillaMapScreen`.

Criterios de aceptación:
- ✅ Existen listas de favoritos y recientes persistidas (backend + cache AsyncStorage).
- ✅ El acceso al prestador requiere menos pasos que hoy (acceso directo desde Home).

### 10. Compartir credencial segura con expiración corta
Impacto: Medio-Alto
Esfuerzo: M
Dependencias: token temporal (implementado)
Estado: ✅ Completada — 20/03/2026

Descripción:
- El token temporal de 3 dígitos se genera en la app (algoritmo SHA256 sobre `afiliadoId`, bucket por tiempo, configurable desde `nusispar.CREDENCIAL.TimeoutTokenCredencial`).
- El token se incluye en el QR: `{afiliadoId, cuil, token, vence}`.

Implementado:
- Token temporal en QR con countdown en tiempo real (`CredencialCard`). ✅
- `GET /credencial/token-valido?afiliadoId=X&token=Y` — endpoint público de validación. Replica el algoritmo SHA256, valida contra bucket actual y anterior (tolerancia de ±1 ventana). Responde `{ valido, expiraEn, segundosRestantes, timeoutMinutos }`.

Criterios de aceptación:
- El contenido compartido expira. ✅ (token con vencimiento en QR)
- El receptor puede validar vigencia y autenticidad. ✅ (endpoint `/credencial/token-valido`)

### 11. Centro de ayuda dentro de la app ✅ Completada 17/03/2026
Impacto: Medio-Alto
Esfuerzo: S
Dependencias: info útil/admin existente

Descripción:
- FAQ dinámica desde backend.
- Sección de ayuda contextual por módulo.
- Acceso a soporte o derivación de contacto.

Criterios de aceptación:
- La ayuda se actualiza sin recompilar app. ✅
- Cada módulo principal puede enlazar ayuda relacionada. ✅

Implementación:
- `mobile/src/screens/AyudaScreen.tsx` — pantalla FAQ con acordeón, búsqueda y tabs de categoría
- `mobile/src/services/infoUtilService.ts` — tipo `InfoUtilItem` extendido con `categoria?` y `orden?`
- `mobile/src/App.tsx` — `AyudaScreen` agregada al `InfoUtilStack`
- `mobile/src/screens/HomeScreen.tsx` — botón "Centro de Ayuda" en la sección de acceso rápido
- `backend/scripts/seed-ayuda-faq.js` — 16 ítems FAQ en 5 categorías (faq, credencial, cartilla, autorizaciones, contacto)
- Navegación desde HomeScreen: `navigate('InfoUtil', { screen: 'Ayuda' })`
- Datos servidos por `GET /api/info-util` con filtro opcional `?categoria=`

### 12. Agenda sanitaria y recordatorios
Impacto: Medio-Alto
Esfuerzo: M
Dependencias: notificaciones push/locales
Estado: ❌ Descartada

Motivo: Fuera del alcance del sprint actual. No se implementará.

---

## P1 — Modo offline y sincronización

### 13. Cola offline para acciones diferidas
Impacto: Alto
Esfuerzo: L
Dependencias: arquitectura de sincronización
Estado: ❌ Descartada

Motivo: Complejidad alta y fuera del alcance del sprint actual. No se implementará.

### 14. Resolución de conflictos de sincronización
Impacto: Alto
Esfuerzo: M
Dependencias: tarea 13
Estado: ❌ Descartada

Motivo: Depende de tarea 13, también descartada. No se implementará.

### 15. Estado de sincronización visible al usuario
Impacto: Medio-Alto
Esfuerzo: S
Dependencias: tareas 13-14 recomendadas
Estado: ❌ Descartada

Motivo: Sin cola offline (#13) el alcance útil es mínimo. Se prioriza #13 como sprint dedicado cuando corresponda.

---

## P1 — Notificaciones y comunicación

### 16. Push notifications transaccionales reales
Impacto: Alto
Esfuerzo: M
Dependencias: infraestructura de push
Estado: ✅ Completada — 18/03/2026

Descripción inicial:
- Integrar envío real por dispositivo registrado.
- Casos: autorización resuelta (vía SIA WS_NOTIFICACION), credencial próxima a vencer, mensaje institucional.

Implementado:
- Categoría 'tramites' eliminada de todas las definiciones (no existe como función aún): `NOTIF_CATEGORIAS`, Zod enum backend, tipo `NotifCategoria` mobile, `CATEGORIAS_INFO` mobile.
- Categorías vigentes: `credencial | autorizaciones | noticias | sistema`.
- `POST /admin/notifications/broadcast` (requiere admin auth): envía mensaje institucional a todos los usuarios activos respetando preferencias `nu_notif_prefs`. Parámetros: `titulo` (≤80), `mensaje` (≤1000), `categoria` ('noticias'|'sistema'), `segmento` ('todos'). Devuelve stats: `{ usuarios, push_enviados, in_app_creadas, omitidos_pref, errores }`.
- SIA ya envía push de autorizaciones vía `POST /api/ws/WS_NOTIFICACION` (no se duplica en crear-solicitud).

Criterios de aceptación:
- La app recibe push segmentadas por evento. ✅
- Existe endpoint de broadcast institucional para el panel admin. ✅

### 17. Preferencias de notificación
Impacto: Medio-Alto
Esfuerzo: S
Dependencias: tarea 16
Estado: ✅ Completada — 18/03/2026

Descripción:
- Permitir elegir categorías de avisos.
- Respetar opt-in/opt-out por tipo.

Implementado:
- Tabla `nu_notif_prefs` (nuusuid + categoria PK, push BOOLEAN, in_app BOOLEAN) con FK a `nuusuari` ON DELETE CASCADE.
- Categorías: credencial | autorizaciones | noticias | sistema (tramites eliminado).
- Endpoints backend: `GET /api/me/notification-preferences` y `PUT /api/me/notification-preferences` (upsert, requiere auth).
- Helper `getNotifPref(nuusuid, categoria)` — default TRUE si no hay fila.
- `createNotification()` actualizado: recibe parámetro `categoria`, respeta `in_app` (skip DB) y `push` (skip Expo Push).
- Mobile `notificationPreferencesService.ts`: tipos `NotifPref`, `NotifCategoria`, constante `CATEGORIAS_INFO`, funciones `getNotificationPreferences()` / `updateNotificationPreferences()`.
- Pantalla `NotificationPreferencesScreen.tsx`: switches por categoría (push + en app), toggles globales, guardado explícito, soporte offline, indicador de estado.
- Navegación: item "Notificaciones" en `PerfilMenuScreen`, stack `NotificationPreferences` en `PerfilStack` de `App.tsx`.
- DDL aplicado a BD el 18/03/2026.

Criterios de aceptación:
- El usuario puede configurar qué quiere recibir.

---

## P1 — Administración y control interno

### 18. Auditoría de acciones administrativas
Impacto: Alto
Esfuerzo: M
Dependencias: ninguna
Estado: ✅ Completada — 13/03/2026

Descripción:
- Registrar altas, bajas, ediciones y cambios sensibles de parámetros, usuarios, cartilla e info útil.
- Guardar actor, fecha, ip, entidad afectada y diff resumido.

Implementado:
- Registro genérico en `audit_logs` para acciones administrativas críticas.
- Auditoría en parámetros, usuarios/admin backend, cartilla, info útil y acciones de email admin.
- Endpoint `GET /admin/audit-logs` con filtros por entidad, acción, actor, target y rango de fechas.
- Payload auditado con actor, requestId, ip, contexto de request y before/after resumido.

Validación 13/03/2026:
- Login admin OK.
- Flujo real CREATE/UPDATE/DELETE sobre `AUDIT_TEST.Temp` dejó 3 eventos en `/admin/audit-logs?entity=parametro`.
- Flujo real CREATE/UPDATE/DELETE sobre info útil dejó 3 eventos en `/admin/audit-logs?entity=info_util`.

Criterios de aceptación:
- Los cambios admin críticos quedan auditados.
- Existe una vista o consulta para revisión posterior.

### 19. Bitácora de cambios funcionales para soporte
Impacto: Medio-Alto
Esfuerzo: S
Dependencias: tarea 18 recomendada
Estado: ✅ Completada — 13/03/2026

Descripción:
- Pantalla simple para soporte con últimos eventos relevantes por usuario.

Implementado:
- Endpoint `GET adb install app\build\outputs\apk\debug\app-debug.apk` para resolver usuario por email/DNI/CUIL/nuusuid.
- Respuesta consolidada con estado actual del usuario, sesiones activas, conteo de credenciales y eventos auditados vinculados.
- Pantalla admin `GET /admin/soporte` para búsqueda rápida y lectura de timeline.
- Acceso agregado a la navegación de paneles admin y portada del backend.

Validación 13/03/2026:
- `GET /admin/soporte` responde 200.
- Login admin OK.
- Consulta real `GET /admin/support/timeline?q=admin@test.local&limit=20` devolvió usuario, 1 sesión activa y timeline operativo.

Criterios de aceptación:
- Soporte puede reconstruir la secuencia de eventos de un afiliado.

### 20. Feature flags desde parámetros
Impacto: Alto
Esfuerzo: S
Dependencias: sistema de parámetros existente
Estado: ✅ Completada — 16/03/2026

Descripción:
- Activar/desactivar funciones por entorno, segmento o rollout gradual.
- Usar `nusispar` como base inicial.

Implementación:
- Backend: `featureFlagsService.js` con 14 flags pre-definidos
- Endpoints públicos: `/feature-flags`, `/feature-flags/:nombre`, `/feature-flags/modulo/:modulo`
- Mobile: Hook `useFeatureFlags()` con caché local en AsyncStorage
- Seed SQL: 14 flags iniciales en `FUNCIONES_APP` (grupo)
- Tests: `test-feature-flags.ps1` con 9 casos
- Documentación: `FEATURE_FLAGS.md` completa

Criterios de aceptación:
- ✅ Se puede apagar una función sin desplegar app nueva (parámetro en nusispar)
- ✅ Hay trazabilidad de qué flags estaban activas (auditoría heredada de parámetros)

### 30. Alineación estética y sesión compartida de paneles admin
Impacto: Alto (operativo interno)
Esfuerzo: S
Dependencias: ninguna
Estado: ✅ Completada — 18/03/2026

Descripción:
- Unificar la apariencia visual de los 7 paneles web del backend.
- Implementar sesión compartida: login una sola vez, válida 8 horas para todos los paneles.

Implementado:
- `backend/public/admin-shared.js` (nuevo) — `AdminSession` con TTL 8h en `localStorage`, backward compat con `auth_token`. Funciones: `AdminSession.set/get/clear/getToken/getUser/minutesLeft()`, `adminAuthFetch()` (fetch autenticado con auto-redirect en 401), `adminLogout()`, `initAdminPanelAuth({loginId, appId, userInfoId, onReady})` (muestra app directamente si la sesión es válida), `highlightActiveNavLink()` (resalta enlace activo en barra de navegación).
- `backend/public/admin-shared.css` (reescrito) — estilos unificados: `.login-container`, `.nav-links a.active-nav`, `.session-badge`, `.btn`, `.alert-*`, `.badge-*`, `.stat-card`, responsive.
- 7 paneles HTML actualizados: `admin-parametros`, `admin-soporte`, `admin-notificaciones`, `admin-usuarios`, `admin-info-util`, `admin-diagnostico`, `admin-cartilla`.
  - Todos: `<script src="/admin-shared.js">`, `initAdminPanelAuth()` al cargar, `AdminSession.set()` en login, `AdminSession.clear()` en logout.
  - `admin-diagnostico`: migrado de `diag_auth_token`/`diag_auth_user` a `AdminSession`.
  - `admin-cartilla`: usa `AdminSession.getToken()` en lugar de `localStorage.getItem('auth_token')`.

Criterios de aceptación:
- ✅ Login en cualquier panel persiste la sesión por 8 horas en todos los demás.
- ✅ Badge de tiempo restante visible en cada panel (`"Sesión: 7h 42m"`).
- ✅ Enlace del panel activo resaltado en la barra de navegación.
- ✅ Al expirar, redirect automático a `/admin?returnUrl=...` con retorno al panel original.

---

## P2 — Calidad técnica y delivery

### 21. Contrato API documentado con OpenAPI
Impacto: Medio-Alto
Esfuerzo: M
Dependencias: ninguna
Estado: ✅ Completada — 19/03/2026

Descripción:
- Documentar endpoints principales de auth, credenciales, cartilla, info útil, SIA, admin.
- Publicar ejemplos de request/response.

Implementado:
- `backend/swaggerConfig.js` — especificación OpenAPI 3.0 con 33 endpoints documentados: Auth (8), GAM (2), Credenciales (3), Autorizaciones SIA (3), Cartilla (1), Favoritos (3), Notificaciones (4), Info Útil (1), Feature Flags (2), Admin Parámetros (3), Admin Usuarios (2), Admin Notificaciones (1), Admin Auditoría (1), Health (1).
- Middleware `swagger-ui-express` integrado en `server-soap.js` — con `try/catch` para no romper el servidor si hay error.
- `GET /api-docs` — UI interactiva de Swagger (explorar, probar, autenticar con Bearer token).
- `GET /api-docs.json` — especificación en JSON (para herramientas externas, Postman, etc.).
- Schemas reutilizables: `Usuario`, `Credencial`, `Autorizacion`, `Parametro`, `PrestadorCartilla`, `InfoUtil`, `Notificacion`, `FeatureFlag`, `ErrorResponse`.
- Soporte de `persistAuthorization: true` — el token Bearer se conserva entre requests.
- Instalación deps: `npm install swagger-jsdoc swagger-ui-express --save`.

Criterios de aceptación:
- Existe especificación versionada y accesible. ✅ (`GET /api-docs`)
- Mobile y backend comparten contrato verificable. ✅ (`GET /api-docs.json`)

### 22. Tests E2E del flujo crítico
Impacto: Alto
Esfuerzo: M
Dependencias: estabilidad de entorno
Estado: ✅ Completada — 19/03/2026

Descripción:
- Cubrir registro, login, credenciales, autorizaciones, cartilla y offline básico.
- Automatizar al menos smoke tests reproducibles.

Implementado:
- `backend/smoke-tests.ps1` — suite PS5.1 con 13 secciones, incluyendo cobertura de analítica funcional admin y constancia PDF.
- Secciones: health, login afiliado, credenciales, autorizaciones, cartilla, feature-flags, notificaciones, admin (login+params+audit+soporte), seguridad (refresh inválido), info-útil, favoritos/recientes, observabilidad, analítica funcional (`GET /admin/analytics/summary?days=7` + `401` sin token) y constancia PDF (`GET /credencial/constancia.pdf` + `401` sin token).
- Tolerancia de entorno: SKIP automático cuando GAM/SOAP/Beneficiarios están caídos (no FAIL).
- Resultado validado (20/03/2026): PASS=18, FAIL=0, SKIP=12.
- Resultado con todos los servicios activos: PASS≥24, FAIL=0, SKIP≤2.
- Uso: `cd backend; .\smoke-tests.ps1` (parámetros opcionales: `-BaseUrl`, `-Username`, `-Pass`, `-AdminEmail`, `-AdminPass`).

Criterios de aceptación:
- ✅ Hay suite reproducible para no romper funciones core.
- ✅ FAIL=0 con backend activo (con o sin servicios externos).

### 23. Hardening de errores y mensajes al usuario
Impacto: Medio-Alto
Esfuerzo: S
Dependencias: ninguna
Estado: ✅ Completada — 18/03/2026

Descripción:
- Unificar errores de red, SOAP, GAM, validación y permisos.
- Convertirlos en mensajes claros para app y admin.

Implementado:
- `mobile/src/utils/errorUtils.ts` — `getErrorMessage(error, fallback)`: normalizador centralizado.
  Filtra patrones técnicos (ECONNREFUSED, SOAP, SyntaxError, IPs internas, etc.), mapea patrones
  conocidos (usuario no encontrado, contraseñas, token expirado) y devuelve mensajes amigables.
- `LoginScreen.tsx` — catch simplificado a 3 líneas usando `getErrorMessage`. Eliminados 40+ líneas de switch/if manual.
- `ForgotPasswordScreen.tsx` — 3 catch genéricos reemplazados por `getErrorMessage`.
- `EnrolamientosScreen.tsx` — `error.message` en Alert reemplazado por `getErrorMessage`.
- `CredencialesScreen.tsx` — extracción manual de `msg` reemplazada por `getErrorMessage`.
- `ProfileScreen.tsx` — ídem anterior.
- `backend/server-soap.js` — eliminados 14 campos `details`/`detalle` con mensajes técnicos en
  respuestas de /register, /auth/login, /credenciales, /credencial/refresh, /credenciales/sync,
  /buscar-cuil. Los errores de GAM login ahora incluyen `message` user-friendly en el JSON.

Criterios de aceptación:
- ✅ No hay errores crudos expuestos al usuario final.
- ✅ El backend no expone error.message, stack traces ni IPs internas en respuestas HTTP.

### 24. Analítica funcional de uso
Impacto: Medio
Esfuerzo: S
Dependencias: definir herramienta
Estado: ✅ Completada — 20/03/2026

Descripción:
- Medir uso de login, cartilla, credencial, autorizaciones, notificaciones.
- Detectar pantallas con abandono alto.

Implementado:
- Tabla `app_functional_events` (autocreate `CREATE TABLE IF NOT EXISTS`) en PostgreSQL para eventos funcionales.
- Instrumentación automática en `backend/server-soap.js` para endpoints clave: login, cartilla, credencial, autorizaciones y notificaciones.
- Endpoint admin `GET /admin/analytics/summary?days=7` (requiere `requireAuth + requireAdmin`) con agregados por evento, módulo, pantalla, serie diaria y últimos eventos.
- Panel web `http://localhost:3000/admin/analytics` con sesión compartida admin (`admin-shared.js`) y tablero mínimo de métricas.

Criterios de aceptación:
- Existe tablero con eventos funcionales mínimos. ✅

---

## P2 — Nuevos módulos o extensiones funcionales

### 25. Carnet o constancia descargable en PDF
Impacto: Medio
Esfuerzo: M
Dependencias: backend de generación o plantilla
Estado: ✅ Completada — 20/03/2026

Descripción:
- Generar una versión PDF o imprimible de credencial o constancia.

Implementado:
- Endpoint autenticado `GET /credencial/constancia.pdf` para descarga directa de constancia en PDF.
- Emisión de PDF con datos principales de credencial (afiliado, CUIL, DNI, plan, parentesco, vigencia).
- Soporte de `afiliadoId` opcional para emitir constancia de un integrante puntual del grupo familiar.
- Incluye token temporal vigente y su vencimiento en el comprobante.
- Mobile: botón de descarga PDF en `CredencialesScreen` (modal de credencial) y en `ProfileScreen` (credencial titular o integrante seleccionado).
- Documentado en OpenAPI (`/api-docs`) y cubierto en smoke tests (401 sin token + descarga autenticada).

Criterios de aceptación:
- El afiliado puede descargar o compartir un comprobante formal. ✅

### 26. Mensajería o bandeja segura afiliado-soporte
Impacto: Medio
Esfuerzo: M
Dependencias: autenticación y notificaciones

Descripción:
- Canal seguro de intercambio para incidencias o seguimiento.

Criterios de aceptación:
- Existe historial de mensajes y estado de lectura.

---

## P3 — Optimización y evolución

### 27. Personalización del Home según perfil del afiliado
Impacto: Medio
Esfuerzo: M
Dependencias: analítica y reglas de negocio

Descripción:
- Reordenar accesos y tarjetas según uso frecuente y contexto.

### 28. Búsqueda inteligente en cartilla e info útil ✅ Completada
Impacto: Medio
Esfuerzo: M
Dependencias: índice de búsqueda

Descripción:
- Mejorar relevancia, tolerancia a errores y sugerencias.

**Implementado:**
- Backend: `sugerirEntidades()` con ranking por relevancia (exacto > startsWith > contains) y soporte multi-token en `cartillaRepository.js`. Endpoint `GET /api/cartilla/sugerencias`.
- Mobile: `searchService.ts` con debounce, `normalizeQuery()`, `filterInfoUtil()` y `getCartillaSugerencias()`.
- `CartillaMapScreen`: debounce 400ms en búsqueda principal + dropdown autocomplete con 350ms debounce.
- `InfoUtilScreen`: barra de búsqueda con filtrado local por relevancia (sin llamada extra a API).

### 29. Asistente guiado para autorizaciones
Impacto: Medio
Esfuerzo: M
Dependencias: reglas de negocio SIA

Descripción:
- Wizard para reducir errores de carga y solicitudes incompletas.

---

## Roadmap sugerido por etapas

### Etapa 1
- [x] 1. Estabilizar backend
- [x] 2. Observabilidad mínima
- [x] 4. Refresh token
- [x] 5. Gestión sesiones
- [x] 6. Rate limiting
- [x] 18. Auditoría admin

### Etapa 2
- [x] 8. Timeline de autorizaciones
- [x] 9. Favoritos cartilla
- [x] 16. Push notifications ✅

### Etapa 3
- [ ] 26. Mensajería segura
- [x] 22. Tests E2E

### Etapa 4
- [x] 11. Centro de ayuda ✅
- [ ] 27. Home personalizado
- [x] 28. Búsqueda inteligente ✅
- [ ] 29. Asistente guiado para autorizaciones
- [x] 21. OpenAPI
- [x] 24. Analítica funcional

---

## Tareas que yo recortaría primero si hay poco tiempo
- [ ] 26. Mensajería segura
- [ ] 27. Home personalizado

## Tareas descartadas en este backlog
- [x] 12. Agenda sanitaria y recordatorios
- [x] 13. Cola offline para acciones diferidas
- [x] 14. Resolución de conflictos de sincronización
- [x] 15. Estado de sincronización visible al usuario

## Tareas que no demoraría demasiado
- [x] 1. Estabilizar backend
- [x] 2. Observabilidad mínima
- [x] 4. Refresh token
- [x] 16. Push notifications ✅
- [x] 18. Auditoría admin

---

## Análisis de próximas tareas — 26/03/2026

### Estado actual del producto

Completadas hasta hoy: **1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 28, 30**
Pendientes accionables: **26**
Mejoras evolutivas (sin prioridad asignada): **27, 29**
Pendientes de validación o alcance menor: **ninguno**
Descartadas: **12, 13, 14, 15**

### Infraestructura disponible relevante

| Área | Qué ya existe |
|------|---------------|
| SIA backend | `POST /sia/crear-solicitud`, `POST /sia/solicitudes` (REC_SOLICITUDES_APP), `GET /sia/historial-atencion` (HISTORIAL_ATENCION_APP), `GET /sia/coseguros-pendientes` |
| Mobile SIA | `SolicitudAutorizacionScreen` (crear solicitud), `HistorialAtencionScreen` (atenciones médicas) |
| Tokens | Token temporal 3 dígitos con countdown, `tokenTemporalVenceEn` en credencial |
| Offline | `OfflineBanner`, `StorageManager`, `AuthContext` con login dual, `isOfflineMode`, `requiresRelogin` |
| Notificaciones | Push vía Expo, preferencias por categoría, broadcast admin |
| Admin panels | 7 paneles con sesión compartida 8h, auditoría, soporte, feature flags |

---

### Evaluación por tarea

#### 🔴 #8 — Timeline de autorizaciones SIA
**Viabilidad: Alta** — La infraestructura SOAP ya existe (`REC_SOLICITUDES_APP` lista el historial de
solicitudes del afiliado). Hay 3 pantallas implementadas:
- `MisAutorizacionesScreen` — listado con estados (AUT, APR, ENV, REC, PEN) y badge coloreado
- `SolicitudAutorizacionScreen` — creación tipo P y S
- `AutorizacionDetalleScreen` — detalle individual con prácticas enriquecidas desde `AUDETALLE_CONSUMO_APP`, tabla full width y totales

Backend: `GET /mis-autorizaciones` (sincroniza con SOAP en background y completa `prestacion_descripcion`/`numero_delegacion` con `AUDETALLE_CONSUMO_APP`) + `POST /sia/crear-solicitud`.

**Estado real: ✅ Completado** — el detalle ya muestra la lista completa de prácticas por autorización, cantidades, importes de coseguro y totales.

- Esfuerzo pendiente: **ninguno**
- Dependencias: servidor SIA disponible para validación

#### 🔴 #8b — Detalle consumo / Coseguros pendientes
**Estado real: ✅ Completado** — `GET /sia/coseguros-pendientes` y `GET /sia/detalle-consumo` ya quedaron incorporados en la experiencia de autorizaciones. El detalle enriquecido usa `AUDETALLE_CONSUMO_APP` para mostrar prácticas y totales, por lo que no queda trabajo pendiente dentro del alcance actual.

#### 🟡 #10 — Compartir credencial segura con expiración corta
**Estado real: ✅ Completado** — El token temporal ya está en el QR y el backend expone
`GET /credencial/token-valido` para validar vigencia/autenticidad.

- Esfuerzo pendiente: **ninguno**

#### ⚫ #12, #13, #14, #15 — Tareas descartadas
Quedan fuera del plan actual.

- `#12 Agenda sanitaria y recordatorios` — descartada por alcance/sprint.
- `#13 Cola offline para acciones diferidas` — descartada por complejidad alta.
- `#14 Resolución de conflictos` — descartada por depender de `#13`.
- `#15 Estado de sincronización visible` — descartada por depender del mismo bloque offline.

#### 🟡 #21 — Contrato API con OpenAPI
**Estado real: ✅ Completado** — OpenAPI publicado en `GET /api-docs` y `GET /api-docs.json`.

- Esfuerzo pendiente: **ninguno**

#### 🟢 #22 — Tests E2E del flujo crítico
**Estado real: ✅ Completado** — Suite `backend/smoke-tests.ps1` consolidada y actualizada,
incluyendo cobertura de analítica funcional admin.

- Esfuerzo pendiente: **ninguno**

#### 🟢 #28 — Búsqueda inteligente en cartilla e info útil
**Estado real: ✅ Completado** — `searchService.ts` con debounce y normalización, `sugerirEntidades()` backend con ranking, autocomplete integrado en `CartillaMapScreen`, `FarmaciasScreen` y `DelegacionesScreen`.

- Esfuerzo pendiente: **ninguno**

---

### Recomendación de orden para próximo sprint

| Prioridad | Tarea | Motivo |
|-----------|-------|--------|
| 1 | **#26 Mensajería segura** | Único pendiente accionable del backlog; canal seguro afiliado-soporte |
| Evolutivo | **#27 Home personalizado** | Base ya existe (favoritos, accesos rápidos); requiere lógica de personalización por usuario |
| Evolutivo | **#29 Asistente guiado autorizaciones** | Postergado; `SolicitudAutorizacionScreen` cubre el caso de uso básico |
| Fuera de alcance | **#12, #13, #14, #15** | Marcadas como descartadas en este backlog |

---

## Funciones nuevas incorporadas — Sprint 26/03/2026

Tareas surgidas de la necesidad operativa del sprint actual. Algunas ya completadas, otras pendientes.

### 31. Desconocimiento de prácticas
Impacto: Alto
Esfuerzo: S
Dependencias: Historial de Atención, SIA
Estado: ✅ Completada — 26/03/2026

Descripción:
- Permitir al afiliado desconocer una práctica del historial de atención.
- Registrar motivo y descripción.
- Panel admin para revisar y gestionar el estado de cada desconocimiento.

Implementado ✅:
- Mobile: `handleDesconocer()` en `HistorialAtencionScreen` — Picker de motivo + TextInput descripción + loading + alert de confirmación.
- Backend user: `POST /desconocimientos` (insert con nuusuid, afiliado_id, atencion_id, motivo, descripcion) y `GET /desconocimientos` (lista filtrada por usuario).
- BD: tabla `app_desconocimientos` (estados: pendiente/en_revision/resuelto/cerrado; motivos: no_reconozco/incorrecto/duplicado/otro).
- Backend admin: `GET /admin/desconocimientos` (paginado + filtros estado/búsqueda), `PATCH /admin/desconocimientos/:id/estado` (cambio de estado con `writeAdminAuditLog`).

✅ Completado — 26/03/2026:
- Panel unificado `admin-historial-atencion.html` (tabs: Desconocimientos + Calificaciones).
- Ruta `/admin/historial-atencion-ui` en `server-soap.js`.
- Nav links actualizados en `admin-noticias.html` y `admin-planes.html`.
- Formato del panel normalizado al estándar admin (`Panel Admin`).
- Acceso incorporado al inicio en `backend/public/index.html` (botón `Historial de Atención`).

Criterios de aceptación:
- El afiliado puede desconocer una práctica con motivo. ✅
- El admin puede ver, filtrar y gestionar desconocimientos desde panel web. ✅

### 32. Calificación de Atención
Impacto: Alto
Esfuerzo: S
Dependencias: Historial de Atención
Estado: ✅ Completada — 26/03/2026

Descripción:
- Permitir al afiliado calificar una atención médica (1–5 estrellas + comentario).
- Panel admin con métricas de calidad promedio y distribución de estrellas.

Implementado ✅:
- Mobile: `handleCalificar()` en `HistorialAtencionScreen` — selector de 5 estrellas táctil + TextInput comentario + upsert (evita duplicado por constraints).
- Backend user: `POST /calificaciones` (upsert con UNIQUE nuusuid+atencion_id), `GET /calificaciones` (lista por usuario), `GET /calificaciones/:atencionId` (calificación específica).
- BD: tabla `app_calificaciones` (puntuacion SMALLINT CHECK 1–5, UNIQUE nuusuid+atencion_id).
- Backend admin: `GET /admin/calificaciones` (paginado + filtros puntuacion/búsqueda), `GET /admin/calificaciones/resumen` (total, promedio, distribución por estrella).

✅ Completado — 26/03/2026 (integrado en panel unificado `admin-historial-atencion.html`).
- Formato del panel normalizado al estándar admin (`Panel Admin`) y acceso desde inicio del backend.

Criterios de aceptación:
- El afiliado puede calificar una atención, sin duplicados. ✅
- El admin puede ver el promedio global y distribución de estrellas. ✅ (endpoint)
- El admin puede acceder a los datos desde panel web. ✅

### 33. Planes con diferentes imágenes de credenciales
Impacto: Medio-Alto
Esfuerzo: S
Dependencias: backend de planes, CredencialCard
Estado: ✅ Completada — 26/03/2026

Descripción:
- Cada plan de cobertura puede tener su propia imagen de fondo para la credencial digital.
- Los admin pueden subir y gestionar las imágenes desde panel web.
- La app mobile muestra la imagen correspondiente al plan del afiliado.

Implementado ✅:
- Backend: tabla `app_planes_imagenes` (o equivalente), endpoints REST para CRUD de imágenes por plan.
- Panel admin `admin-planes.html`: grilla de planes con preview de imagen, modal para subir/cambiar imagen, hints de proporción recomendada 16:9 (1600×900 px) en modal y en tarjetas de grilla.
- Hints de tamaño de imagen: `.image-hint` en formulario + `.preview-hint` en cada tarjeta del grid.

Criterios de aceptación:
- El admin sube la imagen del plan desde interfaz web. ✅
- La credencial muestra la imagen correcta según plan. ✅

### Prioridad técnica sugerida (próximo tramo)
1. **#35 Filtros en Mis Autorizaciones** — quick win (esfuerzo S, impacto visible inmediato).
2. **#36 Filtros en Historial de Atención** — reutiliza patrón de filtros y estado de pantalla.
3. **#34 Plantilla de credencial (general/plan)** — requiere mayor cuidado funcional/auditoría (esfuerzo M).

### 34. Plantilla de credencial (general y por plan)
Impacto: Medio
Esfuerzo: M
Dependencias: `nuplan`, panel admin backend, componente `CredencialCard`
Estado: ✅ Completada — 27/03/2026
Prioridad técnica: 3

Descripción:
- Permitir al administrador definir qué datos se muestran en la credencial y cómo se presentan.
- Configuración por alcance **general** o por **plan** (override), sin edición por afiliado.
- Campos configurables: ubicación (x/y), tipografía, tamaño, estilo, color, visibilidad y si permite ocultar con el ojito.

Criterios de aceptación:
- Existe API para guardar/leer plantilla general y por plan con auditoría. ✅
- El panel admin permite editar la plantilla por campo (sin afiliado individual). ✅
- La app mobile recibe la configuración de layout junto con las credenciales. ✅

Implementado ✅:
- Persistencia de layouts: tabla `app_credencial_layout` (`backend/db/create_app_credencial_layout.sql`).
- Backend:
  * `GET /admin/credenciales-layout?scope=GENERAL|PLAN&planId=`
  * `PUT /admin/credenciales-layout/general`
  * `PUT /admin/credenciales-layout/plan/:id`
  * `DELETE /admin/credenciales-layout/plan/:id`
- Auditoría admin en `audit_logs` para actualización de layout general/plan.
- Interfaz web `backend/public/admin-credenciales.html` (ruta `http://localhost:3000/admin/credenciales-ui`) reconvertida a editor de plantilla:
  * Modo general o por plan.
  * Grilla por campo con `visible`, `allowEyeToggle`, `x`, `y`, `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `color`.
  * Configuración de títulos por campo: `titlePosition` (`izquierda`, `superior`, `inferior`, `derecha`, `invisible`) y `titleFontSize`.
  * Combo de fuentes seguras + normalización para Android (evita warnings por familias no soportadas).
  * Vista previa en vivo y presets rápidos (`Clásico`, `Compacto`, `Minimal`) para aplicar estilos base.
  * Botón para quitar override de plan y volver a plantilla general.
- Mobile `CredencialCard` usa `credencial.credencialLayout` para aplicar posición/tipografía/estilo/visibilidad por campo.
- Mobile muestra la descripción de plan (`crcrepladesc`) como valor principal, con fallback al ID técnico.
- Endpoints legacy de edición por afiliado en admin credenciales quedan deshabilitados (`410 Gone`) por decisión funcional.

### 35. Filtros en Mis Autorizaciones
Impacto: Medio-Alto
Esfuerzo: S
Dependencias: `MisAutorizacionesScreen`, backend `GET /mis-autorizaciones`
Estado: ✅ Completada — 27/03/2026
Prioridad técnica: 1

Descripción:
- Agregar controles de filtrado en la pantalla de autorizaciones del afiliado.
- Filtros sugeridos: estado (ENV/AUD/AUT/REC/PEN/CON), rango de fechas, tipo (P/S), búsqueda por prestación o prestador.

Criterios de aceptación:
- El afiliado puede filtrar sus autorizaciones por estado y fecha. ✅
- El backend acepta parámetros de filtro en `GET /mis-autorizaciones`. ✅
- La UI no pierde estado al navegar entre pantallas. ✅ (useState local)
- Búsqueda por texto (prestación, prestador) implementada y funcional. ✅

Implementado ✅:
- Backend: query params `tipo`, `estado`, `fechaDesde`, `fechaHasta`, `search` en `GET /mis-autorizaciones`.
- Backend: función `matchesServerFilters()` que aplica todos los filtros server-side antes de responder.
- Mobile: `filterPanel` con chips para `tipo` (todos/P/S) y `estado` (todos/ENV/AUD/AUT/REC/PEN/CON).
- Mobile: date pickers para rango de fechas (`filterFechaDesde` / `filterFechaHasta`).
- Mobile: TextInput de búsqueda (`filterSearch`) que busca en prestación, prestador, profesional, descripción, afiliado y número de autorización.
- Mobile: estado de filtros persiste en la UI; recarga automática al cambiar filtros sin perder contexto.
- Mobile: contador en badge del botón filtro que muestra cantidad de filtros activos.
- Mobile: botón "Limpiar filtros" en el panel y empty state cuando no hay resultados.
- Backend: response incluye `filtrosAplicados` (debugging + confirmación de filtros procesados).

### 36. Filtros en Historial de Atención
Impacto: Medio-Alto
Esfuerzo: S
Dependencias: `HistorialAtencionScreen`, backend `GET /sia/historial-atencion`
Estado: ✅ Completada — 27/03/2026
Prioridad técnica: 2

Descripción:
- Agregar controles de filtrado en el historial de atención médica del afiliado.
- Filtros sugeridos: rango de fechas, prestador/entidad y texto general.

Criterios de aceptación:
- El afiliado puede filtrar el historial por fecha y prestador. ✅
- Los parámetros de filtro se pasan al endpoint SIA (`GET /sia/historial-atencion`). ✅
- El estado de filtros persiste mientras el usuario está en la pantalla. ✅

Implementado ✅:
- Backend `GET /sia/historial-atencion`: query params opcionales `Prestador` y `SearchText`.
- Backend: cuando `SearchText` está presente, enriquece cada ítem con `_nombrePractica` via `AUDETALLE_CONSUMO_APP` (llamadas paralelas con `Promise.all`) antes de filtrar — permite encontrar autorizaciones por nombre de práctica.
- Backend: aplica filtros server-side sobre `Resultado` parseado del SOAP (`EntidadNombre/Prestador` + `Object.values()` sobre todos los campos incluyendo `_nombrePractica`).
- Backend: respuesta incluye `filtrosAplicados` para trazabilidad/debug.
- Mobile `HistorialAtencionScreen`: panel de filtros con `Prestador`, `Texto general`, `Desde`, `Hasta`.
- Mobile: los filtros se envían en query params al backend y se refrescan automáticamente (debounce 300 ms).
- Mobile: estado de filtros mantenido en pantalla con badge de cantidad de filtros activos y acción de limpiar.

### 37. Espacio de noticias/novedades en el Home administrado por backend
Impacto: Alto
Esfuerzo: S
Dependencias: backend de noticias, HomeScreen
Estado: ✅ Completada — 26/03/2026

Descripción:
- Sección de noticias/novedades institucionales en el Home de la app.
- El contenido es administrado completamente desde el panel web backend.
- Soporte de imágenes, fechas de publicación y estado activo/inactivo.

Implementado ✅:
- Backend: tabla `app_noticias`, endpoints REST para CRUD con imagen y control de estado.
- Panel admin `admin-noticias.html`: CRUD completo con preview de imagen, hints de proporción 16:9 (1200×675 px) en modal y en tarjetas del grid.
- Mobile `HomeScreen`: sección de noticias con cards compactas (imagen + título + "Ver más →"), recarga automática al volver al foco o al pasar a primer plano.

Criterios de aceptación:
- El admin puede crear, editar y publicar noticias desde panel web. ✅
- La app muestra las noticias activas en el Home. ✅
- Las noticias se actualizan al volver al foco sin recompilar app. ✅

### 38. Rediseño integral de web panels admin (UX + Accesibilidad)
Impacto: Alto
Esfuerzo: L
Dependencias: `backend/public/*.html`, rutas `/admin/*`, auth admin, componentes UI comunes
Estado: 🟡 Planificada — 27/03/2026

Descripción:
- Unificar navegación, layout y patrones de interacción en todos los web panels del backend.
- Resolver problemas de accesibilidad y de navegación entre funciones.
- Migrar paneles a una arquitectura compartida (shell común) para reducir duplicación y errores.

Documentación de implementación:
- Plan detallado por fases: `ADMIN_WEBPANELS_REDESIGN_PLAN.md`.

Criterios de aceptación:
- Todos los panels usan navegación común (sidebar + breadcrumb + topbar). 
- Baseline de accesibilidad WCAG AA aplicado (foco visible, teclado, landmarks, labels, modales accesibles).
- Rutas actuales `/admin/*` continúan operativas sin romper flujos de soporte.
- Existe evidencia de pruebas por fase y por panel (smoke funcional + checklist A11y).

Plan de ejecución (resumen):
- Fase 0: diagnóstico e inventario de deuda UX/A11y.
- Fase 1: shell común y home de administración.
- Fase 2: migración ola 1 (`admin-usuarios.html`, `admin-parametros.html`, `admin-credenciales.html`).
- Fase 3: migración ola 2 (resto de paneles).
- Fase 4: endurecimiento de accesibilidad y QA final.

---

## Resumen estado tareas sprint 27/03/2026

| # | Tarea | Estado |
|---|-------|--------|
| 31 | Desconocimiento de prácticas | ✅ Completa |
| 32 | Calificación de Atención | ✅ Completa |
| 33 | Planes con imágenes de credenciales | ✅ Completa |
| 34 | Plantilla de credencial (general/plan) | ✅ Completa |
| 35 | Filtros en Mis Autorizaciones | ✅ Completa |
| 36 | Filtros en Historial de Atención | ✅ Completa |
| 37 | Noticias/novedades en Home | ✅ Completa |
| 38 | Rediseño integral web panels admin | 🟡 Planificada |
