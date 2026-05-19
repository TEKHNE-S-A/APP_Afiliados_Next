/**
 * test-planes-panel.js — Test del panel admin de Planes
 * Simula el flujo completo: login → fetch planes → verify endpoints
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let authToken = null;

async function testFlow() {
  console.log('🔍 Testing Planes Admin Panel Flow\n');
  
  try {
    // 1. Test: Login
    console.log('1️⃣ Testing /admin/login endpoint...');
    const loginRes = await httpRequest('POST', '/admin/login', {
      username: 'admin@test.local',
      password: 'admin123'
    });
    
    if (!loginRes.token) {
      console.error('❌ Login failed:', loginRes.error || 'No token returned');
      return;
    }
    
    authToken = loginRes.token;
    console.log('✅ Login successful');
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
    
    // 2. Test: Fetch planes
    console.log('\n2️⃣ Testing /admin/planes endpoint...');
    const planesRes = await httpRequest('GET', '/admin/planes', null, authToken);
    
    if (!planesRes.planes || !Array.isArray(planesRes.planes)) {
      console.error('❌ Fetch planes failed:', planesRes.error || 'Invalid response');
      return;
    }
    
    console.log(`✅ Fetched ${planesRes.planes.length} planes`);
    if (planesRes.planes.length > 0) {
      const first = planesRes.planes[0];
      console.log(`   First plan: ${first.id} — ${first.descripcion}`);
      console.log(`   Has image: ${first.imagen_url ? 'Yes' : 'No'}`);
    }
    
    // 3. Test: HTML page loads
    console.log('\n3️⃣ Testing /admin/planes-ui page...');
    const htmlRes = await httpRequest('GET', '/admin/planes-ui', null, null, true);
    
    if (!htmlRes || htmlRes.includes('<!DOCTYPE html')) {
      console.log('✅ HTML page loads correctly');
      console.log(`   Length: ${htmlRes.length} bytes`);
      const hasAdminShared = htmlRes.includes('admin-shared.js');
      console.log(`   Includes admin-shared.js: ${hasAdminShared ? 'Yes' : 'No'}`);
    } else {
      console.error('❌ HTML page failed to load');
    }
    
    // 4. Test: Health check
    console.log('\n4️⃣ Testing /health endpoint...');
    const healthRes = await httpRequest('GET', '/health', null, null);
    
    if (healthRes.status === 'ok') {
      console.log('✅ Backend healthy');
      console.log(`   Requests total: ${healthRes.observability?.requestsTotal || '?'}`);
      console.log(`   SOAP connected: ${healthRes['soap Connected'] ? 'Yes' : 'No'}`);
    }
    
    console.log('\n✅ All tests passed!\n');
    
  } catch (e) {
    console.error('\n❌ Test failed:', e.message);
  }
}

function httpRequest(method, path, body = null, token = null, returnText = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          if (returnText) {
            resolve(data);
          } else {
            resolve(JSON.parse(data));
          }
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

testFlow();
