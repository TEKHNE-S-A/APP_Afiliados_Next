/**
 * swaggerConfig.js — Configuración OpenAPI 3.0 para APP Afiliados Backend
 * Accesible en: GET /api-docs
 */

const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'APP Afiliados — API Backend',
      version: '0.2.0',
      description: [
        'API REST del backend de la aplicación de afiliados OSEP.',
        '',
        '**Autenticación:** La mayoría de los endpoints requieren un Bearer token obtenido en `POST /auth/login` o `POST /gam/login`.',
        '',
        '**Servicios externos:**',
        '- SOAP Beneficiarios (WSBENEFTK): `https://test17.osep.gob.ar`',
        '- SOAP SIA (WSSIATK): `http://tkqa.tekhne.com.ar:8700`',
        '- GAM OAuth2: `https://test17.osep.gob.ar/APP_OSEP_TEST`',
      ].join('\n'),
      contact: {
        name: 'OSEP — Obra Social de Empleados Públicos',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor local de desarrollo',
      },
      {
        url: 'https://test17.osep.gob.ar',
        description: 'Servidor de pruebas (producción)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token obtenido en POST /auth/login o POST /gam/login',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'UNAUTHORIZED' },
            message: { type: 'string', example: 'Token inválido o expirado' },
          },
        },
        Usuario: {
          type: 'object',
          properties: {
            nuusuid: { type: 'string', example: 'ca87f1be-ac8c-46b8-9652-7cc2e6e58eda' },
            nuusuemai: { type: 'string', example: 'usuario@ejemplo.com' },
            nuusuapell: { type: 'string', example: 'García, Juan' },
            nuusuafili: { type: 'string', example: '000000029000000000000000000001' },
            nuusuestit: { type: 'string', enum: ['S', 'N'], example: 'S' },
            nuplaid: { type: 'string', example: '001' },
          },
        },
        Credencial: {
          type: 'object',
          properties: {
            crcreapeno: { type: 'string', example: 'García, Ana' },
            crcreparen: { type: 'string', example: 'TITULAR' },
            crcrefecvi: { type: 'string', format: 'date', example: '2026-03-29' },
            crcreid: { type: 'string', example: '000000029000000000000000000001' },
            tokenTemporal: { type: 'string', example: '478' },
            tokenTemporalVenceEn: { type: 'string', format: 'date-time' },
          },
        },
        Autorizacion: {
          type: 'object',
          properties: {
            ausolicid: { type: 'string', format: 'uuid' },
            descripcion: { type: 'string', example: 'Consulta médica oftalmológica' },
            estado: {
              type: 'string',
              enum: ['PEN', 'APR', 'AUT', 'ENV', 'REC', 'ERR', 'CON'],
              example: 'PEN',
            },
            tipo: { type: 'string', enum: ['P', 'S'], example: 'S' },
            fecha_alta: { type: 'string', format: 'date', example: '2026-03-19' },
            profesional: { type: 'string', example: 'Dr. Martínez' },
            autorizacion_numero: { type: 'string', example: '00123-000000000456' },
          },
        },
        Parametro: {
          type: 'object',
          properties: {
            nusisgrupa: { type: 'string', example: 'GENERALES' },
            nusistippa: { type: 'string', example: 'VigenciaCred' },
            nusisvalpa: { type: 'string', example: '10' },
          },
        },
        PrestadorCartilla: {
          type: 'object',
          properties: {
            caentid: { type: 'string', example: '000001' },
            caentnomb: { type: 'string', example: 'Hospital Central' },
            caentespe: { type: 'string', example: 'CLÍNICA MÉDICA' },
            calle: { type: 'string', example: 'Av. España 2345' },
            localidad: { type: 'string', example: 'Mendoza' },
            lat: { type: 'number', example: -32.8908 },
            lng: { type: 'number', example: -68.8272 },
          },
        },
        InfoUtil: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            titulo: { type: 'string', example: '¿Cómo obtener mi credencial?' },
            contenido: { type: 'string' },
            categoria: { type: 'string', example: 'faq' },
            orden: { type: 'integer', example: 1 },
            activo: { type: 'boolean', example: true },
          },
        },
        Notificacion: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            titulo: { type: 'string', example: 'Nueva autorización' },
            mensaje: { type: 'string' },
            categoria: {
              type: 'string',
              enum: ['credencial', 'autorizaciones', 'noticias', 'sistema'],
            },
            leida: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        FeatureFlag: {
          type: 'object',
          properties: {
            nombre: { type: 'string', example: 'HabilitarAutorizSinOrden' },
            modulo: { type: 'string', example: 'FUNCIONES_APP' },
            activo: { type: 'boolean', example: true },
            descripcion: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Autenticación y sesiones de afiliados' },
      { name: 'GAM', description: 'Autenticación OAuth2 via GeneXus Access Manager' },
      { name: 'Credenciales', description: 'Credenciales digitales del grupo familiar' },
      { name: 'Autorizaciones SIA', description: 'Solicitudes de autorización médica (Sistema Integral de Autorizaciones)' },
      { name: 'Cartilla', description: 'Prestadores médicos, farmacias y delegaciones' },
      { name: 'Favoritos', description: 'Prestadores favoritos y recientes del afiliado' },
      { name: 'Notificaciones', description: 'Notificaciones in-app y push del afiliado' },
      { name: 'Info Útil', description: 'Contenido informativo y FAQ dinámico' },
      { name: 'Feature Flags', description: 'Flags de activación/desactivación de funciones' },
      { name: 'Admin — Parámetros', description: 'ABM de parámetros de configuración (requiere auth admin)' },
      { name: 'Admin — Usuarios', description: 'Gestión de usuarios (requiere auth admin)' },
      { name: 'Admin — Notificaciones', description: 'Broadcast institucional (requiere auth admin)' },
      { name: 'Admin — Auditoría', description: 'Logs de acciones administrativas (requiere auth admin)' },
      { name: 'Health', description: 'Estado y salud del servidor' },
      { name: 'Registro', description: 'Registro de nuevos afiliados' },
    ],
  },
  apis: [__filename], // Las rutas están documentadas inline en este archivo
}

