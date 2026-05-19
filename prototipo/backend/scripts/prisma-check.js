const { getPrisma } = require('../db/prismaClient')

async function main() {
  const prisma = getPrisma()

  // Query mínima contra un modelo ya usado en el backend.
  const total = await prisma.nusispar.count()

  console.log(JSON.stringify({
    ok: true,
    model: 'nusispar',
    total
  }))

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('PRISMA_CHECK_ERROR:', err && (err.stack || err))
  process.exit(1)
})
