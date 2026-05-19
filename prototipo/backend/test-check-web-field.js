// Test simplificado: Verificar si el backend devuelve caentweb
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWebField() {
  console.log('🔍 Verificando campo caentweb en getEntidadById\n');
  
  try {
    // Obtener una entidad existente
    const entidades = await prisma.caentida.findMany({
      take: 1,
      where: { caentmarca: true } // Buscar activa
    });
    
    if (entidades.length === 0) {
      console.log('❌ No hay entidades en la base de datos');
      return;
    }
    
    const entidadId = entidades[0].caentid;
    console.log(`📝 Entidad de prueba: ${entidadId}`);
    console.log(`   Nombre: ${entidades[0].caentapeno}`);
    console.log(`   Web directo de BD: ${entidades[0].caentweb || 'NULL'}\n`);
    
    // Simular getEntidadById manualmente
    const entidad = await prisma.caentida.findUnique({
      where: { caentid: entidadId }
    });
    
    const telefonos = await prisma.caentele.findMany({
      where: { caentid: entidadId }
    });
    
    const primerTelefono = telefonos.length > 0 ? telefonos[0] : null;
    
    console.log('🔎 Datos que debería devolver getEntidadById:');
    console.log(`   caentweb: ${entidad.caentweb || 'NULL'}`);
    console.log(`   caentelefo: ${primerTelefono?.caentelefo || 'NULL'}\n`);
    
    // Ahora usar el repository
    const cartillaRepository = require('./repositories/cartillaRepository');
    const resultado = await cartillaRepository.getEntidadById(entidadId);
    
    console.log('📤 Resultado de getEntidadById:');
    console.log(`   caentweb: ${resultado.caentweb || 'NO DEVUELTO ❌'}`);
    console.log(`   caentelefo: ${resultado.caentelefo || 'NO DEVUELTO ❌'}\n`);
    
    if (resultado.caentweb) {
      console.log('✅ caentweb se está devolviendo correctamente');
    } else {
      console.log('❌ caentweb NO se está devolviendo');
    }
    
    if (primerTelefono && resultado.caentelefo) {
      console.log('✅ caentelefo se está devolviendo correctamente');
    } else if (primerTelefono) {
      console.log('❌ caentelefo NO se está devolviendo (hay teléfono en BD)');
    } else {
      console.log('ℹ️  No hay teléfono en BD para esta entidad');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkWebField();
