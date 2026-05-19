# Instrucciones para agentes AI — APP_Afiliados

Resumen rápido
- Proyecto monorepo pequeño con dos áreas principales:
  - `scripts/` + Python/PowerShell: extracción y análisis del `.xpz` (Genexus) y generación de inventarios en `build/`.
  - `mobile/`: scaffold Expo + TypeScript para la app migrada (pantallas, navegación, auth). 

Qué debe saber un agente AI antes de editar código
- Evitar cambios de infraestructura (instalación de Node/SDKs, reglas de firewall) — documentar pasos en `mobile/README.md` y en PRs.
- Mantener los cambios pequeños y limitados a un propósito por PR. Muchas herramientas consumen archivos en `build/` generados por scripts; no edites esos archivos manualmente.

Archivos y patrones clave
- Backend (Node.js + Express + SOAP + GAM):
  - `backend/server-soap.js` — servidor principal en puerto 3000. Integración con SOAP Genexus (tkqa.tekhne.com.ar:8700) y GAM OAuth2.
  - `backend/gamService.js` — **Servicio GAM (GeneXus Access Manager)** para autenticación OAuth2, registro, cambio de contraseña, recuperación. URL base: `https://test17.osep.gob.ar/APP_OSEP_TEST`. Client ID y Secret en `config.json` (NO en nusispar). **UserID de GAM (GUID) reemplaza a nuusuid local**.
  - **Obtención del GUID de GAM** (chain register → login → userinfo):
    * `POST /rest/Nucleo/NURegistroUsuario` — Registra usuario, **NO devuelve GUID**
    * `POST /oauth/access_token` — Login OAuth2, devuelve `access_token` pero `user_id` viene undefined en esta instancia
    * `GET /oauth/userinfo` — **ÚNICO endpoint que devuelve GUID**. Campo: `GUID` (mayúsculas). Ejemplo: `"GUID": "ca87f1be-ac8c-46b8-9652-7cc2e6e58eda"`
    * `resolveGamUserId(data)` — Helper recursivo en server-soap.js que busca ID en: `userId`, `user_id`, `UserGUID`, `GUID`, `Id`, `id`, `sub` + objetos anidados `user`, `data`, `profile`, `usuario`
    * `checkUserExistsInGAM(email)` — Verifica existencia via login con dummy password. GAM error code 11 = "usuario o contraseña incorrecta" → se trata como "no existe" (GAM no diferencia user-not-found vs wrong-password)
  - **Campos obligatorios `POST /register`** (siempre, con GAM habilitado o no): `email` (válido), `password` (≥6 chars), al menos uno de `cuil`/`dni`/`nroAfiliado`, `fechaNacimiento`, `sexo`, `cantidadIntegrantes`.
  - **Flujo registro con GUID** (`POST /register` con GAM habilitado):
    1. `checkUserExistsInGAM(email)` → code 11 → no existe → continúa
    2. SOAP REGISTRACION → valida afiliado → devuelve AfiliadoId
    3. `registerUserGAM(datos)` → register + login + userinfo → extrae GUID
    4. `resolveGamUserId(gamUserData)` → GUID string
    5. `saveToNuusuari(formData, soapResp, GUID)` → INSERT en `nuusuari` con `nuusuid = GUID`
    6. INSERT en `nuusuauth` con `nuusuid = GUID` (backup contraseña)
    7. `syncCredencialesGrupoFamiliar(GUID, afiliadoId)` → INSERT en `crcredus` con `nuusuid = GUID`
    * **Guard**: Si GUID no se obtiene → throw error → NO cae a legacy silenciosamente
  - **GUID en 3 tablas**: `nuusuari.nuusuid` (PK), `nuusuauth.nuusuid` (FK), `crcredus.nuusuid` (FK) — todos VARCHAR(100)
  - `backend/db/connection.js` — pool PostgreSQL con `pool.connect()` para transacciones. **CRÍTICO**: `pool.on('error')` solo loguea errores, NO usa `process.exit()` para evitar crashes.
  - `backend/db/dll_estructura_app_final2.sql` — DDL completo de tablas: `nuusuari`, `crcreden`, `crcredus`, `nusispar`, `nuusuauth`.
  - `backend/db/migrate_gam_integration.sql` — **Migración GAM**: Cambia `nuusuid` a VARCHAR(100) para soportar UserID de GAM (string). Agrega campos `nuusugamid`, `nuusugamtok`, `nuusugamexp`. Crea vista `v_usuarios_tipo`.
  - `backend/db/create_nuusuauth_table.sql` — Tabla de autenticación con contraseñas hasheadas (pbkdf2Sync). **SOLO para usuarios legacy** (usuarios GAM NO usan esta tabla).
  - **Endpoints GAM** (nuevos):
    - `POST /gam/register` — Registra usuario en GAM, guarda UserID como nuusuid en `nuusuari`
    - `POST /gam/login` — Login OAuth2 GAM, devuelve `access_token`, sincroniza credenciales SOAP automáticamente
    - `GET /gam/userinfo` — Info usuario autenticado (requiere Bearer token GAM)
    - `POST /gam/change-password` — Cambiar contraseña en GAM
    - `POST /gam/password-recovery` — Recuperar contraseña vía email
    - `POST /gam/validate-user` — Validar datos de usuario previo a registro
  - Servicios SOAP implementados:
    - `REGISTRACION` — Registrar nuevo usuario/afiliado (guarda automáticamente en `nuusuauth`)
    - `APPDATOSCREDENCIALES` — Obtener credenciales del grupo familiar (con parámetros `AfiliadoId` + `CredencialDatos[]`)
    - `APPBUSCACUIL` — Buscar CUIL por DNI y sexo
  - Headers HTTP SOAP: `USUARIO: mariar`, `PASSWORD: ignacio11` (no van en JSON body)
  - **Flujo de login obligatorio (previo migración)**: 
    1. Verificar en GAM (`POST /oauth/access_token`) → autenticación OAuth2
    2. Consultar/sincronizar `nuusuari` (`GET /oauth/userinfo` → GUID → INSERT/UPDATE en BD)
    3. Construir resto de datos (credenciales, etc.)
    * GAM es fuente de verdad para autenticación
    * Todos los usuarios GAM deben estar sincronizados en BD local antes de migración masiva
  - **Sistema de Autenticación Dual**:
    * **GAM (nuevo)**: Usuarios nuevos se registran con GAM → `nuusuid` = GUID de GAM (string UUID, ej: `ca87f1be-ac8c-46b8-9652-7cc2e6e58eda`). Login devuelve `access_token` de GAM. Contraseña respaldada en `nuusuauth` como backup.
    * **Local (legacy)**: Usuarios existentes con `nuusuid` numérico (ej: `000...0029`). Tabla `nuusuauth` (nuusuid PK/FK, nuusupass VARCHAR(256)). Hashing: `crypto.pbkdf2Sync`.
    * Funciones: `hashPassword(password)`, `verifyPassword(password, storedHash)`
    * Login: Busca en BD PostgreSQL vía `userRepository.findForLogin()` (email → CUIL → DNI LIKE)
    * Búsqueda multi-criterio: email exacto → CUIL exacto → DNI con LIKE `%DNI%`
    * Contraseña universal de prueba: `123456` (para todos los usuarios de testing)
  - Sincronización automática: al login (`POST /auth/login` y `/gam/login`) sincroniza credenciales SOAP → tabla `crcreden`
  - Hash SHA-256 para detectar cambios en credenciales
  - Fecha vencimiento: **fecha actual** + días configurables en `nusispar` (GENERALES.VigenciaCred)
  - **IMPORTANTE**: `getDefaultVencimiento()` SIEMPRE usa `new Date()` actual, ignora parámetro fechaRegistracion para evitar fechas antiguas
  - Días vigencia configurable: Sistema interno de parámetros con cache (TTL 1 min, recarga cada 5 min)
  - Script inicial: `backend/db/insert_parametro_vigencia_credencial.sql` (inserta valor por defecto 10 días)
  - **Sistema de Parámetros v2 (Interno + Admin Web)**:
    * Cache interno: Map() en memoria, TTL 1min, recarga automática 5min
    * Funciones helper: `getParametro()`, `getParametroNumero()`, `getParametroBoolean()`, `recargarParametros()`
    * Endpoints admin autenticados (Bearer token):
      - `GET /admin/parametros` - Listar todos (115 parámetros)
      - `GET /admin/parametros/:grupo` - Filtrar por grupo
      - `GET /admin/parametros/:grupo/:tipo` - Obtener específico
      - `PUT /admin/parametros/:grupo/:tipo` - Actualizar + recarga cache
      - `POST /admin/parametros` - Crear nuevo + recarga cache
      - `DELETE /admin/parametros/:grupo/:tipo` - Eliminar + recarga cache
    * Middleware `requireAuth(req, res, next)` valida Bearer token (sessions Map)
    * Middleware `requireAdmin(req, res, next)` — async, valida email en lista admin de `nusispar` (SEGURIDAD_APP.BackendAdminEmails)
    * Interfaz web ABM: `http://localhost:3000/admin` (login: admin/admin123)
    * UI moderna: tabla interactiva, búsqueda, filtros, modal crear/editar, estadísticas
    * Script PowerShell: `backend/manage-parametros.ps1` (CLI interactivo)
    * Test suite: `backend/test-admin-parametros.ps1` (9 casos de prueba)
  - **Sistema de Administración de Usuarios Backend (Webpanel)**:
    * `backend/public/admin-usuarios.html` — Panel web completo para gestionar usuarios de la app
    * URL: `http://localhost:3000/admin/usuarios`
    * Login: cualquier email que esté en la lista `SEGURIDAD_APP.BackendAdminEmails` de `nusispar`
    * **Admins por defecto**: `admin@test.local` / `admin123`, `admin@osep.gob.ar` / `admin123`
    * **Seed automático**: `seedBackendAdmins()` al iniciar el backend — crea usuarios admin en `nuusuari` + `nuusuauth` si no existen
    * **Login admin**: `POST /admin/login` — autentica contra BD (`userRepository.findForLogin()`) + verifica que email esté en lista admin
    * **Persistencia admins en BD**: Todos los admin backend son usuarios reales en `nuusuari` + `nuusuauth`, visibles en la grilla
    * **Endpoints admin usuarios**:
      - `GET /admin/users` — Lista paginada con filtros (estado, tipo, búsqueda), incluye campo `is_backend_admin`
      - `GET /admin/users/:id` — Detalle usuario con badge admin
      - `GET /admin/stats/users` — Estadísticas filtradas (total, activos, inactivos, GAM, local, admin backend)
      - `GET /admin/backend-admins` — Lista emails admin backend desde `nusispar`
      - `POST /admin/backend-admins/add` — Agregar admin: si email no existe en BD, crea usuario con nombre+contraseña (transacción nuusuari+nuusuauth); si ya existe, solo lo agrega a la lista
      - `POST /admin/backend-admins/remove` — Quitar admin (con protección anti-autorevocación y último-admin)
      - `POST /admin/user/grant-backend-admin` — Dar admin a usuario existente por nuusuid
      - `POST /admin/user/revoke-backend-admin` — Quitar admin a usuario por nuusuid
    * **Funciones helper**: `normalizeEmail()`, `getBackendAdminEmails({ forceRefresh })` (cache 60s), `saveBackendAdminEmails(emails)`, `parseBackendAdminEmails()`
    * **Parámetro BD**: `SEGURIDAD_APP.BackendAdminEmails` en `nusispar` — emails separados por coma
    * **UI Panel**: Stats con filtros auto-refresh, barra admin con chips + formulario agregar (email+nombre+contraseña), grilla con columna Admin, botones Hacer/Quitar Admin en acciones y modal detalle
  
