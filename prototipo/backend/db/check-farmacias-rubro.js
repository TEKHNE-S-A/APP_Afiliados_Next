/**
 * Script para identificar el rubroId de farmacias en la tabla carubro
 * Semana 18 - Paso 1
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkFarmaciasRubro() {
  try {
    console.log('🔍 Consultando rubros en tabla carubro...\n')

    // Obtener todos los rubros
    const rubros = await prisma.carubro.findMany({
      orderBy: { carubdescr: 'asc' }
    })

    console.log(`📋 Total de rubros encontrados: ${rubros.length}\n`)
    console.log('=' .repeat(80))

    // Mostrar todos los rubros
    rubros.forEach((rubro, index) => {
      console.log(`${index + 1}. ID: ${rubro.carubid.padEnd(10)} | ${rubro.carubdescr}`)
    })

    console.log('=' .repeat(80))

    // Buscar farmacias (case insensitive)
    const farmacias = rubros.filter(r => 
      r.carubdescr.toLowerCase().includes('farmacia')
    )

    if (farmacias.length > 0) {
      console.log('\n✅ FARMACIAS ENCONTRADAS:')
      farmacias.forEach(f => {
        console.log(`   ID: ${f.carubid} | ${f.carubdescr}`)
      })
    } else {
      console.log('\n⚠️  No se encontró rubro "Farmacia" exacto')
      console.log('💡 Posibles alternativas que contienen "farm":')
      
      const alternativas = rubros.filter(r => 
        r.carubdescr.toLowerCase().includes('farm')
      )
      
      if (alternativas.length > 0) {
        alternativas.forEach(a => {
          console.log(`   ID: ${a.carubid} | ${a.carubdescr}`)
        })
      } else {
        console.log('   No se encontraron alternativas')
      }
    }

    // Contar entidades por rubro
    console.log('\n📊 Estadísticas de entidades por rubro:\n')
    
    for (const rubro of rubros) {
      const count = await prisma.caentida.count({
        where: { carubid: rubro.carubid }
      })
      
      if (count > 0) {
        console.log(`   ${rubro.carubdescr.padEnd(30)} : ${count} entidades`)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkFarmaciasRubro()
