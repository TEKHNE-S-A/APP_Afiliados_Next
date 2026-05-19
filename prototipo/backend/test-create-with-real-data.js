const cartillaRepository = require('./repositories/cartillaRepository');

// Helper para convertir BigInt a string en JSON
BigInt.prototype.toJSON = function() { return this.toString(); };

async function testCreateWithRealData() {
  try {
    console.log('\n🧪 TEST: Crear prestador con datos reales\n');
    
    // Datos reales disponibles después de la importación
    const formData = {
      caentdescri: 'TEST NUEVO PRESTADOR CON DATOS REALES',
      carubid: '000000001', // CENTRO (existe en BD)
      caespid: null, // Sin especialidad por ahora
      caentmatri: 'TEST-12345',
      caentdireccion: 'Av. Test Real 789',
      nulocid: '00001', // CATAMARCA (existe en BD)
      caentestado: 'A',
      caentobs: null
    };
    
    console.log('📝 Creando nueva entidad con:');
    console.log('   - Nombre:', formData.caentdescri);
    console.log('   - Rubro:', formData.carubid);
    console.log('   - Localidad:', formData.nulocid);
    console.log('   - Dirección:', formData.caentdireccion);
    
    const nuevaEntidad = await cartillaRepository.createEntidad(formData);
    
    console.log('\n✅ Entidad creada exitosamente:');
    console.log('   - ID:', nuevaEntidad.caentid);
    console.log('   - Nombre:', nuevaEntidad.caentdescri);
    console.log('   - Rubro:', nuevaEntidad.rubro ? `${nuevaEntidad.rubro.carubid.trim()} - ${nuevaEntidad.rubro.carubdescr.trim()}` : 'N/A');
    console.log('   - Localidad:', nuevaEntidad.localidad ? `${nuevaEntidad.localidad.nulocdescr.trim()}` : 'N/A');
    console.log('   - Dirección:', nuevaEntidad.caentdireccion || 'N/A');
    console.log('   - Estado:', nuevaEntidad.caentestado);
    console.log('   - Total direcciones:', nuevaEntidad.total_direcciones);
    console.log('   - Total cartillas:', nuevaEntidad.cartillas.length);
    
    // Verificaciones
    const checks = {
      'Entidad creada': !!nuevaEntidad.caentid,
      'Tiene nombre': !!nuevaEntidad.caentdescri,
      'Tiene rubro': !!nuevaEntidad.rubro,
      'Tiene dirección': !!nuevaEntidad.caentdireccion,
      'Tiene cartilla': nuevaEntidad.cartillas.length > 0,
      'Estado activo': nuevaEntidad.caentestado === 'A'
    };
    
    console.log('\n🔍 Verificaciones:');
    Object.entries(checks).forEach(([test, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${test}`);
    });
    
    const allPassed = Object.values(checks).every(v => v);
    
    if (allPassed) {
      console.log('\n🎉 TODAS LAS PRUEBAS PASARON - El sistema funciona correctamente\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  ALGUNAS PRUEBAS FALLARON\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error al crear entidad:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

testCreateWithRealData();
