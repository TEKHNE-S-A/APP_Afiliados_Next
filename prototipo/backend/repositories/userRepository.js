const { getPrisma } = require('../db/prismaClient')

function isLikelyDni(value) {
  return typeof value === 'string' && /^\d{7,8}$/.test(value)
}

function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function selectPublicUserFields() {
  return {
    nuusuid: true,
    nuusuafili: true,
    nuusuapell: true,
    nuusumail: true,
    nuusunroaf: true,
    nuusubajaf: true,
  }
}

function selectAuthUserFields() {
  return {
    ...selectPublicUserFields(),
    nuusugamtok: true,
    nuusugamexp: true,
  }
}

async function findPublicById(nuusuidRaw) {
  const prisma = getPrisma()
  const nuusuid = typeof nuusuidRaw === 'string' ? nuusuidRaw.trim() : ''
  if (!nuusuid) return null

  return prisma.nuusuari.findUnique({
    where: { nuusuid },
    select: selectPublicUserFields(),
  })
}

async function findPublicByGamUserId(gamUserIdRaw) {
  const prisma = getPrisma()
  const gamUserId = typeof gamUserIdRaw === 'string' ? gamUserIdRaw.trim() : ''
  if (!gamUserId) return null

  return prisma.nuusuari.findFirst({
    where: {
      nuusuid: gamUserId,
    },
    select: selectAuthUserFields(),
  })
}

async function findPublicByGamToken(tokenRaw) {
  const prisma = getPrisma()
  const token = typeof tokenRaw === 'string' ? tokenRaw.trim() : ''
  if (!token) return null

  return prisma.nuusuari.findFirst({
    where: { nuusugamtok: token },
    select: selectAuthUserFields(),
  })
}

async function findPublicByUsername(usernameRaw) {
  const prisma = getPrisma()
  const username = normalizeUsername(usernameRaw)
  if (!username) return null

  const baseSelect = selectPublicUserFields()

  // 1) Email (case-insensitive, para evitar fallos por mayúsculas/minúsculas)
  const byEmail = await prisma.nuusuari.findFirst({
    where: { nuusumail: { equals: username, mode: 'insensitive' } },
    select: baseSelect,
  })
  if (byEmail) return byEmail

  // 2) Nro afiliado / CUIL exacto
  const byNroAf = await prisma.nuusuari.findFirst({
    where: { nuusunroaf: username },
    select: baseSelect,
  })
  if (byNroAf) return byNroAf

  // 3) DNI dentro del CUIL
  if (isLikelyDni(username)) {
    const byDniContains = await prisma.nuusuari.findFirst({
      where: { nuusunroaf: { contains: username } },
      select: baseSelect,
    })
    if (byDniContains) return byDniContains
  }

  return null
}

async function findForLogin(usernameRaw) {
  const prisma = getPrisma()
  const username = normalizeUsername(usernameRaw)
  if (!username) return null

  const baseSelect = {
    ...selectPublicUserFields(),
    nurolid: true,
    nuusuauth: { select: { nuusupass: true } },
  }

  const byEmail = await prisma.nuusuari.findFirst({
    where: { nuusumail: { equals: username, mode: 'insensitive' } },
    select: baseSelect,
  })
  if (byEmail) return byEmail

  const byNroAf = await prisma.nuusuari.findFirst({
    where: { nuusunroaf: username },
    select: baseSelect,
  })
  if (byNroAf) return byNroAf

  if (isLikelyDni(username)) {
    const byDniContains = await prisma.nuusuari.findFirst({
      where: { nuusunroaf: { contains: username } },
      select: baseSelect,
    })
    if (byDniContains) return byDniContains
  }

  return null
}

module.exports = {
  findPublicByUsername,
  findForLogin,
  findPublicById,
  findPublicByGamUserId,
  findPublicByGamToken,
}
