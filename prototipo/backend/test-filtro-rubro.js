const axios = require('axios');

async function testFiltroRubro() {
  try {
    console.log('\n🧪 TEST: Filtro por rubro\n');
    
    // 1. Login
    console.log('1️⃣ Login...');
    const loginResponse = await axios.post('http://localhost:3000/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login OK\n');
    
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    // 2. Listar todos
    console.log('2️⃣ Listar TODAS las entidades (sin filtro)...');
    const allResponse = await axios.get(
      'http://localhost:3000/admin/cartilla/entidades?limit=100',
      { headers }
    );
    console.log(`   Total entidades: ${allResponse.data.data.length}`);
    
    // Agrupar por rubro para ver cuántas hay de cada uno
    const porRubro = {};
    for (const entidad of allResponse.data.data) {
      // Obtener detalle para ver el rubro
      const detalleResp = await axios.get(
        `http://localhost:3000/admin/cartilla/entidades/${entidad.caentid}`,
        { headers }
      );
      const rubroId = detalleResp.data.carubid;
      const rubroDesc = detalleResp.data.rubro?.carubdescr || 'Sin rubro';
      
      if (!porRubro[rubroId]) {
        porRubro[rubroId] = { descripcion: rubroDesc, count: 0 };
      }
      porRubro[rubroId].count++;
    }
    
    console.log('\n   Entidades por rubro:');
    Object.keys(porRubro).forEach(id => {
      console.log(`     - ${id.trim()}: ${porRubro[id].descripcion} (${porRubro[id].count} entidades)`);
    });
    
    // 3. Filtrar por rubro CENTRO (000000001)
    console.log('\n3️⃣ Filtrar por rubro CENTRO (000000001)...');
    const filtroResp = await axios.get(
      'http://localhost:3000/admin/cartilla/entidades?rubroId=000000001&limit=100',
      { headers }
    );
    console.log(`   Total entidades filtradas: ${filtroResp.data.data.length}`);
    
    if (filtroResp.data.data.length === 0) {
      console.log('   ❌ NO devolvió resultados (FILTRO NO FUNCIONA)\n');
      
      // Probar con padding completo
      console.log('4️⃣ Probando con padding completo (30 caracteres)...');
      const rubroConPadding = '000000001'.padEnd(30);
      console.log(`   Valor con padding: "${rubroConPadding}" (${rubroConPadding.length} chars)`);
      
      const filtroPaddingResp = await axios.get(
        `http://localhost:3000/admin/cartilla/entidades?rubroId=${encodeURIComponent(rubroConPadding)}&limit=100`,
        { headers }
      );
      console.log(`   Total entidades: ${filtroPaddingResp.data.data.length}`);
      
      if (filtroPaddingResp.data.data.length > 0) {
        console.log('   ✅ Con padding SÍ funciona - Problema: falta padding en la búsqueda\n');
      }
    } else {
      console.log('   ✅ Filtro funciona correctamente\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error en test:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Detalle:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testFiltroRubro();
