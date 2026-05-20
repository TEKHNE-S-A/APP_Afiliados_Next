/**
 * gamClient.ts — Cliente REST GAM para Next.js.
 *
 * Replica gamService.js del backend Express usando fetch nativo (Node 18+).
 * URL base se lee de la variable de entorno GAM_BASE_URL o del .env.
 */

const GAM_BASE_URL_RAW = process.env.GAM_BASE_URL ?? 'http://localhost:8081/PRODUCTO_APP_SHEMA_DESA1JavaEnvironment'
const GAM_BASE_URL = GAM_BASE_URL_RAW.replace(/\/+$/, '')
const GAM_TIMEOUT_MS = 30_000

async function gamFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GAM_TIMEOUT_MS)
  try {
    return await fetch(`${GAM_BASE_URL}${path}`, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ─── getUserInfo ──────────────────────────────────────────────────────────────

export async function gamGetUserInfo(accessToken: string): Promise<unknown> {
  const res = await gamFetch('/oauth/userinfo', {
    headers: { Authorization: `OAuth ${accessToken}`, 'GeneXus-Agent': 'ExternalClient' },
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new GamError(res.status, data?.error ?? 'Error GAM userinfo')
    throw err
  }
  return data
}

// ─── cancelRegistrationGAM ───────────────────────────────────────────────────

export async function gamCancelRegistration(accessToken: string): Promise<{ success: true; message: string }> {
  const res = await gamFetch('/rest/Nucleo/NUAnulaRegistracion', {
    method: 'POST',
    headers: { Authorization: `OAuth ${accessToken}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  const data = await res.json().catch(() => ({})) as { message?: string }
  if (!res.ok) {
    throw new GamError(res.status, (data as { error?: string }).error ?? 'Error anulando registración GAM')
  }
  return { success: true, message: data.message ?? 'Registro anulado exitosamente' }
}

// ─── registerUserGAM ─────────────────────────────────────────────────────────

export interface GamRegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  telefono: string
  nroAfiliado: string
  documento: string
  cuil: string
  sexo: string
  fechaNacimiento: string
  canMiembrosFamiliar: number
}

export async function gamRegisterUser(data: GamRegisterData): Promise<{ success: boolean; userId?: string; message?: string }> {
  const body = {
    FormaReg: 'APP',
    UserName: data.email,
    UserPassword: data.password,
    UserPasswordVerification: data.password,
    UserFirstName: data.firstName,
    UserLastName: data.lastName,
    UserEmail: data.email,
    UserPhone: data.telefono,
    NroAfiliado: data.nroAfiliado,
    UserDocument: data.documento,
    CUIL: data.cuil,
    UserSex: data.sexo,
    UserBirthDate: data.fechaNacimiento,
    CanMiembrosFamiliar: data.canMiembrosFamiliar,
    SoyAfiliado: true,
  }
  const res = await gamFetch('/rest/Nucleo/NURegistroUsuario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await res.json().catch(() => ({})) as Record<string, unknown>
  if (!res.ok) {
    throw new GamError(res.status, String(result.error ?? result.message ?? 'Error registro GAM'))
  }
  return { success: true, userId: String(result.user_id ?? result.userId ?? ''), message: String(result.message ?? '') }
}

// ─── checkUserExistsInGAM ────────────────────────────────────────────────────

export async function gamCheckUserExists(email: string): Promise<{ exists: boolean }> {
  try {
    const res = await gamFetch('/rest/Nucleo/NUValidoUsuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ FormaReg: 'APP', UserName: email }),
    })
    const data = await res.json().catch(() => ({})) as { exists?: boolean; UserExists?: boolean }
    return { exists: data.exists === true || data.UserExists === true }
  } catch {
    return { exists: false }
  }
}

// ─── loginGAM ─────────────────────────────────────────────────────────────────

const GAM_CLIENT_ID = process.env.GAM_CLIENT_ID ?? ''
const GAM_CLIENT_SECRET = process.env.GAM_CLIENT_SECRET ?? ''

export interface GamLoginResult {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
  user_id?: string
}

export async function gamLogin(username: string, password: string): Promise<GamLoginResult> {
  const params = new URLSearchParams({
    grant_type: 'GAMLocal',
    scope: 'gam_user_data gam_user_roles gam_user_additional_data',
    client_id: GAM_CLIENT_ID,
    client_secret: GAM_CLIENT_SECRET,
    username,
    password,
    authentication_type_name: 'GAM_Remoto',
  })
  const res = await gamFetch('/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const data = await res.json().catch(() => ({})) as Record<string, unknown>
  if (!res.ok) {
    throw new GamError(res.status, String(data.error ?? 'Login GAM fallido'))
  }
  return {
    access_token: String(data.access_token ?? ''),
    refresh_token: data.refresh_token ? String(data.refresh_token) : undefined,
    token_type: String(data.token_type ?? 'Bearer'),
    expires_in: Number(data.expires_in ?? 3600),
    user_id: data.user_id ? String(data.user_id) : undefined,
  }
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class GamError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
    this.name = 'GamError'
  }
}
