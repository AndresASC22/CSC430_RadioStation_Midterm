'use strict';
// Run from the project root after committing your working authentication version.
// Refuses unfamiliar anchors and does not silently overwrite source files.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function load(relative) {
  const filename = path.join(root, relative);
  if (!fs.existsSync(filename)) throw new Error(`Missing ${relative}. Copy all patch files into the project first.`);
  return fs.readFileSync(filename, 'utf8');
}
function replaceOnce(source, from, to, file) {
  if (!source.includes(from)) throw new Error(`${file}: expected insertion point not found. No files modified.`);
  return source.replace(from, to);
}
try {
  let server = load('server.js');
  let auth = load('auth.js');
  let admin = load('public/admin.html');
  if (server.includes("require('./schedule')") || admin.includes('id="scheduleManagement"')) {
    throw new Error('Schedule integration appears already installed. No files modified.');
  }
  auth = replaceOnce(auth, 'module.exports = { handleAuth };',
    'module.exports = { handleAuth, sessionUser, requireSameOrigin };', 'auth.js');
  server = replaceOnce(server, "const { handleAuth } = require('./auth');",
    "const { handleAuth } = require('./auth');\nconst { handleSchedule, getPublicShows } = require('./schedule');", 'server.js');
  server = replaceOnce(server,
    " const u = new URL(req.url,'http://localhost');",
    " const u = new URL(req.url,'http://localhost');\n if (u.pathname === '/api/admin/schedule' || u.pathname.startsWith('/api/admin/schedule/')) {\n  void handleSchedule(req, res, u.pathname);\n  return;\n }", 'server.js');
  const contentLine = " if(req.method==='GET' && u.pathname==='/api/content') return json(res,200,{shows,hosts,announcements,streamUrl:process.env.RADIO_STREAM_URL||null,streamConfigured:!!process.env.RADIO_STREAM_URL});";
  const newContentLine = " if(req.method==='GET' && u.pathname==='/api/content') {\n  void getPublicShows().then(showsFromDb => json(res,200,{shows:showsFromDb,hosts,announcements,streamUrl:process.env.RADIO_STREAM_URL||null,streamConfigured:!!process.env.RADIO_STREAM_URL})).catch(err => { console.error('Public schedule load failed:', err); json(res,503,{error:'Station content temporarily unavailable.'}); });\n  return;\n }";
  server = replaceOnce(server, contentLine, newContentLine, 'server.js');
  const section = `\n    <section id="scheduleManagement" class="admin-panel schedule-management">\n      <div class="admin-heading">\n        <div><h2>Broadcast schedule</h2><p class="auth-muted">Changes appear on the public homepage after refresh. Times are station-local.</p></div>\n        <div><button id="refreshSchedule" type="button" class="auth-outline">Refresh</button><button id="newScheduleShow" type="button" class="auth-primary">Add show</button></div>\n      </div>\n      <p id="scheduleStatus" class="auth-message" role="status" aria-live="polite"></p>\n      <div id="scheduleShows" class="schedule-show-list"></div>\n      <div id="scheduleEditor" class="schedule-editor" hidden>\n        <h3 id="scheduleFormTitle">New show</h3>\n        <form id="scheduleForm">\n          <label for="scheduleTitle">Show title</label><input id="scheduleTitle" name="title" required minlength="2" maxlength="120">\n          <label for="scheduleHost">Host</label><input id="scheduleHost" name="host" required minlength="2" maxlength="120">\n          <label for="scheduleGenre">Genre</label><input id="scheduleGenre" name="genre" maxlength="120">\n          <label>Weekly broadcast slots</label><div id="scheduleSlots"></div>\n          <button id="addScheduleSlot" type="button" class="auth-outline">+ Add day/time slot</button>\n          <div class="schedule-editor-actions"><button id="saveSchedule" type="submit" class="auth-primary">Save schedule</button><button id="cancelScheduleEdit" type="button" class="auth-outline">Cancel</button></div>\n        </form>\n      </div>\n    </section>\n`;
  admin = replaceOnce(admin, '    </section>\n\n    <p id="accessDenied"',
    '    </section>\n'+section+'\n    <p id="accessDenied"', 'public/admin.html');
  // Ensure schedule management is inside the authenticated admin panel, not adjacent to it.
  // Move the inserted section before the existing admin panel's closing tag.
  admin = admin.replace('    </section>\n'+section+'\n    <p id="accessDenied"', section+'    </section>\n\n    <p id="accessDenied"');
  admin = replaceOnce(admin, '  <script src="/admin.js" defer></script>',
    '  <script src="/admin.js" defer></script>\n  <script src="/schedule-admin.js" defer></script>', 'public/admin.html');
  admin = replaceOnce(admin, '  <link rel="stylesheet" href="/auth.css">',
    '  <link rel="stylesheet" href="/auth.css">\n  <link rel="stylesheet" href="/schedule-admin.css">', 'public/admin.html');
  admin = admin.replace('Account overview for authorized administrators. This is a read-only demonstration.', 'Manage registered accounts and broadcast schedules.');
  // All string checks above passed; now apply source changes.
  fs.writeFileSync(path.join(root, 'server.js'), server);
  fs.writeFileSync(path.join(root, 'auth.js'), auth);
  fs.writeFileSync(path.join(root, 'public/admin.html'), admin);
  console.log('Schedule management installed in server.js, auth.js and admin.html.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
