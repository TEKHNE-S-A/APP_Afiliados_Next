/**
 * Feature Flags Service
 * 
 * Gestiona flags de características desde la tabla nusispar
 * Patrón: grupo = FUNCIONES_APP, tipo = nombre del flag
 * Valor: S (habilitado) / N (deshabilitado)
 * 
 * Reutiliza caché y funciones del sistema de parámetros
 */

// Flag definitions con metadata
const FLAG_DEFINITIONS = {
  // Cartilla y administración
  HabilitarCartilla: {
    descripcion: 'Habilitar acceso a cartilla de prestadores',
    default: 'S',
    modulo: 'cartilla',
    impacto: 'Alto afiliado',
  },
  HabilitarInfoUtil: {
    descripcion: 'Habilitar acceso a información útil',
    default: 'S',
    modulo: 'info_util',
    impacto: 'Medio - documentación',
  },

  // Autorizaciones
  HabilitarAutorizSinOrden: {
    descripcion: 'Habilitar solicitud de autorizaciones SIN prescripción (tipo S)',
    default: 'S',
    modulo: 'sia',
    impacto: 'Alto - autorización',
  },
  HabilitarAutorizConOden: {
    descripcion: 'Habilitar solicitud de autorizaciones CON prescripción (tipo P)',
    default: 'S',
    modulo: 'sia',
    impacto: 'Alto - autorización',
  },

  // Historial
  HabilitarHistorialAtencion: {
    descripcion: 'Habilitar pantalla de Historial de Atención / Consumo',
    default: 'S',
    modulo: 'historial',
    impacto: 'Medio - consulta',
  },

  // Notificaciones
  HabilitarNotificaciones: {
    descripcion: 'Habilitar sistema de notificaciones push',
    default: 'N',
    modulo: 'notificaciones',
    impacto: 'Alto - comunicación',
  },
  HabilitarNotificacionesCola: {
    descripcion: 'Habilitar cola offline de notificaciones',
    default: 'N',
    modulo: 'notificaciones',
    impacto: 'Medio - offline',
  },

  // Modo offline
  HabilitarModoOffline: {
    descripcion: 'Habilitar modo offline completo',
    default: 'S',
    modulo: 'offline',
    impacto: 'Alto - estabilidad',
  },

  // UI y experiencia
  HabilitarModoBetaUI: {
    descripcion: 'Habilitar interfaz experimental / beta features',
    default: 'N',
    modulo: 'ui',
    impacto: 'Bajo - UI experimental',
  },
  HabilitarTemaOscuro: {
    descripcion: 'Habilitar opción de tema oscuro',
    default: 'S',
    modulo: 'ui',
    impacto: 'Bajo - preferencia',
  },

  // Trámites y cola
  HabilitarTramites: {
    descripcion: 'Habilitar pantalla de Trámites',
    default: 'N',
    modulo: 'tramites',
    impacto: 'Medio - funcionalidad futura',
  },
  HabilitarColaOffline: {
    descripcion: 'Habilitar cola de acciones offline para sync',
    default: 'N',
    modulo: 'offline',
    impacto: 'Alto - arquitectura futura',
  },

  // Operación
  HabilitarDiagnosticoAdmin: {
    descripcion: 'Habilitar panel de diagnóstico para admins',
    default: 'S',
    modulo: 'admin',
    impacto: 'Bajo - operación',
  },
}

/**
 * Obtener todos los feature flags en formato amigable
 * Retorna array con estado actual y metadata
 * 
 * @param {Function} getParametro - función helper del backend (getParametro)
 * @returns {Promise<Array>} Array de flags con estado y metadata
 */
async function obtenerTodosLosFlags(getParametro) {
  const flags = []

  for (const [nombre, definicion] of Object.entries(FLAG_DEFINITIONS)) {
    const valor = await getParametro('FUNCIONES_APP', nombre, definicion.default)
    const habilitado = valor === 'S'

    flags.push({
      nombre,
      habilitado,
      valor,
      ...definicion,
    })
  }

  return flags
}

/**
 * Obtener un flag específico
 * 
 * @param {string} nombre - nombre del flag
 * @param {Function} getParametroBoolean - función helper del backend
 * @returns {Promise<boolean>} true si habilitado, false si no
 */
async function obtenerFlag(nombre, getParametroBoolean) {
  if (!FLAG_DEFINITIONS[nombre]) {
    console.warn(`⚠️  Flag desconocido: ${nombre}`)
    return false
  }

  const definicion = FLAG_DEFINITIONS[nombre]
  return await getParametroBoolean('FUNCIONES_APP', nombre, definicion.default === 'S')
}

/**
 * Obtener flags por módulo
 * 
 * @param {string} modulo - módulo a filtrar
 * @param {Function} getParametro - función helper del backend
 * @returns {Promise<Array>} Flags del módulo especificado
 */
async function obtenerFlagsPorModulo(modulo, getParametro) {
  const flags = await obtenerTodosLosFlags(getParametro)
  return flags.filter((f) => f.modulo === modulo)
}

/**
 * Obtener flags activos para un módulo
 * Útil para lógica condicional
 * 
 * @param {string} modulo - módulo a filtrar
 * @param {Function} getParametro - función helper del backend
 * @returns {Promise<Object>} { nombreFlag: boolean }
 */
async function obtenerFlagsActivosPorModulo(modulo, getParametro) {
  const flags = await obtenerFlagsPorModulo(modulo, getParametro)
  const resultado = {}

  for (const flag of flags) {
    resultado[flag.nombre] = flag.habilitado
  }

  return resultado
}

/**
 * Obtener descripción de un flag
 * Para logs y auditoría
 * 
 * @param {string} nombre - nombre del flag
 * @returns {string} descripción o null
 */
function obtenerDescripcionFlag(nombre) {
  const definicion = FLAG_DEFINITIONS[nombre]
  return definicion ? definicion.descripcion : null
}

/**
 * Validar si el nombre es un flag conocido
 * 
 * @param {string} nombre - nombre del flag
 * @returns {boolean}
 */
function esUsunaFlagValido(nombre) {
  return FLAG_DEFINITIONS.hasOwnProperty(nombre)
}

/**
 * Obtener lista de nombres de flags
 * 
 * @returns {Array<string>}
 */
function obtenerNombresDeFlags() {
  return Object.keys(FLAG_DEFINITIONS)
}

module.exports = {
  FLAG_DEFINITIONS,
  obtenerTodosLosFlags,
  obtenerFlag,
  obtenerFlagsPorModulo,
  obtenerFlagsActivosPorModulo,
  obtenerDescripcionFlag,
  esUsunaFlagValido,
  obtenerNombresDeFlags,
}
