/**
 * Test de login individual para probar migración automática
 * Uso: node test-login-user.js <email> <password>
 */
const http = require('http');

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('❌ Uso: node test-login-user.js <email> <password>');
  console.error('   Ejemplo: node test-login-user.js nuevo@test.com 12345678');
  process.exit(1);
}

console.log('🔐 Test de Login GAM - Migración Automática');
console.log('═'.repeat(60));
console.log(`📧 Email:    ${email}`);
console.log(`🔑 Password: ${'*'.repeat(password.length)}\n`);

const postData = JSON.stringify({
  username: email,  // El endpoint GAM usa 'username' no 'email'
  password: password
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/gam/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`📡 Status: ${res.statusCode}\n`);
    
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('✅ LOGIN EXITOSO\n');
        
        // Verificar si hubo migración
        if (response.migration) {
          console.log('🎉 MIGRACIÓN AUTOMÁTICA DETECTADA!');
          console.log('─'.repeat(60));
          console.log(`   De:     ${response.migration.oldNuusuid} (LEGACY)`);
          console.log(`   A:      ${response.migration.newNuusuid} (GAM)`);
          console.log(`   Mensaje: ${response.migration.message}`);
          
          if (response.migration.tablesUpdated) {
            console.log('\n   Tablas actualizadas:');
            response.migration.tablesUpdated.forEach(t => {
              console.log(`      • ${t}`);
            });
          }
          console.log('─'.repeat(60) + '\n');
        } else {
          console.log('ℹ️  Usuario ya estaba migrado a GAM (sin migración)\n');
        }
        
        console.log('📊 DATOS DEL USUARIO:');
        console.log(`   GUID:        ${response.user.nuusuid.substring(0, 8)}...`);
        console.log(`   Email:       ${response.user.nuusumail}`);
        console.log(`   Nombre:      ${response.user.nuusuapell || 'N/A'}`);
        console.log(`   AfiliadoId:  ${response.user.nuusuafili || 'N/A'}`);
        
        if (response.credenciales && response.credenciales.length > 0) {
          console.log(`\n   Credenciales: ${response.credenciales.length}`);
          response.credenciales.forEach((c, i) => {
            console.log(`      ${i + 1}. ${c.crcrenombr || 'Sin nombre'} - ${c.crcreparen || 'N/A'}`);
          });
        }
        
        console.log(`\n   Access Token: ${response.access_token.substring(0, 20)}...`);
        
        console.log('\n✅ TEST COMPLETADO CON ÉXITO\n');
        process.exit(0);
      } else {
        console.log('❌ LOGIN FALLIDO\n');
        console.log(`Mensaje: ${response.error || response.message || 'Error desconocido'}`);
        
        if (response.details) {
          console.log(`Detalles: ${response.details}`);
        }
        
        console.log('\n💡 Sugerencias:');
        console.log('   - Verifica que el email sea correcto');
        console.log('   - Verifica que la contraseña sea correcta');
        console.log('   - Verifica que el backend esté corriendo (http://localhost:3000)');
        console.log('   - Verifica que GAM esté disponible\n');
        
        process.exit(1);
      }
    } catch (e) {
      console.log('❌ Error parseando respuesta:', e.message);
      console.log('Respuesta raw:', data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error de conexión:', e.message);
  console.log('\n💡 Verifica que el backend esté corriendo:');
  console.log('   cd E:\\MisProyectos\\appmovil\\APP_Afiliados\\backend');
  console.log('   node server-soap.js\n');
  process.exit(1);
});

req.write(postData);
req.end();
