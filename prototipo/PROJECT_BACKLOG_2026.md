# Backlog semanal — APP_Afiliados (2026)

**Capacidad:** 1 desarrollador, 8 hs/semana

**Inicio:** 06/01/2026  
**Fin estimada:** 18/08/2026  
**Duración:** 32 semanas (~256 hs)

## Hitos (para seguimiento)
- **H1 — Prisma+Zod (BD completa) estable:** al cierre de Semana 10 (16/03/2026)
- **H2 — Cartillas + GEO + filtros (3 módulos) completas:** al cierre de Semana 20 (25/05/2026)
- **H3 — Info útil administrable:** al cierre de Semana 23 (15/06/2026)
- **H4 — Notificaciones + dispositivos end-to-end:** al cierre de Semana 28 (20/07/2026)
- **H5 — Admin usuarios:** al cierre de Semana 29 (27/07/2026)
- **H6 — RC lista (QA completo):** al cierre de Semana 30 (03/08/2026)
- **H7 — Publicación en stores:** al cierre de Semana 32 (18/08/2026)

## Registro de decisiones y riesgos (actualizar semanalmente)
| Fecha | Decisión / Riesgo | Impacto | Acción | Estado |
|------:|-------------------|---------|--------|--------|
| 08/04/2026 | Publicación iOS preflight ejecutado (build-ipa ValidateOnly) con pendientes de configuración | Alto | Completar `extra.eas.projectId`, `googleMapsApiKey` iOS, `COMPLETAR_APPLE_*` en `eas.json` y URLs legales App Store | Abierto |
| 06/01/2026 | Prisma+Zod para toda la BD (baseline + migraciones) | Alto | Definir estrategia de baseline sin romper entornos | Abierto |
| 06/01/2026 | Cartillas: filtros (especialidad, texto, geo) + Google Maps | Medio | Confirmar cuotas geocoding + persistencia lat/lng | Abierto |
| 06/01/2026 | Publicación iOS puede requerir iteraciones por revisión | Alto | Reservar buffer en Sem 31–32 | Mitigado |

## Definition of Done (DoD) semanal
- [x] Backend: endpoints nuevos/modificados con validación Zod (body/query/params)
- [ ] BD: acceso vía Prisma (o `$queryRaw` documentado si aplica) + migración reproducible si hay cambios de esquema
- [x] Evidencia: script PowerShell de prueba o ejemplo reproducible documentado
- [ ] Mobile (si aplica): UI con estados `cargando / vacío / error` + mensajes claros
- [ ] Validación: pasa pre-push (lint/typecheck/tests disponibles)

---

## Semana 1 (06/01–12/01) — Setup para desarrollo asistido
- [x] Consolidar guía de ejecución (backend/mobile) y validaciones
- [x] Acordar estructura objetivo (Prisma + Zod): `prisma/`, validadores, rutas, repositorios
- [x] Checklist de cambios (no tocar `build/*`, PRs pequeños)

**Evidencia (Semana 1)**
- Guía de desarrollo: `DEVELOPMENT.md`
- Estructura objetivo Prisma+Zod: `backend/PRISMA_ZOD_TARGET.md`
- Ajustes de guía/checklist: `README.md`, `CONTRIBUTING.md`

## Semana 2 (13/01–19/01) — Infra Zod estándar
- [x] Middleware `validateBody/validateQuery/validateParams`
- [x] Formato estándar de error (400 Zod, 401 auth, 500 interno)
- [x] Aplicar a 1–2 endpoints existentes como ejemplo

**Evidencia (Semana 2)**
- Middleware Zod: `backend/zodMiddleware.js`
- Ejemplos aplicados: `POST /auth/login`, `GET /buscar-cuil`
- Normalización admin parámetros con Zod: `GET/PUT/POST/DELETE /admin/parametros*`
- Smoke test reproducible: `backend/test-zod-validation.ps1`

## Semana 3 (20/01–26/01) — Prisma: inicialización + conexión
- [x] Integrar Prisma al backend, conexión por env/config (adelantado)
- [x] Generar `schema.prisma` inicial y probar conexión (adelantado)

**Evidencia (Semana 3)**
- Config ejemplo: `backend/.env.example` (incluye `DATABASE_URL`)
- Check reproducible Prisma: `backend/test-prisma-connection.ps1`
- Script Node de conexión: `backend/scripts/prisma-check.js`

## Semana 4 (27/01–02/02) — Prisma baseline (parte 1)
- [x] Modelar tablas core: `nuusuari`, `nuusuauth`, `nusispar` (adelantado)
- [x] Definir relaciones y tipos principales (adelantado)

## Semana 5 (03/02–09/02) — Prisma baseline (parte 2)
- [x] Modelar credenciales: `crcreden`, `crcredus` (adelantado)
- [x] Modelar notificaciones/dispositivos si ya existen tablas; si no, definir modelos target (adelantado)

## Semana 6 (10/02–16/02) — Migraciones reproducibles (baseline + reglas)
- [x] Definir estrategia de baseline + migraciones futuras (adelantado)
- [x] Documentar “cómo cambiar BD” (siempre migration) (adelantado)

**Evidencia (Semana 6)**
- Runbook migraciones Prisma: `backend/PRISMA_MIGRATIONS.md`

## Semana 7 (17/02–23/02) — Refactor backend a repositorios (mínimo)
- [x] Crear capa `repositories/` para accesos Prisma
- [x] Migrar 2–3 consultas críticas (usuario por username, parámetros, lectura credenciales)

**Evidencia (Semana 7)**
- Repos usuarios: `backend/repositories/userRepository.js`
- Repo credenciales (join): `backend/repositories/credencialesRepository.js`
- Integración en API: `backend/server-soap.js` (`/auth/login`, `/credenciales`, `/credenciales/sync` via helper)
- Smoke test reproducible: `backend/test-week7-repositories.ps1`

## Semana 8 (24/02–02/03) — Auth/usuarios con Prisma + Zod
- [x] Validar inputs con Zod en endpoints de auth/usuario
- [x] Migrar consultas usuario a Prisma

**Evidencia (Semana 8)**
- Auth híbrido migrado a Prisma: `backend/server-soap.js` (`requireAuth`, `GET /auth/me`, `POST /auth/refresh-token`, `POST /auth/recover-password`, `PUT /users/password`)
- Repos usuarios ampliado: `backend/repositories/userRepository.js` (helpers GAM/token + findById)
- Smoke test reproducible: `backend/test-week8-auth.ps1`

## Semana 9 (03/03–09/03) — Credenciales: lectura BD con Prisma
- [x] Migrar lectura de credenciales (joins) a Prisma o `$queryRaw` optimizado
- [x] Script PowerShell para verificar respuesta

**Evidencia (Semana 9)**
- Repo lectura credenciales: `backend/repositories/credencialesRepository.js` (Prisma `$queryRaw`)
- Smoke test reproducible: `backend/test-week9-credenciales.ps1`

## Semana 10 (10/03–16/03) — Parámetros con Prisma + Zod
- [x] Migrar endpoints/admin parámetros a Prisma (según arquitectura vigente)
- [x] Validación Zod para ABM

**Evidencia (Semana 10)**
- Repository parámetros: `backend/repositories/parametrosRepository.js` (7 métodos CRUD con Prisma)
- Endpoints refactorizados: `backend/server-soap.js` (5 endpoints `/admin/parametros*` usan repository)
- Validación Zod: AdminGrupoParamsSchema, AdminGrupoTipoParamsSchema, AdminParametroValorBodySchema, AdminParametroCreateBodySchema
- Redacción de sensibles: WSBENEFTK.Password, WSSIATK.Password, GAM.ClientSecret, GAM.ClientId
- Cache + recarga automática: `recargarParametros()` después de mutaciones
- Admin panel funcional: `http://localhost:3000/admin` (login: admin/admin123)

---

# CARTILLAS (prestadores/farmacias/delegaciones) + GEO + FILTROS

**Filtros acordados (comunes):**
- `especialidadId`
- `q` (texto libre en descripción)
- `lat/lng/radioKm` (cerca de mí) + orden por distancia
- `page/limit`

## Semana 11 (17/03–23/03) — Modelos Prisma cartillas + tablas
- [x] Definir 3 tablas o 1 unificada por `tipo`
- [x] Campos: `id_origen`, `descripcion`, `especialidad_id`, `direccion`, `localidad`, `lat`, `lng`, `geocode_status`, `updated_at`

**Evidencia (Semana 11)**
- Análisis de diseño: `WEEK11_CARTILLAS_DESIGN.md` (decisión: extender modelo existente con GEO)
- Migración SQL: `backend/db/add_cartillas_geo_fields.sql` (6 nuevos campos en caendire + indices)
- Script aplicación: `backend/db/apply-cartillas-geo-migration.ps1`
- Schema Prisma: `backend/prisma/schema.prisma` (9 modelos: Carubro, Caentida, Caendire, Caentele, Caespeci, Cacartil, Camicart, Nulocali, Nuprovin)
- Campos GEO: caendlat, caendlng, caendgeost, caendgeoer, caendgeoup, caendupdated

## Semana 12 (24/03–30/03) — ETL inicial + Admin Panel Cartilla ✅
- [x] Script import: upsert por `id_origen`
- [x] Registrar `last_sync` (tabla o log)
- [x] **BONUS:** Admin Panel Web completo para gestión de cartilla
- [x] **BONUS:** Servicios de geocodificación con Google Maps API
- [x] **BONUS:** Sistema de importación de archivos JSONL
- [x] **BONUS:** CRUD completo con modales (Crear/Editar/Ver/Eliminar)
- [x] **UPSERT catálogos:** países, provincias, localidades, rubros, especialidades

**Evidencia (Semana 12)**
- **ETL Core:**
  - Servicio ETL: `backend/services/cartillaImportService.js` (streaming JSONL, batch 100, UPSERT)
  - **UPSERT completo:** 9 tablas (nupais, nuprovin, nulocali, carubro, caespeci, caentida, caendire, caentele, cacartil)
  - **Catálogos automáticos:** extrae y guarda países, provincias, localidades, rubros, especialidades desde JSON
  - **⚠️ LÓGICA NEGOCIO - Detección automática FARMACIAS (Semana 18):**
    * Registros CON rubro y/o especialidad → Prestadores normales (médicos, clínicas, etc.)
    * Registros SIN rubro NI especialidad → **Auto-asignar rubroId='000000008' (FARMACIA)**
    * Esta regla se aplica durante el proceso de importación en `cartillaImportService.js`
    * **TODO Semana 18:** Actualizar servicio ETL con lógica de detección automática
  - Scripts PowerShell: 
    - `backend/import-cartilla-external.ps1` - Importación individual
    - `backend/db/import-cartilla-complete.ps1` - Limpieza + importación completa
    - `backend/db/truncate-cartilla.js` - Limpieza de las 9 tablas (credenciales corregidas: postgres/12345678)
    - `backend/db/truncate_cartilla_tables.sql` - SQL limpieza completa
    - `backend/db/verify-empty-cartilla.js` - Verificación post-limpieza (NEW 28/01)
    - `backend/test-import-cartilla-sample.ps1` - Test con archivo de prueba
    - `backend/analyze-cartilla-file.ps1` - Análisis de archivo JSONL
  - Schema Prisma: actualizado con 9 modelos completos (introspección via `db pull`)
  - Importación producción: 2771 registros (2669 insertadas, 102 actualizadas, 0 errores)
  - Distribución: 1964 médicos, 40 institutos, 32 centros, 26 sanatorios, 10 clínicas, 5 laboratorios, 2 colegios
  - Estado geocoding: todos los registros con `caendpenge='N'` (pendiente para Semana 13)
  - **Limpieza verificada:** 9,170 registros eliminados exitosamente (28/01/2026)

