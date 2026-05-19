const { getPrisma } = require('./prismaClient');

(async () => {
  try {
    const prisma = getPrisma();
    
    console.log('\n🔧 Agregando columnas de geocodificación...\n');
    
    // 1. Agregar caendgeost
    try {
      await prisma.$executeRaw`
        ALTER TABLE caendire 
        ADD COLUMN caendgeost CHAR(1) DEFAULT 'N'
      `;
      console.log('✅ Columna caendgeost agregada');
    } catch (e) {
      if (e.message.includes('ya existe')) {
        console.log('⚠️  Columna caendgeost ya existe');
      } else {
        throw e;
      }
    }
    
    // 2. Agregar caendlat
    try {
      await prisma.$executeRaw`
        ALTER TABLE caendire 
        ADD COLUMN caendlat NUMERIC(10, 8)
      `;
      console.log('✅ Columna caendlat agregada');
    } catch (e) {
      if (e.message.includes('ya existe')) {
        console.log('⚠️  Columna caendlat ya existe');
      } else {
        throw e;
      }
    }
    
    // 3. Agregar caendlng
    try {
      await prisma.$executeRaw`
        ALTER TABLE caendire 
        ADD COLUMN caendlng NUMERIC(11, 8)
      `;
      console.log('✅ Columna caendlng agregada');
    } catch (e) {
      if (e.message.includes('ya existe')) {
        console.log('⚠️  Columna caendlng ya existe');
      } else {
        throw e;
      }
    }
    
    // 4. Agregar caendgeoerr
    try {
      await prisma.$executeRaw`
        ALTER TABLE caendire 
        ADD COLUMN caendgeoerr VARCHAR(512)
      `;
      console.log('✅ Columna caendgeoerr agregada');
    } catch (e) {
      if (e.message.includes('ya existe')) {
        console.log('⚠️  Columna caendgeoerr ya existe');
      } else {
        throw e;
      }
    }
    
    // 5. Crear índice de estado
    try {
      await prisma.$executeRaw`
        CREATE INDEX idx_caendire_geost 
        ON caendire(caendgeost)
      `;
      console.log('✅ Índice idx_caendire_geost creado');
    } catch (e) {
      if (e.message.includes('ya existe')) {
        console.log('⚠️  Índice idx_caendire_geost ya existe');
      } else {
        console.log(`⚠️  No se pudo crear índice: ${e.message}`);
      }
    }
    
    console.log('\n🎉 Migración completada!\n');
    
    // Verificar
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE caendgeost = 'N') AS pendiente
      FROM caendire
    `;
    
    console.log('📊 Estado:');
    console.log(`  Total: ${stats[0].total}`);
    console.log(`  Pendientes: ${stats[0].pendiente}\n`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
