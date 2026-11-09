'use strict';
// This makes two minimal edits to the repository's EXISTING server.js.
// Refuses to overwrite unexpected file structure. Does not touch HTML or JSON data.
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'server.js');
if (!fs.existsSync(file)) {
  console.error('Copy this starter into the radio project root before installing.');
  process.exit(1);
}
let code = fs.readFileSync(file, 'utf8');
const importLine = "const { handleAuth } = require('./auth');";
const importAnchor = "const { URL } = require('node:url');";
const routeAnchor = " const u = new URL(req.url,'http://localhost');";
const routeBlock = `\n if (u.pathname.startsWith('/api/auth/') || u.pathname === '/api/admin/users') {\n  void handleAuth(req, res, u.pathname);\n  return;\n }`;
if (code.includes(importLine) || code.includes("void handleAuth(req, res, u.pathname)")) {
  console.log('Authentication already integrated, no changes made.');
  process.exit(0);
}
if (!code.includes(importAnchor) || !code.includes(routeAnchor)) {
  console.error('Unexpected server.js format: see README-SETUP.md for manual integration.');
  process.exit(1);
}
code = code.replace(importAnchor, importAnchor + '\n' + importLine);
code = code.replace(routeAnchor, routeAnchor + routeBlock);
fs.writeFileSync(file, code);
console.log('Patched server.js to dispatch authentication requests to auth.js.');
