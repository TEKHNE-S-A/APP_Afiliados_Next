import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PERF_PROFILE = (__ENV.PERF_PROFILE || 'load500').toLowerCase();
const P95_MS = Number(__ENV.P95_MS || 1500);
const P99_MS = Number(__ENV.P99_MS || 2500);
const SIA_PRESTACIONES_RATIO = Math.max(0, Math.min(100, Number(__ENV.SIA_PRESTACIONES_RATIO || 100)));
const SIA_INCLUDE_PRESTACIONES = String(__ENV.SIA_INCLUDE_PRESTACIONES || 'true').toLowerCase() !== 'false';

const APP_USERNAME = __ENV.USERNAME2 || 'marianr@tekhne.com.ar';
const APP_PASSWORD = __ENV.PASSWORD2 || '123456';
const FIXED_AFILIADO_ID = __ENV.SIA_AFILIADO_ID || '000000380000000000001000000380';

function profileStages() {
  if (PERF_PROFILE === 'baseline') {
    return [
      { duration: '20s', target: 20 },
      { duration: '40s', target: 60 },
      { duration: '40s', target: 120 },
      { duration: '20s', target: 0 },
    ];
  }

  if (PERF_PROFILE === 'stress') {
    return [
      { duration: '30s', target: 80 },
      { duration: '30s', target: 160 },
      { duration: '30s', target: 260 },
      { duration: '30s', target: 360 },
      { duration: '30s', target: 500 },
      { duration: '30s', target: 620 },
      { duration: '20s', target: 0 },
    ];
  }

  if (PERF_PROFILE === 'spike') {
    return [
      { duration: '15s', target: 40 },
      { duration: '10s', target: 500 },
      { duration: '30s', target: 500 },
      { duration: '10s', target: 40 },
      { duration: '20s', target: 0 },
    ];
  }

  return [
    { duration: '35s', target: 120 },
    { duration: '35s', target: 280 },
    { duration: '35s', target: 500 },
    { duration: '2m', target: 500 },
    { duration: '20s', target: 0 },
  ];
}

export const options = {
  scenarios: {
    sia_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: profileStages(),
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    'checks{name:sia prestaciones not 5xx}': ['rate==1'],
    'checks{name:sia enrolamientos not 5xx}': ['rate==1'],
    'checks{name:sia historial not 5xx}': ['rate==1'],
    http_req_duration: [`p(95)<${P95_MS}`, `p(99)<${P99_MS}`],
  },
};

function tryJson(response) {
  try {
    return response.json();
  } catch (error) {
    return null;
  }
}

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ username: APP_USERNAME, password: APP_PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    }
  );
  const loginBody = tryJson(loginRes);
  const token = loginBody?.token || loginBody?.access_token || null;

  let afiliadoId = FIXED_AFILIADO_ID;
  if (!afiliadoId && token) {
    const meRes = http.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: '30s',
    });
    const meBody = tryJson(meRes);
    afiliadoId = meBody?.nuusuafili || meBody?.afiliadoId || '';
  }

  return {
    token,
    afiliadoId,
  };
}

export default function (data) {
  const token = data?.token;
  const afiliadoId = data?.afiliadoId || '000000380000000000001000000380';

  if (SIA_INCLUDE_PRESTACIONES && (Math.random() * 100) < SIA_PRESTACIONES_RATIO) {
    const prestacionesRes = http.post(`${BASE_URL}/sia/prestaciones`, '', {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    });
    check(prestacionesRes, {
      'sia prestaciones not 5xx': (r) => r.status < 500,
    });
  }

  const enrolRes = http.get(
    `${BASE_URL}/sia/enrolamientos-afiliado?afiliadoId=${encodeURIComponent(afiliadoId)}`,
    { timeout: '30s' }
  );
  check(enrolRes, {
    'sia enrolamientos not 5xx': (r) => r.status < 500,
  });

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const histRes = http.get(
    `${BASE_URL}/sia/historial-atencion?afiliadoId=${encodeURIComponent(afiliadoId)}&fechaDesde=2025-01-01&fechaHasta=2025-12-31&page=1&pageSize=20`,
    {
      headers,
      timeout: '30s',
    }
  );
  check(histRes, {
    'sia historial not 5xx': (r) => r.status < 500,
  });

  sleep(0.4);
}