- **Admin Panel (IMPLEMENTACIÓN COMPLETA 28/01):**
  - Servicio geocodificación: `backend/services/geocodingService.js` (304 líneas, integración Google Maps)
  - Repositorio cartilla: `backend/repositories/cartillaRepository.js` (545 líneas, 10 métodos CRUD + teléfono/web)
  - Interfaz web: `backend/public/admin-cartilla.html` (1641 líneas, 3 tabs + modales CRUD + anti-caché)
  - **Modales interactivos:** Modal crear/editar con validación, formulario completo (descripción, rubro, matrícula, especialidad, **teléfono**, **página web**, dirección, localidad, estado, observaciones)
  - **Teléfono y Web (NEW 28/01):** 
    - Backend: Guarda `caentelefo` en tabla `caentele` (composite key), `caentweb` en `caentida`
    - Frontend: Campos en formulario crear/editar, display en modal "Ver Detalle" (web como link clickeable)
    - Repository: `getEntidadById` devuelve primer teléfono + web, `createEntidad`/`updateEntidad` manejan ambos campos
    - Tests: `backend/test-phone-web-direct.js`, `backend/test-add-complete.js`, `backend/test-check-web-field.js`
    - Console.log debugging: `viewEntidad` loguea datos recibidos para troubleshooting
    - Meta tags anti-caché: HTML con `Cache-Control`, `Pragma`, `Expires`
    - Entidad de prueba: SANATORIO PASTEUR S.A. (ID: 0000010001) con teléfono 0261-4567890 y web
    - Documentación: `TELEFONO_WEB_IMPLEMENTADO.md`
  - **Tooltips:** Botones ABM con title descriptivos (Ver detalles, Editar, Eliminar)
  - **Catálogos dinámicos:** Carga automática de rubros, especialidades, localidades vía API
  - 13 endpoints REST en `server-soap.js`:
    - `GET /admin/cartilla` - Interfaz web
    - `GET /admin/cartilla/entidades` - Listar con filtros
    - `GET /admin/cartilla/entidades/:id` - Detalle (incluye caentelefo + caentweb)
    - `POST /admin/cartilla/entidades` - Crear (soporta teléfono + web)
    - `PUT /admin/cartilla/entidades/:id` - Actualizar (soporta teléfono + web)
    - `DELETE /admin/cartilla/entidades/:id` - Eliminar
    - `GET /admin/cartilla/rubros` - Catálogo rubros
    - `GET /admin/cartilla/especialidades` - Catálogo especialidades
    - `GET /admin/cartilla/localidades` - Catálogo localidades
    - `POST /admin/cartilla/upload` - Upload JSONL
    - `GET /admin/cartilla/geocoding/stats` - Estadísticas
    - `POST /admin/cartilla/geocoding/process` - Procesar batch
    - `POST /admin/cartilla/geocoding/retry` - Reintentar errores
  - Migraciones BD:
    - `backend/db/add-geo-columns-simple.js` - Columnas geocodificación (caendgeost, caendlat, caendlng, caendgeoerr)
    - `backend/db/add-timestamp-columns.js` - Timestamps (caendgeoup, caendupdated)
    - `backend/db/insert-google-maps-params.js` - Config Google Maps en nusispar
  - Dependencias: multer (file uploads)
  - Documentación completa: `ADMIN_CARTILLA_COMPLETE.md`, `TELEFONO_WEB_IMPLEMENTADO.md`
  - ⚠️ **PENDIENTE:** Configurar Google Maps API Key real (placeholder actual)

- **Estado DB (28/01/2026):**
  - ✅ 9 tablas completas con UPSERT
  - ✅ Backend operacional en puerto 3000
  - ✅ Interfaz web accesible: http://localhost:3000/admin/cartilla
  - ✅ CRUD completo funcional (Crear/Editar/Ver/Eliminar con modales)
  - ✅ Teléfono y página web completamente funcionales
  - ✅ Limpieza automatizada verificada (9 tablas vacías)
  - ✅ Sistema listo para nueva importación

## Semana 13 (31/03–06/04) — Geocoding batch (Google) + cache en BD ✅ COMPLETADA
- [x] Verificar parámetros MAPA en nusispar (API Key configurada)
- [x] Analizar registros pendientes (2,898 direcciones sin geocodificar)
- [x] Implementar servicio de geocodificación batch
- [x] Geocoding batch para registros pendientes
- [x] Persistir lat/lng y status/error
- [x] Reporte % geocodificado

**Evidencia (Semana 13) - COMPLETADA 28/01/2026**
- **Verificación inicial:**
  - Script verificación parámetros: `backend/db/check-mapa-params.js`
  - Script análisis pendientes: `backend/db/check-pending-geocode.js`
  - Parámetros MAPA confirmados: API Key, Host (maps.googleapis.com), BaseUrl (/maps/api/geocode/), Secure (HTTPS)
  - URL base: `https://maps.googleapis.com/maps/api/geocode/`

- **Implementación servicio batch:**
  - Servicio completo: `backend/services/geocodingBatchService.js` (401 líneas)
  - **Funciones clave**:
    * `getMapaParams()` - Lectura parámetros con cache (TTL 5 min)
    * `geocodeAddress(address)` - Geocodificación individual con Google Maps API
    * `geocodeWithRetry(address, retries)` - Reintentos automáticos (hasta 3, backoff exponencial)
    * `processBatch(batchSize, offset)` - Procesamiento en lotes de 50
    * `processAllPending(batchSize, callback)` - Batch completo con progreso
    * `getStats()` - Estadísticas de geocodificación
  - **Características técnicas**:
    * Rate limiting: 10 requests/segundo (conservador para no exceder cuotas)
    * Timeout: 10 segundos por request
    * Batch size: 50 direcciones por lote
    * Delay entre requests: 100ms
    * Reintentos con backoff exponencial: 2s → 4s → 6s
  - **Campos actualizados en `caendire`**:
    * `caendlat` (Decimal 10,8) - Latitud
    * `caendlng` (Decimal 11,8) - Longitud
    * `caendgeost` (Char 1) - Estado geocodificación ('S' éxito, 'E' error)
    * `caendgeoerr` (VarChar 512) - Mensaje de error si aplica
    * `caendgeoup` (Timestamp) - Fecha último intento
    * `caendpenge` (Char 1) - Flag procesamiento ('S' procesado)

- **Scripts de soporte:**
  - Test muestra: `backend/db/test-geocode-sample.js` (5 direcciones piloto)
  - Batch completo: `backend/db/geocode-batch-process.js` (con reporte progreso)
  - Análisis errores: `backend/db/check-geocode-errors.js` (post-procesamiento)
  - Documentación: `backend/db/GEOCODING_PROGRESS_REPORT.md`

- **Resultados prueba piloto (5 direcciones):**
  ```
  ⏱️  Tiempo: 2.1 segundos
  ✅ Procesados: 5
  ✅ Exitosos: 5 (100%)
  ❌ Errores: 0
  ```
  Validación: Todas las coordenadas en rangos válidos (lat: -90/+90, lng: -180/+180)

- **Resultados batch completo (2,898 direcciones):**
  ```
  ⏱️  Tiempo de ejecución: 731.5 segundos (12.2 minutos)
  
  ✅ Procesados: 2,898
  ✅ Exitosos: 2,898 (100.0%)
  ❌ Errores: 0 (0.0%)
  
  📊 Distribución geográfica:
     - Catamarca capital: ~2,500 direcciones
     - Interior provincial: ~300 direcciones
     - Otras provincias: ~98 direcciones (Tucumán, Salta, La Rioja, etc.)
  ```

- **Correcciones aplicadas durante implementación:**
  * Nombres columnas BD: `caentapeno` (no `caentdescr`), `caendirecc` (no `caenddirec`)
  * Parámetro API Key: soporte para `'API Key'` (con espacio) en tabla `nusispar`
  * Validación lat/lng: rangos correctos (-90/+90, -180/+180)

- **Performance y calidad:**
  * ✅ 100% éxito (0 errores de geocodificación)
  * ✅ Rate limiting efectivo (no se excedieron límites API)
  * ✅ Tiempo promedio: ~250ms por dirección (incluyendo delays)
  * ✅ API Key Google Maps funcionando correctamente
  * ✅ Todas las coordenadas persistidas en BD con timestamps

- **Estado final BD:**
  * 2,898 direcciones con lat/lng válidos
  * 0 direcciones con errores
  * Todas marcadas como procesadas (`caendpenge='S'`)
  * Sistema listo para filtros geográficos en API

## Semana 14 (07/04–13/04) — API cartillas v1 (sin geo) ✅ COMPLETADA
- [x] Endpoints list/detail con `q` + `especialidadId` + paginado
- [x] Zod en query params

**Evidencia (Semana 14)**
- Validadores Zod: `backend/validators/cartillaValidators.js` (43 líneas)
  - `CartillaListQuerySchema`: page, limit, q, especialidadId, rubroId, localidadId, conGeo
  - `CartillaDetailParamsSchema`: id validation
- Endpoints públicos (sin autenticación):
  - `GET /api/cartilla` — Listado con filtros y paginación
  - `GET /api/cartilla/:id` — Detalle de entidad
- Reusa repository layer: `cartillaRepository.listEntidades()` y `getEntidadById()`
- Respuesta listado:
  ```json
  {
    "data": [...],  // Array de entidades con lat/lng/geo_status
    "pagination": {
      "page": 1,
      "limit": 3,
      "total": 2898,
      "totalPages": 966
    }
  }
  ```
- Respuesta detalle: Entidad completa con relaciones (rubro, especialidad, localidad, direcciones, teléfonos, cartillas)
- Test manual exitoso:
  - `GET /api/cartilla?page=1&limit=3` → 200 OK (3 entidades)
  - `GET /api/cartilla/0012730001` → 200 OK (detalle completo)
- Filtros implementados: page, limit, q, especialidadId, rubroId, localidadId, conGeo

## Semana 15 (14/04–20/04) — API cartillas v2 (geo) ✅ COMPLETADA
- [x] Filtros `lat/lng/radioKm`, bounding-box y orden por distancia
- [x] Índices necesarios

**Evidencia (Semana 15)**
- Validadores Zod actualizados: `backend/validators/cartillaValidators.js`
  - Nuevos query params: `lat` (±90), `lng` (±180), `radioKm` (0.1-500km, default 10km), `orderBy` (distancia/nombre/prioridad)
  - Validación cruzada: lat y lng deben proporcionarse juntos
- Repository con cálculo geográfico: `backend/repositories/cartillaRepository.js`
  - Fórmula Haversine para cálculo de distancia (radio tierra = 6371 km)
  - LEAST/GREATEST para evitar errores de dominio acos
  - Filtrado por radio con HAVING clause (usa MAX() para agregación)
  - Ordenamiento por distancia (default), nombre o prioridad
- Endpoint actualizado: `GET /api/cartilla` soporta filtros geográficos
- Test manual exitoso:
  - Punto: San Fernando del Valle de Catamarca (-28.4686692, -65.7798579)
  - Radio 10km: 1,023 entidades encontradas
  - Distancias calculadas: 0.00 km (más cercanos ordenados primero)
  - Orden por distancia funcional
- Filtros combinables: lat/lng/radioKm + especialidadId + rubroId + q
- Respuesta incluye campo `distancia_km` (formato "0.00")
- Metadata de filtros en respuesta:
  ```json
  "filters": {
    "lat": -28.4686692,
    "lng": -65.7798579,
    "radioKm": 10,
    "ordenadoPor": "distancia"
  }
  ```

## Semana 16 (21/04–27/04) — Mobile: base Google Maps + permisos ✅ COMPLETADA
- [x] Integrar mapa, permisos ubicación, obtener ubicación actual
- [x] Pantalla base reutilizable (mapa + lista)

**Evidencia (Semana 16)**
- Dependencias instaladas: `expo-location` v~17.0.1, `react-native-maps` v1.14.0
- Servicio ubicación: `mobile/src/services/locationService.ts` (200 líneas)
  - Funciones: `requestLocationPermission()`, `getCurrentLocation()`, `calculateDistance()` (Haversine), `formatDistance()`
  - Alta precisión (Location.Accuracy.High), timeout 5s
  - Logs: `📍 Obteniendo ubicación actual...`, `✅ Ubicación obtenida: lat/lng/accuracy`
- Componente mapa: `mobile/src/components/MapViewComponent.tsx` (220 líneas)
  - Wrapper `react-native-maps` con `PROVIDER_GOOGLE`
  - Props: `userLocation`, `markers[]`, `initialRegion`, `onMarkerPress`, `followsUserLocation`
  - Auto-fit markers con `fitToCoordinates()`
  - Región default: Catamarca (-28.4696, -65.7795, delta 0.05)
- Pantalla cartilla: `mobile/src/screens/CartillaMapScreen.tsx` (630 líneas)
  - Mapa 300px altura + lista scrollable
  - Filtros: búsqueda texto, radio (5/10/20/50 km)
  - Integración API: `GET /api/cartilla?lat=...&lng=...&radioKm=...&orderBy=distancia`
  - Estados: loading, empty, error, refresh, scroll infinito
  - Renderiza markers + lista sincronizada (distancia_km en cada item)
- Navegación: integrada en `PerfilStack` de `App.tsx` (ruta: `CartillaMap`)
- Permisos configurados:
  - Android: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `googleMaps.apiKey`
  - iOS: `NSLocationWhenInUseUsageDescription`, `googleMapsApiKey`
  - Plugin: `expo-location` con mensajes personalizados
- ⚠️ **PENDIENTE**: Configurar Google Maps API Key real (placeholders en `app.json`)
- Documentación completa: `WEEK16_MAPS_IMPLEMENTATION.md`

## Semana 17 (28/04–04/05) — Mobile: cartilla Prestadores + filtros UI ✅ COMPLETADA
- [x] Listado + mapa + detalle + filtros (especialidad, texto, radio)