- Backend / análisis XPZ:
  - `scripts/parse_xpz_deep.py`, `scripts/export_xpz_inventory.py`, `scripts/generate_migration_summary.py` — análisis streaming del XML y generación de: `build/xpz_deep_inventory.json`, `build/xpz_ui_mapping.json`, `build/MIGRATION_SUMMARY.json`.
  - PowerShell helpers: `scripts/extract_xpz.ps1`, `scripts/analyze_xpz_xml.ps1` — se usan en Windows dev.
  
- Mobile (Expo + TS):
  - `mobile/src/services/api.ts` — wrapper HTTP central. Timeout: 30s GET, 60s POST. Usa `setBaseUrl()` y admite modo mock (controlado por `mobile/src/config.ts`). **Detección de errores de red**: `NetworkError`, `TimeoutError`, función `isNetworkError()` para fallback offline.
  - `mobile/src/services/storageManager.ts` — **Cache offline**: guarda/recupera usuario, credenciales, contraseñas hasheadas (SHA256) en AsyncStorage. Funciones: `saveUser()`, `getUser()`, `saveCredenciales()`, `getCredenciales()`, `saveUserCredentials()`, `verifyUserCredentials()`, `clearAll()`.
  - `mobile/src/hooks/useNetworkStatus.ts` — **Detección de conexión**: hook que usa `@react-native-community/netinfo` para monitorear estado online/offline en tiempo real. Retorna `{ isConnected, isInternetReachable, type }`.
  - `mobile/src/contexts/AuthContext.tsx` — **Login dual offline/online**: persistencia del token en `AsyncStorage`, signIn valida primero contra cache local (offline), luego intenta sincronización online en background. Incluye `credenciales[]` sincronizadas desde backend. Función `signIn()` con 3 pasos: 1) Validación offline, 2) Login desde cache + sync background, 3) Login online si no hay cache. Nuevo campo `isOfflineMode` para indicar estado actual.
  - `mobile/src/config.ts` — cambiar `USE_MOCK` y `API_BASE_URL` aquí para desarrollo; AVD debe usar `http://10.0.2.2:3000`.
  - `mobile/src/utils/dateUtils.ts` — Función `formatFecha(fecha)` centralizada para formatear fechas a DD/MM/AAAA. Usa en todo el frontend.
  - Components:
    - `mobile/src/components/CredencialCard.tsx` — Tarjeta de credencial con imagen de fondo apaisada (credencial-fondo-2.png), badges (TITULAR centrado, VIGENTE esquina superior derecha), datos completos en layout 2 columnas. **Token temporal en vértice inferior derecho** con countdown en tiempo real. Altura fija 280px. Layout diferenciado: titular marginTop 50px, familiares marginTop 80px. Sin botones internos.
    - `mobile/src/components/CredencialesCarousel.tsx` — Carrusel de credenciales del grupo familiar
    - `mobile/src/components/OfflineBanner.tsx` — **Banner modo offline**: muestra estado offline/online con animación, botón sync manual. Aparece automáticamente en pantallas principales cuando `isOfflineMode=true` o sin conexión.
  - Screens: 
    - `mobile/src/screens/LoginScreen.tsx` — Login con sincronización automática de credenciales. **Modo dual offline/online**: valida credenciales localmente primero, luego intenta sincronizar con backend.
    - `mobile/src/screens/HomeScreen.tsx` — Header "Bienvenido + nombre" en misma línea (fontSize 14px, centrado). Vista táctil credencial titular sin QR. Al tocar abre modal con credencial completa + **QR en frame separado** + opciones (actualizar, compartir, ver grupo familiar). **OfflineBanner** integrado en la parte superior.
    - `mobile/src/screens/CredencialesScreen.tsx` — Carrusel credenciales grupo familiar táctil. Al tocar cualquier credencial abre modal con **QR en frame separado** + opciones (actualizar, compartir). Botón externo "Compartir" usa handleShareFromCarousel (abre modal, espera 500ms, captura, comparte). **OfflineBanner** integrado.
    - `mobile/src/screens/ProfileScreen.tsx` — Perfil con credencial digital y grupo familiar. QR integrado en tarjeta grande, se actualiza al seleccionar miembro del grupo familiar. **OfflineBanner** integrado.
    - Otros: Transactions, Notifications, Tramites — UI básica y hooks hacia `useAuth` y `api.ts`.

