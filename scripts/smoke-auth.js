'use strict';
// Requires a locally-running Waveform server and configured MySQL database.
// Creates one demonstration listener account and leaves it in the DB.
require('dotenv').config();
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const base = process.env.APP_ORIGIN || 'http://localhost:3000';
const email = `demo-${randomBytes(7).toString('hex')}@example.org`;
const password = `Sample passphrase ${randomBytes(16).toString('hex')}!`;

async function request(path, method = 'GET', data, cookie = '') {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(method !== 'GET' ? { Origin: base, 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    ...(method !== 'GET' ? { body: JSON.stringify(data || {}) } : {})
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie') };
}
async function main() {
  const register = await request('/api/auth/register', 'POST', { fullName: 'Demo Listener', email, password, role: undefined });
  assert.equal(register.status, 201, JSON.stringify(register));
  console.log('PASS registration (listener)');

  const login = await request('/api/auth/login', 'POST', { email, password });
  assert.equal(login.status, 200, JSON.stringify(login));
  assert.equal(login.data.user.role, 'listener');
  const cookie = login.cookie?.split(';')[0];
  assert.ok(cookie);
  console.log('PASS login + session cookie');

  const me = await request('/api/auth/me', 'GET', undefined, cookie);
  assert.equal(me.status, 200);
  assert.equal(me.data.user.email, email);
  console.log('PASS session lookup');

  const admin = await request('/api/admin/users', 'GET', undefined, cookie);
  assert.equal(admin.status, 403);
  console.log('PASS listener blocked from admin users');

  const logout = await request('/api/auth/logout', 'POST', {}, cookie);
  assert.equal(logout.status, 200);
  const loggedOut = await request('/api/auth/me', 'GET', undefined, cookie);
  assert.equal(loggedOut.status, 401);
  console.log('PASS logout invalidates session');
  console.log('All auth smoke checks passed.');
}
main().catch(err => { console.error('Auth smoke test failed:', err); process.exitCode = 1; });
