/**
 * credencial-mapper.ts — Mapea filas Prisma (crcredus + crcreden) al formato
 * que espera la app mobile (interfaz Credencial).
 */
import crypto from 'node:crypto'

const DEFAULT_TOKEN_TIMEOUT_MIN = 10

export function mapCredencial(row: any, timeoutMin = DEFAULT_TOKEN_TIMEOUT_MIN) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + timeoutMin * 60 * 1000)
  const hash = crypto
    .createHash('sha256')
    .update(`${row.crcreid}:${now.toISOString().slice(0, 16)}`)
    .digest('hex')
  const tokenTemporal = String(parseInt(hash.slice(0, 6), 16) % 1000).padStart(3, '0')

  const c = row.crcreden
  return {
    crcreid:      row.crcreid,
    crcrepropi:   row.crcrepropi,
    crcreapeno:   c.crcreapeno?.trim() ?? '',
    crcrenroaf:   c.crcrenroaf?.trim() ?? '',
    crcredocum:   c.crcredocum?.trim() ?? '',
    crcrefecha:   c.crcrefecha instanceof Date
                    ? c.crcrefecha.toISOString().slice(0, 10)
                    : (c.crcrefecha ?? ''),
    crcrecuil:    typeof c.crcrecuil === 'bigint' ? Number(c.crcrecuil) : c.crcrecuil,
    crcresexo:    c.crcresexo?.trim() ?? '',
    crcreplaid:   c.crcreplaid?.trim() ?? null,
    crcrepladesc: c.nuplan?.nupladescr ?? null,
    crcrefecvi:   c.crcrefecvi instanceof Date
                    ? c.crcrefecvi.toISOString().slice(0, 10)
                    : (c.crcrefecvi ?? ''),
    crcrelin:     c.crcrelin ?? '',
    crcreafili:   c.crcreafili ?? '',
    crcrehash:    c.crcrehash ?? '',
    tokenTemporal,
    tokenTemporalGeneradoEn: now.toISOString(),
    tokenTemporalVenceEn:    expiresAt.toISOString(),
  }
}

export function mapCredenciales(rows: any[], timeoutMin = DEFAULT_TOKEN_TIMEOUT_MIN) {
  return rows.map(r => mapCredencial(r, timeoutMin))
}