Comandos y flujos de desarrollo (Windows / PowerShell)
- Backend SOAP:
  - Reiniciar servidor con script:
    ```powershell
    cd backend
    .\restart-backend.ps1  # Reinicia backend en proceso separado
    ```
  - Iniciar servidor manualmente:
    ```powershell
    cd backend
    node server-soap.js
    # Escucha en http://0.0.0.0:3000
    # Conecta a PostgreSQL (localhost:5432/app_afiliados_genexus)
    # Conecta a SOAP (tkqa.tekhne.com.ar:8700)
    ```
  - Detener puerto 3000 si está ocupado:
    ```powershell
    Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
    ```
  - Endpoints principales:
    - `POST /register` — Registro con SOAP REGISTRACION
    - `POST /auth/login` — Login + sincronización automática credenciales SOAP (username/password)
    - `GET /auth/me` — Perfil usuario autenticado (Bearer token)
    - `GET /credencial` — Credenciales del grupo familiar
    - `GET /admin/parametros` — Listar parámetros (requiere autenticación)
    - `PUT /admin/parametros/:grupo/:tipo` — Actualizar parámetro (requiere autenticación)
    - `POST /admin/parametros` — Crear parámetro (requiere autenticación)
    - `DELETE /admin/parametros/:grupo/:tipo` — Eliminar parámetro (requiere autenticación)
  - **Endpoints SIA (Sistema Integral de Autorizaciones)**:
    - `POST /sia/solicitudes` — REC_SOLICITUDES_APP (requiere auth, usa nuusuid)
    - `POST /sia/autorizacion-imprimir` — AUTORIZACION_IMPRIMIR (requiere auth, usa nuusuid)
    - `POST /sia/prestaciones` — REC_PRESTACIONES_APP (sin parámetros)
    - `POST /sia/pago-coseguro` — PAGO_COSEGURO_APP (por definir)
    - `GET /sia/coseguros-pendientes` — COSEGUROS_PENDIENTES_APP (requiere auth, usa AfiliadoId)
    - `POST /sia/enrolamientos` — ENROLAMIENTOS (parámetros específicos)
    - `GET /sia/historial-atencion` — HISTORIAL_ATENCION_APP (requiere auth, paginación, formato fecha YYYY-MM-DD)
    - `GET /sia/detalle-consumo` — AUDETALLE_CONSUMO_APP (parámetros numéricos)
    - Documentación completa: `backend/SIA_SERVICES.md` y `backend/SIA_SOAP_EXAMPLES.md`
    - Scripts de prueba: `backend/test-sia-*.ps1` (uno por servicio)
    - `POST /admin/parametros` — Crear parámetro (requiere autenticación)
    - `DELETE /admin/parametros/:grupo/:tipo` — Eliminar parámetro (requiere autenticación)
  - Interfaz web:
    - `http://localhost:3000` — Página principal con tests de endpoints
    - `http://localhost:3000/admin` — ABM de parámetros (login: admin/admin123)
    - `http://localhost:3000/admin/usuarios` — Panel gestión de usuarios (login: admin@test.local/admin123)
    
