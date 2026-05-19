const { getPrisma } = require('../db/prismaClient')

async function main() {
  const prisma = getPrisma()
  try {
    const row = await prisma.nusispar.findFirst({
      select: { nusisgrupa: true, nusistippa: true, nusisvalpa: true },
    })
    console.log('Prisma OK; sample:', row)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('Prisma FAIL:', e)
  process.exitCode = 1
})
