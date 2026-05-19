// ─────────────────────────────────────────────────────────────────────────────
//  Tipos compartidos — App Afiliados Next.js
// ─────────────────────────────────────────────────────────────────────────────

// Re-export de uniones de dominio centralizadas (BD legada modela como CHAR/VARCHAR).
export * from './enums'
import type { UserRole } from './enums'

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  role: UserRole
  accessToken?: string
}

// ── Credenciales ──────────────────────────────────────────────────────────────

export interface Credencial {
  crcreid: string
  crcrefecvi: string | Date
  crcrelin: string
  crcrenroaf: string
  crcreapeno: string
  crcreafili: string
  crcrecuil: number | bigint
  crcredocum: string
  crcresexo: string
  crcrefecha: string | Date
  crcrehash: string
  crcreifech: string | Date
  crcreparen?: string | null
  crcrepladesc?: string | null
  crcreplaid?: string | null
  crcrepropi?: string
  tokenTemporal?: string
  tokenTemporalGeneradoEn?: string
  tokenTemporalVenceEn?: string
  credencialLayout?: CredencialLayoutConfig
  credencialLayoutSource?: string
}

export interface CredencialLayoutField {
  x: number
  y: number
  fontFamily?: string
  fontSize: number
  fontWeight: string
  fontStyle: 'normal' | 'italic'
  color: string
  hidden: boolean
  allowEyeToggle: boolean
  titlePosition?: 'izquierda' | 'superior' | 'inferior' | 'derecha' | 'invisible'
  titleFontSize?: number
}

export interface CredencialLayoutConfig {
  version: number
  canvas?: {
    width: number
    height: number
  }
  fields: {
    [key: string]: CredencialLayoutField
  }
}

// ── Solicitudes / Autorizaciones ──────────────────────────────────────────────

export interface Solicitud {
  ausolicid: string
  nuusuid: string
  ausoldescr: string
  ausolfecal: string | Date
  ausolfecor: string | Date
  ausolnroaf: string
  ausoltexto: string
  ausolentid: string
  ausolfecve: string | Date
  ausolextid: string
  ausolrechd: string
  ausolestad: string
  ausolentno: string
  ausolautnu: string
  ausoltipo: string
  ausolpsoco: string
  ausolcantp: number
  ausolobspr: string
  ausolgravc: number
}

// SolicitudEstado: alias retro-compatible al dominio SIA real (ver enums.ts).
export type { EstadoSolicitud as SolicitudEstado } from './enums'

// ── Notificaciones ────────────────────────────────────────────────────────────

export interface Notificacion {
  id: string
  nuusuid: string
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  fecha_creacion: string | Date
  fecha_leida?: string | Date | null
  metadata?: Record<string, unknown> | null
}

// ── Cartilla ──────────────────────────────────────────────────────────────────

export interface Entidad {
  caentid: string
  caentapeno: string
  caentmail: string
  caentweb: string
  caentmarca: boolean
  caentprior: number
  caentmatri?: string | null
  caentobs?: string | null
  carubid?: string | null
  caespid?: string | null
  caentactivo: boolean
  caentupdated?: string | Date | null
  caendire?: DireccionEntidad[]
}

export interface DireccionEntidad {
  caentid: string
  caendid: string
  nulocid: string
  caendirecc: string
  caendirpri: string
  caendhorat: string
  caendlat?: number | null
  caendlng?: number | null
  caentele?: TelefonoEntidad[]
  nulocali?: { nulocdescr: string }
}

export interface TelefonoEntidad {
  caentid: string
  caendid: string
  caenteleid: string
  caentelefo: string
  caentelepr: string
}

export interface Rubro {
  carubid: string
  carubdescr: string
  carubtipor: string
}

export interface Especialidad {
  caespid: string
  carubid: string
  caespdescr: string
}

// ── Usuarios (Admin) ──────────────────────────────────────────────────────────

export interface UsuarioAdmin {
  nuusuid: string
  nuusuafili: string
  nuusuapell: string
  nuusumail: string
  nuusunroaf: string
  nuusubajaf?: Date | string | null
  nuusuactiv?: string | null
  nurolid?: number | null
  nurolper?: {
    nurolid: number
    nurolnombre: string
    nurolpermisos?: string
  } | null
}

export interface ParametroAdmin {
  nusisgrupa: string
  nusistippa: string
  nusisvalpa: string
}

// ── Paginación ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── Respuesta API estándar ────────────────────────────────────────────────────

export interface ApiError {
  error: string
  message: string
  issues?: Array<{ path: string; message: string }>
}