- XPZ → inventario:
  - Extraer y analizar (PowerShell):
    - `.\scripts\extract_xpz.ps1 -Input .\xpz\PRODUCTO_APP_SHEMA_DESA1.xpz -Out .\build\xpz_extracted` (ver `scripts/` para variantes)
    - `python .\scripts\parse_xpz_deep.py -i .\build\xpz_extracted\PRODUCTO_APP_SHEMA_DESA1.xml -o .\build\xpz_deep_inventory`
    
- Mobile (Expo):
  - Instalación deps (si hay conflictos de peer deps, usar `--legacy-peer-deps`):
    ```powershell
    cd mobile
    npm install --legacy-peer-deps
    npx expo install @react-native-async-storage/async-storage react-native-screens react-native-safe-area-context
    npm install @react-navigation/native @react-navigation/native-stack --legacy-peer-deps
    ```
  - Ejecutar bundler / emulador:
    ```powershell
    npx expo start
    # presionar 'a' para abrir en AVD, 'w' para web
    # Si usas Android AVD: API_BASE_URL = 'http://10.0.2.2:3000'
    ```
  - Si usas Android real por USB y quieres mapear puertos:
    ```powershell
    adb reverse tcp:3000 tcp:3000
    ```

Patrones de integración y recomendaciones concretas
- SOAP Integration (Dos sistemas paralelos):
  - **Sistema WSBENEFTK (Beneficiarios)**:
    * Tabla nusispar: grupo `WSBENEFTK` (mayúsculas)
    * URL construida dinámicamente: Host, Port, Secure, BaseUrl, Servicio
    * URL producción: `https://test17.osep.gob.ar:443/OSEP_BENEF17_TEST_WS/com.tekhne.abe_ws`
    * Servicio SOAP: `BE_WS.Execute`, namespace `com.tekhne.beneficiarios`
    * Headers HTTP: `USUARIO` (valor de User=admin), `PASSWORD` (valor de Password=admin123)
    * Funciones: `buildSoapUrl()`, `getSoapUser()`, `getSoapPassword()`, `callSoapExecute()`
    * Servicios: REGISTRACION, APPDATOSCREDENCIALES, APPBUSCACUIL, VALIDAAFIREG
  - **Sistema WSSIATK (SIA - Sistema Integral de Autorizaciones)**:
    * Tabla nusispar: grupo `WSSIATK` (mayúsculas)
    * URL construida dinámicamente: Host, Port, Secure, BaseUrl, Servicio
    * URL producción: `http://tkqa.tekhne.com.ar:8700/PRODUCTO_SIA_QA/com.tekhne.asia_ws`
    * Servicio SOAP: `SIA_WS.Execute`, namespace `com.tekhne.sia`
    * Headers HTTP: `USUARIO` (valor de User=mariar), `PASSWORD` (valor de Password=ignacio11)
    * Funciones: `buildSoapUrlSIA()`, `getSoapUserSIA()`, `getSoapPasswordSIA()`, `callSoapExecuteSIA()`
    * Servicios: 8 endpoints REST documentados en `backend/SIA_SERVICES.md`
  - AfiliadoId: 30 caracteres = 9 (titular) + 12 (organización) + 9 (familiar)
  - Headers HTTP: `USUARIO` y `PASSWORD` van en headers HTTP, **NO** en JSON body (nombres fijos, valores dinámicos desde nusispar)
  - **SIN valores hardcodeados**: Todas las funciones lanzan error descriptivo si falta algún parámetro en `nusispar`
  - **Formato JSON por servicio** (CRÍTICO):
    * `REGISTRACION`: Requiere **doble envoltura** `{"Parametros":{"AfiliadoNro":"...","FecNacimiento":"..."}}`
    * `APPDATOSCREDENCIALES`: Requiere **formato plano** `{"AfiliadoId":"...","CredencialDatos":[...]}`
    * Función `callSoapExecute`: Auto-detecta servicio y aplica formato correcto (lista en `serviciosConEnvoltura`)
    * Función `callSoapExecutePlain`: Siempre envía formato plano (para APPDATOSCREDENCIALES)
    * Función `callSoapExecuteSIA`: Acepta objeto JSON o string vacío `''` para servicios sin parámetros
  - Fallback HTTP: si HTTPS falla con EPROTO, reintentar con `http://`
  - Fecha vencimiento configurable:
    * Query a `nusispar`: WHERE nusisgrupa='GENERALES' AND nusistippa='VigenciaCred'
    * Fecha base: `nuusufecha` (fecha registración usuario) o fecha actual si no disponible
    * Días hábiles: valor de `nusisvalpa` (excluye sábados/domingos), fallback 10 días
    * Funciones: `getDiasVigenciaCredencial()` async, `getDefaultVencimiento(fechaRegistracion)` async
  - **Guardado completo en `nuusuari`** (POST /register):
    * `nuusuafili` — AfiliadoId de 30 caracteres desde SOAP
    * `nuplaid` — PlanId desde SOAP
    * `nuusuapell` — "Apellido, Nombre" desde SOAP
    * `nuusuestit` — "S" o "N" (es titular) desde SOAP
    * Función `saveToNuusuari(formData, soapResponse)` extrae campos de respuesta SOAP
    * **Guarda contraseña hasheada en `nuusuauth` automáticamente**
  - **Sincronización credenciales grupo familiar** (POST /auth/login):
    * Automática al login si existe AfiliadoId y SOAP conectado
    * Llama `syncCredencialesGrupoFamiliar(nuusuid, afiliadoId)`
    * Guarda/actualiza en tabla `crcreden` con hash SHA-256
    * Incluye campo `crcreparen` (parentesco) desde SOAP
    * Devuelve array `credenciales[]` en respuesta login
    * **Recalcula fecha vencimiento**: Usa SIEMPRE fecha actual + días vigencia configurables
  
