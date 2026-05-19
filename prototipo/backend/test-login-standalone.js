const gamService = require('./gamService');

async function testLogin() {
  const email = 'test.gam.20251216141905@example.com'; // Usuario recién creado
  const password = 'Pass1234!';
  
  console.log('\n=== TEST LOGIN STANDALONE ===');
  console.log('Email:', email);
  console.log('Password:', password);
  
  try {
    console.log('\n1. Intentando login...');
    const loginResult = await gamService.loginGAM(email, password);
    
    console.log('\n2. Resultado del login:');
    console.log(JSON.stringify(loginResult, null, 2));
    
    console.log('\n3. user_id extraído:', loginResult.user_id);
    
  } catch (error) {
    console.error('\n❌ Error en login:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testLogin();