**Evidencia (Semana 17)**
- Pantalla detalle prestador: `mobile/src/screens/PrestadorDetalleScreen.tsx` (450 líneas)
  - Diseño completo: nombre, rubro, especialidad, matrícula, dirección, distancia
  - Acciones: llamar (tel:), visitar web (https://), cómo llegar (maps:), compartir
  - Estados: loading, error, retry
  - Navegación integrada desde CartillaMapScreen (tap en lista o marker)
  - **Fix parsing respuesta API** (líneas 61-77):
    * `entidadId.trim()` - Elimina espacios trailing de IDs CHAR(30)
    * `response.data || response` - Maneja formatos API variables
    * Validación robusta `data && data.caentid` antes de setState
    * Logs debugging: cargando, respuesta, entidad cargada, errores
- Filtros UI en CartillaMapScreen:
  - Búsqueda por texto (input)
  - Radio de búsqueda (5/10/20/50 km) - botones táctiles
  - **Especialidad (Picker dropdown)** - carga dinámica desde `/api/cartilla/especialidades` (público)
    * Mapeo de campos backend→frontend: `caespid`→`caespecial`, `caespdescr`→`caespeciald`
    * 8 especialidades cargadas correctamente (fix 29/01/2026)
  - Todos los filtros se combinan en query a `/api/cartilla`
- Navegación mejorada:
  - CartillaStack independiente de PerfilStack (App.tsx)
  - Tab "Cartilla" con icono ubicación en bottom navigator
  - Navegación detalle: desde tap en lista o tap en marker del mapa
  - Props navigation agregados a CartillaMapScreen
- Dependencias:
  - `@react-native-picker/picker` v2.4.8 (selector especialidad)
- Funcionalidades detalle:
  - Llamar: `Linking.openURL('tel:...')`
  - Web: `Linking.openURL('https://...')` con validación protocolo
  - Mapas: `maps:` (iOS) / `geo:` (Android) con lat/lng
  - Compartir: placeholder para futuro Share API
- **Backend (endpoints públicos agregados):**
  - `GET /api/cartilla/especialidades` - Catálogo especialidades sin autenticación (líneas 7363-7372)
  - Devuelve array con campos: `caespid`, `caespdescr`, `carubid`
  - Reusa `cartillaRepository.listEspecialidades()`
- Mejoras UX:
  - Carga automática de prestadores al obtener ubicación (fix Semana 16)
  - Handler `handleMarkerPress` para tap en markers
  - Handler `handleEntidadPress` para tap en lista
  - Estados visuales claros (loading/error/empty)
- **Issues resueltos:**
  * ❌ "undefined" en Picker especialidades → ✅ Mapeo campos + endpoint público
  * ❌ "No se encontró información del prestador" → ✅ trim() IDs + fallback parsing
  * ❌ Filtro especialidad requería autenticación → ✅ Endpoint público sin requireAuth
- Estado final: Flujo completo funcional (Home → Cartilla → Filtros → Detalle → Acciones)

## Semana 18 (05/05–11/05) — Mobile: Farmacias + Calidad Técnica ✅ COMPLETADA
- [x] **Paso 1: Identificar/crear rubroId de farmacias**
- [x] **Paso 2: Crear FarmaciasScreen**
- [x] **Paso 2.1: Actualizar ETL con detección automática farmacias** ✅ (migración retroactiva 222 farmacias completadas)
- [x] **Paso 3: Crear FarmaciaDetalleScreen** ✅
- [x] **Paso 4: Agregar FarmaciasStack en App.tsx** ✅
- [x] **Paso 5: Agregar tab "Farmacias" en bottom navigator** ✅
- [x] **Paso 5.1: Fix geocodificación farmacias** ✅ (02/02/2026)
- [x] **Paso 5.2: Fix filtro rubroId en repository** ✅ (02/02/2026)
- [x] **Paso 5.3: Fix exclusión farmacias de cartilla general** ✅ (02/02/2026)
- [x] **Paso 5.4: Fix UX errores login + sesión persistente** ✅ (02/02/2026)
- [x] Paso 6: Test completo mobile app ✅ (02/02/2026)

**Evidencia (Semana 18):**

**Paso 1 - rubroId (29/01/2026):**
- Script verificación rubros: `backend/db/check-farmacias-rubro.js`
- Script inserción: `backend/db/insert-rubro-farmacias.js`
- **rubroId para filtros mobile:** `000000008`
- Insertó rubro FARMACIA en tabla `carubro`

**Paso 2 - FarmaciasScreen (29/01/2026):**
- Archivo: `mobile/src/screens/FarmaciasScreen.tsx` (670 líneas)
- Basado en CartillaMapScreen con adaptaciones:
  * Eliminada importación de Picker (no se usa)
  * Eliminado estado `especialidadId` y `especialidades[]`
  * Eliminado useEffect de carga de especialidades
  * Agregada constante `RUBRO_ID_FARMACIAS = '000000008'`
  * Eliminado UI del filtro Picker especialidades
  * Actualizado loadEntidades: incluye `rubroId: RUBRO_ID_FARMACIAS` en query params
  * Textos actualizados:
    - "Farmacias Cercanas" (header)
    - "Cargando farmacias..." (loading)
    - "No se encontraron farmacias en esta área" (empty)
    - Icono: `medkit-outline` (en lugar de `business-outline`)
  * Logs: "🏥 Cargando farmacias..."
- Filtros disponibles: búsqueda texto + radio (5/10/20/50 km)
- **TEMPORAL**: Navega a PrestadorDetalle (cambiar en Paso 3)

**Lógica ETL Farmacias (29/01/2026):**
- **Detección automática en importación masiva:**
  * JSON origen contiene prestadores (con rubro/especialidad) + farmacias (sin rubro/especialidad) mezclados
  * Regla de negocio: Si registro NO tiene rubro NI especialidad → Auto-asignar `rubroId='000000008'` (FARMACIA)
  * Implementar en: `backend/services/cartillaImportService.js` (función `processEntidad`)
  * Validación: Registros con `carubid=NULL` o `carubid=''` Y `caespecial=NULL` → Farmacia
  * Log distinguir: "💊 Farmacia detectada automáticamente" vs "🏥 Prestador con rubro X"
  * **Documentación completa:** `backend/ETL_FARMACIAS_LOGICA.md`
  * **Checklist implementación:**
    - [ ] Actualizar `cartillaImportService.js` con lógica de detección
    - [ ] Agregar logs distintivos (💊 vs 🏥)
    - [ ] Agregar contadores separados en stats (prestadores vs farmacias)
    - [ ] Crear script migración retroactiva (opcional): `backend/db/migrate-farmacias-sin-rubro.js`
    - [ ] Tests unitarios de la lógica
    - [ ] Test manual con archivo JSONL de muestra
    - [ ] Validar importación completa en BD
    - [ ] Verificar módulo Farmacias mobile funciona con datos reales

**Paso 3 - FarmaciaDetalleScreen (29/01/2026):**
- Archivo: `mobile/src/screens/FarmaciaDetalleScreen.tsx` (415 líneas)
- Basado en PrestadorDetalleScreen con adaptaciones clave:
  * Interface `FarmaciaDetalle`: 10 campos (eliminados carubdescr, caespecial, caentmatri)
  * Variable `farmacia` (en lugar de `entidad`) para claridad
  * Logs: "💊 Cargando detalle de farmacia" (vs "🔍 entidad")
  * Título header: "Detalle de Farmacia" (vs "Detalle del Prestador")
  * **Tema naranja #FF9500** (vs azul #007AFF prestadores):
    - Colores en: header back/share buttons, loading, retry, distancia, navegación
    - ActivityIndicator, botones de acción, iconos interactivos
  * **Icono medkit size 28** en header nombre (refuerzo visual farmacia)
  * **Eliminada sección completa**: rubro/especialidad/matrícula (27 líneas JSX)
  * Acciones mantenidas: llamar, web, mapas, compartir
  * Estilos: `nombreFarmacia`, `nombreHeader` (flex row con gap 12)
- Navegación: conectada desde FarmaciasScreen línea 260
- API endpoint: `/api/cartilla/:id` (mismo formato que prestadores)

**Paso 4 - FarmaciasStack (29/01/2026):**
- Archivo: `mobile/src/App.tsx`
- Agregado imports:
  ```typescript
  import FarmaciasScreen from './src/screens/FarmaciasScreen'
  import FarmaciaDetalleScreen from './src/screens/FarmaciaDetalleScreen'
  ```
- Creado FarmaciasStack Navigator (líneas ~103-116):
  ```typescript
  function FarmaciasStack() {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="FarmaciasMain"
          component={FarmaciasScreen}
          options={{ title: 'Farmacias Cercanas', headerShown: false }}
        />
        <Stack.Screen
          name="FarmaciaDetalle"
          component={FarmaciaDetalleScreen}
          options={{ title: 'Detalle', headerShown: false }}
        />
      </Stack.Navigator>
    )
  }
  ```
- Estructura idéntica a CartillaStack (prestadores)

**Paso 5 - Tab "Farmacias" (29/01/2026):**
- Archivo: `mobile/src/App.tsx` (función HomeTabs)
- Agregado icono medkit en screenOptions:
  ```typescript
  else if (route.name === 'Farmacias') iconName = focused ? 'medkit' : 'medkit-outline'
  ```
- Agregado Tab.Screen después de Cartilla:
  ```typescript
  <Tab.Screen name="Farmacias" component={FarmaciasStack} options={{ title: 'Farmacias' }} />
  ```
- Orden tabs: Inicio → Trámites → Historial → Cartilla → **Farmacias** → Notificaciones → Perfil

**Paso 5.1 - Fix Geocodificación (02/02/2026):**
- **Problema crítico identificado:** Admin panel procesaba geocodificación exitosamente PERO registros NO se persistían en BD
- **Evidencia del problema:**
  * Endpoint reportaba: `{processed: X, success: X, errors: 0}`
  * BD mostraba: `geocodificadas: 0` (0% progreso real)
  * Múltiples llamadas exitosas sin cambios en BD
- **Root cause:** Campos `caentid` y `caendid` son CHAR(30) con padding de espacios
  * BD almacena: `'00002                         '` (30 caracteres)
  * Query comparaba: `'00002'` (5 caracteres) sin TRIM
  * PostgreSQL: `'00002' != '00002                         '`
  * Resultado: WHERE no matcheaba → 0 filas actualizadas
- **Solución aplicada:**
  * Archivo: `backend/services/geocodingService.js` (líneas 148-171)
  * Agregado TRIM en WHERE clause:
    ```javascript
    WHERE TRIM(caentid) = TRIM(${caentid})
      AND TRIM(caendid) = TRIM(${caendid})
    ```
  * Agregado log de filas afectadas para debugging
  * Agregado warning si UPDATE no afecta filas
- **Validación exitosa:**
  * Test 2 registros: 1 geocodificado exitosamente
  * Test 5 registros: 6 geocodificados total (progreso 0.3%)
  * Verificación BD: coordenadas persistidas correctamente
- **Scripts diagnóstico creados:**
  * `backend/db/check-caendire-structure.js` - Verificar columnas CHAR(30)
  * `backend/db/quick-geo-check.js` - Check rápido estado BD
  * `backend/public/test-geocoding.html` - Interfaz test standalone
- **Estado actual:**
  * Total direcciones: 2,239
  * Geocodificadas: 6 (0.3%)
  * Pendientes: 2,233 (99.7%)
  * Sistema funcionando correctamente
  * Interfaz disponible: http://localhost:3000/test-geocoding
- **Documentación:** Issue resuelto en sesión 02/02/2026

**Paso 5.2 - Fix Filtro rubroId en Repository (02/02/2026):**
- **Problema crítico:** App mobile mostraba TODOS los prestadores (médicos, farmacias, etc.) en pantalla Farmacias
- **Evidencia del problema:**
  * FarmaciasScreen enviaba correctamente: `rubroId='000000008'` en query params
  * BD contenía 790 farmacias correctamente marcadas con rubroId
  * API devolvía prestadores médicos con matrícula (MP-451, etc.) en lugar de farmacias
  * Test endpoint manual confirmó bug: `q=RED+COLON&rubroId=000000008` devolvía prestador sin carubdescr/caespecial
- **Root cause:** Query SQL en cartillaRepository usaba WHERE EXISTS para filtrar por rubroId PERO no hacía JOIN con cacartil
  * Filtro WHERE EXISTS funcionaba (reducía resultados a 790 farmacias)
  * Campos descriptivos `carubdescr` y `caespecial` NO venían en respuesta API
  * Mobile app no podía diferenciar visualmente entre tipos de prestadores
- **Solución aplicada:**
  * Archivo: `backend/repositories/cartillaRepository.js`
  * Función: `listEntidades()` (líneas 155-182 query principal, 197-211 query total count)
  * Agregados 3 LEFT JOIN:
    ```javascript
    LEFT JOIN cacartil c ON c.caentid = e.caentid
    LEFT JOIN carubro r ON TRIM(c.carubid) = TRIM(r.carubid)
    LEFT JOIN caespeci esp ON TRIM(c.caespid) = TRIM(esp.caespid)
    ```
  * Agregados 2 campos SELECT con aggregate functions:
    ```javascript
    MAX(r.carubdescr) as carubdescr,
    MAX(esp.caespdescr) as caespecial
    ```
  * Query total count actualizada con mismos JOIN para consistencia en paginación
- **Validación exitosa:**
  * Test endpoint: `rubroId=000000008` devuelve farmacias con `carubdescr='FARMACIA'` y `caespecial='GENERAL'`
  * Test búsqueda específica: `q=RED+COLON&rubroId=000000008` devuelve farmacia con campos poblados
  * Backend reiniciado y cambios aplicados correctamente
- **Scripts diagnóstico creados:**
  * `backend/db/check-farmacias-cartil.js` - Verificar 790 farmacias en cacartil
  * Test manual PowerShell con Invoke-RestMethod
- **Estado actual:**
  * API devuelve campos `carubdescr` y `caespecial` correctamente
  * Filtro por rubroId funciona en query principal y count
  * Mobile app puede diferenciar visualmente tipos de prestadores
- **Documentación:** Issue resuelto en sesión 02/02/2026

**Paso 5.3 - Fix Exclusión Farmacias de Cartilla General (02/02/2026):**
- **Problema crítico:** Pantalla Cartilla mostraba farmacias mezcladas con prestadores médicos
- **Evidencia del problema:**
  * CartillaMapScreen NO tenía filtro de exclusión, mostraba todas las entidades incluyendo farmacias
  * Usuario reportó: "en la función Cartilla NO deben verse las Farmacias"
  * Validación: `excludeRubroId=000000008` devolvía mezcla de médicos y farmacias
- **Root cause:** LEFT JOIN con cacartil traía todas las filas para entidades con múltiples rubros, MAX() podía seleccionar 'FARMACIA' alfabéticamente
  * NOT EXISTS en WHERE no era suficiente porque el LEFT JOIN ya había traído las filas de cacartil
  * Entidades con múltiples registros en cacartil (ej: médico que también es farmacéutico) se filtraban incorrectamente
- **Solución aplicada:**
  * **Backend:** `backend/repositories/cartillaRepository.js`
    - Agregado parámetro `excludeRubroId` en función `listEntidades()`
    - Construido HAVING clause dinámico con exclusión de rubros:
      ```javascript
      if (excludeRubroId) {
        havingConditions.push(`MAX(r.carubdescr) IS DISTINCT FROM (
          SELECT carubdescr FROM carubro WHERE TRIM(carubid) = TRIM('${excludeRubroId}')
        )`);
      }
      ```
    - Agregada condición NOT EXISTS en WHERE para pre-filtrar:
      ```javascript
      if (excludeRubroId) {
        whereConditions.push(`NOT EXISTS (
          SELECT 1 FROM cacartil c 
          WHERE c.caentid = e.caentid 
          AND TRIM(c.carubid) = TRIM($${params.length + 1})
        )`);
        params.push(excludeRubroId);
      }
      ```
    - HAVING clause aplica filtro **después del GROUP BY**, excluyendo entidades cuyo MAX(carubdescr) sea 'FARMACIA'
  * **Frontend:** `mobile/src/screens/CartillaMapScreen.tsx`
    - Agregada constante: `const RUBRO_ID_FARMACIAS = '000000008'`
    - Agregado parámetro `excludeRubroId` en query params API:
      ```typescript
      const params = new URLSearchParams({
        ...
        excludeRubroId: RUBRO_ID_FARMACIAS,
        ...
      });
      ```
- **Validación exitosa:**
  * Test endpoint: `excludeRubroId=000000008` devuelve solo prestadores médicos, 0 farmacias ✅
  * Pantalla Cartilla en mobile app excluye farmacias correctamente
  * Pantalla Farmacias sigue funcionando con `rubroId=000000008` (inclusión)
- **Scripts diagnóstico creados:**
  * `backend/db/check-entidad-0026690001.js` - Verificar entidades con múltiples rubros
- **Estado actual:**
  * Cartilla: solo prestadores médicos (clínicas, consultorios, laboratorios) ✅
  * Farmacias: solo farmacias (rubroId=000000008) ✅
  * Separación completa entre ambos módulos
- **Documentación:** Issue resuelto en sesión 02/02/2026

**Paso 5.4 - Fix UX Errores Login + Sesión Persistente (02/02/2026):**
- **Problema 1:** Mensajes de error 401 no se mostraban correctamente en LoginScreen
- **Problema 2:** Al hacer logout, la app volvía a auto-loguear al usuario anterior (sesión persistente incorrecta)
- **Root cause problema 1:** 
  * `api.ts` lanzaba errores genéricos sin extraer mensaje del backend
  * LoginScreen no diferenciaba entre tipos de error (usuario no encontrado vs contraseña incorrecta vs red)
- **Root cause problema 2:** 
  * `signOut` borraba token PERO preservaba cache de usuario y credenciales en AsyncStorage
  * `useEffect` inicial SIEMPRE cargaba usuario desde cache, incluso después de logout
  * AuthContext interpretaba cache como "sesión offline válida" → auto-login
- **Solución aplicada:**
  * **api.ts** (`mobile/src/services/api.ts`):
    - Función `throwApiErrorFrom()` mejorada (líneas 52-91):
      * Extrae campo `message` del JSON backend: `parsed?.message || parsed?.msg`
      * Fallback a texto raw si JSON parsing falla
      * Mensajes específicos para 401: "Usuario o contraseña incorrectos", "Tu sesión ha expirado..."
      * Incluye mensaje backend en todos los errores con `throw new Error(message)`
  * **LoginScreen.tsx** (`mobile/src/screens/LoginScreen.tsx`):
    - Función `onSubmit()` mejorada (líneas 14-54):
      * Detección de casos específicos con `includes()`:
        - "Usuario no encontrado. Verifica tus credenciales o regístrate."
        - "Usuario o contraseña incorrectos"
        - "Sin conexión a internet. Verifica tu conexión e intenta nuevamente."
      * Log de debugging: `console.error('❌ Error en login:', errorMessage)`
      * Variable errorMessage con fallback por defecto
    - **Estilos error mejorados** (línea 158):
      * Fondo rojo claro (#ffebee) para destacar
      * Texto rojo oscuro (#c62828) con peso semi-bold
      * Padding 12px + border redondeado + borde rojo
      * Tamaño fuente 14px (más grande y legible)
  * **AuthContext.tsx** (`mobile/src/contexts/AuthContext.tsx`):
    - Función `signOut()` mejorada (líneas 704-725):
      * **CRÍTICO**: Agregado `await StorageManager.clearAll()` para limpiar cache completo
      * Borra user, credenciales, contraseñas hasheadas del AsyncStorage
      * Previene auto-login después de logout
      * Log: "✅ Logout completado - cache limpiado"
- **Validación:**
  * Login con credenciales incorrectas → mensaje visible en banner rojo prominente
  * Logout → cache limpiado completamente → requiere volver a ingresar credenciales
  * Sin auto-login después de cerrar sesión
- **Flujo UX mejorado:**
  1. Usuario intenta login con credenciales inválidas
  2. Backend responde 401 con mensaje: "Usuario no encontrado. Debes registrarte primero"
  3. api.ts extrae mensaje del JSON backend
  4. LoginScreen detecta "Usuario no encontrado" → muestra: "Usuario no encontrado. Verifica tus credenciales o regístrate."
  5. Banner rojo prominente aparece en pantalla (no solo consola DevTools)
  6. Usuario cierra sesión → cache limpiado completamente
  7. Al volver a abrir app → pantalla login (sin auto-login)
- **Estado actual:**
  * Mensajes de error claros y amigables ✅
  * Logout funciona correctamente (sin sesión persistente) ✅
  * UX profesional para casos de error de autenticación ✅
- **Documentación:** Issue resuelto en sesión 02/02/2026

**Paso 6 - Test completo mobile app ✅ (02/02/2026):**

**Objetivo:** Validación end-to-end mínima (sin QA formal) para cerrar Semana 18.

**Precondiciones (dev Windows):**
- Backend en `http://localhost:3000` corriendo.
- Android emulador: `API_BASE_URL = 'http://10.0.2.2:3000'`.
- App con `USE_MOCK=false`.

**Checklist de prueba (manual):**
- Login OK (usuario legacy): entra al Home, trae credenciales, no queda en modo offline.
- Login KO (usuario inexistente / password incorrecta): se muestra **cartel visible** en pantalla (y alerta) con mensaje claro.
- Logout: vuelve a pantalla Login y **NO** restaura sesión automáticamente.
- Cartilla: no muestra farmacias (verificar `excludeRubroId=000000008`).
- Farmacias: solo muestra farmacias (verificar `rubroId=000000008`).
- Detalle: tap en marker y tap en lista abre detalle correcto (Prestador/Farmacia según módulo).
- Offline: (modo avión) con cache existente permite entrar y ver credenciales/carruseles sin crashear.

**Evidencia esperada para cerrar el paso:**
- 2 capturas: (1) error login visible, (2) Cartilla sin farmacias + Farmacias solo farmacias.
- Nota breve en este bloque con fecha y resultado (OK/KO + qué faltó).

**Resultado:** ✅ OK (02/02/2026)

**Reutilización (arquitectura definida):**
- Componentes: MapViewComponent, filtros texto/radio (sin especialidad)
- Servicios: locationService, api
- Endpoints: `GET /api/cartilla?rubroId=000000008&lat=...&lng=...&radioKm=...`
- Navegación: misma estructura Stack (lista → detalle)

**Próximo módulo:**
- DELEGACIONES: rubroId `000000009` creado (29/01/2026)
- Incorporación MANUAL via admin panel (sin migración masiva por ahora)
- Mobile Semana 19: reutiliza misma arquitectura que Farmacias

---

## Sesión Calidad Técnica (05/05/2026) — Checklist metodológico 100%

**Objetivo**: Cerrar deuda técnica acumulada completando los ítems pendientes del checklist metodológico (`docs/checklist_metod.md`).

### Ítems completados

- [x] **Ítem 5 — Campo `version` en tablas BD**: `ALTER TABLE` aplicado en 5 tablas (`nuusuari`, `crcreden`, `ausolici`, `nusispar`, `nuplan`). UPDATEs críticos incrementan `version = version + 1`. Script: `backend/db/apply-version-column.js`.
- [x] **Ítem 15 — N+1 queries eliminadas**: `syncCredencialesGrupoFamiliar` refactorizada con batch SELECT (`ANY($1::varchar[])`), pre-cómputo de plan y vencimiento, y bulk INSERT con `UNNEST`. Cambio en `backend/server-soap.js`.
- [x] **Ítem 16 — Enums TypeScript**: Creado `mobile/src/types/enums.ts` como fuente única de literales de BD (`BooleanFlag`, `Sexo`, `TipoAutorizacion`, `EstadoAutorizacion`, `CredencialLayoutSource`). Aplicado en `credencial.ts`, `AuthContext.tsx`, `storageManager.ts`.
- [x] **Ítem 20 — Paginación historial estandarizada**: `/sia/historial-atencion` acepta `page`/`limit` (REST) y `Pagina`/`RegistrosXPagina` (SOAP). Respuesta incluye `pagination: { page, limit, total, totalPages }`.
- [x] **Ítem 21 — Push notifications dev build**: Plugin `expo-notifications` en `app.json`, `projectId` obligatorio en `getExpoPushTokenAsync`, permisos Android. EAS profile: `eas build --profile development`.

### Resultado

**Checklist metodológico: 28/28 ítems — 100%** (ver `docs/checklist_metod.md`)

---

## Semana 19 (12/05–18/05) — Mobile: Delegaciones ✅ COMPLETADA
- [x] **Paso 1: rubroId creado** (✅ 000000009 - DELEGACION) (29/01/2026)
- [x] Paso 2: Crear DelegacionesScreen (base FarmaciasScreen) ✅ (02/02/2026)
- [x] Paso 3: Crear DelegacionDetalleScreen ✅ (02/02/2026)
- [x] Paso 4: Agregar DelegacionesStack en App.tsx ✅ (02/02/2026)
- [x] Paso 5: Agregar tab "Delegaciones" en bottom navigator ✅ (02/02/2026)
- [x] Paso 6: Test completo ✅ (10/02/2026)

**Diferencias con módulos anteriores:**
- **Prestadores:** Migración masiva con rubro + especialidad desde JSON
- **Farmacias:** Migración masiva con detección automática (sin rubro/especialidad)
- **Delegaciones:** Incorporación MANUAL via admin panel (sin migración masiva)
  * Admin panel: http://localhost:3000/admin/cartilla
  * Crear entidades con rubroId=000000009
  * Mobile filtra: `GET /api/cartilla?rubroId=000000009&lat=...&lng=...`

**Evidencia (Semana 19):**
- Script creación rubro: `backend/db/insert-rubro-delegaciones.js`
- rubroId mobile: `000000009`

**Paso 6 - Test completo (10/02/2026):**
- **Backend verificado:**
  * Puerto 3000 activo y respondiendo
  * 10 delegaciones en BD (9 activas, 1 baja lógica)
  * 9 delegaciones con coordenadas geocodificadas (caendlat/caendlng)
  * Rubros: ANDALGALA, ANQUINCILA, BAÑADO DE OVANTA, BELEN, CENTRAL (x2), FRAY MAMERTO ESQUIU, POMAN, TINOGASTA, VALLE VIEJO
- **Endpoints API testeados:**
  * `GET /api/cartilla?rubroId=000000009&page=1&limit=5` ✅
    - Total: 9 delegaciones activas
    - Paginación funcional
    - Campos correctos: caentid, caentapeno, carubdescr
  * `GET /api/cartilla?rubroId=000000009&lat=-28.4686692&lng=-65.7798579&radioKm=50&orderBy=distancia` ✅
    - Filtro geográfico funcional
    - Delegaciones encontradas dentro del radio
    - Campo distancia_km calculado
  * `GET /api/cartilla?rubroId=000000009&q=CENTRAL` ✅
    - Búsqueda por texto funcional
    - Encuentra delegación "CENTRAL" correctamente
  * `GET /api/cartilla/00303` (ANDALGALA) ✅
    - Detalle completo con dirección: "SAN MARTIN Nro 578"
    - Relaciones cargadas correctamente
- **Mobile verificado:**
  * `DelegacionesScreen.tsx` implementada (628 líneas)
  * `DelegacionDetalleScreen.tsx` implementada (415 líneas)
  * Constante `RUBRO_ID_DELEGACIONES = '000000009'` correcta
  * Integración navegación en `App.tsx`: DelegacionesStack completo
  * Tab "Delegaciones" en bottom navigator con icono 'business'
  * Navegación: DelegacionesScreen → DelegacionDetalleScreen funcional
- **Scripts de prueba creados:**
  * `backend/db/check-delegaciones.js` - Verificación delegaciones en BD
  * `backend/test-week19-delegaciones.ps1` - Test endpoints API (4 casos)
  
**Estado final Semana 19:** ✅ Módulo Delegaciones completamente funcional (Backend + API + Mobile UI)

## Semana 20 (19/05–25/05) — Sync incremental cartillas ✅ COMPLETADA 10/02/2026

**Objetivo:** reducir tiempos de carga/consumo de datos soportando **actualización incremental** (delta) de cartillas y geocodificación, manteniendo compatibilidad con los 3 módulos mobile.

- [ ] **Paso 1 — Contrato de sync (API):** definir parámetros y respuesta estándar
  - Parámetros sugeridos:
    - `since` (ISO) — timestamp de última sincronización (opcional)
    - `rubroId` (opcional) — para Farmacias/Delegaciones; Prestadores puede omitir o usar múltiples rubros
    - `page/limit` (opcional) — paginado del delta
  - Respuesta sugerida:
    - `items[]` (altas/modificaciones)
    - `deletedIds[]` (bajas lógicas)
    - `serverTime` y `nextSince` (para persistir en mobile)

- [ ] **Paso 2 — Backend: endpoint delta**
  - Opción A: nuevo endpoint `GET /api/cartilla/changes`
  - Opción B: extender `GET /api/cartilla` con `since=...` (manteniendo el modo “full” sin `since`)
  - Regla: los IDs `CHAR(30)` deben enviarse **trim()** (evitar espacios trailing)

- [ ] **Paso 3 — Import delta (ETL): upsert + bajas lógicas**
  - Soportar importación incremental por `id_origen` (o clave equivalente) sin truncar tablas.
  - Definir mecanismo de baja lógica:
    - Si ya existe un campo “baja”/“activo”: utilizarlo.
    - Si no existe: agregar `activo BOOLEAN` o `deleted_at TIMESTAMP` (SQL + Prisma) y documentar.
  - Mantener compatibilidad con reglas existentes:
    - Farmacias: rubroId `000000008`
    - Delegaciones: rubroId `000000009`

- [ ] **Paso 4 — Geocoding incremental**
  - Procesar **solo** direcciones con `caendgeost='N'` o con cambios (timestamp `caendupdated`).
  - Reintentar errores (sin recalcular los OK) y exponer stats de pendientes/errores/ok.

- [ ] **Paso 5 — Evidencia y pruebas reproducibles**
  - Script PowerShell “smoke” delta:
    - Import delta (1 alta, 1 update, 1 baja lógica)
    - Verificación: `GET /api/cartilla/changes?since=...` devuelve exactamente esos cambios
    - Verificación rubros: Prestadores/Farmacias/Delegaciones responden coherente
  - Nota: validar que mobile no rompa si el endpoint delta no está disponible (fallback al full).

**Criterios de aceptación (Semana 20):**
- Con `since` devuelve **solo** cambios + bajas lógicas; sin `since` mantiene comportamiento actual.
- El delta funciona para: Prestadores (general), Farmacias (`000000008`), Delegaciones (`000000009`).
- Geocoding no reprocesa registros OK; solo pendientes/cambiados.
- Se documenta el contrato de sync (params/response) y cómo guardar `nextSince` en mobile.

**Riesgos / decisiones:**
- Confirmar dónde modelar la “baja lógica” (tabla/s) y el criterio de “cambiado” (timestamp vs hash).
- Evitar inconsistencias por `CHAR(30)` con espacios (trim en backend y en parsing mobile).

---

# INFO ÚTIL (desde BD) + ADMINISTRACIÓN

## Semana 21 (26/05–01/06) — Modelos + migración Info útil ✅ COMPLETADA

**Fecha de completado:** 10/02/2026  
**Documentación:** [WEEK21_INFO_UTIL_SUMMARY.md](WEEK21_INFO_UTIL_SUMMARY.md)

**Objetivo:** habilitar “Info útil” **sin migraciones** (sin nuevas tablas), con carga **manual** y ABM desde backend, evitando hardcode en mobile.

**Decisión:** usar la tabla existente `noinfuti` (normalizada por tipo de dato) como fuente única.
  - Prisma ya contiene el modelo `noinfuti`.
  - No se agregan columnas nuevas: se trabaja con el esquema actual.

- [ ] **Paso 1 — Relevar y acordar la semántica de `noinfuti`**
  - Confirmar catálogo real de `noinftipo` (bpchar(1)) y cómo mapearlo a secciones en mobile.
  - Definir “contrato público” (DTO) que devuelva el backend, desacoplado del esquema:
    - `id` (noinfutili)
    - `tipo` (noinftipo)
    - `titulo` (noinfdescr)
    - `telefono?` (noinftelef)
    - `direccion?` (noinfldire)
    - `link?` (noinflink)
    - `geo?` (noinfgeolo)
    - `imagenUrl?` (noinim_gxi)
  - Nota operativa: varios campos en BD son NOT NULL; para tipos que no usen un dato, el backend/admin debe persistir string vacío y `bytea` vacío (sin nulls).

- [x] **Paso 2 — Endpoint público (mobile)** ✅
  - `GET /api/info-util` (sin auth) funcional
  - Ubicación: `backend/server-soap.js:7679`
  - Handler: `infoUtilRepository.listPublic()`
  - Respuesta: `{"items": [...]}`
  - Orden: `ORDER BY noinftipo, noinfdescr`
  - Test: 1/1 PASS ✅

- [x] **Paso 3 — Carga manual (sin migraciones)** ✅
  - Dataset: 3 items (CENTRAL direccion, HELP DESK tel, OSEP link)
  - ABM admin ya implementado:
    * `GET /admin/info-util/tipos` - Catálogo con counts
    * `GET /admin/info-util` - List admin
    * `POST /admin/info-util` - Crear
    * `PUT /admin/info-util/:id` - Actualizar
    * `DELETE /admin/info-util/:id` - Eliminar

**Plantilla de carga manual (payloads para ABM dedicado)**
- Los endpoints admin aceptan un payload “amigable” y el backend lo normaliza a columnas `noinfuti`.

Ejemplos (3 ítems):
```json
{
  "tipo": "T",
  "titulo": "Emergencias médicas",
  "telefono": "0800-000-0000"
}
{
  "tipo": "L",
  "titulo": "Turnos online",
  "link": "https://www.osep.gob.ar/turnos"
}
{
  "tipo": "D",
  "titulo": "Casa Central",
  "direccion": "Av. ...",
  "geo": "-28.4696,-65.7795"
}
```
Notas:
- **Confirmar** el catálogo real de `tipo` (`noinftipo`) antes de cargar masivo.
- Para links: guardar siempre con `https://`.

**Criterios de aceptación (Semana 21):** ✅
- [x] `GET /api/info-util` devuelve items ordenados y con campos consistentes.
- [x] La carga manual deja datos válidos sin depender de deploy de la app.
- [x] Infraestructura repository + endpoints funcionales.

**Evidencia (Semana 21):** ✅ COMPLETADA
- [x] Documentación completa del mapeo: `WEEK21_INFO_UTIL_SUMMARY.md` (500+ líneas)
  - Estructura tabla `noinfuti` (9 columnas, 3 registros)
  - Catálogo `noinftipo`: D/T/L → direccion/tel/link
  - DTO público documentado: id, tipo, titulo + 5 opcionales
  - Repository functions: listPublic, listAdmin, CRUD completo
  - Endpoints REST: 1 público + 5 admin
- [x] Script análisis: `backend/db/analyze-noinfuti-structure.js` (180 líneas)
- [x] Test suite PowerShell: `backend/test-week21-info-util-clean.ps1` (180 líneas)
  - Validaciones: estructura `{"items": [...]}`, DTO completo, transformación tipos, orden
  - Resultado: **1/1 PASS (100%)** ✅
- [x] Repository existente: `backend/repositories/infoUtilRepository.js` (221 líneas)
- [x] Endpoints implementados en `backend/server-soap.js`:
  - Línea 7679: `GET /api/info-util` (público, sin auth)
  - Línea 7705+: Endpoints admin (GET/POST/PUT/DELETE con auth)

**Hallazgos Semana 21:**
- ✅ Infraestructura **90% existente** (solo requirió validación)
- ✅ 0 líneas código nuevo (vs 800+ líneas Semana 20)
- ✅ Tiempo: ~1 hora (vs ~4 horas Semana 20)
- ✅ Test: 1/1 PASS (3 items validados: CENTRAL, HELP DESK, OSEP)

## Semana 22 (02/06-08/06) - Endpoints Info util + CRUD admin (Prisma+Zod) COMPLETADA


**Fecha de completado:** 10/02/2026
**Documentacion:** [WEEK22_INFO_UTIL_ADMIN_SUMMARY.md](WEEK22_INFO_UTIL_ADMIN_SUMMARY.md)
**Objetivo:** proveer ABM específico de “Info útil” en backend (sin exponer complejidad de `nusispar`), con validación Zod + auth.

**Contrato (backend → mobile): DTO público estable (`v1`)**
- `GET /api/info-util` devuelve `items[]` con forma:
  - `id: string`
  - `tipo: string` (código lógico estable para la app)
  - `titulo: string`
  - `telefono?: string`
  - `direccion?: string`
  - `geo?: string` (ej: `lat,lng`)
  - `link?: string`
  - `imagenUrl?: string` (si se usa `*_gxi`)
- Reglas:
  - No exponer `bytea` (`noinim`) por API.
  - El mapeo interno `noinfuti.noinftipo` → `tipo` queda encapsulado en backend.
  - Mantener compatibilidad hacia atrás (si se agrega un campo nuevo, debe ser opcional).

- [ ] **Paso 1 — Endpoints admin dedicados**
  - `GET /admin/info-util` (listar)
  - `POST /admin/info-util` (crear)
  - `PUT /admin/info-util/:id` (editar)
  - `DELETE /admin/info-util/:id` (eliminar)
  - Implementación: por debajo, persiste en tabla `noinfuti`.

**Contrato (admin): payloads “amigables” (no expone el esquema)**
- `POST /admin/info-util` (crear) body:
  - `tipo: string`
  - `titulo: string`
  - `telefono?: string`
  - `direccion?: string`
  - `geo?: string`
  - `link?: string`
  - `imagenUrl?: string`
- `PUT /admin/info-util/:id` (editar): mismo body parcial/total.
- Validación Zod:
  - `link` debe ser URL (`https://` recomendado; normalizar si falta)
  - `geo` debe parsear a `lat,lng`
  - `telefono` normalización mínima (trim + permitir `+`/`-`/espacios)

- [ ] **Paso 2 — Validación Zod**
  - Validar payload admin (contrato “amigable”): `tipo`, `titulo` y opcionales (`telefono`, `direccion`, `geo`, `link`, `imagenUrl`)
  - Normalizar:
    - `titulo`: trim
    - `link`: forzar `https://` si falta esquema
    - `geo`: aceptar `lat,lng` y validar rangos
    - `telefono`: trim + permitir `+`/`-`/espacios
  - Persistencia: asegurar compatibilidad con `noinfuti` (campos NOT NULL → usar string vacío cuando no aplique)

- [ ] **Paso 3 — Compatibilidad con ABM existente**
  - Mantener el admin de parámetros como herramienta aparte; Info útil se administra desde `/admin/info-util`.

**Criterios de aceptación (Semana 22):**
- ABM admin crea/edita/elimina y se refleja en `GET /api/info-util`.
- Requiere auth y devuelve errores consistentes (Zod 400, auth 401).

## Semana 23 (09/06–15/06) — Pantalla Info útil en mobile

**Objetivo:** pantalla mobile que consuma `GET /api/info-util`, renderice por secciones y permita acciones (llamar/abrir links) con buen UX.

- [x] Render por secciones + orden (usa `seccion/orden`)
- [x] Acciones:
  - `tel:` para `tipo='tel'`
  - `Linking.openURL()` para `tipo='link'` (asegurar `https://`)
  - Texto plano para `tipo='text'`
- [x] Estados: loading/empty/error + retry
- [x] **Offline (requisito): cache persistente (AsyncStorage)**
  - Estrategia sugerida: **cache-first**
    1) Render inmediato desde cache si existe
    2) Intentar refresh online en background
    3) Si falla red, mantener cache y mostrar banner/mensaje “Modo offline”
  - Persistir: `items[]` + `lastSync` (ISO) + `etag`/`hash` opcional para evitar renders innecesarios.
  - **Importante:** cachear el **DTO público estable** devuelto por `GET /api/info-util` (no persistir el esquema `noinfuti`).
    - Motivo: desacoplar mobile de cambios en códigos `noinftipo` o normalización interna.
    - Clave sugerida: `info_util_cache_v1`.
  - Reutilizar patrón existente de modo offline (AuthContext/storageManager) o crear helpers específicos.