- Mock mode: `mobile/src/config.ts` define `USE_MOCK`. Para desarrollo rápido activa `true` y todo `/auth/login` y `/auth/me` será simulado por `api.ts`.
- Autenticación: la app guarda `auth_token` en `AsyncStorage` y llama `apiGet('/auth/me')` al arrancar si hay token. Para integrar un backend real, asegurar que `/auth/login` devuelve `{ token | access_token, user, credenciales }` y que `/auth/me` devuelve el perfil.
- API wrapper: siempre usar `mobile/src/services/api.ts` — no uses `fetch` a mano en los componentes.
- Timeout: 30s para GET, 60s para POST (configurado en `api.ts`)
- **Formato de fechas**: SIEMPRE usar `formatFecha()` de `mobile/src/utils/dateUtils.ts` para mostrar fechas en formato DD/MM/AAAA. NO usar `toLocaleDateString()` directamente.
- **QR de credenciales**: 
  * **CredencialCard**: NO incluye QR ni botones internos (removidos del componente)
  * **QR en frame separado**: HomeScreen y CredencialesScreen muestran QR en frame independiente dentro de modal
  * **Formato QR**: JSON stringify con `{afiliadoId, cuil, token, vence}` - incluye token temporal
  * **Nombre debajo del QR**: Sin numberOfLines (expansión completa), fontSize 15px, lineHeight 20, width 100%, paddingHorizontal 16
  * **Acceso al QR**:
    - HomeScreen: Tocar credencial titular → modal con QR
    - CredencialesScreen: Tocar cualquier credencial del carrusel → modal con QR
    - ProfileScreen: QR integrado en tarjeta, se actualiza al seleccionar miembro del grupo familiar
    - Ver grupo familiar: HomeScreen → "Ver grupo familiar" → ProfileScreen
- **Compartir credencial**: 
  * Desde modal: `handleShare()` captura `credencialModalRef` directamente
  * Desde botón externo (CredencialesScreen): `handleShareFromCarousel()` abre modal, espera 500ms, captura, comparte, cierra modal
  * Usa `captureRef` de `react-native-view-shot` + `expo-sharing` para capturar y compartir credencial como imagen PNG completa (incluye QR, datos, badges). NO usar `Share.share()` de React Native (solo texto).
