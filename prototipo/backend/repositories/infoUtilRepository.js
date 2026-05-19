const { getPrisma } = require('../db/prismaClient')
const crypto = require('crypto')

function toTrimmedString(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function toOptionalTrimmedString(value) {
  const trimmed = toTrimmedString(value)
  return trimmed.length > 0 ? trimmed : null
}

function looksLikeUrl(s) {
  if (!s) return false
  const t = s.trim().toLowerCase()
  return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('www.')
}

function deriveTipo({ tipoCodigo, link, telefono, direccion }) {
  const code = (tipoCodigo || '').trim().toUpperCase()
  // noinflink puede contener una URL real O un texto largo (ej: respuesta de FAQ).
  // Solo tratarlo como link si realmente parece una URL.
  const hasUrl = looksLikeUrl(link)

  // Validar que el tipo declarado coincide con los datos disponibles.
  // Ej: 'T' sin teléfono → ítems FAQ/texto con código incorrecto → caen al fallback.
  // Ej: 'L' sin URL pero con teléfono → contactos telefónicos mal codificados → caen al fallback.
  if (code === 'T' && telefono) return 'tel'
  if (code === 'L' && hasUrl) return 'link'
  if (code === 'D' && direccion) return 'direccion'
  if (code === 'X' && !hasUrl && !telefono && !direccion) return 'text'

  // Fallback: inferir por campos disponibles
  if (hasUrl) return 'link'
  if (telefono) return 'tel'
  if (direccion) return 'direccion'
  return 'text'
}

const SELECT_FIELDS = {
  noinfutili: true,
  noinftipo: true,
  noinfdescr: true,
  noinftelef: true,
  noinfldire: true,
  noinfgeolo: true,
  noinim_gxi: true,
  noinflink: true,
  noinfcate: true,
  noinforden: true,
}

function mapRow(row) {
  const telefono = toOptionalTrimmedString(row.noinftelef)
  const direccion = toOptionalTrimmedString(row.noinfldire)
  const geo = toOptionalTrimmedString(row.noinfgeolo)
  const link = toOptionalTrimmedString(row.noinflink)
  return {
    id: toTrimmedString(row.noinfutili),
    tipo: deriveTipo({ tipoCodigo: row.noinftipo, link, telefono, direccion }),
    titulo: toTrimmedString(row.noinfdescr),
    telefono,
    direccion,
    geo,
    link,
    imagenUrl: toOptionalTrimmedString(row.noinim_gxi),
    categoria: toOptionalTrimmedString(row.noinfcate) || 'general',
    orden: row.noinforden ?? 0,
  }
}

async function listPublic(categoria) {
  const prisma = getPrisma()
  const where = categoria ? { noinfcate: { equals: categoria } } : undefined
  const rows = await prisma.noinfuti.findMany({
    select: SELECT_FIELDS,
    where,
    orderBy: [{ noinforden: 'asc' }, { noinftipo: 'asc' }, { noinfdescr: 'asc' }],
  })
  return rows.map(mapRow)
}

async function listAdmin() {
  const prisma = getPrisma()
  const rows = await prisma.noinfuti.findMany({
    select: SELECT_FIELDS,
    orderBy: [{ noinforden: 'asc' }, { noinftipo: 'asc' }, { noinfdescr: 'asc' }],
  })
  return rows.map((row) => ({
    ...mapRow(row),
    tipoCodigo: toTrimmedString(row.noinftipo),
  }))
}

async function getTipoCatalogo() {
  const prisma = getPrisma()
  const groups = await prisma.noinfuti.groupBy({
    by: ['noinftipo'],
    _count: { _all: true },
    orderBy: [{ noinftipo: 'asc' }],
  })

  return groups.map((g) => ({
    noinftipo: toTrimmedString(g.noinftipo),
    count: g._count?._all ?? 0,
  }))
}

function mapInputTipoToCodigo(tipo) {
  const raw = toTrimmedString(tipo)
  const upper = raw.toUpperCase()

  if (upper.length === 1) return upper
  if (upper === 'TEL') return 'T'
  if (upper === 'LINK') return 'L'
  if (upper === 'DIRECCION' || upper === 'DIRECCIÓN') return 'D'
  if (upper === 'TEXT' || upper === 'TEXTO') return 'X'
  return upper.substring(0, 1)
}

async function createAdmin(input) {
  const prisma = getPrisma()
  const id = crypto.randomUUID()
  const noinftipo = mapInputTipoToCodigo(input.tipo)

  const created = await prisma.noinfuti.create({
    data: {
      noinfutili: id,
      noinftipo,
      noinfdescr: toTrimmedString(input.titulo),
      noinftelef: toTrimmedString(input.telefono),
      noinfldire: toTrimmedString(input.direccion),
      noinfgeolo: toTrimmedString(input.geo),
      noinim: Buffer.from(''),
      noinim_gxi: input.imagenUrl ? toTrimmedString(input.imagenUrl) : null,
      noinflink: input.link ? toTrimmedString(input.link) : null,
      noinfcate: input.categoria ? toTrimmedString(input.categoria) : 'general',
      noinforden: input.orden !== undefined ? Number(input.orden) : 0,
    },
    select: SELECT_FIELDS,
  })

  return { ...mapRow(created), tipoCodigo: toTrimmedString(created.noinftipo) }
}

async function updateAdmin(id, patch) {
  const prisma = getPrisma()

  const data = {}
  if (patch.tipo !== undefined) data.noinftipo = mapInputTipoToCodigo(patch.tipo)
  if (patch.titulo !== undefined) data.noinfdescr = toTrimmedString(patch.titulo)
  if (patch.telefono !== undefined) data.noinftelef = toTrimmedString(patch.telefono)
  if (patch.direccion !== undefined) data.noinfldire = toTrimmedString(patch.direccion)
  if (patch.geo !== undefined) data.noinfgeolo = toTrimmedString(patch.geo)
  if (patch.imagenUrl !== undefined) data.noinim_gxi = patch.imagenUrl ? toTrimmedString(patch.imagenUrl) : null
  if (patch.link !== undefined) data.noinflink = patch.link ? toTrimmedString(patch.link) : null
  if (patch.categoria !== undefined) data.noinfcate = toTrimmedString(patch.categoria) || 'general'
  if (patch.orden !== undefined) data.noinforden = Number(patch.orden)

  const updated = await prisma.noinfuti.update({
    where: { noinfutili: id },
    data,
    select: SELECT_FIELDS,
  })

  return {
    ...mapRow(updated),
    tipoCodigo: toTrimmedString(updated.noinftipo),
    titulo: toTrimmedString(updated.noinfdescr),
    telefono: toOptionalTrimmedString(updated.noinftelef),
    direccion: toOptionalTrimmedString(updated.noinfldire),
    geo: toOptionalTrimmedString(updated.noinfgeolo),
    link: toOptionalTrimmedString(updated.noinflink),
    imagenUrl: toOptionalTrimmedString(updated.noinim_gxi),
  }
}

async function removeAdmin(id) {
  const prisma = getPrisma()
  await prisma.noinfuti.delete({ where: { noinfutili: id } })
  return { ok: true }
}

module.exports = {
  listPublic,
  listAdmin,
  getTipoCatalogo,
  createAdmin,
  updateAdmin,
  removeAdmin,
}