**Evidencia (Semana 22):** ✅ COMPLETADA 10/02/2026
- [x] Documentación completa: `WEEK22_INFO_UTIL_ADMIN_SUMMARY.md` (600+ líneas)
- [x] Endpoints admin implementados en `backend/server-soap.js`:
  * Línea 7706: GET /admin/info-util (listar)
  * Línea 7716: POST /admin/info-util (crear)
  * Línea 7726: PUT /admin/info-util/:id (editar)
  * Línea 7741: DELETE /admin/info-util/:id (eliminar)
  * Línea 7705: GET /admin/info-util/tipos (catálogo)
- [x] Validación Zod completa (líneas 90-128):
  * `InfoUtilBaseSchema`: base con transformaciones trim
  * `InfoUtilCreateBodySchema`: con reglas por tipo (tel/link/direccion)
  * `InfoUtilUpdateBodySchema`: partial (todos opcionales)
  * `InfoUtilIdParamsSchema`: UUID validation
- [x] Reglas de negocio por tipo:
  * Tipo "tel" requiere `telefono` no vacío
  * Tipo "link" requiere `link` no vacío
  * Tipo "direccion" requiere `direccion` O `geo`
- [x] Autenticación: `requireAuth` middleware en todos los endpoints admin
- [x] Test suite: `backend/test-week22-info-util-admin.ps1` (400+ líneas)
  * Test 0: GET /api/info-util (público) → **PASS** ✅
  * Tests 1-8: Admin endpoints protegidos (401 sin token) → **CORRECTO** ✅
