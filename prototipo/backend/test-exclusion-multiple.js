/**
 * Test de exclusión múltiple de rubros en /api/cartilla
 * Prueba que la cartilla excluya FARMACIAS (000000008) y DELEGACIONES (000000009)
 */

async function testExclusionMultiple() {
  console.log('🧪 Test de Exclusión Múltiple de Rubros\n');
  
  try {
    // Test 1: Sin exclusiones (traer TODO)
    console.log('📊 Test 1: SIN exclusiones (traer todas las entidades activas)');
    const url1 = 'http://localhost:3000/api/cartilla?limit=100&page=1';
    const resp1 = await fetch(url1);
    const data1 = await resp1.json();
    
    console.log(`   Total entidades: ${data1.data?.length || 0}`);
    
    // Contar rubros
    const rubros1 = {};
    data1.data?.forEach(e => {
      const rubro = e.carubdescr || 'SIN_RUBRO';
      rubros1[rubro] = (rubros1[rubro] || 0) + 1;
    });
    
    console.log('   Distribución por rubro:');
    Object.entries(rubros1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([rubro, count]) => {
        console.log(`   - ${rubro}: ${count}`);
      });
    
    // Test 2: Excluir FARMACIAS (000000008)
    console.log('\n📊 Test 2: Excluir FARMACIAS (000000008)');
    const url2 = 'http://localhost:3000/api/cartilla?limit=100&page=1&excludeRubroId=000000008';
    const resp2 = await fetch(url2);
    const data2 = await resp2.json();
    
    console.log(`   Total entidades: ${data2.data?.length || 0}`);
    
    const rubros2 = {};
    data2.data?.forEach(e => {
      const rubro = e.carubdescr || 'SIN_RUBRO';
      rubros2[rubro] = (rubros2[rubro] || 0) + 1;
    });
    
    console.log('   Distribución por rubro:');
    Object.entries(rubros2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([rubro, count]) => {
        console.log(`   - ${rubro}: ${count}`);
      });
    
    const tieneFarmacias = data2.data?.some(e => (e.carubdescr || '').trim().toUpperCase() === 'FARMACIA');
    console.log(`   ¿Tiene farmacias? ${tieneFarmacias ? '❌ ERROR' : '✅ OK'}`);
    
    // Test 3: Excluir FARMACIAS Y DELEGACIONES (múltiple)
    console.log('\n📊 Test 3: Excluir FARMACIAS (000000008) Y DELEGACIONES (000000009) - MÚLTIPLE');
    const url3 = 'http://localhost:3000/api/cartilla?limit=100&page=1&excludeRubroId=000000008&excludeRubroId=000000009';
    const resp3 = await fetch(url3);
    const data3 = await resp3.json();
    
    console.log(`   Total entidades: ${data3.data?.length || 0}`);
    
    const rubros3 = {};
    data3.data?.forEach(e => {
      const rubro = e.carubdescr || 'SIN_RUBRO';
      rubros3[rubro] = (rubros3[rubro] || 0) + 1;
    });
    
    console.log('   Distribución por rubro:');
    Object.entries(rubros3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([rubro, count]) => {
        console.log(`   - ${rubro}: ${count}`);
      });
    
    const tieneFarmacias3 = data3.data?.some(e => (e.carubdescr || '').trim().toUpperCase() === 'FARMACIA');
    const tieneDelegaciones3 = data3.data?.some(e => (e.carubdescr || '').trim().toUpperCase() === 'DELEGACION');
    
    console.log(`   ¿Tiene farmacias? ${tieneFarmacias3 ? '❌ ERROR' : '✅ OK'}`);
    console.log(`   ¿Tiene delegaciones? ${tieneDelegaciones3 ? '❌ ERROR' : '✅ OK'}`);
    
    // Resumen final
    console.log('\n📈 Resumen Comparativo:');
    console.log(`   Sin exclusiones: ${data1.data?.length || 0} entidades`);
    console.log(`   Sin farmacias: ${data2.data?.length || 0} entidades`);
    console.log(`   Sin farmacias ni delegaciones: ${data3.data?.length || 0} entidades`);

    const countRubro = (data, rubro) =>
      (data?.data || []).filter(e => (e.carubdescr || '').trim().toUpperCase() === rubro).length;

    const f1 = countRubro(data1, 'FARMACIA');
    const f2 = countRubro(data2, 'FARMACIA');
    const f3 = countRubro(data3, 'FARMACIA');
    const d1 = countRubro(data1, 'DELEGACION');
    const d2 = countRubro(data2, 'DELEGACION');
    const d3 = countRubro(data3, 'DELEGACION');

    console.log(`\n   Farmacias (sin excl / excl farm / excl farm+del): ${f1} / ${f2} / ${f3}`);
    console.log(`   Delegaciones (sin excl / excl farm / excl farm+del): ${d1} / ${d2} / ${d3}`);
    
    console.log('\n✅ Test completado');
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
    console.error(error);
  }
}

testExclusionMultiple();
