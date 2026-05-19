const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.nuusuari.findFirst({
      where: { nuusumail: 'nuevo@test.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      process.exit(1);
    }
    
    console.log('\n👤 Usuario:', user.nuusuapell);
    console.log('📇 AfiliadoId:', user.nuusuafili || '(sin afiliado)');
    console.log('🆔 NuUsuId:', user.nuusuid);
    
    // Buscar credenciales en crcreden para ese AfiliadoId
    if (user.nuusuafili) {
      const credenciales = await prisma.crcreden.findMany({
        where: {
          crcreafili: user.nuusuafili
        }
      });
      
      console.log('\n🎫 Credenciales en crcreden:', credenciales.length);
      credenciales.forEach((c, i) => {
        console.log(`  ${i+1}. crcreid: ${c.crcreid}, Afiliado: ${c.crcreafili}`);
      });
      
      // Buscar en crcredus si hay vínculo
      const vinculos = await prisma.crcredus.findMany({
        where: { nuusuid: user.nuusuid }
      });
      
      console.log('\n🔗 Vínculos en crcredus:', vinculos.length);
      vinculos.forEach((v, i) => {
        console.log(`  ${i+1}. Usuario: ${v.nuusuid} -> Credencial: ${v.crcreid}`);
      });
      
      if (credenciales.length === 0) {
        console.log('\n⚠️  No hay credenciales en la BD para este AfiliadoId');
        console.log('💡 Necesitas sincronizar desde SOAP o registrar al usuario correctamente');
      } else if (vinculos.length === 0) {
        console.log('\n⚠️  Hay credenciales en crcreden pero NO están vinculadas en crcredus');
        console.log('💡 Se debe crear el vínculo en crcredus');
      }
    } else {
      console.log('\n⚠️  Usuario sin AfiliadoId - no se pueden buscar credenciales');
    }
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
