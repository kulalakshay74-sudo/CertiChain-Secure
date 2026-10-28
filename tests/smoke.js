'use strict';

const assert = require('node:assert/strict');

const baseUrl = (process.env.TEST_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { response, body };
}

(async () => {
  let passed = 0;
  async function check(name, fn) {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  }

  await check('API health and blockchain connectivity', async () => {
    const { response, body } = await request('/api/health');
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.blockchain, 'connected');
  });

  await check('admin registry requires authentication', async () => {
    const { response, body } = await request('/api/certificates');
    assert.equal(response.status, 401);
    assert.match(body.error, /login required/i);
  });

  await check('unknown certificate returns a negative verification result', async () => {
    const { response, body } = await request('/api/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ certificateId: 'CERT-SMOKE-NOT-FOUND' })
    });
    assert.equal(response.status, 200);
    assert.equal(body.valid, false);
    assert.equal(body.status, 'NOT_FOUND');
  });

  await check('invalid login is rejected', async () => {
    const { response } = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'invalid@example.test', password: 'wrong-password', role: 'admin' })
    });
    assert.equal(response.status, 401);
  });

  console.log(`Smoke tests passed: ${passed}/4`);
})().catch(error => {
  console.error('Smoke tests failed:', error.message);
  process.exitCode = 1;
});
