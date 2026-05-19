import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = __ENV.USERNAME || 'admin@test.local';
const ADMIN_PASSWORD = __ENV.PASSWORD || 'admin123';
const PERF_PROFILE = (__ENV.PERF_PROFILE || 'load500').toLowerCase();
const P95_MS = Number(__ENV.P95_MS || 1500);
const P99_MS = Number(__ENV.P99_MS || 2500);
const ADMIN_USERS_LIMIT = Number(__ENV.ADMIN_USERS_LIMIT || 5);
const ADMIN_PARAMETROS_LIMIT = Number(__ENV.ADMIN_PARAMETROS_LIMIT || 100);

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
      { duration: '30s', target: 380 },
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
    { duration: '40s', target: 120 },
    { duration: '40s', target: 300 },
    { duration: '40s', target: 500 },
    { duration: '2m', target: 500 },
    { duration: '20s', target: 0 },
  ];
}

export const options = {
  scenarios: {
    admin_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: profileStages(),
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    'checks{name:admin users not 5xx}': ['rate==1'],
    'checks{name:admin users status 200}': ['rate==1'],
    'checks{name:admin parametros not 5xx}': ['rate==1'],
    'checks{name:admin parametros status 200}': ['rate==1'],
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
    `${BASE_URL}/admin/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    }
  );

  const body = tryJson(loginRes);
  const token = body?.token || null;

  return { token };
}

export default function (data) {
  const token = data?.token;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const usersRes = http.get(`${BASE_URL}/admin/users?limit=${ADMIN_USERS_LIMIT}&page=1`, {
    headers,
    timeout: '30s',
  });
  check(usersRes, {
    'admin users not 5xx': (r) => r.status < 500,
    'admin users status 200': (r) => r.status === 200,
  });

  const paramsRes = http.get(`${BASE_URL}/admin/parametros?limit=${ADMIN_PARAMETROS_LIMIT}`, {
    headers,
    timeout: '30s',
  });
  check(paramsRes, {
    'admin parametros not 5xx': (r) => r.status < 500,
    'admin parametros status 200': (r) => r.status === 200,
  });

  sleep(0.4);
}
