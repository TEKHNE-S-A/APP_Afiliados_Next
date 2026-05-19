// Test directo del repository (sin autenticación)
const cartillaRepository = require('./repositories/cartillaRepository');

async function testPhoneWebDirect() {
  console.log('🧪 Test Directo Teléfono y Página Web\n');
  
  try {
    // 1. Crear entidad con teléfono y web
    console.log('1️⃣ Creando entidad con teléfono y web...');
    const newEntidad = await cartillaRepository.createEntidad({
      caentdescri: 'Centro Médico Test Phone Web',
      carubid: '1',
      caespid: '1',
      caentmatri: 'MP 12345',
      caentelefo: '0261-4123456',
      caentweb: 'https://ejemplo-clinica.com',
      caentdireccion: 'Av. San Martín 123',
      nulocid: '1',
      caentestado: 'A',
      caentobs: 'Test de teléfono y web'
    });
    
    console.log(`✅ Entidad creada: ${newEntidad.caentid}`);
    console.log(`   Teléfono: ${newEntidad.caentelefo || 'NO GUARDADO ❌'}`);
    console.log(`   Web: ${newEntidad.caentweb || 'NO GUARDADO ❌'}\n`);
    
    // 2. Verificar lectura de datos
    console.log('2️⃣ Verificando lectura de datos...');
    const getEntidad = await cartillaRepository.getEntidadById(newEntidad.caentid);
    
    console.log(`   Teléfono leído: ${getEntidad.caentelefo || 'NO ENCONTRADO ❌'}`);
    console.log(`   Web leída: ${getEntidad.caentweb || 'NO ENCONTRADO ❌'}\n`);
    
    // 3. Actualizar teléfono y web
    console.log('3️⃣ Actualizando teléfono y web...');
    const updatedEntidad = await cartillaRepository.updateEntidad(newEntidad.caentid, {
      caentdescri: 'Centro Médico Test Phone Web',
      carubid: '1',
      caespid: '1',
      caentmatri: 'MP 12345',
      caentelefo: '0261-9876543', // NUEVO TELÉFONO
      caentweb: 'https://clinica-actualizada.com', // NUEVA WEB
      caentdireccion: 'Av. San Martín 123',
      nulocid: '1',
      caentestado: 'A',
      caentobs: 'Test actualizado'
    });
    
    console.log(`✅ Entidad actualizada`);
    console.log(`   Nuevo teléfono: ${updatedEntidad.caentelefo || 'NO ACTUALIZADO ❌'}`);
    console.log(`   Nueva web: ${updatedEntidad.caentweb || 'NO ACTUALIZADA ❌'}\n`);
    
    // 4. Verificar actualización en BD
    console.log('4️⃣ Verificando actualización en BD...');
    const verifyEntidad = await cartillaRepository.getEntidadById(newEntidad.caentid);
    
    const telefonoOk = verifyEntidad.caentelefo === '0261-9876543';
    const webOk = verifyEntidad.caentweb === 'https://clinica-actualizada.com';
    
    console.log(`   Teléfono verificado: ${verifyEntidad.caentelefo} ${telefonoOk ? '✅' : '❌'}`);
    console.log(`   Web verificada: ${verifyEntidad.caentweb} ${webOk ? '✅' : '❌'}\n`);
    
    // RESUMEN
    console.log('📊 RESUMEN');
    console.log('==========');
    console.log(`Crear con teléfono y web: ${newEntidad.caentelefo && newEntidad.caentweb ? '✅ OK' : '❌ FALLO'}`);
    console.log(`Leer teléfono y web: ${getEntidad.caentelefo && getEntidad.caentweb ? '✅ OK' : '❌ FALLO'}`);
    console.log(`Actualizar teléfono y web: ${telefonoOk && webOk ? '✅ OK' : '❌ FALLO'}`);
    console.log(`\n🎉 TEST COMPLETADO`);
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

testPhoneWebDirect();