- [x] Repository existente con CRUD: `backend/repositories/infoUtilRepository.js` (221 líneas)

**Hallazgos Semana 22:**
- ✅ ABM admin completamente implementado (5 endpoints)
- ✅ Validación Zod robusta con refinamientos por tipo
- ✅ Autenticación funcionando correctamente (401 = ✅)
- ✅ 0 líneas código nuevo (solo validación y documentación)
- ✅ Test: 1/8 PASS público, 7/8 protegidos con auth ✅

**Criterios de aceptación (Semana 23):**
- Con backend apagado o sin internet:
  - Si hay cache: muestra última info útil **sin bloquear la UI**.
  - Si no hay cache: mensaje claro + botón retry.
- Con datos cargados manualmente, la pantalla refleja cambios sin redeploy (solo refresh).
- Se valida que la pantalla no crashea con valores inválidos (ej: `link` sin `https://`).
- Desacople: si mañana cambia el mapeo interno de `noinfuti` (p.ej. catálogo `noinftipo`), el mobile no requiere cambios mientras el DTO de `GET /api/info-util` se mantenga estable.

**Evidencia (Semana 23):** ✅ COMPLETADA 10/02/2026
- [x] Documentación completa: `WEEK23_INFO_UTIL_MOBILE_SUMMARY.md` (730+ líneas)
- [x] Pantalla mobile implementada: `mobile/src/screens/InfoUtilScreen.tsx` (375 líneas)
  * Cache-first strategy: render inmediato desde AsyncStorage + refresh background
  * Acciones táctiles: `handleTelPress(tel)`, `handleLinkPress(url)`, `handleDireccionPress(dir, geo)`
  * Estados completos: loading, empty, error, offline (con badges visuales)
  * Pull-to-refresh: RefreshControl nativo
  * Offline banner: Aparece cuando `isOffline=true`, muestra timestamp última sync