// ============================================================================
// DOCUMENTACIÓN INLINE DE ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Estado de salud del servidor
 *     description: Devuelve estado de las dependencias (PostgreSQL, SOAP Beneficiarios, SOAP SIA, GAM) y métricas básicas.
 *     responses:
 *       200:
 *         description: Servidor activo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 version: { type: string, example: '0.2.0' }
 *                 uptime: { type: number, example: 3600 }
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     postgres: { type: string, enum: [ok, error] }
 *                     soapBeneficiarios: { type: string, enum: [ok, error, unknown] }
 *                     soapSIA: { type: string, enum: [ok, error, unknown] }
 *                     gam: { type: string, enum: [ok, error, unknown] }
 */

/**
 * @swagger
 * /register:
 *   post:
 *     tags: [Registro]
 *     summary: Registrar nuevo afiliado
 *     description: >
 *       Valida datos del afiliado contra SOAP REGISTRACION, registra en GAM si está habilitado,
 *       y guarda en la base de datos local. Devuelve token de sesión.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nroAfiliado, fechaNacimiento, email, password]
 *             properties:
 *               nroAfiliado: { type: string, example: '29000000' }
 *               fechaNacimiento: { type: string, format: date, example: '1985-06-15' }
 *               email: { type: string, format: email, example: 'usuario@ejemplo.com' }
 *               password: { type: string, format: password, example: '123456' }
 *               cuil: { type: string, example: '20290000001' }
 *     responses:
 *       200:
 *         description: Registro exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 token: { type: string }
 *                 user:
 *                   $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Datos inválidos o afiliado no encontrado en SOAP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: El afiliado ya está registrado
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login de afiliado
 *     description: >
 *       Autentica al afiliado (email, DNI o CUIL). Sincroniza credenciales del grupo familiar
 *       desde SOAP al login. Devuelve token de sesión, datos del usuario y credenciales.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 description: Email, CUIL o DNI del afiliado
 *                 example: 'marianr@tekhne.com.ar'
 *               password:
 *                 type: string
 *                 format: password
 *                 example: '123456'
 *               deviceId: { type: string, example: 'device-abc123' }
 *               platform: { type: string, enum: [ios, android, web], example: android }
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 refresh_token: { type: string }
 *                 user:
 *                   $ref: '#/components/schemas/Usuario'
 *                 credenciales:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Credencial'
 *                 tokenTimeout: { type: integer, example: 10, description: 'Minutos de vigencia del token temporal de credencial' }
 *       401:
 *         description: Credenciales incorrectas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Perfil del afiliado autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario actual
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Usuario'
 *                 - type: object
 *                   properties:
 *                     session:
 *                       type: object
 *                       properties:
 *                         sessionId: { type: string }
 *                         deviceId: { type: string }
 *                         platform: { type: string }
 *                         lastActivityAt: { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar sesión
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 */

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Renovar access token
 *     description: Obtiene un nuevo access token usando el refresh token. No requiere relogin.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token: { type: string }
 *     responses:
 *       200:
 *         description: Token renovado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 refresh_token: { type: string }
 *       401:
 *         description: Refresh token inválido o expirado
 */

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     tags: [Auth]
 *     summary: Listar sesiones activas del usuario
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de sesiones activas por dispositivo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sessionId: { type: string }
 *                       deviceId: { type: string }
 *                       platform: { type: string }
 *                       appVersion: { type: string }
 *                       ip: { type: string }
 *                       lastActivityAt: { type: string, format: date-time }
 */

