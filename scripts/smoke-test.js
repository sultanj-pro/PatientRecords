#!/usr/bin/env node
/**
 * Smoke test — hits every route through the API Gateway and asserts correct responses.
 * Usage: node scripts/smoke-test.js [baseUrl]
 * Default baseUrl: http://localhost:5000
 */

const http = require('http');

const BASE_URL = process.argv[2] || 'http://localhost:5000';
const TEST_PATIENT_ID = 20001;
let passed = 0;
let failed = 0;

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
      timeout: 5000,
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function run() {
  console.log(`\n🔍 Smoke Test — ${BASE_URL}\n`);
  let token;

  // --- Gateway health ---
  console.log('[ Gateway ]');
  try {
    const r = await request('GET', '/health');
    assert('GET /health returns 200', r.status === 200, `status=${r.status}`);
    assert('status=ok', r.body.status === 'ok');
  } catch (e) { assert('GET /health reachable', false, e.message); }

  try {
    const r = await request('GET', '/health/deep');
    assert('GET /health/deep returns 200 or 207', [200, 207].includes(r.status), `status=${r.status}`);
    assert('gateway=ok in deep health', r.body.gateway === 'ok');
    const services = r.body.services || {};
    for (const [svc, status] of Object.entries(services)) {
      assert(`  ${svc} reachable`, status === 'ok', `status=${status}`);
    }
  } catch (e) { assert('GET /health/deep reachable', false, e.message); }

  // --- Auth Service ---
  console.log('\n[ Auth Service ]');
  try {
    const r = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin' });
    assert('POST /api/auth/login returns 200', r.status === 200, `status=${r.status}`);
    assert('accessToken present', !!r.body.accessToken);
    assert('role=admin', r.body.role === 'admin');
    token = r.body.accessToken;
  } catch (e) { assert('POST /api/auth/login reachable', false, e.message); }

  try {
    const r = await request('POST', '/api/auth/refresh', { token });
    assert('POST /api/auth/refresh returns 200', r.status === 200, `status=${r.status}`);
    assert('new accessToken present', !!r.body.accessToken);
  } catch (e) { assert('POST /api/auth/refresh reachable', false, e.message); }

  try {
    const r = await request('POST', '/api/auth/validate', { token });
    assert('POST /api/auth/validate returns 200', r.status === 200, `status=${r.status}`);
    assert('valid=true', r.body.valid === true);
  } catch (e) { assert('POST /api/auth/validate reachable', false, e.message); }

  if (!token) { console.log('\n⚠️  No token — skipping authenticated routes\n'); return finish(); }

  // --- Registry Service ---
  console.log('\n[ Registry Service ]');
  try {
    const r = await request('GET', '/api/registry');
    assert('GET /api/registry returns 200', r.status === 200, `status=${r.status}`);
    assert('modules array present', Array.isArray(r.body.modules));
    assert('at least 1 module', (r.body.modules || []).length > 0);
  } catch (e) { assert('GET /api/registry reachable', false, e.message); }

  // --- Patient Service ---
  console.log('\n[ Patient Service ]');
  try {
    const r = await request('GET', '/api/patients', null, token);
    assert('GET /api/patients returns 200', r.status === 200, `status=${r.status}`);
    const patients = Array.isArray(r.body) ? r.body : r.body.patients;
    assert('patients list non-empty', Array.isArray(patients) && patients.length > 0);
  } catch (e) { assert('GET /api/patients reachable', false, e.message); }

  try {
    const r = await request('GET', `/api/patients/${TEST_PATIENT_ID}`, null, token);
    assert(`GET /api/patients/${TEST_PATIENT_ID} returns 200`, r.status === 200, `status=${r.status}`);
    assert('patientid matches', r.body.patientid === TEST_PATIENT_ID || r.body._id !== undefined);
  } catch (e) { assert(`GET /api/patients/${TEST_PATIENT_ID} reachable`, false, e.message); }

  // --- Clinical Domain Services ---
  const clinical = [
    { name: 'Vitals Service',      path: `/api/patients/${TEST_PATIENT_ID}/vitals` },
    { name: 'Labs Service',        path: `/api/patients/${TEST_PATIENT_ID}/labs` },
    { name: 'Medications Service', path: `/api/patients/${TEST_PATIENT_ID}/medications` },
    { name: 'Visits Service',      path: `/api/patients/${TEST_PATIENT_ID}/visits` },
    { name: 'Care Team Service',   path: `/api/patients/${TEST_PATIENT_ID}/care-team` },
  ];

  for (const { name, path } of clinical) {
    console.log(`\n[ ${name} ]`);
    try {
      const r = await request('GET', path, null, token);
      assert(`GET ${path} returns 200`, r.status === 200, `status=${r.status}`);
      assert('response is array', Array.isArray(r.body), `type=${typeof r.body}`);
    } catch (e) { assert(`GET ${path} reachable`, false, e.message); }
  }

  finish();
}

function finish() {
  const total = passed + failed;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed}/${total} passed${failed > 0 ? `, ${failed} FAILED` : ''}`);
  console.log(failed === 0 ? '✅ All smoke tests passed!\n' : '❌ Some tests failed — check logs above\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