- **CredencialCard Layout**: 
  * Imagen de fondo: `credencial-fondo-2.png` con `resizeMode="cover"`
  * Altura fija: 280px (todas las pantallas)
  * Padding interno: 16px
  * Layout flexbox (NO posicionamiento absoluto) para captura correcta
  * Badge TITULAR: Centrado horizontalmente (`justifyContent: 'center'` en topRow)
  * Badge VIGENTE: Posición absoluta esquina superior derecha (`position: 'absolute', top: 0, right: 0`)
  * **Badge TOKEN TEMPORAL**: Posición absoluta vértice inferior derecho (`position: 'absolute', bottom: 0, right: 0`), color naranja (#FF9800), fuente 32px, con countdown M:SS en tiempo real
  * Content marginTop diferenciado: Titular 50px, Familiares 80px (usa `!isTitular && styles.contentFamiliar`)
  * Layout 2 columnas para datos, text shadows para legibilidad
  * SIN botones internos (compartir/actualizar removidos)
- **Token Temporal Sistema**:
  * **Algoritmo**: SHA256(afiliadoId:bucket) mod 1000 → 3 dígitos con padding (000-999)
  * **Bucket**: floor(epochMillis / (timeoutMinutes * 60000))
  * **Timeout configurable**: lee parámetro `CREDENCIAL.TimeoutTokenCredencial` desde `nusispar` (default 10 minutos)
  * **Backend** (`backend/tokenService.js`):
    - `getTimeoutMinutes()`: lee parámetro de BD con cache (TTL 1min)
    - `generateTokenFor(afiliadoId, date)`: genera token para fecha específica
    - `attachTokensToCredenciales(credenciales)`: adjunta tokens a array de credenciales
    - Login devuelve `tokenTimeout` en respuesta JSON
  * **Mobile** (`mobile/src/services/tokenService.ts`):
    - `getTimeoutMinutes()`: lee de AsyncStorage (sincronizado desde backend en login)
    - `generateTokenSync()`: replica algoritmo backend para modo offline
    - `attachTokensToCredenciales()`: genera tokens localmente
    - `setTimeoutMinutes()`: guarda timeout en AsyncStorage
  * **Campos en credencial**:
    - `tokenTemporal`: string 3 dígitos (ej: "478", "026")
    - `tokenTemporalGeneradoEn`: ISO timestamp
    - `tokenTemporalVenceEn`: ISO timestamp (generadoEn + timeout)
  * **Countdown en tiempo real**:
    - `CredencialCard` usa `useEffect` con interval cada 1 segundo
    - Calcula diferencia entre `now` y `tokenTemporalVenceEn`
    - Formato: "M:SS" (minutos:segundos)
    - Badge ROJO (#EF4444) cuando expira, texto "EXPIRADO"
  * **Auto-refresh**:
    - `AuthContext` detecta expiración <10 segundos
    - Regenera tokens automáticamente (modo offline/online)
    - Actualiza state y guarda en cache
    - Log: "🔄 Token próximo a expirar, regenerando..."
  * **Sincronización timeout**:
    - Login online: backend envía `tokenTimeout` → mobile guarda en AsyncStorage
    - Login offline: usa timeout en cache, fallback a 10 minutos
    - Log: "⏱️  TimeoutTokenCredencial actualizado: X minutos"
- **Modal credencial**: Credencial táctil en home/carrusel (sin QR). Al tocar abre modal con credencial + QR en frame separado + opciones actualizar/compartir. QR tamaño 180px, fondo blanco, border. Frame QR con paddingBottom 32px para expansión del nombre.

- **Script de Sincronización Automática GAM → BD Local**:
  - Ubicación: `backend/scripts/sync-users-from-gam.js` + wrapper PowerShell `sync-users-from-gam.ps1`
  - Propósito: Preparar BD para migración masiva, sincronizando usuarios GAM a tablas locales
  - Flujo por usuario:
    1. Login GAM OAuth2 (contraseña prueba "123456")
    2. Obtener GUID desde `/oauth/userinfo`
    3. Actualizar `nuusuari.nuusuid` (legacy numérico → GAM GUID)
    4. Actualizar FKs: `nuusuauth.nuusuid`, `crcredus.nuusuid`
    5. Sincronizar credenciales SOAP → `crcreden`
  - Uso:
    * Simulación: `.\sync-users-from-gam.ps1 -DryRun`
    * Todos: `.\sync-users-from-gam.ps1`
    * Uno: `.\sync-users-from-gam.ps1 -Email user@test.com`
  - Endpoint backend: `POST /credencial/sync-manual` (solo localhost o con token)
  - Test suite: `.\test-sync-gam.ps1` (verifica backend, archivos, dry-run, endpoint)
  - Documentación: `backend/scripts/SYNC_GAM_USERS_README.md`
  - **Limitación**: Usa contraseña "123456" (testing); producción requiere token admin GAM o proceso asistido
  - **Output**: Stats con totales: actualizados, sin cambios, saltados (no en GAM), errores

- Admin Web de Parámetros:
  - Acceso: `http://localhost:3000/admin`
  - Login por defecto: `admin@test.local` / `admin123` (usuario admin persistido en BD)
  - Funcionalidades: CRUD completo, búsqueda en tiempo real, filtros por grupo, estadísticas
  - Autenticación: Bearer token con sesión validada en cada request
  - Cache: recarga automática después de modificaciones (PUT/POST/DELETE)
- Admin Web de Usuarios:
  - Acceso: `http://localhost:3000/admin/usuarios`
  - Login: cualquier email admin backend (`admin@test.local` / `admin123`)
  - Funcionalidades: CRUD usuarios, gestión de roles admin, estadísticas filtradas, activar/desactivar usuarios
  - Agregar admin: email + nombre + contraseña → crea en BD si no existe, agrega a lista admin
  - Admins persistidos en BD: `nuusuari` + `nuusuauth` + lista en `nusispar` (SEGURIDAD_APP.BackendAdminEmails)

Errores y notas frecuentes (descubiertos en este repositorio)
- Peer-dependency conflicts en `@react-navigation/*` (v6 vs v7). Solución rápida: instalar con `--legacy-peer-deps` o alinear todas las dependencias a la misma mayor versión.
- Metro/Expo escucha en `0.0.0.0:19000` y a veces propone cambiar a 19001 si está ocupado. AVD usa `10.0.2.2` para acceder al host.
- **CRÍTICO Pool PostgreSQL**: NUNCA usar `process.exit()` en `pool.on('error')` — solo loguear. El pool reconecta automáticamente.
- **Hashing de contraseñas**: Usar SIEMPRE `pbkdf2Sync` consistentemente en `hashPassword()` y `verifyPassword()`. NO mezclar con `scryptSync`.
- **Script restart-backend.ps1**: Usa `$PSScriptRoot` para ubicación automática del directorio backend. NO hardcodear rutas absolutas.
- **Error handlers Express**: Deben ir AL FINAL después de todas las rutas. Signature: `app.use((err, req, res, next) => {})`

Contribuciones de un agente AI (qué hacer y cómo entregar)
- Haz cambios pequeños, agrega tests cuando sea factible y provee un README corto si añades scripts nuevos.
- Referencia archivos de salida: si generas cambios que afectan `build/*`, documenta el script que los produce y no edites `build/*` a mano.
- PR: incluye pasos para reproducir localmente (comandos PowerShell/adb/expo) y muestras de payloads de API si tocas `api.ts` o auth.
- Gestión de Parámetros: usa la interfaz web `/admin` para modificaciones manuales, o endpoints `/admin/parametros` para automatización con scripts PowerShell (`test-admin-parametros.ps1`, `manage-parametros.ps1`)

Limitaciones operativas
- Un agente AI no puede cambiar la configuración de servicios externos (p.e. habilitar modelos GPT-5 a nivel de plataforma). Para eso el humano debe ajustar la configuración de la organización/servicio.

Feedback
- Si algo no está claro, indícame qué tarea concreta quieres que automatice (p.e. crear mock más completo, añadir tests unitarios para `api.ts`, o adaptar la app al endpoint real `/auth/login`).

Sistema de Parámetros
- Tabla `nusispar` (PK: nusisgrupa, nusistippa; valor: nusisvalpa text) — 115 parámetros activos
- Cache interno: Map() con TTL 1min, recarga automática 5min
- Interfaz web ABM: `http://localhost:3000/admin` (HTML/CSS/JS vanilla, login requerido)
- Scripts: `test-admin-parametros.ps1` (suite tests), `manage-parametros.ps1` (CLI interactivo)
- Endpoints admin: GET/PUT/POST/DELETE en `/admin/parametros/*` (Bearer token obligatorio)
- Middleware: `requireAuth(req, res, next)` valida sesión en sessions Map
- Uso: Gestionar configuración de vigencia de credenciales, mensajes, URLs, flags booleanos (S/N)

Sistema de Autenticación y Contraseñas
- Tabla `nuusuauth` (nuusuid PK/FK → nuusuari, nuusupass VARCHAR(256), nuusucrea TIMESTAMP, nuusuultm TIMESTAMP)
- Algoritmo: `crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512')` formato `salt:hash`
- Contraseña universal testing: `123456` (hash: `b14d7c6d5de07e9ccde32778d3ec576d:a63157dee33c815fed355fd5bc1b704712e8e0b52388d062637e510e4d4b7e68b2f00608af0453874a2d13b9d15e629603ee389f4feca9d4428269780b5cbd96`)
- Login app: `POST /auth/login` vía `userRepository.findForLogin()` (email → CUIL → DNI LIKE) en BD
- Login admin: `POST /admin/login` vía `userRepository.findForLogin()` + verificación lista admin en `nusispar`
- **Ya NO se usa** `registeredUsers` Map para login admin — todos autentican contra BD
- Registro: Automáticamente inserta en `nuusuauth` al crear usuario en `nuusuari`
- Seed admins: `seedBackendAdmins()` crea admin users en BD al iniciar si no existen (contraseña default: `admin123`)
- Usuarios de prueba:
  * `marianr@tekhne.com.ar` / `123456` (7 credenciales grupo familiar)
  * `diana76ar@gmail.com` / `123456` (2 credenciales)
  * `20120282388` / `123456` (DNI lookup)
- Usuarios admin por defecto:
  * `admin@test.local` / `admin123` (admin backend, creado por seed)
  * `admin@osep.gob.ar` / `admin123` (admin backend, creado por seed)

Sistema de Modo Offline (Mobile)
- **Arquitectura**: Login dual offline/online con cache persistente en AsyncStorage
- **Estado**: ✅ FUNCIONANDO COMPLETAMENTE (Diciembre 2025)
- **Funcionalidades Offline** (sin conexión):
  * ✅ Login con credenciales guardadas (email, DNI, CUIL - matching exacto por clave)
  * ✅ Ver credenciales del grupo familiar (cache local)
  * ✅ Mostrar QR de credenciales
  * ✅ Ver datos de perfil del usuario
  * ✅ Compartir credencial (imagen PNG)
  * ✅ Navegación entre pantallas
  * ✅ Token offline automático (generado localmente si no existe)
- **Funcionalidades Online** (requieren conexión):
  * ❌ Primer login (sin cache previo)
  * ❌ Registro de nuevos usuarios
  * ❌ Sincronización de credenciales actualizadas
  * ❌ Actualización de datos del backend
  * ❌ Trámites nuevos
  * ❌ Notificaciones en tiempo real
- **Componentes**:
  * `mobile/src/hooks/useNetworkStatus.ts` — Detecta estado conexión con @react-native-community/netinfo@9.3.7
  * `mobile/src/services/storageManager.ts` — Cache AsyncStorage con funciones: saveUser(), getUser(), saveCredenciales(), getCredenciales(), saveUserCredentials(), verifyUserCredentials()
  * `mobile/src/services/api.ts` — NetworkError y TimeoutError para detección errores de red, función isNetworkError()
  * `mobile/src/contexts/AuthContext.tsx` — Login dual 3 pasos: 1) Validación offline SHA256, 2) Login offline (user+creds en cache, genera token offline), 3) Login online si no hay cache. Campo isOfflineMode.
  * `mobile/src/components/OfflineBanner.tsx` — Banner naranja superior con botón sync manual, aparece cuando isOfflineMode=true o sin conexión