/**
 * @swagger
 * /auth/sessions/{id}:
 *   delete:
 *     tags: [Auth]
 *     summary: Revocar una sesión específica
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: sessionId a revocar
 *     responses:
 *       200:
 *         description: Sesión revocada
 *       404:
 *         description: Sesión no encontrada
 */

/**
 * @swagger
 * /auth/sessions/revoke-others:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar todas las sesiones excepto la actual
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Otras sesiones revocadas
 */

/**
 * @swagger
 * /credencial:
 *   get:
 *     tags: [Credenciales]
 *     summary: Obtener credenciales del grupo familiar
 *     description: >
 *       Devuelve las credenciales digitales del afiliado y su grupo familiar.
 *       Cada credencial incluye un token temporal de 3 dígitos para el QR.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de credenciales del grupo familiar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 credenciales:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Credencial'
 *                 tokenTimeout:
 *                   type: integer
 *                   example: 10
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /credencial/token-valido:
 *   get:
 *     tags: [Credenciales]
 *     summary: Validar token temporal de credencial
 *     description: >
 *       Valida un token temporal de 3 dígitos para una credencial.
 *       Replica el algoritmo SHA256 por bucket de tiempo y compara contra
 *       bucket actual y bucket anterior (tolerancia de ventana).
 *     parameters:
 *       - in: query
 *         name: afiliadoId
 *         required: true
 *         schema:
 *           type: string
 *         description: AfiliadoId de la credencial a validar
 *         example: '000082018000000000000000000001'
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9]{3}$'
 *         description: Token temporal de 3 dígitos
 *         example: '478'
 *     responses:
 *       200:
 *         description: Resultado de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valido:
 *                   type: boolean
 *                   example: true
 *                 expiraEn:
 *                   type: string
 *                   format: date-time
 *                   example: '2026-03-20T18:36:00.000Z'
 *                 segundosRestantes:
 *                   type: integer
 *                   example: 179
 *                 timeoutMinutos:
 *                   type: integer
 *                   example: 10
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /credencial/constancia.pdf:
 *   get:
 *     tags: [Credenciales]
 *     summary: Descargar constancia de credencial en PDF
 *     description: >
 *       Genera un PDF descargable con los datos de la credencial del afiliado.
 *       Si se envía `afiliadoId` en query, usa esa credencial; de lo contrario,
 *       prioriza la credencial titular.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: afiliadoId
 *         required: false
 *         schema:
 *           type: string
 *         description: AfiliadoId específico para generar la constancia
 *     responses:
 *       200:
 *         description: PDF generado correctamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /credencial/sync-manual:
 *   post:
 *     tags: [Credenciales]
 *     summary: Forzar sincronización de credenciales desde SOAP
 *     description: Re-sincroniza el grupo familiar desde el servicio SOAP APPDATOSCREDENCIALES.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sincronización completada
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /mis-autorizaciones:
 *   get:
 *     tags: [Autorizaciones SIA]
 *     summary: Listar mis solicitudes de autorización
 *     description: >
 *       Devuelve las solicitudes de autorización del afiliado autenticado.
 *       Sincroniza en background con el SOAP SIA (REC_SOLICITUDES_APP).
 *
 *       **Estados posibles:**
 *       - `PEN` — Pendiente
 *       - `APR` — Aprobada
 *       - `AUT` — Autorizada
 *       - `ENV` — Enviada
 *       - `REC` — Rechazada por SIA
 *       - `ERR` — Error de conexión al enviar
 *       - `CON` — Consumida
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de autorizaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 autorizaciones:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Autorizacion'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /sia/crear-solicitud:
 *   post:
 *     tags: [Autorizaciones SIA]
 *     summary: Crear solicitud de autorización
 *     description: >
 *       Crea una nueva solicitud de autorización médica. Inserta en BD local con estado `PEN`,
 *       luego envía al SOAP SIA (REC_SOLICITUDES_APP).
 *
 *       - **Tipo P** (con prescripción): admite fotos adjuntas en base64, hasta 5 según parámetro.
 *       - **Tipo S** (sin prescripción): sin fotos, cantidad editable.
 *
 *       Si el envío SOAP falla por conexión, el registro queda en estado `ERR`
 *       y la app permite reintentar. Si SIA rechaza, queda en `REC` (sin opción de reintento).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [AUSolTipo, AUSolPresId, AUSolGravCodigo, AUSolRefAfiliado, AfiliadoId]
 *             properties:
 *               AUSolTipo: { type: string, enum: [P, S], example: S }
 *               AUSolPresId: { type: string, example: '14201010101', description: 'ID de prestación desde REC_PRESTACIONES_APP' }
 *               AUSolGravCodigo: { type: integer, example: 101, description: 'Código de cobertura desde ENROLAMIENTOS' }
 *               AUSolRefAfiliado: { type: string, example: 'Consulta de control', maxLength: 40 }
 *               AfiliadoId: { type: string, example: '000000029000000000000000000001' }
 *               AUSolPresCant: { type: integer, example: 1, description: 'Cantidad (solo tipo S)' }
 *               AUSolObsPref: { type: string, example: 'Dr. Martínez', description: 'Profesional preferente (opcional)' }
 *               fotosBase64:
 *                 type: array
 *                 description: Solo para tipo P. Máximo configurable de 1 a 5 fotos.
 *                 minItems: 1
 *                 maxItems: 5
 *                 items:
 *                   type: string
 *                   format: byte
 *     responses:
 *       200:
 *         description: Solicitud creada y enviada a SIA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 siaSent: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     solicitudId: { type: string, format: uuid }
 *                     estado: { type: string, example: PENDIENTE }
 *       502:
 *         description: Error al conectar con SIA (solicitud guardada en estado ERR localmente)
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /sia/prestaciones:
 *   post:
 *     tags: [Autorizaciones SIA]
 *     summary: Obtener listado de prestaciones disponibles
 *     description: Llama a SOAP SIA (REC_PRESTACIONES_APP). No requiere parámetros.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de prestaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prestaciones:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       AULPresID: { type: string, example: '14201010101' }
 *                       AULPresDescripcion: { type: string, example: 'CONSULTA MÉDICA' }
 */

