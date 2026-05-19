// Script simple para probar el endpoint de login
const http = require('http');

const data = JSON.stringify({
  username: '20120282388',
  password: '123456'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  },
  timeout: 5000 // timeout de 5 segundos
};

console.log('📡 Enviando solicitud de login...');
console.log('Datos:', data);
console.log('Headers:', options.headers);

const req = http.request(options, (res) => {
  console.log(`✅ Status Code: ${res.statusCode}`);
  console.log(`✅ Headers:`, res.headers);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('📝 Respuesta:', responseData);
    try {
      const json = JSON.parse(responseData);
      console.log('📦 JSON parseado:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('⚠️ No se pudo parsear como JSON');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
});

req.on('timeout', () => {
  console.error('⏱️ Timeout - El servidor no respondió en 5 segundos');
  req.destroy();
});

console.log('📤 Enviando datos...');
req.write(data);
req.end();
console.log('✅ Request enviado');
