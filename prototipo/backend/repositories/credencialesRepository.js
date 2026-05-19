const { getPrisma } = require('../db/prismaClient')

function toDateOnlyString(value) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const s = String(value)
  // Si ya viene YYYY-MM-DD o ISO, recortar a fecha
  return s.length >= 10 ? s.slice(0, 10) : s
}

function toIsoString(value) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function toSafeNumber(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number') return value
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function listByUserId(nuusuid) {
  const prisma = getPrisma()

  const rows = await prisma.$queryRaw`
    SELECT
      c.crcreid,
      c.crcrefecvi,
      c.crcrelin,
      c.crcrenroaf,
      c.crcreapeno,
      c.crcreafili,
      c.crcrecuil,
      c.crcreplaid,
      TRIM(COALESCE(p.nupladescr, '')) AS crcrepladesc,
      c.crcredocum,
      c.crcresexo,
      c.crcrefecha,
      c.crcrehash,
      c.crcreifech,
      c.crcreparen,
      cu.crcrepropi
    FROM crcreden c
    INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
    LEFT JOIN nuplan p ON TRIM(p.nuplaid) = TRIM(c.crcreplaid)
    WHERE cu.nuusuid = ${nuusuid}
    ORDER BY cu.crcrepropi DESC, c.crcreapeno
  `

  return (rows || []).map((r) => ({
    ...r,
    // Mantener contrato esperado por mobile: fechas YYYY-MM-DD y cuil como number
    crcrefecvi: toDateOnlyString(r.crcrefecvi) || '',
    crcrefecha: toDateOnlyString(r.crcrefecha) || '',
    crcreifech: toIsoString(r.crcreifech),
    crcrecuil: toSafeNumber(r.crcrecuil) ?? 0,
    crcreplaid: r.crcreplaid ? String(r.crcreplaid).trim() : null,
    crcrepladesc: r.crcrepladesc ? String(r.crcrepladesc).trim() : '',
  }))
}

module.exports = {
  listByUserId,
}
