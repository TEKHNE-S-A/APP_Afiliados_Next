// Actualizar una entidad existente con teléfono y web
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPhoneWebToExisting() {
  console.log('🔧 Agregando teléfono y web a entidad existente\n');
  
  try {
    // Obtener primera entidad activa
    const entidad = await prisma.caentida.findFirst({
      where: { caentmarca: true }
    });
    
    if (!entidad) {
      console.log('❌ No hay entidades en la BD');
      return;
    }
    
    console.log(`📝 Entidad seleccionada: ${entidad.caentid}`);
    console.log(`   Nombre: ${entidad.caentapeno}\n`);
    
    // Actualizar caentweb
    await prisma.caentida.update({
      where: { caentid: entidad.caentid },
      data: {
        caentweb: 'https://www.ejemplo-clinica-test.com.ar'
      }
    });
    
    console.log('✅ Campo caentweb actualizado\n');
    
    // Buscar si ya tiene dirección
    const direccion = await prisma.caendire.findFirst({
      where: { caentid: entidad.caentid }
    });
    
    if (!direccion) {
      console.log('⚠️  Entidad no tiene dirección, no se puede agregar teléfono');
    } else {
      // Verificar si ya tiene teléfono
      const telefonoExistente = await prisma.caentele.findFirst({
        where: { caentid: entidad.caentid }
      });
      
      if (telefonoExistente) {
        // Actualizar teléfono existente
        await prisma.caentele.update({
          where: { 
            caentid_caendid_caenteleid: {
              caentid: telefonoExistente.caentid,
              caendid: telefonoExistente.caendid,
              caenteleid: telefonoExistente.caenteleid
            }
          },
          data: {
            caentelefo: '0261-TEST123',
            caentelepr: 'S'
          }
        });
        console.log('✅ Teléfono existente actualizado\n');
      } else {
        // Crear nuevo teléfono
        const telefonoId = `${entidad.caentid.substring(0, 20)}99`.padEnd(30);
        await prisma.caentele.create({
          data: {
            caentid: entidad.caentid,
            caendid: direccion.caendid,
            caenteleid: telefonoId,
            caentelefo: '0261-TEST123',
            caentelepr: 'S'
          }
        });
        console.log('✅ Nuevo teléfono creado\n');
      }
    }
    
    // Verificar resultado final
    const cartillaRepository = require('./repositories/cartillaRepository');
    const resultado = await cartillaRepository.getEntidadById(entidad.caentid);
    
    console.log('📤 Resultado final de getEntidadById:');
    console.log(`   caentweb: ${resultado.caentweb || 'NULL'}`);
    console.log(`   caentelefo: ${resultado.caentelefo || 'NULL'}\n`);
    
    if (resultado.caentweb && resultado.caentelefo) {
      console.log('✅ ¡Perfecto! Ahora esta entidad tiene teléfono y web');
      console.log(`\n🌐 Prueba en el frontend:`);
      console.log(`   http://localhost:3000/admin/cartilla`);
      console.log(`   Busca la entidad: ${resultado.caentdescri}`);
      console.log(`   Haz clic en "Ver Detalle" y verifica que se muestren:`);
      console.log(`   - Teléfono: ${resultado.caentelefo}`);
      console.log(`   - Página Web: ${resultado.caentweb}`);
    } else {
      console.log('⚠️  Algunos campos siguen NULL');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

addPhoneWebToExisting();
