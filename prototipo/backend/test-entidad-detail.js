const cartillaRepository = require('./repositories/cartillaRepository');

// Helper para convertir BigInt a string en JSON
BigInt.prototype.toJSON = function() { return this.toString(); };

async function test() {
  try {
    // Obtener todas las entidades (primera)
    const list = await cartillaRepository.listEntidades({ page: 1, limit: 1 });
    console.log('\n📋 Primera entidad de la lista:');
    console.log(JSON.stringify(list.data[0], null, 2));
    
    if (list.data.length > 0) {
      const caentid = list.data[0].caentid;
      console.log(`\n🔍 Obteniendo detalle de: ${caentid}`);
      
      // Obtener detalle completo
      const detalle = await cartillaRepository.getEntidadById(caentid);
      console.log('\n📄 Detalle completo:');
      console.log(JSON.stringify(detalle, null, 2));
      
      // Verificar campos esperados por frontend
      console.log('\n✅ Verificación de campos para frontend:');
      console.log(`  - caentdescri: ${detalle.caentdescri || 'NULL'}`);
      console.log(`  - carubid: ${detalle.carubid || 'NULL'}`);
      console.log(`  - caespid: ${detalle.caespid || 'NULL'}`);
      console.log(`  - rubro.carubdescr: ${detalle.rubro?.carubdescr || 'NULL'}`);
      console.log(`  - especialidad.caespdescr: ${detalle.especialidad?.caespdescr || 'NULL'}`);
      console.log(`  - localidad.nulocdescr: ${detalle.localidad?.nulocdescr || 'NULL'}`);
      console.log(`  - total_direcciones: ${detalle.total_direcciones || 0}`);
      console.log(`  - total_telefonos: ${detalle.total_telefonos || 0}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
