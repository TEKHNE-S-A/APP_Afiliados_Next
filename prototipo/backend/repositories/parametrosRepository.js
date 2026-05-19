const { getPrisma } = require('../db/prismaClient')
const db = require('../db/connection')

/**
 * Repositorio para acceso a parámetros del sistema (tabla nusispar)
 * Encapsula toda la lógica de acceso a datos vía Prisma
 */

/**
 * Listar todos los parámetros
 * @returns {Promise<Array>} Lista de parámetros con formato normalizado
 */
async function listAll() {
  const prisma = getPrisma()
  const parametros = await prisma.nusispar.findMany({
    select: { nusisgrupa: true, nusistippa: true, nusisvalpa: true },
    orderBy: [{ nusisgrupa: 'asc' }, { nusistippa: 'asc' }],
  })

  return parametros.map((p) => ({
    nusisgrupa: String(p.nusisgrupa).trim(),
    nusistippa: String(p.nusistippa).trim(),
    nusisvalpa: p.nusisvalpa,
  }))
}

/**
 * Listar parámetros de un grupo específico
 * @param {string} grupo - Nombre del grupo
 * @returns {Promise<Array>} Lista de parámetros del grupo
 */
async function listByGrupo(grupo) {
  const prisma = getPrisma()
  const parametros = await prisma.nusispar.findMany({
    where: { nusisgrupa: grupo },
    select: { nusisgrupa: true, nusistippa: true, nusisvalpa: true },
    orderBy: [{ nusistippa: 'asc' }],
  })

  return parametros.map((p) => ({
    nusisgrupa: String(p.nusisgrupa).trim(),
    nusistippa: String(p.nusistippa).trim(),
    nusisvalpa: p.nusisvalpa,
  }))
}

/**
 * Obtener un parámetro específico
 * @param {string} grupo - Nombre del grupo
 * @param {string} tipo - Tipo de parámetro
 * @returns {Promise<Object|null>} Parámetro o null si no existe
 */
async function findOne(grupo, tipo) {
  const prisma = getPrisma()
  const parametro = await prisma.nusispar.findUnique({
    where: { nusisgrupa_nusistippa: { nusisgrupa: grupo, nusistippa: tipo } },
    select: { nusisgrupa: true, nusistippa: true, nusisvalpa: true },
  })

  if (!parametro) return null

  return {
    nusisgrupa: String(parametro.nusisgrupa).trim(),
    nusistippa: String(parametro.nusistippa).trim(),
    nusisvalpa: parametro.nusisvalpa,
  }
}

/**
 * Actualizar un parámetro existente
 * @param {string} grupo - Nombre del grupo
 * @param {string} tipo - Tipo de parámetro
 * @param {string} valor - Nuevo valor
 * @returns {Promise<Object>} Parámetro actualizado
 * @throws {Error} Si el parámetro no existe (código P2025)
 */
async function update(grupo, tipo, valor) {
  const prisma = getPrisma()
  // Incrementar version vía SQL raw (evita regenerar cliente Prisma)
  await db.query(
    `UPDATE nusispar SET nusisvalpa = $1, version = version + 1
     WHERE nusisgrupa = $2 AND nusistippa = $3`,
    [valor, grupo, tipo]
  )
  const parametro = await prisma.nusispar.findUnique({
    where: { nusisgrupa_nusistippa: { nusisgrupa: grupo, nusistippa: tipo } },
    select: { nusisgrupa: true, nusistippa: true, nusisvalpa: true },
  })
  if (!parametro) {
    // Simular error Prisma P2025 para que el caller lo maneje igual
    const err = new Error('Record to update not found.')
    err.code = 'P2025'
    throw err
  }

  return {
    nusisgrupa: String(parametro.nusisgrupa).trim(),
    nusistippa: String(parametro.nusistippa).trim(),
    nusisvalpa: parametro.nusisvalpa,
  }
}

/**
 * Crear un nuevo parámetro
 * @param {string} grupo - Nombre del grupo
 * @param {string} tipo - Tipo de parámetro
 * @param {string} valor - Valor inicial
 * @returns {Promise<Object>} Parámetro creado
 * @throws {Error} Si el parámetro ya existe (código P2002)
 */
async function create(grupo, tipo, valor) {
  const prisma = getPrisma()
  const parametro = await prisma.nusispar.create({
    data: { nusisgrupa: grupo, nusistippa: tipo, nusisvalpa: valor },
    select: { nusisgrupa: true, nusistippa: true, nusisvalpa: true },
  })

  return {
    nusisgrupa: String(parametro.nusisgrupa).trim(),
    nusistippa: String(parametro.nusistippa).trim(),
    nusisvalpa: parametro.nusisvalpa,
  }
}

/**
 * Eliminar un parámetro
 * @param {string} grupo - Nombre del grupo
 * @param {string} tipo - Tipo de parámetro
 * @returns {Promise<Object>} Parámetro eliminado
 * @throws {Error} Si el parámetro no existe (código P2025)
 */
async function remove(grupo, tipo) {
  const prisma = getPrisma()
  const parametroEliminado = await prisma.nusispar.delete({
    where: { nusisgrupa_nusistippa: { nusisgrupa: grupo, nusistippa: tipo } },
    select: { nusisgrupa: true, nusistippa: true, nusisvalpa: true },
  })

  return {
    nusisgrupa: String(parametroEliminado.nusisgrupa).trim(),
    nusistippa: String(parametroEliminado.nusistippa).trim(),
    nusisvalpa: parametroEliminado.nusisvalpa,
  }
}

/**
 * Contar total de parámetros
 * @returns {Promise<number>} Total de parámetros en BD
 */
async function count() {
  const prisma = getPrisma()
  return await prisma.nusispar.count()
}

module.exports = {
  listAll,
  listByGrupo,
  findOne,
  update,
  create,
  remove,
  count,
}
