# Waveform Radio — MySQL Accounts Starter

This patch adds `users` and `sessions` to your **existing** `radio_station_db` (MySQL 8+), and authentication endpoints to the Node.js HTTP server. It leaves your existing `public/` website, five station tables, and JSON song-request API unchanged. It was drafted from the `master` branch of `AndresASC22/CSC430_RadioStation_Midterm` on November 8, 2026.

## 0. Branch and install

From inside your local repository:

```sh
git switch -c feature/mysql-accounts
```

Copy **all files in this starter** into the repository root, merging the `database/` and `scripts/` folders. Keep your existing `server.js` and `public/` files (the starter does not replace them). You can use a supported LTS Node.js version (Node 24/26), with MySQL 8.0.16+.

## 1. Create tables in MySQL Workbench

Open the SQL file `database/01_accounts.sql`, connect with an account allowed to create tables, and run it. This file creates only the new `users` and `sessions` tables, not your existing radio content tables.

Then run:

```sql
USE radio_station_db;
SHOW TABLES;
DESCRIBE users;
DESCRIBE sessions;
```

Expected: `users` and `sessions` are present. If you ran the previous five-table radio lab on the same MySQL server, the other five tables should still exist.

### Create a limited application database login

Run the following in Workbench as a MySQL administrator, **replacing the password** with a long, unique one. Do not commit this SQL statement with a real password to GitHub. Do not use your database root account to run the Node.js website.

```sql
CREATE USER 'radio_app'@'127.0.0.1'
  IDENTIFIED BY 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON radio_station_db.users
  TO 'radio_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON radio_station_db.sessions
  TO 'radio_app'@'127.0.0.1';
```

If that database user already exists, don't run `CREATE USER` again; update its password and grants in Workbench instead. The database login **radio_app** is separate from website accounts in the `users` table.

## 2. Configure Node.js

```sh
npm install
```

Copy `.env.example` to `.env`. Change `DB_PASSWORD` to the password you assigned to `radio_app`, and verify all settings. `.env` is covered by `.gitignore`; never push it, real user records, or passwords to the repository.

## 3. Hook authentication into existing server.js

Safest automatic method (only patches two recognizable lines):

```sh
node scripts/install-auth.js
```

Manual equivalent, if the installer reports a changed file layout:

After `const { URL } = require('node:url');` add:

```js
const { handleAuth } = require('./auth');
```

Inside `function handle(req,res)`, directly after `const u = new URL(req.url,'http://localhost');` add:

```js
if (u.pathname.startsWith('/api/auth/') || u.pathname === '/api/admin/users') {
  void handleAuth(req, res, u.pathname);
  return;
}
```

## 4. Run and check

Open one terminal and start the app:

```sh
npm start
```

Open http://localhost:3000 in your browser. Existing radio pages and the contact form should still load.

In **a second terminal**, run:

```sh
node scripts/smoke-auth.js
```

This creates one clearly-named demo listener record, logs in, checks the session, confirms an ordinary listener cannot read the admin endpoint, and logs out. It requires the MySQL server to be running. It does not delete the demo listener record.

Run the original tests separately:

```sh
npm test
```

**Note:** The pre-existing `tests/api.test.js` test writes a request to `data/requests.json` (a tracked file), so expect a local diff to that file. That behavior pre-dates this patch; keep any actual personal data out of the repository.

## 5. Give an existing listener admin privileges (restricted local action)

First register a listener account through the API, then run from a terminal **on your development machine**:

```sh
node scripts/create-admin.js admin@example.org
```

This changes that database user's role to `admin` and revokes their old sessions. They must log in again to see admin privileges. **There is no public admin registration endpoint.** Avoid promoting random demo accounts.

## Routes added

| HTTP | URL | Access |
|---|---|---|
| POST | /api/auth/register | Public; creates `listener` only |
| POST | /api/auth/login | Public; gives session cookie |
| POST | /api/auth/logout | Login optional; revokes session |
| GET | /api/auth/me | Logged-in listener or admin |
| GET | /api/admin/users | Admin only; returns up to 50 accounts, without password hashes |

For POST routes, send JSON with `Content-Type: application/json` and a valid same-origin `Origin` header. Browser `fetch()` from `http://localhost:3000` supplies the Origin. This patch intentionally rejects cross-origin and missing-origin authentication POST requests. CLI programs need to send `Origin: http://localhost:3000` manually.

Registration body:

```json
{"fullName":"Test Listener","email":"listener@example.org","password":"a long unique passphrase"}
```

Login body:

```json
{"email":"listener@example.org","password":"a long unique passphrase"}
```

Never include `role` in registration; the server assigns `listener` regardless of what the website displays.

## Security details

- Password hashes: Argon2id with 19 MiB, two iterations, one parallelism lane.
- Password length: 15–128 characters; no composition rules.
- Sessions: 32 random bytes per token, SHA-256 verifier stored in MySQL, seven-day absolute expiry.
- Cookies: `HttpOnly`, `SameSite=Lax`, `Path=/`; `Secure` and `__Host-` prefix in production HTTPS mode.
- Authorization: database lookup for each protected request; active account and role checked on server.
- SQL queries: placeholders via `mysql2/promise`, not SQL string concatenation.
- CSRF: same-origin POST request validation plus SameSite cookie (a dedicated anti-CSRF token is recommended before production deployment).
- Brute-force: lightweight per-process rate limits for local class demonstration.

## Further work before public deployment

This is an educational starter, not a complete production identity system. Add email verification, password reset, account recovery, MFA for administrators, a distributed login limiter, a breached-password blocklist, CSRF tokens for all state changes, audit logging, regular backups, HTTPS and hardened hosting. Address request-data retention and ensure any user data already committed to Git history is appropriately handled. Keep MySQL on a private network, not directly exposed to the public internet.
