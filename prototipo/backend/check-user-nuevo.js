const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Buscar usuario por email
    const user = await prisma.nuusuari.findFirst({
      where: { nuusumail: 'nuevo@test.com' },
      include: {
        nuusuauth: true,
        crcredus: {
          include: {
            crcreden: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ Usuario nuevo@test.com NO encontrado en BD');
      process.exit(1);
    }
    
    console.log('\n✅ Usuario encontrado:');
    console.log(`  🆔 NuUsuId: ${user.nuusuid}`);
    console.log(`  👤 Nombre: ${user.nuusuapell || '(sin nombre)'}`);
    console.log(`  📧 Email: ${user.nuusumail}`);
    console.log(`  📇 AfiliadoId: ${user.nuusuafili || '(sin afiliado)'}`);
    console.log(`  📅 Fecha registro: ${user.nuusufecha}`);
    
    console.log('\n🔐 Autenticación (nuusuauth):');
    if (user.nuusuauth) {
      console.log(`  ✅ Contraseña: ${user.nuusuauth.nuusupass ? 'CONFIGURADA' : '❌ VACÍA'}`);
      console.log(`  📅 Creada: ${user.nuusuauth.nuusucrea}`);
      console.log(`  📅 Última mod: ${user.nuusuauth.nuusuultm}`);
    } else {
      console.log('  ❌ NO EXISTE entrada en nuusuauth');
    }
    
    console.log('\n🎫 Credenciales (crcredus):');
    console.log(`  Total: ${user.crcredus.length}`);
    user.crcredus.forEach((c, i) => {
      console.log(`  ${i+1}. crcreid: ${c.crcreid}, titular: ${c.crcrepropi}`);
    });
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
