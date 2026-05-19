import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Usuarios de prueba con password por usuario.
// Admins usan admin123; usuarios funcionales usan 123456.
const TEST_USERS = [
  { username: __ENV.USERNAME  || 'admin@test.local',      password: __ENV.PASSWORD  || 'admin123' },
  { username: __ENV.USERNAME2 || 'admin@osep.gob.ar',     password: __ENV.PASSWORD2 || 'admin123' },
  { username: __ENV.USERNAME3 || 'marianr@tekhne.com.ar', password: __ENV.PASSWORD3 || '123456' },
  { username: __ENV.USERNAME4 || 'diana76ar@gmail.com',   password: __ENV.PASSWORD4 || '123456' },
  { username: __ENV.USERNAME5 || '20120282388',           password: __ENV.PASSWORD5 || '123456' },
];

// setup() corre UNA VEZ antes del escenario y su valor se pasa a cada VU.
// Hacemos login de todos los usuarios aquí para no saturar el rate limiter
// durante el loop principal.
export function setup() {
  const activeUsers = [];
  for (const user of TEST_USERS) {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ username: user.username, password: user.password }),
      { headers: { 'Content-Type': 'application/json' }, timeout: '30s' }
    );
    if (res.status === 200) {
      const body = res.json();
      const token = body?.token || body?.access_token;
      if (token) {
        activeUsers.push({ username: user.username, token });
      }
    }
  }
  return { activeUsers };
}

export const options = {
  scenarios: {
    credencial_load: {
      executor: 'constant-vus',
      vus: 40,
      duration: '90s',
    },
  },
  thresholds: {
    // El fallo de credencial es 401 si el backend tiene el afiliado vacío.
    // Medimos que no haya 5xx bajo carga.
    'checks{name:credencial not 5xx}': ['rate>0.98'],
    http_req_duration: ['p(95)<1800'],
  },
};

export default function (data) {
  const users = data?.activeUsers || [];
  // Cada VU rota entre los usuarios autenticados en setup().
  const user = users.length > 0 ? users[(__VU - 1) % users.length] : null;
  const token = user?.token;

  if (!token) {
    check(null, { 'token available': () => false });
    sleep(1);
    return;
  }

  const res = http.get(`${BASE_URL}/credencial`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: '30s',
  });

  check(res, {
    'credencial status 200|204|403': (r) => [200, 204, 403].includes(r.status),
    'credencial not 5xx': (r) => r.status < 500,
  });

  sleep(1);
}
