function ensureDatabaseUrlFromLegacyEnv() {
  if (process.env.DATABASE_URL) return

  const host = process.env.DB_HOST || '127.0.0.1'
  const port = process.env.DB_PORT || 5432
  const user = process.env.DB_USER || 'postgres'
  const password = process.env.DB_PASSWORD || '12345678'
  const database = process.env.DB_NAME || 'app_afiliados_genexus'

  const encodedPassword = encodeURIComponent(password)
  process.env.DATABASE_URL = `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}?schema=public`
}

let prismaSingleton = null

function getPrisma() {
  if (prismaSingleton) return prismaSingleton

  ensureDatabaseUrlFromLegacyEnv()

  // Lazy require para que el backend no falle antes de instalar dependencias.
  // (Una vez instaladas, Prisma usará DATABASE_URL o derivará de DB_*.)
  const { PrismaClient } = require('@prisma/client')
  prismaSingleton = new PrismaClient()
  return prismaSingleton
}

module.exports = {
  getPrisma,
}