- **Flujo Login Offline (3 PASOS)**:
  1. **Validación offline**: verifyUserCredentials() con SHA256 hash (clave exacta: email, DNI o CUIL)
  2. **Login offline**: Si válido + cache existe (user + credenciales):
     - Carga user, credenciales desde AsyncStorage
     - Genera token offline si no existe: `offline_${timestamp}_${random}`
     - setIsOfflineMode(true)
     - setTimeout 500ms: Intenta sync background sin bloquear UI
     - return (login offline exitoso)
  3. **Login online**: Si no hay cache válido:
     - apiPost('/auth/login') → guarda todo en cache
     - saveUserCredentials() con múltiples claves (email + username + CUIL)
     - setIsOfflineMode(false)
- **Guardado Múltiple**: Al login online, guarda contraseña hasheada con 3 claves:
  * Email (clave principal): `marianr@tekhne.com.ar`
  * Username ingresado: `20288787655` (DNI)
  * CUIL (si existe): `20288787655`
- **Validación exacta**: verifyUserCredentials() busca SOLO por clave exacta (toLowerCase). Sin matching por substring para evitar que las credenciales de un usuario sean usadas para cargar datos de otro usuario en el mismo dispositivo.
- **Logout limpia sesión**: signOut() llama StorageManager.clearAll() que elimina `cached_user`, `cached_credenciales` y `last_sync`. Preserva SOLO `USER_CREDENTIALS` (hashes de contraseñas) para permitir futura validación offline del mismo usuario cuando vuelva a iniciar sesión. **Seguridad**: ningún dato del usuario anterior queda accesible para otros usuarios en el dispositivo.
- **Token Offline**: Si no existe token en cache, genera uno temporal localmente para sesiones offline. No intenta login online si ya tiene user+credenciales.
- **Dependencias**: @react-native-community/netinfo@9.3.7, crypto-js@^4.2.0
- **Instalación**: `cd mobile; npm install --legacy-peer-deps`
- **Logs Clave**:
  ```
  LOG  🔐 Validación offline: EXITOSA
  LOG  📂 Cache user: Sí ✅
  LOG  📂 Cache creds: 7 ✅
  LOG  🔑 Token offline generado
  LOG  🟠 Modo OFFLINE activado
  LOG  🔐 ========== LOGIN OFFLINE COMPLETADO ==========
  ```

