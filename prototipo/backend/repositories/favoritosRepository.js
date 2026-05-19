/**
 * Favoritos y recientes de prestadores.
 */

const db = require('../db/connection')

async function addFavoritoOReciente(nuusuid, caentid, tipo = 'favorito') {
  if (!['favorito', 'reciente'].includes(tipo)) {
    throw new Error(`Tipo inválido: ${tipo}`)
  }

  const prestadorId = String(caentid).trim()

  if (tipo === 'reciente') {
    const result = await db.query(
      `
        INSERT INTO nu_favoritos_prestadores (nuusuid, caentid, tipo, nufeccrea)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (nuusuid, caentid, tipo)
        DO UPDATE SET nufeccrea = CURRENT_TIMESTAMP
        RETURNING nufavid, nuusuid, caentid, tipo, nufeccrea
      `,
      [nuusuid, prestadorId, tipo]
    )

    return result.rows[0]
  }

  const result = await db.query(
    `
      INSERT INTO nu_favoritos_prestadores (nuusuid, caentid, tipo, nufeccrea)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (nuusuid, caentid, tipo)
      DO UPDATE SET nufeccrea = nu_favoritos_prestadores.nufeccrea
      RETURNING nufavid, nuusuid, caentid, tipo, nufeccrea
    `,
    [nuusuid, prestadorId, tipo]
  )

  return result.rows[0]
}

async function removeFavorito(nuusuid, caentid) {
  const result = await db.query(
    `
      DELETE FROM nu_favoritos_prestadores
      WHERE nuusuid = $1
        AND caentid = $2
        AND tipo = 'favorito'
    `,
    [nuusuid, String(caentid).trim()]
  )

  return result.rowCount > 0
}

async function isFavorito(nuusuid, caentid) {
  const result = await db.query(
    `
      SELECT 1
      FROM nu_favoritos_prestadores
      WHERE nuusuid = $1
        AND caentid = $2
        AND tipo = 'favorito'
      LIMIT 1
    `,
    [nuusuid, String(caentid).trim()]
  )

  return result.rowCount > 0
}

async function getFavoritos(nuusuid, limit = 20) {
  const result = await db.query(
    `
      SELECT
        f.nufavid, f.nuusuid, f.caentid, f.tipo, f.nufeccrea,
        CAST(e.caentapeno AS TEXT) AS nombre,
        CAST((
          SELECT d.caendirecc FROM caendire d WHERE d.caentid = f.caentid LIMIT 1
        ) AS TEXT) AS direccion
      FROM nu_favoritos_prestadores f
      LEFT JOIN caentida e ON e.caentid = f.caentid
      WHERE f.nuusuid = $1
        AND f.tipo = 'favorito'
      ORDER BY f.nufeccrea DESC
      LIMIT $2
    `,
    [nuusuid, limit]
  )

  return result.rows
}

async function getRecientes(nuusuid, limit = 10) {
  const result = await db.query(
    `
      SELECT
        r.nufavid, r.nuusuid, r.caentid, r.tipo, r.nufeccrea,
        CAST(e.caentapeno AS TEXT) AS nombre,
        CAST((
          SELECT d.caendirecc FROM caendire d WHERE d.caentid = r.caentid LIMIT 1
        ) AS TEXT) AS direccion
      FROM (
        SELECT DISTINCT ON (caentid) nufavid, nuusuid, caentid, tipo, nufeccrea
        FROM nu_favoritos_prestadores
        WHERE nuusuid = $1
          AND tipo = 'reciente'
        ORDER BY caentid, nufeccrea DESC
      ) r
      LEFT JOIN caentida e ON e.caentid = r.caentid
      ORDER BY r.nufeccrea DESC
      LIMIT $2
    `,
    [nuusuid, limit]
  )

  return result.rows
}

async function limpiarRecientesAntiguos(nuusuid, diasAntiguos = 30) {
  const result = await db.query(
    `
      DELETE FROM nu_favoritos_prestadores
      WHERE nuusuid = $1
        AND tipo = 'reciente'
        AND nufeccrea < CURRENT_TIMESTAMP - ($2::text || ' days')::interval
    `,
    [nuusuid, diasAntiguos]
  )

  return result.rowCount
}

async function limpiarTodosLosRecientes(nuusuid) {
  const result = await db.query(
    `
      DELETE FROM nu_favoritos_prestadores
      WHERE nuusuid = $1
        AND tipo = 'reciente'
    `,
    [nuusuid]
  )

  return result.rowCount
}

async function getFavoritosYRecientes(nuusuid, limit = 5) {
  const [favoritos, recientes] = await Promise.all([
    getFavoritos(nuusuid, limit),
    getRecientes(nuusuid, limit)
  ])

  return {
    favoritos,
    recientes,
    total: favoritos.length + recientes.length
  }
}

module.exports = {
  addFavoritoOReciente,
  removeFavorito,
  isFavorito,
  getFavoritos,
  getRecientes,
  limpiarRecientesAntiguos,
  limpiarTodosLosRecientes,
  getFavoritosYRecientes
}
