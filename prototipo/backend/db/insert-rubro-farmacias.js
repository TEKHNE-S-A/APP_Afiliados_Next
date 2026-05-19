/**
 * Script para insertar rubro FARMACIAS en tabla carubro
 * Semana 18 - Preparación para módulo Farmacias
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function insertRubroFarmacias() {
  try {
    console.log('🏥 Insertando rubro FARMACIAS...\n')

    // Obtener el siguiente ID disponible
    const maxRubro = await prisma.carubro.findFirst({
      orderBy: { carubid: 'desc' }
    })

    const nextId = maxRubro 
      ? String(parseInt(maxRubro.carubid.trim()) + 1).padStart(9, '0')
      : '000000008'

    console.log(`   Último ID: ${maxRubro?.carubid.trim()}`)
    console.log(`   Nuevo ID:  ${nextId}`)

    // Verificar si ya existe
    const existing = await prisma.carubro.findUnique({
      where: { carubid: nextId.padEnd(30, ' ') }
    })

    if (existing) {
      console.log('\n⚠️  El rubro FARMACIAS ya existe')
      console.log(`   ID: ${existing.carubid.trim()} | ${existing.carubdescr}`)
      return
    }

    // Insertar nuevo rubro
    const nuevoRubro = await prisma.carubro.create({
      data: {
        carubid: nextId.padEnd(30, ' '),    // CHAR(30) con padding
        carubdescr: 'FARMACIA',              // VARCHAR(40)
        carubtipor: 'FAR'                    // CHAR(3) - código tipo rubro
      }
    })

    console.log('\n✅ Rubro FARMACIAS insertado exitosamente')
    console.log(`   ID: ${nuevoRubro.carubid.trim()}`)
    console.log(`   Descripción: ${nuevoRubro.carubdescr}`)

    // Listar todos los rubros
    console.log('\n📋 Rubros actuales:')
    const rubros = await prisma.carubro.findMany({
      orderBy: { carubdescr: 'asc' }
    })

    rubros.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.carubid.trim().padEnd(12)} | ${r.carubdescr}`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

insertRubroFarmacias()
