const axios = require('axios');

async function testValidacionObligatoria() {
  try {
    console.log('\n🧪 TEST: Validación campos obligatorios (Rubro y Especialidad)\n');
    
    // 1. Login
    console.log('1️⃣ Login...');
    const loginResponse = await axios.post('http://localhost:3000/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login OK\n');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. Intentar crear sin rubro (debe fallar)
    console.log('2️⃣ Intentar crear entidad SIN rubro...');
    try {
      await axios.post(
        'http://localhost:3000/admin/cartilla/entidades',
        {
          caentdescri: 'Test sin rubro',
          caentdireccion: 'Calle Test 123',
          nulocid: '00001',
          caentestado: 'A',
          caespid: 'FON' // Tiene especialidad pero NO rubro
        },
        { headers }
      );
      console.log('❌ NO validó - Se creó sin rubro (ERROR)\n');
      process.exit(1);
    } catch (error) {
      if (error.response?.data?.error?.includes('Rubro es obligatorio')) {
        console.log('✅ Validación OK - Rechazó sin rubro');
        console.log(`   Mensaje: "${error.response.data.error}"\n`);
      } else {
        console.log('❌ Error inesperado:', error.response?.data || error.message);
        process.exit(1);
      }
    }
    
    // 3. Intentar crear sin especialidad (debe fallar)
    console.log('3️⃣ Intentar crear entidad SIN especialidad...');
    try {
      await axios.post(
        'http://localhost:3000/admin/cartilla/entidades',
        {
          caentdescri: 'Test sin especialidad',
          carubid: '000000001', // Tiene rubro pero NO especialidad
          caentdireccion: 'Calle Test 123',
          nulocid: '00001',
          caentestado: 'A'
        },
        { headers }
      );
      console.log('❌ NO validó - Se creó sin especialidad (ERROR)\n');
      process.exit(1);
    } catch (error) {
      if (error.response?.data?.error?.includes('Especialidad es obligatorio')) {
        console.log('✅ Validación OK - Rechazó sin especialidad');
        console.log(`   Mensaje: "${error.response.data.error}"\n`);
      } else {
        console.log('❌ Error inesperado:', error.response?.data || error.message);
        process.exit(1);
      }
    }
    
    // 4. Crear correctamente con ambos campos (debe funcionar)
    console.log('4️⃣ Crear entidad CON rubro Y especialidad...');
    const createResponse = await axios.post(
      'http://localhost:3000/admin/cartilla/entidades',
      {
        caentdescri: 'Test con rubro y especialidad',
        carubid: '000000001',
        caespid: 'FON',
        caentdireccion: 'Calle Test 456',
        nulocid: '00001',
        caentestado: 'A'
      },
      { headers }
    );
    
    const entidadId = createResponse.data.caentid;
    console.log('✅ Creación OK - ID:', entidadId);
    console.log(`   Rubro: ${createResponse.data.rubro?.carubdescr || 'N/A'}`);
    console.log(`   Especialidad: ${createResponse.data.especialidad?.caespdescr || 'N/A'}\n`);
    
    // 5. Intentar editar eliminando rubro (debe fallar)
    console.log('5️⃣ Intentar editar eliminando rubro...');
    try {
      await axios.put(
        `http://localhost:3000/admin/cartilla/entidades/${entidadId}`,
        {
          caentdescri: 'Test editado sin rubro',
          caespid: 'KIN',
          caentdireccion: 'Calle Test 789',
          nulocid: '00001',
          caentestado: 'A'
          // Sin carubid
        },
        { headers }
      );
      console.log('❌ NO validó - Permitió editar sin rubro (ERROR)\n');
      process.exit(1);
    } catch (error) {
      if (error.response?.data?.error?.includes('Rubro es obligatorio')) {
        console.log('✅ Validación OK - Rechazó edición sin rubro');
        console.log(`   Mensaje: "${error.response.data.error}"\n`);
      } else {
        console.log('❌ Error inesperado:', error.response?.data || error.message);
        process.exit(1);
      }
    }
    
    // 6. Intentar editar eliminando especialidad (debe fallar)
    console.log('6️⃣ Intentar editar eliminando especialidad...');
    try {
      await axios.put(
        `http://localhost:3000/admin/cartilla/entidades/${entidadId}`,
        {
          caentdescri: 'Test editado sin especialidad',
          carubid: '000000002',
          caentdireccion: 'Calle Test 789',
          nulocid: '00001',
          caentestado: 'A'
          // Sin caespid
        },
        { headers }
      );
      console.log('❌ NO validó - Permitió editar sin especialidad (ERROR)\n');
      process.exit(1);
    } catch (error) {
      if (error.response?.data?.error?.includes('Especialidad es obligatorio')) {
        console.log('✅ Validación OK - Rechazó edición sin especialidad');
        console.log(`   Mensaje: "${error.response.data.error}"\n`);
      } else {
        console.log('❌ Error inesperado:', error.response?.data || error.message);
        process.exit(1);
      }
    }
    
    // 7. Editar correctamente (debe funcionar)
    console.log('7️⃣ Editar entidad CON rubro Y especialidad...');
    const updateResponse = await axios.put(
      `http://localhost:3000/admin/cartilla/entidades/${entidadId}`,
      {
        caentdescri: 'Test editado correctamente',
        carubid: '000000002',
        caespid: 'NUT',
        caentdireccion: 'Calle Test Editada 999',
        nulocid: '00002',
        caentestado: 'A'
      },
      { headers }
    );
    
    console.log('✅ Edición OK');
    console.log(`   Nuevo rubro: ${updateResponse.data.rubro?.carubdescr || 'N/A'}`);
    console.log(`   Nueva especialidad: ${updateResponse.data.especialidad?.caespdescr || 'N/A'}\n`);
    
    console.log('🎉 TODAS LAS VALIDACIONES PASARON CORRECTAMENTE\n');
    
  } catch (error) {
    console.error('\n❌ Error en test:', error.response?.data || error.message);
    process.exit(1);
  }
}

testValidacionObligatoria();
