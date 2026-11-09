'use strict';
const { randomBytes, createHash } = require('node:crypto');
const argon2 = require('argon2');
const pool = require('./db');

const MAX_BODY_BYTES = 8192;
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const APP_ORIGIN = process.env.APP_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
if (IS_PRODUCTION && !APP_ORIGIN.startsWith('https://')) {
  throw new Error('APP_ORIGIN must be an HTTPS origin when NODE_ENV=production.');
}
const COOKIE_NAME = IS_PRODUCTION ? '__Host-waveform_session' : 'waveform_session';
const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

// A simple single-process throttle for the school demo. Use a shared limiter for deployment.
const limits = new Map();
function rateLimited(key, max, windowMs) {
  const now = Date.now();
  if (limits.size > 10000) limits.clear();
  const entry = limits.get(key);
  if (!entry || now >= entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > max;
}
function respond(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}
class ClientError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function requireSameOrigin(req) {
  // Browser POST requests include Origin. Require it for cookie-authenticated mutations.
  if (req.headers.origin !== APP_ORIGIN) {
    throw new ClientError(403, 'Request origin not allowed.');
  }
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    if ((req.headers['content-type'] || '').split(';')[0].trim() !== 'application/json') {
      reject(new ClientError(415, 'Expected application/json.'));
      req.resume();
      return;
    }
    let size = 0;
    const chunks = [];
    let finished = false;
    req.on('data', chunk => {
      if (finished) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        finished = true;
        reject(new ClientError(413, 'Request body too large.'));
        req.resume();
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      if (finished) return;
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
        resolve(value);
      } catch {
        reject(new ClientError(400, 'Invalid JSON object.'));
      }
    });
    req.on('error', reject);
  });
}
function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}
function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
function tokenFromCookie(req) {
  const cookies = String(req.headers.cookie || '').split(';');
  for (const part of cookies) {
    const pos = part.indexOf('=');
    if (pos < 0 || part.slice(0, pos).trim() !== COOKIE_NAME) continue;
    const value = part.slice(pos + 1).trim();
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
  }
  return null;
}
function sessionCookie(value, maxAge) {
  return [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    ...(IS_PRODUCTION ? ['Secure'] : []),
    `Max-Age=${maxAge}`
  ].join('; ');
}
function safeUser(row) {
  return { id: row.user_id, fullName: row.full_name, email: row.email, role: row.role };
}
async function sessionUser(req) {
  const token = tokenFromCookie(req);
  if (!token) return null;
  const [rows] = await pool.execute(
    `SELECT u.user_id, u.full_name, u.email, u.role
     FROM sessions s JOIN users u ON u.user_id = s.user_id
     WHERE s.session_token_hash = ?
       AND s.expires_at > UTC_TIMESTAMP(6) AND u.is_active = TRUE
     LIMIT 1`, [hashToken(token)]
  );
  return rows[0] || null;
}
// Use a real Argon2 check even for unknown emails to reduce timing differences.
let dummyHashPromise;
function dummyHash() {
  if (!dummyHashPromise) dummyHashPromise = argon2.hash('not-a-real-account-password', ARGON2_OPTIONS);
  return dummyHashPromise;
}
async function handleAuth(req, res, pathname) {
  try {
    const ip = req.socket.remoteAddress || 'unknown';
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      requireSameOrigin(req);
      if (rateLimited(`register:${ip}`, 5, 60 * 60 * 1000))
        throw new ClientError(429, 'Too many registrations. Try again later.');
      const data = await readJson(req);
      const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : '';
      const email = normalizeEmail(data.email);
      const password = data.password;
      if (Object.hasOwn(data, 'role'))
        throw new ClientError(400, 'Account role cannot be selected during registration.');
      if (fullName.length < 2 || fullName.length > 120 || !validEmail(email) ||
          typeof password !== 'string' || password.length < 15 || password.length > 128)
        throw new ClientError(400, 'Provide a name, valid email, and a password of 15–128 characters.');
      const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);
      try {
        await pool.execute(
          'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
          [fullName, email, passwordHash, 'listener']
        );
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
          throw new ClientError(409, 'Unable to create account with this email.');
        throw err;
      }
      return respond(res, 201, { message: 'Listener account created. Please log in.' });
    }
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      requireSameOrigin(req);
      if (rateLimited(`login:${ip}`, 10, 15 * 60 * 1000))
        throw new ClientError(429, 'Too many login attempts. Try again later.');
      const data = await readJson(req);
      const email = normalizeEmail(data.email);
      const password = data.password;
      if (!validEmail(email) || typeof password !== 'string' || password.length > 128)
        throw new ClientError(401, 'Invalid email or password.');
      const [rows] = await pool.execute(
        'SELECT user_id, full_name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1',
        [email]
      );
      const user = rows[0];
      const hash = user ? user.password_hash : await dummyHash();
      const matches = await argon2.verify(hash, password);
      if (!user || !user.is_active || !matches)
        throw new ClientError(401, 'Invalid email or password.');

      // Rotate any existing session after a successful login.
      const previous = tokenFromCookie(req);
      if (previous) await pool.execute('DELETE FROM sessions WHERE session_token_hash = ?', [hashToken(previous)]);
      const token = randomBytes(32).toString('base64url');
      await pool.execute(
        'INSERT INTO sessions (user_id, session_token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 7 DAY))',
        [user.user_id, hashToken(token)]
      );
      return respond(res, 200, { user: safeUser(user) }, { 'Set-Cookie': sessionCookie(token, SESSION_SECONDS) });
    }
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = await sessionUser(req);
      return user ? respond(res, 200, { user: safeUser(user) }) : respond(res, 401, { error: 'Not logged in.' });
    }
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      requireSameOrigin(req);
      const token = tokenFromCookie(req);
      if (token) await pool.execute('DELETE FROM sessions WHERE session_token_hash = ?', [hashToken(token)]);
      return respond(res, 200, { message: 'Logged out.' }, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (pathname === '/api/admin/users' && req.method === 'GET') {
      const user = await sessionUser(req);
      if (!user) throw new ClientError(401, 'Log in to continue.');
      if (user.role !== 'admin') throw new ClientError(403, 'Admin access required.');
      const [rows] = await pool.execute(
        'SELECT user_id AS id, full_name AS fullName, email, role, is_active AS isActive, created_at AS createdAt FROM users ORDER BY user_id DESC LIMIT 50'
      );
      return respond(res, 200, { users: rows });
    }
    return respond(res, 404, { error: 'Unknown authentication route.' });
  } catch (err) {
    if (err instanceof ClientError) return respond(res, err.status, { error: err.message });
    console.error('Authentication request failed:', err);
    if (!res.headersSent) return respond(res, 500, { error: 'Internal server error.' });
  }
}

module.exports = { handleAuth, sessionUser, requireSameOrigin };