*** Fin ***
- Registro: Automáticamente inserta en `nuusuauth` al crear usuario en `nuusuari`
- Usuarios de prueba:
  * `marianr@tekhne.com.ar` / `123456` (7 credenciales grupo familiar)
  * `diana76ar@gmail.com` / `123456` (2 credenciales)
  * `20120282388` / `123456` (DNI lookup)
- Usuarios admin por defecto:
  * `admin@test.local` / `admin123` (admin backend, creado por seed)
  * `admin@osep.gob.ar` / `admin123` (admin backend, creado por seed)

Sistema de Autorizaciones (Con/Sin Prescripción)
- **Backend**: `POST /sia/crear-solicitud` — Endpoint unificado para crear autorizaciones
- **Tipos de Autorización**:
  * **Tipo "P" (Con Prescripción)**:
    - Incluye fotos adjuntas (hasta 2)
    - `AUSolPresCant` fijo en 1
    - Requiere prestacionId del combo REC_PRESTACIONES_APP
    - Requiere cobertura (id ENROLAMIENTOS)
  * **Tipo "S" (Sin Prescripción)**:
    - SIN fotos
    - `AUSolPresCant` editable por usuario
    - Requiere prestacionId del combo REC_PRESTACIONES_APP
    - Requiere cobertura (id ENROLAMIENTOS)
- **Campos SIA comunes**:
  * `AUSolTipo`: "P" o "S"
  * `AUSolPresTipo`: "A" (fijo - PRESTACIONES MEDICAS)
  * `AUSolPresId`: código de prestación desde REC_PRESTACIONES_APP (campo `Id` del SOAP)
  * `AUSolGravCodigo`: id de cobertura desde ENROLAMIENTOS (numérico)
  * `AUSolRefAfiliado`: referencia/descripción de la solicitud
  * `AUSolObsPref`: profesional preferente (opcional)
- **Campos específicos tipo "P"**:
  * `Foto[]`: Array de fotos con estructura {AUSoFId, AUSoFIdExt, AUSoFFileName, AUSoFFotoBase64}
- **Servicio SOAP REC_PRESTACIONES_APP**:
  * Endpoint: `POST /sia/prestaciones`
  * Sin parámetros (enviar string vacío `''`)
  * **Respuesta SOAP**: `<Resultado>[{"Id":"...", "Descripcion":"..."}]</Resultado>`
  * **Parsing crítico**: El campo `Resultado` es un STRING JSON, NO un objeto
  * **Mapeo frontend**: `Id` → `AULPresID`, `Descripcion` → `AULPresDescripcion` (con trim)
  * Ejemplo prestaciones: CONSULTA MEDICA, CONSULTA OFTALMOLOGICA, ELECTROCARDIOGRAMA, etc.
- **Frontend Mobile** (`SolicitudAutorizacionScreen.tsx`):
  * Selector de tipo: 2 botones táctiles grandes (Con/Sin Prescripción)
  * **Picker desplegable** para prestaciones (ahorra espacio vs botones)
  * Paquete: `@react-native-picker/picker` v2.4.8
  * Componente: `<Picker selectedValue={...} onValueChange={...}>`
  * Carga automática de prestaciones al seleccionar tipo "S"
  * Campo cantidad editable (solo tipo "S")
  * Sección fotos condicional (solo tipo "P")
- **Validación**:
  * Afiliado requerido (ambos tipos)
  * Cobertura requerida (ambos tipos)
  * Prestación requerida (ambos tipos)
  * Referencia requerida (ambos tipos)
  * Tipo "S" no permite fotos (validación backend y frontend)
- **Payload final a SIA**:
  ```json
  {
    "Mode": "INS",
    "AUSolTipo": "S",
    "AUSolPresTipo": "A",
    "AUSolPresId": "14201010101",
    "AUSolGravCodigo": 101,
    "AUSolPresCant": 2,
    "AUSolUsuAfiliadoId": "...",
    "AUSolNroAfiliado": "...",
    "AUSolFecha": "2025-12-22",
    "AUSolRefAfiliado": "...",
    "AUSolObsPref": "..."
  }
  ```
- **Tests**:
  * `backend/test-solicitud-sin-prescripcion.ps1` — Test completo tipo P vs S
  * `backend/test-prest.ps1` — Test rápido REC_PRESTACIONES_APP
- **Parámetro habilitación**: `FUNCIONES_APP.HabilitarAutorizSinOrden` (S/N) en `nusispar`
- **Documentación**: `backend/SIA_SERVICES.md` — Comparación tipo P vs S, payloads, ejemplos

