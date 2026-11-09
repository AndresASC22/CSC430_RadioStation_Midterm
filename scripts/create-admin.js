'use strict';
// One-time, local, authorized promotion of an existing listener account.
// Usage: node scripts/create-admin.js admin@example.com
const pool = require('../db');

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('Usage: node scripts/create-admin.js existing-listener@example.com');
    process.exitCode = 1;
    return;
  }
  const [result] = await pool.execute("UPDATE users SET role = 'admin' WHERE email = ? AND is_active = TRUE", [email]);
  if (result.affectedRows !== 1) {
    console.error('No active account was found for that email. Register the listener first.');
    process.exitCode = 1;
    return;
  }
  const [users] = await pool.execute('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
  await pool.execute('DELETE FROM sessions WHERE user_id = ?', [users[0].user_id]);
  console.log('Account promoted to admin. Existing sessions revoked; log in again.');
}
main().catch(err => { console.error('Admin setup failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