/**
 * @swagger
 * /api/cartilla:
 *   get:
 *     tags: [Cartilla]
 *     summary: Buscar prestadores en la cartilla
 *     description: Búsqueda de prestadores médicos, farmacias y delegaciones con filtros y paginación.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Texto de búsqueda (nombre o especialidad)
 *         example: medico
 *       - in: query
 *         name: tipo
 *         schema: { type: string, enum: [medico, farmacia, delegacion] }
 *       - in: query
 *         name: especialidad
 *         schema: { type: string }
 *       - in: query
 *         name: localidad
 *         schema: { type: string }
 *       - in: query
 *         name: lat
 *         schema: { type: number }
 *         description: Latitud para búsqueda por proximidad
 *       - in: query
 *         name: lng
 *         schema: { type: number }
 *       - in: query
 *         name: radio
 *         schema: { type: number, default: 5 }
 *         description: Radio de búsqueda en km
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Resultados de la búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer }
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PrestadorCartilla'
 */

/**
 * @swagger
 * /api/me/favoritos:
 *   get:
 *     tags: [Favoritos]
 *     summary: Obtener prestadores favoritos del afiliado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de favoritos con nombre y dirección del prestador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 favoritos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       caentid: { type: string }
 *                       nombre: { type: string }
 *                       direccion: { type: string }
 *                       tipo: { type: string }
 *   post:
 *     tags: [Favoritos]
 *     summary: Agregar prestador a favoritos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [caentid, tipo]
 *             properties:
 *               caentid: { type: string, example: '000001' }
 *               tipo: { type: string, enum: [medico, farmacia, delegacion] }
 *     responses:
 *       200:
 *         description: Favorito agregado
 */

