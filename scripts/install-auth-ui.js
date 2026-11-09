'use strict';
// Safe, idempotent addition to the existing homepage navigation.
const fs = require('node:fs');
const path = require('node:path');
const homepage = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(homepage, 'utf8');
if (html.includes('href="/account.html"')) {
  console.log('Homepage account link already exists. No changes needed.');
  process.exit(0);
}
const pattern = /(<a\s+href="#contact">Contact<\/a>)/;
if (!pattern.test(html)) {
  console.error('Could not find original Contact navigation link. No changes made.');
  process.exit(1);
}
html = html.replace(pattern, '$1\n      <a href="/account.html">Account</a>');
fs.writeFileSync(homepage, html);
console.log('Added Account link to public/index.html.');
