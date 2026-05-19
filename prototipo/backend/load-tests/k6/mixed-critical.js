import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PERF_PROFILE = (__ENV.PERF_PROFILE || 'load500').toLowerCase();
const P95_MS = Number(__ENV.P95_MS || 1500);
const P99_MS = Number(__ENV.P99_MS || 2500);
const DUP_EMAIL = __ENV.DUP_EMAIL || 'perf.duplicate@example.com';
const SIA_AFILIADO_ID = __ENV.SIA_AFILIADO_ID || '000000380000000000001000000380';

const USERS = [
  { username: __ENV.USERNAME || 'admin@test.local', password: __ENV.PASSWORD || 'admin123' },
  { username: __ENV.USERNAME2 || 'marianr@tekhne.com.ar', password: __ENV.PASSWORD2 || '123456' },
  { username: __ENV.USERNAME3 || 'diana76ar@gmail.com', password: __ENV.PASSWORD3 || '123456' },
  { username: __ENV.USERNAME4 || 'admin@osep.gob.ar', password: __ENV.PASSWORD4 || 'admin123' },
  { username: __ENV.USERNAME5 || '20120282388', password: __ENV.PASSWORD5 || '123456' },
];

function profileStages() {
  if (PERF_PROFILE === 'stress') {
    return [
      { duration: '45s', target: 100 },
      { duration: '45s', target: 200 },
      { duration: '45s', target: 350 },
      { duration: '45s', target: 500 },
      { duration: '45s', target: 650 },
      { duration: '45s', target: 800 },
      { duration: '30s', target: 0 },
    ];
  }

  if (PERF_PROFILE === 'spike') {
    return [
      { duration: '20s', target: 40 },
      { duration: '10s', target: 500 },
      { duration: '30s', target: 500 },
      { duration: '10s', target: 40 },
      { duration: '30s', target: 40 },
      { duration: '10s', target: 0 },
    ];
  }

  return [
    { duration: '45s', target: 100 },
    { duration: '45s', target: 250 },
    { duration: '45s', target: 500 },
    { duration: '3m', target: 500 },
    { duration: '30s', target: 0 },
  ];
}

export const options = {
  scenarios: {
    mixed_critical: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: profileStages(),
      gracefulRampDown: '20s',
    },
  },
  thresholds: {
    'checks{name:login not 5xx}': ['rate==1'],
    'checks{name:credencial not 5xx}': ['rate==1'],
    'checks{name:register not 5xx}': ['rate==1'],
    'checks{name:admin users not 5xx}': ['rate==1'],
    'checks{name:admin parametros not 5xx}': ['rate==1'],
    'checks{name:sia prestaciones not 5xx}': ['rate==1'],
    'checks{name:sia enrolamientos not 5xx}': ['rate==1'],
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

function login(username, password) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ username, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    }
  );

  check(res, {
    'login not 5xx': (r) => r.status < 500,
  });

  if (res.status !== 200) {
    return null;
  }

  const body = tryJson(res);
  return body?.token || body?.access_token || null;
}

export function setup() {
  const appTokens = [];
  for (const user of USERS) {
    const token = login(user.username, user.password);
    if (token) {
      appTokens.push({ username: user.username, token });
    }
  }

  const adminLoginRes = http.post(
    `${BASE_URL}/admin/login`,
    JSON.stringify({ email: USERS[0].username, password: USERS[0].password }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    }
  );
  const adminBody = tryJson(adminLoginRes);
  const adminToken = adminBody?.token || null;

  return {
    appTokens,
    adminToken,
    siaAfiliadoId: SIA_AFILIADO_ID,
  };
}

function registerPayload() {
  const iter = `${__VU}${__ITER}`.padStart(8, '0').slice(-8);
  return {
    email: DUP_EMAIL,
    password: '123456',
    nroAfiliado: `99${iter}`,
    fechaNacimiento: '1990-01-01',
    sexo: 'F',
    cantidadIntegrantes: 1,
  };
}

function callCredencial(appTokens) {
  if (!appTokens.length) {
    return;
  }

  const current = appTokens[(__VU - 1) % appTokens.length];
  const res = http.get(`${BASE_URL}/credencial`, {
    headers: { Authorization: `Bearer ${current.token}` },
    timeout: '30s',
  });

  check(res, {
    'credencial not 5xx': (r) => r.status < 500,
  });
}

function callRegister() {
  const res = http.post(`${BASE_URL}/register`, JSON.stringify(registerPayload()), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  });

  check(res, {
    'register not 5xx': (r) => r.status < 500,
  });
}

function callAdminUsers(adminToken) {
  if (!adminToken) {
    return;
  }

  const res = http.get(`${BASE_URL}/admin/users?limit=10&page=1`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    timeout: '30s',
  });

  check(res, {
    'admin users not 5xx': (r) => r.status < 500,
  });
}

function callAdminParametros(adminToken) {
  if (!adminToken) {
    return;
  }

  const res = http.get(`${BASE_URL}/admin/parametros`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    timeout: '30s',
  });

  check(res, {
    'admin parametros not 5xx': (r) => r.status < 500,
  });
}

function callSiaPrestaciones() {
  const res = http.post(`${BASE_URL}/sia/prestaciones`, '', {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  });

  check(res, {
    'sia prestaciones not 5xx': (r) => r.status < 500,
  });
}

function callSiaEnrolamientos(siaAfiliadoId) {
  const afiliadoId = siaAfiliadoId || '000000380000000000001000000380';
  const res = http.get(
    `${BASE_URL}/sia/enrolamientos-afiliado?afiliadoId=${encodeURIComponent(afiliadoId)}`,
    { timeout: '30s' }
  );

  check(res, {
    'sia enrolamientos not 5xx': (r) => r.status < 500,
  });
}

export default function (data) {
  const appTokens = data?.appTokens || [];
  const adminToken = data?.adminToken || null;
  const siaAfiliadoId = data?.siaAfiliadoId || '';

  const selectedUser = USERS[__VU % USERS.length];
  login(selectedUser.username, selectedUser.password);

  const roll = Math.random();
  if (roll < 0.3) {
    callCredencial(appTokens);
  } else if (roll < 0.5) {
    callRegister();
  } else if (roll < 0.65) {
    callAdminUsers(adminToken);
  } else if (roll < 0.8) {
    callAdminParametros(adminToken);
  } else if (roll < 0.9) {
    callSiaPrestaciones();
  } else {
    callSiaEnrolamientos(siaAfiliadoId);
  }

  sleep(0.4);
}
