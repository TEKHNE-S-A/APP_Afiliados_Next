/**
 * Enums sincronizados con los valores de BD (nusispar, crcreden, nuusuari, etc.)
 * Usar estos tipos en lugar de string literales sueltos en todo el proyecto.
 */

/** Flag booleana de BD: 'S' = Sí, 'N' = No */
export type BooleanFlag = 'S' | 'N'

/** Sexo del afiliado: 'M' = Masculino, 'F' = Femenino */
export type Sexo = 'M' | 'F'

/** Tipo de solicitud de autorización SIA: 'P' = Con Prescripción, 'S' = Sin Prescripción */
export type TipoAutorizacion = 'P' | 'S'

/**
 * Estado de solicitud de autorización SIA
 * ENV = Enviada, AUD = En auditoría, AUT = Autorizada,
 * REC = Rechazada, PEN = Pendiente, CON = Consultada
 */
export type EstadoAutorizacion = 'ENV' | 'AUD' | 'AUT' | 'REC' | 'PEN' | 'CON'

/** Estado del afiliado en el sistema */
export type EstadoAfiliado = 'Activo' | 'Inactivo'

/** Tipo prestación SIA: 'A' = Prestaciones Médicas (fijo en SIA) */
export type TipoPrestacion = 'A'

/** Fuente del layout de credencial */
export type CredencialLayoutSource = 'GENERAL' | 'PLAN'
