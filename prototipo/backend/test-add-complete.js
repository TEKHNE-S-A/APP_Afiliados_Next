// Buscar entidad con dirección y agregarle teléfono y web
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPhoneWebToEntityWithAddress() {
  console.log('🔧 Buscando entidad con dirección\n');
  
  try {
    // Buscar entidad que tenga dirección
    const direcciones = await prisma.caendire.findMany({
      take: 1
    });
    
    if (direcciones.length === 0) {
      console.log('❌ No hay direcciones en la BD');
      return;
    }
    
    const entidadId = direcciones[0].caentid;
    
    const entidad = await prisma.caentida.findUnique({
      where: { caentid: entidadId }
    });
    
    console.log(`📝 Entidad con dirección: ${entidadId}`);
    console.log(`   Nombre: ${entidad.caentapeno}\n`);
    
    // Actualizar caentweb
    await prisma.caentida.update({
      where: { caentid: entidadId },
      data: {
        caentweb: 'https://www.clinica-test-completa.com.ar'
      }
    });
    
    console.log('✅ Campo caentweb actualizado');
    
    // Verificar si ya tiene teléfono
    const telefonoExistente = await prisma.caentele.findFirst({
      where: { caentid: entidadId }
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
          caentelefo: '0261-4567890',
          caentelepr: 'S'
        }
      });
      console.log('✅ Teléfono existente actualizado\n');
    } else {
      // Crear nuevo teléfono
      const telefonoId = `${entidadId.substring(0, 20)}T1`.padEnd(30);
      await prisma.caentele.create({
        data: {
          caentid: entidadId,
          caendid: direcciones[0].caendid,
          caenteleid: telefonoId,
          caentelefo: '0261-4567890',
          caentelepr: 'S'
        }
      });
      console.log('✅ Nuevo teléfono creado\n');
    }
    
    // Verificar resultado final con el repository
    const cartillaRepository = require('./repositories/cartillaRepository');
    const resultado = await cartillaRepository.getEntidadById(entidadId);
    
    console.log('📤 Resultado final de getEntidadById:');
    console.log(`   caentid: ${resultado.caentid}`);
    console.log(`   caentdescri: ${resultado.caentdescri}`);
    console.log(`   caentweb: ${resultado.caentweb}`);
    console.log(`   caentelefo: ${resultado.caentelefo}\n`);
    
    if (resultado.caentweb && resultado.caentelefo) {
      console.log('✅✅✅ ¡PERFECTO! Backend devuelve teléfono y web correctamente\n');
      console.log('🌐 PRUEBA EN FRONTEND:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`1. Abre: http://localhost:3000/admin/cartilla`);
      console.log(`2. Busca la entidad: "${resultado.caentdescri}"`);
      console.log(`3. Haz clic en el botón "Ver Detalle" 👁️`);
      console.log(`4. Verifica que se muestren:`);
      console.log(`   📞 Teléfono: ${resultado.caentelefo}`);
      console.log(`   🌐 Página Web: ${resultado.caentweb} (debe ser un link clickeable)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('❌ Algunos campos siguen NULL');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

addPhoneWebToEntityWithAddress();
