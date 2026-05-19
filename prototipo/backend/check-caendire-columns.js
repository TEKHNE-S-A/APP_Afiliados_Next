const { getPrisma } = require('./db/prismaClient');

(async () => {
  try {
    const prisma = getPrisma();
    
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'caendire'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 COLUMNAS DE caendire:');
    console.log('=====================');
    columns.forEach(col => {
      const len = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`  ${col.column_name} - ${col.data_type}${len}`);
    });
    
    // Verificar si faltan columnas de geocodificación
    const hasGeoStatus = columns.some(c => c.column_name === 'caendgeost');
    const hasPending = columns.some(c => c.column_name === 'caendpenge');
    const hasLat = columns.some(c => c.column_name === 'caendlat');
    const hasLng = columns.some(c => c.column_name === 'caendlng');
    
    console.log('\n🔍 Estado columnas geocodificación:');
    console.log(`  caendgeost (estado): ${hasGeoStatus ? '✅' : '❌ FALTA'}`);
    console.log(`  caendpenge (pendiente): ${hasPending ? '✅' : '❌ FALTA'}`);
    console.log(`  caendlat (latitud): ${hasLat ? '✅' : '❌ FALTA'}`);
    console.log(`  caendlng (longitud): ${hasLng ? '✅' : '❌ FALTA'}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
