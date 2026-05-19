import { BooleanFlag, Sexo, CredencialLayoutSource } from './enums'

export interface Credencial {
  crcreid: string        // AfiliadoId (PK) - 30 caracteres
  crcreapeno: string     // Apellido y Nombre completo
  crcrenroaf: string     // Número de afiliado
  crcreparen?: string    // Parentesco (ej: "Titular", "Cónyuge", "Hijo/a")
  crcredocum: string     // Documento DNI
  crcrefecha: string     // Fecha de nacimiento (YYYY-MM-DD)
  crcrecuil: number      // CUIL completo
  crcresexo: Sexo        // Sexo (M/F)
  crcreplaid: string | null  // Plan de salud ID (puede ser null)
  crcrepladesc?: string  // Descripción del plan
  crcrefecvi: string     // Fecha vigencia credencial (YYYY-MM-DD)
  crcrelin: string       // Línea del plan (URL imagen)
  crcrepropi: BooleanFlag  // Es titular? ('S' = Sí, 'N' = No)
  crcrehash: string      // Hash SHA-256 para detectar cambios
  // Token temporal (opcional) generado por el backend o por cliente offline
  tokenTemporal?: string
  tokenTemporalGeneradoEn?: string
  tokenTemporalVenceEn?: string
  credencialLayout?: CredencialLayoutConfig
  credencialLayoutSource?: CredencialLayoutSource
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

export interface GrupoFamiliar {
  titular: Credencial
  familiares: Credencial[]
  total: number
}

export interface SyncStats {
  total: number
  inserted: number
  updated: number
  unchanged: number
}

export interface CredencialCardProps {
  credencial: Credencial
  isTitular: boolean
  showQR?: boolean
  compact?: boolean
  showToken?: boolean
  showToggleDatos?: boolean
  planImageUrl?: string | null
  onShare?: () => void
  onRefresh?: () => void
}

// Tipos para prestaciones (autorizaciones sin prescripción)
export interface Prestacion {
  AULPresID: number
  AULPresDescripcion: string
}

export interface PrestacionesResponse {
  success: boolean
  prestaciones: Prestacion[]
  total: number
}

export interface ParametroAutorizSinOrden {
  habilitado: boolean
  valor: string
}
