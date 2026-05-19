import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PASSWORD = __ENV.PASSWORD || 'admin123';

// Usuarios de prueba reales en la BD.
// Cada VU elige uno por índice para distribuir la carga y no saturar
// el rate limiter (5 intentos / 300s por usuario).
const TEST_USERS = [
  __ENV.USERNAME      || 'admin@test.local',
  __ENV.USERNAME2     || 'marianr@tekhne.com.ar',
  __ENV.USERNAME3     || 'diana76ar@gmail.com',
  __ENV.USERNAME4     || 'admin@osep.gob.ar',
  __ENV.USERNAME5     || '20120282388',
];

export const options = {
  scenarios: {
    login_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 80 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    // 429 es esperado — el rate limiter funciona correctamente.
    // Medimos que el backend no devuelva 5xx bajo carga.
    'checks{name:login not 5xx}': ['rate>0.98'],
    http_req_duration: ['p(95)<1500', 'p(99)<2500'],
  },
};

export default function () {
  // Distribuye usuarios: VU 0→user[0], VU 1→user[1], …, VU 5→user[0], etc.
  const username = TEST_USERS[__VU % TEST_USERS.length];

  const payload = JSON.stringify({ username, password: PASSWORD });

  const res = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  });

  check(res, {
    'login status 200|401|429': (r) => r.status === 200 || r.status === 401 || r.status === 429,
    'login not 5xx':            (r) => r.status < 500,
  });

  sleep(1);
}