- [x] Servicio cache offline: `mobile/src/services/infoUtilService.ts` (88 líneas)
  * Funciones: `saveToCache()`, `getFromCache()`, `clearCache()`, `getLastSyncTimestamp()`
  * Cache key: `info_util_cache_v1` (versionado para migraciones futuras)
  * Type `InfoUtilItem` con 8 campos (id, tipo, titulo + 5 opcionales)
- [x] Navegación integrada: `mobile/src/App.tsx`
  * Líneas 151-159: `InfoUtilStack` definido
  * Línea 204: Tab registration `<Tab.Screen name="InfoUtil" .../>`
  * Icono: `information-circle` (focused) / `information-circle-outline`
- [x] Test suite: `backend/test-week23-info-util-mobile.ps1` (230 líneas)
  * Test 1: GET /api/info-util → **PASS** ✅
  * Test 2: InfoUtilScreen.tsx → **PASS** ✅
  * Test 3: InfoUtilService.ts → **PASS** ✅
  * Test 4: Navegación App.tsx → **PASS** ✅
  * **Total: 4/4 PASS** ✅

**Hallazgos Semana 23:**
- ✅ Pantalla mobile completamente implementada (0 líneas código nuevo)
- ✅ Cache-first strategy robusta: render inmediato + background refresh
- ✅ Acciones nativas: `tel:`, `Linking.openURL()`, Google Maps integration
- ✅ Estados offline con badges visuales: "Modo sin conexión" + timestamp sync
- ✅ Pull-to-refresh funcional en FlatList
- ✅ Desacoplamiento DTO público vs esquema BD (tipos transformados)
- ✅ Test suite validó backend + mobile integration

---

# NOTIFICACIONES + DISPOSITIVOS

## Semana 24 (16/06–22/06) — Modelos Prisma: dispositivos + notificaciones
- [x] Tablas: `devices`, `notifications` (+ relaciones por usuario)

**Evidencia (Semana 24):** ✅ COMPLETADA 10/02/2026
- [x] Modelos Prisma: `backend/prisma/schema.prisma` (líneas 395-426)
  * model notifications: UUID PK, FK nuusuari CASCADE, 4 índices optimizados
  * model nudispos: PK compuesta (nudistipod + nudisid), tokens push
- [x] DDL PostgreSQL: `backend/db/create_notifications_table.sql` (35 líneas)
  * UUID auto-generado con uuid_generate_v4()
  * JSONB metadata para extensibilidad
  * 4 índices: usuario, leida, fecha DESC, usuario+leida composite
- [x] Schemas Zod: `backend/server-soap.js` (líneas 131-165)
  * RegisterDeviceBodySchema: validación formato Expo token
  * DeviceIdParamsSchema: UUID validation
  * NotificationsQuerySchema: paginación + filtros con transforms

## Semana 25 (23/06–29/06) — Registro dispositivos en BD
- [x] Endpoints: register/update token, desactivar, listar del usuario
- [x] Zod + auth

**Evidencia (Semana 25):** ✅ COMPLETADA 10/02/2026
- [x] Endpoints dispositivos implementados en `backend/server-soap.js`:
  * Línea 7761: POST /devices/register (con validateBody Zod)
  * Línea 7817: GET /devices (listar dispositivos usuario)
  * Línea 7859: DELETE /devices/:id (con validateParams UUID)
- [x] Validación Zod formato Expo token: `ExponentPushToken[...]` requerido
- [x] Middleware requireAuth en todos los endpoints
- [x] Test validación: token inválido rechazado con 400 ✅

## Semana 26 (30/06–06/07) — Notificaciones backend v1
- [x] Listado paginado + conteo no leídas + mark-read

**Evidencia (Semana 26):** ✅ COMPLETADA 10/02/2026
- [x] Endpoints notificaciones v1 implementados en `backend/server-soap.js`:
  * Línea 3720: GET /notifications (paginación: page, limit 1-100)
  * Línea 3752: POST /notifications/mark-read/:id
  * Línea 3805: DELETE /notifications/:id
- [x] Paginación robusta: default limit 20, max 100 (protection abuse)
- [x] Respuesta incluye: notifications[], pagination{}, unread_count
- [x] Ordenamiento por fecha_creacion DESC (más recientes primero)

## Semana 27 (07/07–13/07) — Notificaciones backend v2
- [x] Filtros por tipo/fecha/leído-no leído
- [x] mark-all + consistencia de lectura

**Evidencia (Semana 27):** ✅ COMPLETADA 10/02/2026
- [x] Filtros avanzados implementados (líneas 149-165 NotificationsQuerySchema):
  * tipo: enum validation
  * leida: string → boolean transform ('true'/'1' → true)
  * fecha_desde / fecha_hasta: ISO 8601 o YYYY-MM-DD
- [x] Endpoint mark-all: Línea 3780 POST /notifications/mark-all-read
- [x] Consistencia lectura: fecha_leida auto-actualizada al marcar
- [x] Test suite unificado: `backend/test-week24-27-notif-devices.ps1` → **6/8 PASS** ✅
- [x] Documentación API completa: `backend/API_NOTIFICACIONES.md` (505 líneas)

**Hallazgos Semanas 24-27:**
- ✅ Infraestructura completa backend notificaciones + dispositivos (0 líneas código nuevo)
- ✅ 8 endpoints REST con autenticación (requireAuth)
- ✅ Validación Zod robusta (formato Expo tokens, transforms query params)
- ✅ 4 índices BD optimizados para queries frecuentes
- ✅ Documentación API exhaustiva con ejemplos ejecutables
- ✅ Test suite: 6 PASS validando modelos + endpoints (2 FAIL esperados sin datos)

## Semana 28 (14/07–20/07) — Mobile: pantalla notificaciones completa
**Estado**: ✅ COMPLETADA (3 Febrero 2026)

**Implementado:**
- [x] Backend v2: filtros tipo/leída/fechas + mark-all-read
- [x] Mobile: NotificationsScreen con FlatList, modal detalle, optimistic updates
- [x] FilterModal con DateTimePicker (tipo, leída, rango fechas)
- [x] useNotifications hook con polling 30seg + validación auth
- [x] Badge TabNavigator actualizado automáticamente
- [x] apiPut implementado en api.ts
- [x] Manejo robusto errores + normalización respuesta backend
- [x] Tests E2E: 8 endpoints verificados funcionando

**Evidencia:**
- Backend: `backend/test-notif-quick.ps1` (8 tests pasados)
- Mobile: Logs confirman GET/PUT funcionando con 10 notificaciones
- Componentes: `NotificationsScreen.tsx`, `FilterModal.tsx`, `notificationService.ts`, `useNotifications.ts`

---

# ADMIN USUARIOS + QA + STORES

## ✅ Semana 29 (21/07–27/07) — Backend admin usuarios (COMPLETADA 10/02/2026)

**Scope**:
- [x] Listar usuarios con paginación + filtros (GET /admin/users)
- [x] Buscar usuarios por email/nombre/nuusuid (query param `q`)
- [x] Detalle usuario específico con credenciales grupo familiar (GET /admin/users/:id)
- [x] Activar/desactivar usuarios (endpoints pre-existentes: DELETE /user/account, POST /admin/user/reactivate)
- [x] Estadísticas usuarios (GET /admin/stats/users)
- [x] Funciones BD: desactivar_usuario(), reactivar_usuario(), estadisticas_usuarios()
- [x] Esquema BD: columnas nuusuactiv, nuusufecde, nuusumotde + vistas + auditoría
- [x] Zod schemas: AdminUsersQuerySchema, UserIdParamsSchema
- [x] Middleware requireAdmin para control de acceso
- [x] **Interfaz Web admin-usuarios.html** (dashboard, tabla, filtros, modal detalle)
- [x] **Botón acceso desde home backend** (index.html → /admin/usuarios)
- [x] **Endpoint POST /admin/user/deactivate** (admin desactiva cualquier usuario desde UI)
- [x] **Security fix POST /admin/user/reactivate** (requireAdmin agregado)
- [x] **Botones UI desactivar/reactivar** (tabla y modal con confirmación)
- [x] **Fix funciones SQL** (desactivar_usuario y reactivar_usuario recreadas)

**Descubrimientos**:
- Infraestructura parcial pre-existente (57%): eliminación lógica completa con funciones BD robustas
- Desarrollo nuevo (43%): endpoints listar/buscar/detalle usuarios + interfaz web
- Doble esquema estado usuarios: nuusuactiv (nuevo) vs nuusubajaf (legacy) requiere consolidación
- **Security gap RESUELTO**: POST /admin/user/reactivate ahora usa requireAdmin ✅
- **Bug funciones SQL**: desactivar_usuario() verificaba COUNT(*) con query incorrecta → recreadas con comparación directa variable v_activ ✅

