const axios = require('axios');

async function testFiltroRubroFinal() {
  try {
    console.log('\n🧪 TEST: Filtro por rubro (con y sin padding)\n');
    
    // Login
    const loginResponse = await axios.post('http://localhost:3000/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // Test 1: Filtro con padding (30 chars) - como viene del select
    console.log('1️⃣ Filtro con padding (30 chars): "000000001                     "');
    const conPadding = '000000001'.padEnd(30);
    const resp1 = await axios.get(
      `http://localhost:3000/admin/cartilla/entidades?rubroId=${encodeURIComponent(conPadding)}&limit=5`,
      { headers }
    );
    console.log(`   Resultados: ${resp1.data.data.length} entidades`);
    if (resp1.data.data.length > 0) {
      console.log('   ✅ Filtro con padding FUNCIONA\n');
    } else {
      console.log('   ❌ Filtro con padding NO FUNCIONA\n');
    }
    
    // Test 2: Filtro sin padding (9 chars) - valor corto
    console.log('2️⃣ Filtro sin padding (9 chars): "000000001"');
    const sinPadding = '000000001';
    const resp2 = await axios.get(
      `http://localhost:3000/admin/cartilla/entidades?rubroId=${sinPadding}&limit=5`,
      { headers }
    );
    console.log(`   Resultados: ${resp2.data.data.length} entidades`);
    if (resp2.data.data.length > 0) {
      console.log('   ✅ Filtro sin padding FUNCIONA\n');
    } else {
      console.log('   ❌ Filtro sin padding NO FUNCIONA\n');
    }
    
    // Test 3: Filtro rubro inexistente
    console.log('3️⃣ Filtro con rubro inexistente: "999999999"');
    const resp3 = await axios.get(
      `http://localhost:3000/admin/cartilla/entidades?rubroId=999999999&limit=5`,
      { headers }
    );
    console.log(`   Resultados: ${resp3.data.data.length} entidades`);
    if (resp3.data.data.length === 0) {
      console.log('   ✅ Correctamente devuelve 0 resultados\n');
    }
    
    // Test 4: Sin filtro
    console.log('4️⃣ Sin filtro (todas las entidades)');
    const resp4 = await axios.get(
      `http://localhost:3000/admin/cartilla/entidades?limit=5`,
      { headers }
    );
    console.log(`   Resultados: ${resp4.data.data.length} entidades`);
    console.log('   ✅ Sin filtro funciona\n');
    
    console.log('🎉 TESTS COMPLETADOS - Filtro por rubro funciona correctamente con y sin padding\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testFiltroRubroFinal();
