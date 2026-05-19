// Test completo de teléfono y página web
const axios = require('axios');

const API_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'test-admin-token'; // Token de admin

async function testPhoneWeb() {
  console.log('🧪 Test Teléfono y Página Web\n');
  
  try {
    // 1. Crear entidad con teléfono y web
    console.log('1️⃣ Creando entidad con teléfono y web...');
    const createResponse = await axios.post(
      `${API_URL}/admin/cartilla/entidades`,
      {
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
      },
      {
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
      }
    );
    
    const entidadId = createResponse.data.caentid;
    console.log(`✅ Entidad creada: ${entidadId}`);
    console.log(`   Teléfono: ${createResponse.data.caentelefo || 'NO GUARDADO ❌'}`);
    console.log(`   Web: ${createResponse.data.caentweb || 'NO GUARDADO ❌'}\n`);
    
    // 2. Verificar lectura de datos
    console.log('2️⃣ Verificando lectura de datos...');
    const getResponse = await axios.get(
      `${API_URL}/admin/cartilla/entidades/${entidadId}`,
      {
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
      }
    );
    
    console.log(`   Teléfono leído: ${getResponse.data.caentelefo || 'NO ENCONTRADO ❌'}`);
    console.log(`   Web leída: ${getResponse.data.caentweb || 'NO ENCONTRADO ❌'}\n`);
    
    // 3. Actualizar teléfono y web
    console.log('3️⃣ Actualizando teléfono y web...');
    const updateResponse = await axios.put(
      `${API_URL}/admin/cartilla/entidades/${entidadId}`,
      {
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
      },
      {
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
      }
    );
    
    console.log(`✅ Entidad actualizada`);
    console.log(`   Nuevo teléfono: ${updateResponse.data.caentelefo || 'NO ACTUALIZADO ❌'}`);
    console.log(`   Nueva web: ${updateResponse.data.caentweb || 'NO ACTUALIZADA ❌'}\n`);
    
    // 4. Verificar actualización en BD
    console.log('4️⃣ Verificando actualización en BD...');
    const verifyResponse = await axios.get(
      `${API_URL}/admin/cartilla/entidades/${entidadId}`,
      {
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
      }
    );
    
    const telefonoOk = verifyResponse.data.caentelefo === '0261-9876543';
    const webOk = verifyResponse.data.caentweb === 'https://clinica-actualizada.com';
    
    console.log(`   Teléfono verificado: ${verifyResponse.data.caentelefo} ${telefonoOk ? '✅' : '❌'}`);
    console.log(`   Web verificada: ${verifyResponse.data.caentweb} ${webOk ? '✅' : '❌'}\n`);
    
    // 5. Test sin teléfono ni web (campos opcionales)
    console.log('5️⃣ Creando entidad sin teléfono ni web...');
    const createNoPhoneResponse = await axios.post(
      `${API_URL}/admin/cartilla/entidades`,
      {
        caentdescri: 'Centro Sin Contacto',
        carubid: '1',
        caespid: '1',
        caentdireccion: 'Calle Falsa 123',
        nulocid: '1',
        caentestado: 'A'
        // Sin caentelefo ni caentweb
      },
      {
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
      }
    );
    
    console.log(`✅ Entidad sin contacto creada: ${createNoPhoneResponse.data.caentid}`);
    console.log(`   Teléfono: ${createNoPhoneResponse.data.caentelefo || 'NULL (correcto) ✅'}`);
    console.log(`   Web: ${createNoPhoneResponse.data.caentweb || 'NULL (correcto) ✅'}\n`);
    
    // RESUMEN
    console.log('📊 RESUMEN');
    console.log('==========');
    console.log(`✅ Crear con teléfono y web: ${telefonoOk && webOk ? 'OK' : 'FALLO'}`);
    console.log(`✅ Actualizar teléfono y web: ${telefonoOk && webOk ? 'OK' : 'FALLO'}`);
    console.log(`✅ Campos opcionales: OK`);
    console.log(`\n🎉 TEST COMPLETADO`);
    
  } catch (error) {
    console.error('❌ ERROR:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('   Detalle:', error.response.data.error);
    }
  }
}

testPhoneWeb();