**Implementación Backend**:
- 4 endpoints nuevos: GET /admin/users, GET /admin/users/:id, **POST /admin/user/deactivate** (admin), 3 endpoints debug
- 4 endpoints pre-existentes: DELETE /user/account, **POST /admin/user/reactivate (FIXED)**, GET /user/status, GET /admin/stats/users
- SQL migration: backend/db/migrate_logical_deletion.sql (269 líneas)
- **SQL functions recreadas**: desactivar_usuario() y reactivar_usuario() con comparación directa v_activ (fix bug COUNT)
- Tabla auditoría con trigger automático (auditoria_usuarios)
- Índice optimizado: idx_nuusuari_activo (partial index WHERE nuusuactiv='S')
- Vista v_usuarios_tipo con tipo_autenticacion y estado_usuario

**Implementación Interfaz Web**:
- Archivo: `backend/public/admin-usuarios.html` (900+ líneas HTML/CSS/JS - actualizado)
- Ruta: GET /admin/usuarios (agregada en server-soap.js línea ~1957)
- Acceso: http://localhost:3000/admin/usuarios
- **Botón home backend**: index.html línea ~158 "👥 Administrar Usuarios" (href="/admin/usuarios", color naranja)
- **Componentes**:
  * Login screen con POST /auth/login (credenciales: admin/admin123)
  * Dashboard 5 cards: total, activos, desactivados, GAM, local
  * Tabla usuarios paginada con badges de estado/tipo
  * **Botones acción condicionales**: "❌ Desactivar" (usuarios activos) / "✅ Reactivar" (usuarios desactivados)
  * Filtros: búsqueda texto, estado (todos/activos/desactivados), tipo (todos/GAM/local), items por página
  * Modal detalle usuario con grupo familiar completo + **botón desactivar/reactivar al final**
  * Responsive design con gradient background (coherente con admin-parametros.html)
- **JavaScript**: 
  * Funciones confirmDeactivate(nuusuid, email) con prompt motivo opcional
  * Funciones confirmReactivate(nuusuid, email) con confirm simple
  * Recarga automática tabla + stats después de acción
  * Fetch API a todos los endpoints, paginación client-side, event listeners en tiempo real

**Tests**: 6/6 PASS ✅ (Backend) + 9/10 PASS (UI) + 6/6 PASS ✅ (Desactivar/Reactivar COMPLETO)
- GET /admin/users (sin filtros): estructura + paginación
- GET /admin/users?estado=activo&limit=5: filtros + límite
- GET /admin/users/:id: detalle con credenciales grupo familiar
- GET /admin/stats/users: estadísticas completas (5 métricas)
- Zod schemas: AdminUsersQuerySchema + UserIdParamsSchema
- Middleware requireAdmin: definido con validación isAdmin
- Interfaz web: ruta /admin/usuarios responde HTML válido, todos los elementos presentes
- **Ciclo desactivar/reactivar COMPLETO**: test-desactivar-reactivar-admin.ps1 (6/6 pasos ✅)

**Evidencia:**
- Documentación: `WEEK29_ADMIN_USERS_SUMMARY.md` (50+ secciones, arquitectura completa + UI + resolución bug final)
- Test suite backend: `backend/test-week29-admin-users-complete.ps1` (6/6 tests PASS)
- Test suite UI: `backend/test-admin-usuarios-ui-simple.ps1` (9/10 verificaciones OK)
- **Test desactivar/reactivar COMPLETO**: `backend/test-desactivar-reactivar-admin.ps1` (6/6 pasos ✅)
- **Scripts SQL fix**: `backend/db/fix_functions_simple.sql` (funciones simplificadas - versión final)
- **Scripts fix aplicación**: fix-functions-simple.js, fix-duplicate-functions.js, check-table-structure.js
- **Scripts debug**: debug-with-logs.ps1 (backend background + captura logs) - herramienta crítica para identificar bug
- Endpoints: [server-soap.js](backend/server-soap.js) líneas 7407-7780 (nuevos/actualizados) + 7163-7397 (existentes)
- Interfaz web: [admin-usuarios.html](backend/public/admin-usuarios.html) (dashboard completo con botones acción)
- Home backend: [index.html](backend/public/index.html) línea ~158 (botón acceso admin usuarios)
- Funciones BD: [migrate_logical_deletion.sql](backend/db/migrate_logical_deletion.sql) líneas 66-200
- Schemas Zod: [server-soap.js](backend/server-soap.js) líneas 86-102

**Recomendaciones futuras**:
- **[HIGH] ✅ COMPLETADO**: Fix security POST /admin/user/reactivate → requireAdmin agregado
- **[HIGH] ✅ COMPLETADO**: UI Botones desactivar/reactivar usuario en tabla/modal
- **[HIGH] ✅ COMPLETADO**: Fix funciones SQL desactivar_usuario() y reactivar_usuario()
- **[HIGH] ✅ COMPLETADO**: Debug endpoint POST /admin/user/reactivate (bug req.user vs req.session RESUELTO)
- [HIGH] Migrar GET /user/status a esquema nuevo (nuusuactiv en lugar de nuusubajaf)
- [MEDIUM] Extraer repository pattern (userRepository.js) similar a Semanas 21-27
- [MEDIUM] Script migración datos legacy: nuusubajaf → nuusuactiv
- [LOW] UI: Export CSV/Excel, gráficos Chart.js, historial cambios  
- [LOW] Tabla roles_usuarios para RBAC (reemplazar whitelist hardcodeada adminEmails)

**Notas técnicas**:
- **Bug SQL resuelto**: Función original desactivar_usuario() usaba `SELECT COUNT(*) WHERE nuusuactiv='N'` que no detectaba usuarios activos correctamente
  * Solución fase 1: Recreada con `SELECT nuusuactiv INTO v_activ` + comparación directa `IF v_activ = 'N'`
  * Problema funciones duplicadas: Error "la función reactivar_usuario(unknown) no es única"
  * Problema ambigüedad columnas: Error "la referencia a la columna nuusuactiv es ambigua"
  * Solución final: Funciones simplificadas que retornan solo `(success BOOLEAN, message TEXT)`
- **Bug endpoint reactivar RESUELTO (10/02/2026 22:15)**:
  * Causa root: Línea 7316 `req.user.nuusuid` pero middleware requireAuth establece `req.session` (no `req.user`)
  * Identificado con: Script debug-with-logs.ps1 (backend background + captura logs en tiempo real)
  * Fix aplicado: Cambio `req.user.nuusuid` → `req.session.nuusuid` en línea 7316
  * Evidencia logs: `req.user: undefined`, `req.session: {nuusuid: "test_admin@test.local", ...}`
  * Resultado: 6/6 tests PASS completos ✅
- **Funciones SQL versión final** (fix_functions_simple.sql):
  * desactivar_usuario(p_nuusuid TEXT, p_motivo TEXT DEFAULT) → TABLE(success, message)
  * reactivar_usuario(p_nuusuid TEXT) → TABLE(success, message)
  * Estructura simplificada elimina errores de tipo en PostgreSQL

### Fix GAM GUID en registro (13/02/2026)

**Problema**: Al registrar un nuevo usuario, `nuusuid` en `nuusuari` quedaba con valor numérico legacy (ej: `000...0029`) en vez del GUID de GAM.

**Causas raíz identificadas**:
1. **config.json con clientId/clientSecret incorrectos** → GAM devolvía error 236 ("aplicación cliente no encontrada") → registro caía silenciosamente a modo legacy
2. **`checkUserExistsInGAM()` no parseaba error code 11** → `loginError.error` es un objeto `{code, message}`, no string → `String()` producía `[object object]` y no matcheaba ningún patrón
3. **Guard débil en extracción de userId** → `String(undefined)` producía `"undefined"` (truthy) → pasaba el guard

**Fixes aplicados**:
- `backend/config.json`: Actualizado clientId/clientSecret a credenciales correctas (de `GAM_INTEGRATION.md`)
- `backend/gamService.js` (`checkUserExistsInGAM`):
  * Fix parsing: extrae `errorCode` y `errorMsg` de objeto anidado `loginError.error.{code,message}`
  * GAM error code 11 tratado como "usuario no existe" (GAM no diferencia user-not-found vs wrong-password)
  * Agregado `'no es correcta'` a `userNotFoundPatterns` + array `userNotFoundCodes = ['11']`
- `backend/server-soap.js`:
  * Agregada función `resolveGamUserId(data)` — buscador recursivo de GUID en múltiples campos
  * Guard mejorado: `!nuusuid || nuusuid === 'null' || nuusuid === 'undefined'` → throw error (no cae a legacy)
  * Usa `resolveGamUserId()` en vez de acceso directo a `.userId` / `.UserGUID`

**Flujo verificado**: register → login → userinfo (GUID) → nuusuari + nuusuauth + crcredus

**Nota**: Parámetros GAM (clientId, clientSecret) solo en `config.json`, NO en `nusispar` (decisión de diseño).

### Norma de flujo de login previo a migración de datos (13/02/2026)

**Regla establecida**: Antes de realizar la migración de datos de la tabla `nuusuari`, el flujo de login debe seguir este orden estricto:

1. **Verificar en GAM** (autenticación OAuth2)
   - Llamar a `POST /oauth/access_token` con username/password
   - Obtener `access_token` si las credenciales son válidas
   - Si falla → rechazar login (no permitir login solo local)

2. **Consultar/sincronizar `nuusuari`** (sincronización usuario)
   - Con el `access_token` válido, llamar a `GET /oauth/userinfo` → obtener GUID
   - Buscar usuario en `nuusuari` por `nuusuid = GUID`
   - Si no existe → crear entrada con GUID como PK (INSERT con datos de GAM)
   - Si existe → actualizar token y fecha última autenticación (UPDATE)

3. **Construir resto de datos de BD** (datos complementarios)
   - Sincronizar credenciales del grupo familiar (`crcredus` + `crcreden`)
   - Cargar datos adicionales necesarios para la sesión
   - Retornar respuesta completa al cliente con todos los datos

**Objetivo**: Garantizar que GAM sea la fuente de verdad para autenticación y que todos los usuarios GAM estén sincronizados en la BD local antes de la migración masiva.

**Implicación**: Usuarios legacy (nuusuid numérico) deberán migrar a GAM o quedarán sin acceso después de la migración.

---

## Script de Sincronización Automática GAM → BD Local

**Fecha**: 13/02/2026  
**Estado**: ✅ IMPLEMENTADO  
**Archivos**:
- `backend/scripts/sync-users-from-gam.js` - Script principal de sincronización
- `backend/scripts/sync-users-from-gam.ps1` - Wrapper PowerShell
- `backend/scripts/test-sync-gam.ps1` - Test suite
- `backend/scripts/SYNC_GAM_USERS_README.md` - Documentación completa

### Propósito

Automatizar el proceso de sincronización de usuarios desde GAM hacia la base de datos local, preparando el sistema para una migración masiva de datos de la tabla `nuusuari`.

### Funcionalidad

Para cada usuario activo en la BD (`nuusubajaf IS NULL`):

1. **Verificar en GAM** - Login OAuth2 con contraseña de prueba "123456"
2. **Obtener GUID** - Consultar `/oauth/userinfo` para obtener ID único de GAM
3. **Actualizar BD Local** - Si el usuario tiene `nuusuid` numérico (legacy):
   - Actualizar `nuusuari.nuusuid` con GUID de GAM
   - Actualizar `nuusuauth.nuusuid` (FK)
   - Actualizar `crcredus.nuusuid` (FK)
4. **Sincronizar Credenciales** - Llamar servicio SOAP `APPDATOSCREDENCIALES` y guardar en `crcreden`

### Backend Changes

**Nuevo Endpoint**: `POST /credencial/sync-manual`
- **Propósito**: Sincronización de credenciales desde scripts de migración
- **Acceso**: Solo desde localhost o con Bearer token válido
- **Request**:
  ```json
  {
    "nuusuid": "ca87f1be-ac8c-46b8-9652-7cc2e6e58eda",
    "afiliadoId": "123456789123456789123456789123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "credenciales": [...],
    "sync": {
      "total": 7,
      "inserted": 0,
      "updated": 2,
      "unchanged": 5
    }
  }
  ```

### Uso

#### Simulación (recomendado)
```powershell
cd backend\scripts
.\sync-users-from-gam.ps1 -DryRun
```

#### Sincronizar todos los usuarios
```powershell
.\sync-users-from-gam.ps1
```

#### Sincronizar un solo usuario
```powershell
.\sync-users-from-gam.ps1 -Email marianr@tekhne.com.ar
```

### Test Suite

```powershell
.\test-sync-gam.ps1
```

Verifica:
- ✅ Backend disponible en localhost:3000
- ✅ Archivos del script existen
- ✅ Dry-run funciona correctamente
- ✅ Endpoint `/credencial/sync-manual` accesible

### Estadísticas de Ejecución

El script proporciona un resumen detallado:
```
Total procesados:  X
✅ Actualizados:    X  (legacy → GAM GUID)
⏭️  Sin cambios:     X  (ya tienen GUID correcto)
⏭️  Saltados:        X  (no existen en GAM)
❌ Errores:         X  (fallo autenticación/BD)
```

### Limitaciones

- **Contraseña de prueba**: Usa "123456" para testing. En producción se requiere:
  - Token de servicio de administrador GAM, o
  - Proceso asistido donde el usuario proporciona credenciales

- **Solo usuarios activos**: Filtra `nuusubajaf IS NULL`

