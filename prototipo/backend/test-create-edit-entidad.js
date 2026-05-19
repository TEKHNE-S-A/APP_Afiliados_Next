const cartillaRepository = require('./repositories/cartillaRepository');

// Helper para convertir BigInt a string en JSON
BigInt.prototype.toJSON = function() { return this.toString(); };

async function test() {
  try {
    console.log('\n🔧 TEST: Crear y Editar Entidad\n');
    
    // 1. Crear nueva entidad
    console.log('📝 1. Creando nueva entidad...');
    const formDataCrear = {
      caentdescri: 'TEST CLINICA NUEVA',
      carubid: null, // Omitir cartilla por ahora
      caespid: null,
      caentmatri: null,
      caentdireccion: 'Av. Test 123',
      nulocid: '04853', // Usar ID de localidad real (string)
      caentestado: 'A',
      caentobs: null
    };
    
    const nuevaEntidad = await cartillaRepository.createEntidad(formDataCrear);
    console.log(`✅ Entidad creada: ${nuevaEntidad.caentid}`);
    console.log(`   - Nombre: ${nuevaEntidad.caentdescri}`);
    console.log(`   - Rubro: ${nuevaEntidad.rubro?.carubdescr || 'N/A'}`);
    console.log(`   - Dirección: ${nuevaEntidad.caentdireccion || 'N/A'}`);
    console.log(`   - Estado: ${nuevaEntidad.caentestado}`);
    
    // 2. Editar la entidad recién creada
    console.log('\n✏️  2. Editando entidad...');
    const formDataEditar = {
      caentdescri: 'TEST CLINICA MODIFICADA',
      carubid: '000000007', // Agregar rubro en edición
      caespid: null, // No hay especialidades en BD aún
      caentmatri: 'MAT-12345',
      caentdireccion: 'Av. Test 456 MODIFICADO',
      nulocid: '04969', // Cambiar localidad (string)
      caentestado: 'I', // Cambiar a inactivo
      caentobs: 'Observación de prueba'
    };
    
    const entidadEditada = await cartillaRepository.updateEntidad(nuevaEntidad.caentid, formDataEditar);
    console.log(`✅ Entidad editada: ${entidadEditada.caentid}`);
    console.log(`   - Nombre: ${entidadEditada.caentdescri}`);
    console.log(`   - Especialidad: ${entidadEditada.especialidad?.caespdescr || 'N/A'}`);
    console.log(`   - Dirección: ${entidadEditada.caentdireccion || 'N/A'}`);
    console.log(`   - Estado: ${entidadEditada.caentestado}`);
    
    // 3. Verificar que se guardó correctamente
    console.log('\n🔍 3. Verificando datos guardados...');
    const verificacion = await cartillaRepository.getEntidadById(nuevaEntidad.caentid);
    
    const checks = {
      'Nombre actualizado': verificacion.caentdescri.includes('MODIFICADA'),
      'Estado inactivo': verificacion.caentestado === 'I',
      'Dirección actualizada': verificacion.caentdireccion?.includes('MODIFICADO'),
      'Tiene cartilla': verificacion.cartillas.length > 0,
      'Tiene dirección': verificacion.direcciones.length > 0
    };
    
    console.log('\nResultados:');
    Object.entries(checks).forEach(([test, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${test}`);
    });
    
    const allPassed = Object.values(checks).every(v => v);
    console.log(`\n${allPassed ? '🎉 TODAS LAS PRUEBAS PASARON' : '⚠️  ALGUNAS PRUEBAS FALLARON'}\n`);
    
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
