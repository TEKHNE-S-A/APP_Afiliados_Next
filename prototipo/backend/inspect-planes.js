/**
 * Inspeccionar estructura de datos de planes
 */
const http = require('http');

async function getPlanes() {
  return new Promise((resolve, reject) => {
    let loginData = '';
    const loginReq = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      res.on('data', d => loginData += d);
      res.on('end', () => {
        try {
          const loginRes = JSON.parse(loginData);
          if (!loginRes.token) throw new Error('No token');
          
          const token = loginRes.token;
          let planesData = '';
          const planesReq = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/admin/planes',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
          }, (res2) => {
            res2.on('data', d => planesData += d);
            res2.on('end', () => {
              const planesRes = JSON.parse(planesData);
              console.log('📊 Planes response structure:');
              console.log(JSON.stringify(planesRes.planes[0], null, 2));
              console.log('\n📝 IDs in planesData:');
              planesRes.planes.forEach((p, i) => {
                console.log(`  [${i}] id=${p.id} (type: ${typeof p.id})`);
              });
              resolve();
            });
          });
          planesReq.on('error', reject);
          planesReq.end();
        } catch (e) {
          reject(e);
        }
      });
    });
    loginReq.on('error', reject);
    loginReq.write(JSON.stringify({ username: 'admin@test.local', password: 'admin123' }));
    loginReq.end();
  });
}

getPlanes().catch(console.error);