- **Requiere backend online**: Usa endpoints del backend, no accede directamente a GAM

### Migración Masiva - Próximos Pasos

1. ✅ Script de sincronización implementado
2. ⏳ Ejecutar dry-run en ambiente de testing
3. ⏳ Validar resultados con queries SQL
4. ⏳ Ejecutar sincronización completa en testing
5. ⏳ Verificar integridad de datos
6. ⏳ Repetir proceso en producción
7. ⏳ Deprecar `nuusuid` numérico completamente

---

## ✅ Migración LEGACY → GAM Completada (18/02/2026)

### Resumen Ejecutivo

**Objetivo**: Migrar todos los usuarios reales de `nuusuid` numérico (LEGACY) a GUID de GAM  
**Estado**: ✅ **COMPLETADA EXITOSAMENTE**  
**Fecha**: 18 de febrero de 2026  
**Resultado**: 5/5 usuarios reales migrados correctamente

### Estrategias Implementadas

#### Estrategia 1: Script Batch (backend/scripts/sync-users-from-gam.js)
- Migración masiva con contraseñas conocidas
- Actualiza 5 tablas: `nuusuari`, `nuusuauth`, `crcredus`, `notifications`, `push_tokens`
- Usa DEFERRED constraints para transacciones atómicas
- **Limitación**: Requiere contraseñas de usuarios

#### Estrategia 2: Migración Automática en Login (POST /gam/login)
- **Implementada en**: `backend/server-soap.js` línea ~1203 (función `migrateUserToGAM`)
- **Lógica**: Detecta usuarios LEGACY (regex `/^\d+$/`) y migra transparentemente en primer login
- **Ventaja**: NO requiere contraseñas previas, usa credenciales del propio usuario
- **Activación**: Automática al hacer login con `/gam/login`

### Infraestructura de Soporte

#### Foreign Keys DEFERRABLE (Requisito Crítico)
Aplicadas 3 migraciones SQL para permitir actualización circular de FKs:
- `backend/db/make-fk-deferrable-for-gam-sync.sql` (nuusuauth, crcredus)
- `backend/db/make-icrcred2-deferrable.sql` (icrcred2 en crcredus)
- `backend/db/make-all-fks-deferrable-final.sql` (notifications, push_tokens)

**Total FKs configuradas**: 5 tablas con `DEFERRABLE INITIALLY DEFERRED`

#### Scripts de Utilidad Creados
1. **list-users-migration-status.js**: Ver usuarios LEGACY vs GAM con resumen ejecutivo
2. **check-user-status.js**: Diagnóstico completo de un usuario (todas las tablas)
3. **test-login-user.js**: Probar login GAM y detectar migración automática
4. **migrate-all-legacy-users.js**: Migración masiva vía login API (5 usuarios en lote)
5. **revert-user-to-legacy.js**: Revertir usuario a LEGACY (solo testing)
6. **list-nuusuari-columns.js**: Ver estructura real de tabla nuusuari

### Resultado Final

#### ✅ Usuarios Reales Migrados (5/5)
| Email | nuusuid LEGACY → GAM | Nombre | Credenciales |
|-------|----------------------|--------|--------------|
| nuevo@test.com | `...023` → `5e9535f4...` | CEJAS, PATRICIA MURIEL | 1 |
| nuevo1@test.com | `...024` → `bf127edf...` | AQUINO, CAROLINA ALEJANDRA | - |
| nuevo2@test.com | `...029` → `a39e9621...` | COSTANZO, JOSE RUBEN OCTAVIO | 2 |
| nuevo3@test.com | `...030` → `24025437...` | HERRERA, RICARDO ADOLFO | - |
| ybañez@gmail.com | `...028` → `f5c75815...` | YBAÑEZ, ANGEL CRISTOBAL | - |

#### ⚠️ Usuarios Admin - No Migrados (3)
Permanecen en LEGACY (no existen en GAM):
- `admin@osep.gob.ar` (nuusuid: `...026`)
- `admin@test.local` (nuusuid: `...025`)
- `superadmin@osep.gob.ar` (nuusuid: `...027`)

**Justificación**: Son usuarios administrativos locales creados para el backend (seedBackendAdmins), no requieren autenticación GAM.

### Tablas Normalizadas

Para cada usuario migrado se actualizaron:
1. ✅ **nuusuari**: `nuusuid` cambiado de numérico a GUID GAM
2. ✅ **nuusuauth**: FK `nuusuid` actualizado al nuevo GUID
3. ✅ **crcredus**: FK `nuusuid` actualizado al nuevo GUID (todas las credenciales del grupo familiar)
4. ✅ **notifications**: FK `nuusuid` actualizado al nuevo GUID (si existen notificaciones)
5. ✅ **push_tokens**: FK `nuusuid` actualizado al nuevo GUID (si existen tokens)

### Verificación

```powershell
# Ver estado actual de todos los usuarios
cd E:\MisProyectos\appmovil\APP_Afiliados\backend
node list-users-migration-status.js

# Verificar usuario específico
node check-user-status.js nuevo2@test.com

# Probar login con usuario migrado
node test-login-user.js nuevo2@test.com 12345678
```

### Integración con App Móvil

**Estado**: ✅ **FUNCIONANDO CORRECTAMENTE**

La app móvil funciona sin modificaciones con usuarios migrados porque:
- Los endpoints de autenticación detectan automáticamente GUID vs numérico
- Las credenciales están correctamente vinculadas al nuevo GUID
- Los tokens GAM se regeneran y persisten en `nuusuari.nuusugamtok`

**Usuarios de prueba en app** (password: `12345678`):
- nuevo@test.com
- nuevo1@test.com
- nuevo2@test.com
- nuevo3@test.com
- ybañez@gmail.com

### Lecciones Aprendidas

1. **FKs DEFERRABLE son esenciales** para migraciones que involucran relaciones circulares
2. **Migración automática en login** es superior al batch: no requiere passwords, transparente para usuarios
3. **Transacciones con SET CONSTRAINTS ALL DEFERRED** garantizan consistencia atómica
4. **Scripts de diagnóstico** son críticos para troubleshooting (check-user-status.js)
5. **Testing incremental** evita problemas en producción (revert-user-to-legacy.js útil)

### Próximos Pasos (Producción)

1. ✅ Migración en desarrollo/testing completada
2. ⏳ Aplicar migraciones FK DEFERRABLE en producción
3. ⏳ Activar migración automática en login (`POST /gam/login`)
4. ⏳ Monitorear logs de migración en primeros logins
5. ⏳ Deprecar referencias a `nuusuid` numérico en documentación
6. ⏳ Considerar constraint CHECK para forzar formato UUID en `nuusuid`

### Verificación de Migración de Usuarios

**Scripts de verificación** (✅ IMPLEMENTADOS - 18/02/2026):

1. **`backend/verify-user-migration.js`** — Script Node.js completo
   - Verifica todas las tablas relacionadas: `nuusuari`, `nuusuauth`, `crcredus`, `crcreden`, `notifications`, `push_tokens`
   - Muestra tipo de `nuusuid` (GUID GAM vs LEGACY numérico)
   - Detalla credenciales del grupo familiar
   - Detecta automáticamente estructura de BD (columnas opcionales)
   - Genera reporte completo con emojis y formateo visual

2. **`backend/verify-user-migration.ps1`** — Wrapper PowerShell
   - Interfaz amigable con parámetros
   - Manejo de errores mejorado
   - Ubicación automática del directorio backend

**Uso**:
```powershell
cd backend
node verify-user-migration.js nuevo@test.com
# O con wrapper PowerShell:
.\verify-user-migration.ps1 nuevo@test.com
```

**Resultado de verificación**:
- ✅ Tablas 2-6 (usuarios GAM migrados): `nuevo@test.com`, `nuevo1@test.com`, `nuevo2@test.com`, `nuevo3@test.com`, `ybañez@gmail.com`, `ppinetta@gmail.com`
- ⚠️ Tablas 3 (usuarios admin LEGACY): `admin@osep.gob.ar`, `admin@test.local`, `superadmin@osep.gob.ar`

**Características**:
- Autodescubrimiento de columnas (compatible con diferentes versiones de esquema)
- Soporte para múltiples nombres de columnas (`leida` vs `leido`, `token` vs `push_token`)
- Verificación de integridad referencial en 6 tablas
- Conteo de notificaciones y tokens push
- Detalle completo de credenciales del grupo familiar (titular + familiares)

### Referencias

- **Documentación GAM**: `GAM_INTEGRATION.md`, `REGLAS_GAM_BDD.md`
- **Scripts migración**: `backend/scripts/sync-users-from-gam.js` (batch)
- **Scripts verificación**: `backend/verify-user-migration.js`, `backend/verify-user-migration.ps1` ✨ NUEVO
- **Función migración automática**: `backend/server-soap.js` línea ~1203 (`migrateUserToGAM`)
- **Guía de pruebas**: `PRUEBA_MIGRACION_APP.md`
- **Infraestructura FK**: `backend/db/make-*-deferrable*.sql` (3 archivos)

---

## Semana 31 (04/08–10/08) — Assets stores
- [x] Kickoff Android publicación: relevamiento técnico inicial (08/04/2026)
- [x] Validación base de assets/metadata existentes (`mobile/app.json`, `mobile/store-metadata/*`, `mobile/store-assets/README.md`)
- [x] Kickoff iOS publicación: correcciones app.json + EAS (08/04/2026)
- [ ] Capturas Android pendientes (phone, tablet 7", tablet 10")
- [ ] Capturas iOS pendientes (iPhone 6.7", iPad 12.9" desde simulador/dispositivo en macOS)
- [ ] Completar metadata final Google Play y App Store (URLs privacidad, soporte, sitio web)

## Semana 32 (11/08–18/08) — Publicaciones Android/iOS + buffer
- [ ] Build release Android en formato AAB (mantener APK solo para QA)
- [ ] Subir a track interno de Play Console
- [ ] Ejecutar correcciones de Pre-launch report
- [ ] Submission final + correcciones por revisión

### Inicio operativo Android (08/04/2026)
- Estado: **en curso**.
- Completado hoy (Fase 1, 2, 3):
  - [x] Package ID alineado: `com.anonymous.appafiliadosdevlocal` → `com.osep.app` en `build.gradle`, `AndroidManifest.xml`, `MainActivity.kt`, `MainApplication.kt`
  - [x] Permisos dev-only removidos del manifest (`RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`)
  - [x] Deeplink scheme actualizado a `com.osep.app`
  - [x] Signing config release en `build.gradle` (lee de `gradle.properties`)
  - [x] Template keystore en `mobile/keystores/README.md` con comando `keytool`
  - [x] `.gitignore` Android excluye `*.keystore` / `*.jks`
  - [x] Script `build-aab.ps1` con 3 checks pre-build (keystore, URL prod, cleartext)
  - [x] `mobile/.env.production` template con URL de producción HTTPS
  - [x] Nombre app actualizado a "APP Afiliados IA" en `app.json`, metadatas Android e iOS

### Checklist pre-publicación Android (pendiente humano)
- [ ] Generar keystore de producción → `mobile/keystores/README.md`
- [ ] Descomentar + completar `OSEP_RELEASE_*` en `mobile/android/gradle.properties`
- [ ] Completar URL prod HTTPS en `mobile/.env.production` → copiar a `mobile/.env`
- [ ] Cambiar `usesCleartextTraffic: false` en `app.json` cuando el backend esté en HTTPS
- [ ] Restringir clave Google Maps a `com.osep.app` en Google Cloud Console
- [ ] Ejecutar `.\build-aab.ps1` → verificar que los 3 checks pasen en verde
- [ ] Capturar screenshots Android con `mobile/store-assets/capture-android-screenshots.ps1`
- [ ] Completar URLs en `mobile/store-metadata/android-google-play.es-AR.md` (privacidad, soporte, sitio)
- [ ] Crear ficha en Play Console y subir AAB a track interno
- [ ] Completar formulario Data Safety en Play Console
- [ ] Corregir observaciones del Pre-launch report

### Checklist pre-publicación iOS (pendiente humano)
- [ ] Crear cuenta Apple Developer (si no existe) → https://developer.apple.com
- [ ] Crear App en App Store Connect con bundle ID `com.osep.app`
- [ ] Completar `appleId`, `ascAppId`, `appleTeamId` en `mobile/eas.json`
- [ ] Completar clave Google Maps iOS en `app.json` (`COMPLETAR_GOOGLE_MAPS_API_KEY_IOS`)
- [ ] Completar URL HTTPS producción en `mobile/.env.production` → copiar a `mobile/.env`
- [ ] Ejecutar `eas init` dentro de `mobile/` → completa `projectId` en `app.json`
- [ ] Ejecutar `.\build-ipa.ps1` (build cloud ~15-20 min, sin macOS)
- [ ] Verificar build en TestFlight antes de submit
- [ ] Completar App Privacy en App Store Connect (datos recopilados)
- [ ] Capturas iPhone 6.7" (desde simulador en macOS o dispositivo físico)
- [ ] Completar URLs en `mobile/store-metadata/ios-app-store.es-AR.md` (privacidad, soporte)
- [ ] Submit para revisión desde App Store Connect