/**
 * @swagger
 * /api/me/favoritos/{caentid}:
 *   delete:
 *     tags: [Favoritos]
 *     summary: Eliminar prestador de favoritos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: caentid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Favorito eliminado
 */

/**
 * @swagger
 * /api/me/recientes:
 *   get:
 *     tags: [Favoritos]
 *     summary: Obtener prestadores consultados recientemente
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de recientes con nombre y dirección
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Listar notificaciones del afiliado
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoria
 *         schema: { type: string, enum: [credencial, autorizaciones, noticias, sistema] }
 *       - in: query
 *         name: leida
 *         schema: { type: boolean }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista de notificaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notificaciones:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notificacion'
 *                 totalNoLeidas: { type: integer }
 */

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notificaciones]
 *     summary: Marcar notificación como leída
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Notificación marcada como leída
 */

/**
 * @swagger
 * /api/me/notification-preferences:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Obtener preferencias de notificación del afiliado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferencias por categoría
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 preferences:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoria: { type: string }
 *                       push: { type: boolean }
 *                       in_app: { type: boolean }
 *   put:
 *     tags: [Notificaciones]
 *     summary: Actualizar preferencias de notificación
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferences:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     categoria: { type: string, enum: [credencial, autorizaciones, noticias, sistema] }
 *                     push: { type: boolean }
 *                     in_app: { type: boolean }
 *     responses:
 *       200:
 *         description: Preferencias actualizadas
 */

/**
 * @swagger
 * /api/info-util:
 *   get:
 *     tags: [Info Útil]
 *     summary: Listar contenido de info útil y FAQ
 *     parameters:
 *       - in: query
 *         name: categoria
 *         schema: { type: string, example: faq }
 *         description: Filtrar por categoría (faq, credencial, cartilla, autorizaciones, contacto)
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Búsqueda por texto
 *     responses:
 *       200:
 *         description: Ítems de info útil
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/InfoUtil'
 */

/**
 * @swagger
 * /feature-flags:
 *   get:
 *     tags: [Feature Flags]
 *     summary: Obtener todos los feature flags activos
 *     description: Devuelve los flags de habilitación de funciones configurados en `nusispar` (grupo FUNCIONES_APP).
 *     responses:
 *       200:
 *         description: Lista de feature flags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 flags:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FeatureFlag'
 */

/**
 * @swagger
 * /feature-flags/{nombre}:
 *   get:
 *     tags: [Feature Flags]
 *     summary: Obtener un feature flag por nombre
 *     parameters:
 *       - in: path
 *         name: nombre
 *         required: true
 *         schema: { type: string }
 *         example: HabilitarAutorizSinOrden
 *     responses:
 *       200:
 *         description: Estado del flag
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeatureFlag'
 *       404:
 *         description: Flag no encontrado
 */

