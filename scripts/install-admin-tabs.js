'use strict';
// Move existing schedule UI out of Registered Accounts into its own tab.
// Idempotent; modifies only public/admin.html and keeps a .bak backup.
const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve(__dirname, '../public/admin.html');
function locateElement(html, id, expectedTag='section') {
  const open = new RegExp(`<${expectedTag}\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i').exec(html);
  if (!open) throw new Error(`Cannot find <${expectedTag} id="${id}"> in admin.html`);
  const start = open.index;
  const bodyStart = start + open[0].length;
  const rx = /<\/?section\b[^>]*>/gi;
  rx.lastIndex = bodyStart;
  let depth = 1, match;
  while ((match = rx.exec(html))) {
    depth += /^<\/section\b/i.test(match[0]) ? -1 : 1;
    if (!depth) return {start,bodyStart,closeStart:match.index,end:rx.lastIndex,opening:open[0]};
  }
  throw new Error(`Unbalanced section for #${id}`);
}
try {
  let html = fs.readFileSync(file,'utf8');
  if (html.includes('id="adminTabs"') && html.includes('id="accountsTab"')) {
    console.log('Admin tabs already installed; nothing changed.');
    process.exit(0);
  }
  const outer = locateElement(html,'adminContent');
  const schedule = locateElement(html,'scheduleManagement');
  if (!(schedule.start>outer.bodyStart && schedule.end<outer.closeStart)) {
    throw new Error('Expected scheduleManagement to be inside adminContent. No changes made.');
  }
  const section = html.slice(schedule.start,schedule.end);
  let accounts = html.slice(outer.bodyStart,schedule.start)+html.slice(schedule.end,outer.closeStart);
  if (!accounts.includes('id="usersBody"')) throw new Error('Expected registered accounts table not found.');
  const tabs = `\n      <div id="adminTabs" class="admin-tabs" role="tablist" aria-label="Admin dashboard sections">\n        <button id="accountsTabButton" class="admin-tab is-active" type="button" role="tab" aria-selected="true" aria-controls="accountsTab" tabindex="0">Registered Accounts</button>\n        <button id="scheduleTabButton" class="admin-tab" type="button" role="tab" aria-selected="false" aria-controls="scheduleTab" tabindex="-1">Manage Schedule</button>\n      </div>\n`;
  // The schedule JS expects #scheduleManagement. Instead wrap the section in the tab panel
  // and leave the original id unchanged.
  const schedulePanel = `\n      <div id="scheduleTab" class="admin-tab-panel" role="tabpanel" aria-labelledby="scheduleTabButton" hidden>\n${section}\n      </div>\n`;
  const replacement = outer.opening + tabs + `\n      <div id="accountsTab" class="admin-tab-panel" role="tabpanel" aria-labelledby="accountsTabButton">` + accounts + `\n      </div>` + schedulePanel + `    </section>`;
  html = html.slice(0,outer.start) + replacement + html.slice(outer.end);
  if (!html.includes('src="/admin-tabs.js"')) html = html.replace('</body>','  <script src="/admin-tabs.js" defer></script>\n</body>');
  if (!html.includes('href="/admin-tabs.css"')) html = html.replace('</head>','  <link rel="stylesheet" href="/admin-tabs.css">\n</head>');
  fs.copyFileSync(file,file+'.bak');
  fs.writeFileSync(file,html);
  console.log('Admin tabs installed. Original saved to public/admin.html.bak');
} catch(error) {
  console.error('Admin tabs not installed: '+error.message);
  process.exitCode=1;
}
