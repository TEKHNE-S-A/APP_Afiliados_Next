const axios = require('axios');

async function testMatriculaObservaciones() {
  try {
    console.log('\n🧪 TEST: Guardar matrícula y observaciones\n');
    
    // 1. Login
    console.log('1️⃣ Login...');
    const loginResponse = await axios.post('http://localhost:3000/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log(`✅ Login OK - Token: ${token.substring(0, 20)}...`);
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. Crear entidad con matrícula y observaciones
    console.log('\n2️⃣ Crear entidad con matrícula y observaciones...');
    const createData = {
      caentdescri: 'DR. JUAN PÉREZ - TEST MATRÍCULA',
      carubid: '000000001',
      caentdireccion: 'Av. Belgrano 1234',
      nulocid: '00001',
      caentestado: 'A',
      caentmatri: 'MP 12345/6 - MATRICULA TEST', // Campo nuevo
      caentobs: 'Atiende de lunes a viernes de 9 a 17hs. Requiere turno previo. TEST OBSERVACIONES.' // Campo nuevo
    };
    
    const createResponse = await axios.post(
      'http://localhost:3000/admin/cartilla/entidades',
      createData,
      { headers }
    );
    
    const entidadId = createResponse.data.caentid;
    console.log(`✅ Entidad creada - ID: ${entidadId}`);
    console.log(`   📋 Matrícula guardada: ${createResponse.data.caentmatri || 'NO GUARDADO ❌'}`);
    console.log(`   📝 Observaciones guardadas: ${createResponse.data.caentobs ? createResponse.data.caentobs.substring(0, 50) + '...' : 'NO GUARDADO ❌'}`);
    
    // 3. Obtener entidad para verificar
    console.log('\n3️⃣ Verificar datos guardados...');
    const getResponse = await axios.get(
      `http://localhost:3000/admin/cartilla/entidades/${entidadId}`,
      { headers }
    );
    
    const entidad = getResponse.data;
    console.log('✅ Entidad recuperada:');
    console.log(`   - Nombre: ${entidad.caentdescri}`);
    console.log(`   - Matrícula: ${entidad.caentmatri || 'NULL ❌'}`);
    console.log(`   - Observaciones: ${entidad.caentobs || 'NULL ❌'}`);
    
    // 4. Validar
    console.log('\n🔍 Validación:');
    const matriculaOK = entidad.caentmatri === createData.caentmatri;
    const obsOK = entidad.caentobs === createData.caentobs;
    
    console.log(`   ${matriculaOK ? '✅' : '❌'} Matrícula: ${matriculaOK ? 'OK' : 'FALLO'}`);
    console.log(`   ${obsOK ? '✅' : '❌'} Observaciones: ${obsOK ? 'OK' : 'FALLO'}`);
    
    if (matriculaOK && obsOK) {
      console.log('\n🎉 TEST EXITOSO - Los campos se guardan correctamente\n');
    } else {
      console.log('\n❌ TEST FALLIDO - Los campos NO se guardaron correctamente\n');
      process.exit(1);
    }
    
    // 5. Test de edición
    console.log('4️⃣ Test de edición...');
    const updateData = {
      ...createData,
      caentmatri: 'MP 99999/8 - MATRICULA EDITADA',
      caentobs: 'Observaciones actualizadas - NUEVA INFO'
    };
    
    const updateResponse = await axios.put(
      `http://localhost:3000/admin/cartilla/entidades/${entidadId}`,
      updateData,
      { headers }
    );
    
    console.log('✅ Entidad actualizada:');
    console.log(`   - Matrícula nueva: ${updateResponse.data.caentmatri || 'NULL ❌'}`);
    console.log(`   - Observaciones nuevas: ${updateResponse.data.caentobs || 'NULL ❌'}`);
    
    const matriculaEditadaOK = updateResponse.data.caentmatri === updateData.caentmatri;
    const obsEditadaOK = updateResponse.data.caentobs === updateData.caentobs;
    
    console.log(`\n   ${matriculaEditadaOK ? '✅' : '❌'} Matrícula editada: ${matriculaEditadaOK ? 'OK' : 'FALLO'}`);
    console.log(`   ${obsEditadaOK ? '✅' : '❌'} Observaciones editadas: ${obsEditadaOK ? 'OK' : 'FALLO'}`);
    
    if (matriculaEditadaOK && obsEditadaOK) {
      console.log('\n🎉 TEST COMPLETO EXITOSO\n');
    } else {
      console.log('\n❌ TEST DE EDICIÓN FALLIDO\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error en test:', error.response?.data || error.message);
    process.exit(1);
  }
}

testMatriculaObservaciones();
