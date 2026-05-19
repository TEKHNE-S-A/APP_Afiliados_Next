import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const DUP_EMAIL = __ENV.DUP_EMAIL || 'ppinetta@gmail.com';
const AFILIADO_BASE = __ENV.AFILIADO_BASE || '99-999999';

export const options = {
  scenarios: {
    register_duplicates: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 10 },
        { duration: '40s', target: 40 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // 429 esperado por rate limiter (3 intentos/10min por email/afiliado).
    // El threshold relevante es que el backend NO devuelva 5xx bajo concurrencia.
    'checks{name:register not 5xx}': ['rate>0.98'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const suffix = `${__VU}${__ITER}`.padStart(2, '0').slice(-2);
  const payload = JSON.stringify({
    email: DUP_EMAIL,
    password: '123456',
    nroAfiliado: `${AFILIADO_BASE}-${suffix}`,
    fechaNacimiento: '1990-01-01',
    sexo: 'F',
    cantidadIntegrantes: 1,
  });

  const res = http.post(`${BASE_URL}/register`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  });

  check(res, {
    'register status expected': (r) => [200, 400, 409, 429].includes(r.status),
    'register not 5xx': (r) => r.status < 500,
  });

  sleep(1);
}
