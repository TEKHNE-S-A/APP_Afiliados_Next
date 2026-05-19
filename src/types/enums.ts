// ─────────────────────────────────────────────────────────────────────────────
//  Enums centralizados — APP Afiliados Next
//
//  Los dominios reflejan los valores válidos en BD legada (campos modelados
//  como CHAR/VARCHAR en prisma/schema.prisma, sin `enum` Prisma por la
//  estrategia de no romper tablas legadas).
//
//  Para usar en Zod: `z.enum(BooleanFlagValues)` (arrays `as const`).
//  Para usar en TS:  `BooleanFlag` (union de strings).
// ─────────────────────────────────────────────────────────────────────────────

// ── Flags S/N ────────────────────────────────────────────────────────────────
export const BooleanFlagValues = ['S', 'N'] as const
export type BooleanFlag = (typeof BooleanFlagValues)[number]

// ── Sexo ─────────────────────────────────────────────────────────────────────
export const SexoValues = ['M', 'F'] as const
export type Sexo = (typeof SexoValues)[number]

// ── Solicitudes / Autorizaciones SIA ─────────────────────────────────────────
// Dominio real de BD para ausolici.ausolestad, ausol_estado y ausol_aut_estado.
export const EstadoSolicitudValues = [
  'ENV', // Enviado
  'AUD', // En auditoría
  'AUT', // Autorizado
  'REC', // Rechazado
  'PEN', // Pendiente
  'CON', // Consumido
] as const
export type EstadoSolicitud = (typeof EstadoSolicitudValues)[number]

// Tipo de autorización SIA (ausolici.ausoltipo)
export const TipoAutorizacionValues = ['P', 'S'] as const
export type TipoAutorizacion = (typeof TipoAutorizacionValues)[number]

// Marcas de autorización/auditoría SIA (ausol_aut_mar / ausol_aud_mar)
// '' (Blanco) se incluye porque la columna admite valor vacío.
export const MarcaAutorizacionValues = [
  'AUD', // Auditada
  'AUT', // Autorizada
  'DEN', // Denegada
  'DEA', // Denegada Aud. Médica
  'DIF', // Diferida
  'DIA', // Diferida Aud. Médica
  'S/D', // Sin Detalle
  'VAC', // Vacío
  '',    // Blanco
] as const
export type MarcaAutorizacion = (typeof MarcaAutorizacionValues)[number]

// ── Credencial ───────────────────────────────────────────────────────────────
// Fuente del layout (GENERAL = común, PLAN = específico de plan)
export const CredencialLayoutSourceValues = ['GENERAL', 'PLAN'] as const
export type CredencialLayoutSource = (typeof CredencialLayoutSourceValues)[number]

// ── Cartilla ─────────────────────────────────────────────────────────────────
// Tipo de rubro (carubid.carubtipor)
export const TipoRubroValues = ['CAR', 'FAR', 'DEL'] as const
export type TipoRubro = (typeof TipoRubroValues)[number]

// ── Información Útil (noinfuti.noinftipo) ────────────────────────────────────
export const TipoInfoUtilValues = ['E', 'D', 'T', 'L'] as const
export type TipoInfoUtil = (typeof TipoInfoUtilValues)[number]

// ── Noticias (app_noticias.tipo) ─────────────────────────────────────────────
export const TipoNoticiaValues = ['texto', 'imagen', 'mixta'] as const
export type TipoNoticia = (typeof TipoNoticiaValues)[number]

// ── Desconocimientos (app_desconocimientos.estado) ───────────────────────────
export const EstadoDesconocimientoValues = [
  'pendiente',
  'en_revision',
  'resuelto',
  'cerrado',
] as const
export type EstadoDesconocimiento = (typeof EstadoDesconocimientoValues)[number]

// ── Favoritos de prestadores (nu_favoritos_prestadores.tipo) ─────────────────
export const TipoFavoritoValues = ['favorito', 'reciente'] as const
export type TipoFavorito = (typeof TipoFavoritoValues)[number]

// ── Notificaciones broadcast ─────────────────────────────────────────────────
// Categoría del mensaje (uso interno API)
export const CategoriaNotificacionValues = ['noticias', 'sistema'] as const
export type CategoriaNotificacion = (typeof CategoriaNotificacionValues)[number]

// Tipo de audiencia para broadcast
export const AudienciaBroadcastValues = ['todos', 'titular', 'familiar'] as const
export type AudienciaBroadcast = (typeof AudienciaBroadcastValues)[number]

// Plataforma de push (vacío = todas)
export const PlataformaPushValues = ['', 'ios', 'android'] as const
export type PlataformaPush = (typeof PlataformaPushValues)[number]

// ── Auth ─────────────────────────────────────────────────────────────────────
export const UserRoleValues = ['admin', 'user'] as const
export type UserRole = (typeof UserRoleValues)[number]