/**
 * @swagger
 * /admin/parametros:
 *   get:
 *     tags: [Admin — Parámetros]
 *     summary: Listar todos los parámetros de configuración
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: grupo
 *         schema: { type: string }
 *         description: Filtrar por grupo (ej. GENERALES, FUNCIONES_APP)
 *     responses:
 *       200:
 *         description: Lista de parámetros
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Parametro'
 *   post:
 *     tags: [Admin — Parámetros]
 *     summary: Crear nuevo parámetro
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Parametro'
 *     responses:
 *       201:
 *         description: Parámetro creado
 */

/**
 * @swagger
 * /admin/parametros/{grupo}/{tipo}:
 *   put:
 *     tags: [Admin — Parámetros]
 *     summary: Actualizar valor de un parámetro
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grupo
 *         required: true
 *         schema: { type: string }
 *         example: GENERALES
 *       - in: path
 *         name: tipo
 *         required: true
 *         schema: { type: string }
 *         example: VigenciaCred
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [valor]
 *             properties:
 *               valor: { type: string, example: '15' }
 *     responses:
 *       200:
 *         description: Parámetro actualizado y caché recargado
 *   delete:
 *     tags: [Admin — Parámetros]
 *     summary: Eliminar un parámetro
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grupo
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: tipo
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Parámetro eliminado
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin — Usuarios]
 *     summary: Listar usuarios de la app (paginado)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Búsqueda por email, nombre o CUIL
 *       - in: query
 *         name: estado
 *         schema: { type: string, enum: [activo, inactivo] }
 *       - in: query
 *         name: tipo
 *         schema: { type: string, enum: [gam, local] }
 *     responses:
 *       200:
 *         description: Lista paginada de usuarios
 */

/**
 * @swagger
 * /admin/stats/users:
 *   get:
 *     tags: [Admin — Usuarios]
 *     summary: Estadísticas de usuarios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas filtradas (total, activos, inactivos, GAM, local, admin)
 */

/**
 * @swagger
 * /admin/notifications/broadcast:
 *   post:
 *     tags: [Admin — Notificaciones]
 *     summary: Enviar notificación institucional a todos los usuarios activos
 *     description: >
 *       Envía un mensaje broadcast a todos los usuarios activos respetando sus preferencias
 *       (nu_notif_prefs). Registra in-app y envía push Expo si corresponde.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, mensaje, categoria]
 *             properties:
 *               titulo: { type: string, maxLength: 80, example: 'Actualización del sistema' }
 *               mensaje: { type: string, maxLength: 1000, example: 'El sistema estará en mantenimiento...' }
 *               categoria: { type: string, enum: [noticias, sistema] }
 *               segmento: { type: string, enum: [todos], default: todos }
 *     responses:
 *       200:
 *         description: Broadcast enviado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 usuarios: { type: integer }
 *                 push_enviados: { type: integer }
 *                 in_app_creadas: { type: integer }
 *                 omitidos_pref: { type: integer }
 *                 errores: { type: integer }
 */

/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     tags: [Admin — Auditoría]
 *     summary: Consultar logs de auditoría
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entity
 *         schema: { type: string }
 *         example: parametro
 *         description: Filtrar por entidad (parametro, usuario, info_util, cartilla)
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *         example: UPDATE
 *       - in: query
 *         name: actor
 *         schema: { type: string }
 *         example: admin@test.local
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Logs de auditoría filtrados
 */

/**
 * @swagger
 * /gam/login:
 *   post:
 *     tags: [GAM]
 *     summary: Login OAuth2 via GAM
 *     description: Autentica al afiliado contra GeneXus Access Manager. Devuelve access_token GAM.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: 'usuario@ejemplo.com' }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login GAM exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token: { type: string }
 *                 token_type: { type: string, example: Bearer }
 *                 credenciales:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Credencial'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /gam/userinfo:
 *   get:
 *     tags: [GAM]
 *     summary: Información del usuario GAM autenticado
 *     description: Devuelve datos del perfil GAM incluyendo el GUID del usuario.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario GAM
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 GUID: { type: string, format: uuid, example: 'ca87f1be-ac8c-46b8-9652-7cc2e6e58eda' }
 *                 email: { type: string }
 *                 name: { type: string }
 */

const swaggerSpec = swaggerJsdoc(options)

module.exports = swaggerSpec
