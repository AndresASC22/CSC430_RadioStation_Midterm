'use strict';
const pool = require('./db');
const { sessionUser, requireSameOrigin } = require('./auth');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_BYTES = 16384;
const LOCK_NAME = 'waveform_radio_schedule_edit';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function respond(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(payload));
}
function normalizeClock(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return value;
}
function validateShow(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new HttpError(400, 'Expected a show object.');
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const host = typeof input.host === 'string' ? input.host.trim() : '';
  const genre = typeof input.genre === 'string' ? input.genre.trim() : '';
  if (title.length < 2 || title.length > 120 || host.length < 2 || host.length > 120 || genre.length > 120)
    throw new HttpError(400, 'Show title and host must be 2–120 characters; genre at most 120.');
  if (!Array.isArray(input.slots) || input.slots.length < 1 || input.slots.length > 14)
    throw new HttpError(400, 'Provide 1–14 weekly broadcast slots.');
  const seen = new Set();
  const slots = input.slots.map(slot => {
    if (!slot || typeof slot !== 'object' || Array.isArray(slot))
      throw new HttpError(400, 'Invalid broadcast slot.');
    const dayOfWeek = slot.dayOfWeek;
    const start = normalizeClock(slot.start);
    const end = normalizeClock(slot.end);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !start || !end || start >= end)
      throw new HttpError(400, 'Each slot needs a valid day and start/end times (end after start).');
    const key = `${dayOfWeek}|${start}`;
    if (seen.has(key)) throw new HttpError(400, 'Duplicate broadcast slot.');
    seen.add(key);
    return { dayOfWeek, start, end };
  });
  // Also check for overlaps within the proposed show.
  checkOverlaps(slots);
  return { title, host, genre, slots };
}
function checkOverlaps(slots) {
  const sorted = [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.start.localeCompare(b.start));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].dayOfWeek === sorted[i - 1].dayOfWeek && sorted[i].start < sorted[i - 1].end)
      throw new HttpError(409, `Overlapping broadcasts on ${DAY_NAMES[sorted[i].dayOfWeek]}.`);
  }
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    if (String(req.headers['content-type'] || '').split(';')[0].trim() !== 'application/json') {
      req.resume();
      return reject(new HttpError(415, 'Expected application/json.'));
    }
    let size = 0; const parts = []; let aborted = false;
    req.on('data', chunk => {
      if (aborted) return;
      size += chunk.length;
      if (size > MAX_BYTES) { aborted = true; reject(new HttpError(413, 'Request too large.')); req.resume(); }
      else parts.push(chunk);
    });
    req.on('end', () => {
      if (aborted) return;
      try { resolve(JSON.parse(Buffer.concat(parts).toString('utf8'))); }
      catch { reject(new HttpError(400, 'Invalid JSON.')); }
    });
    req.on('error', reject);
  });
}
async function listShows(connection = pool) {
  const [rows] = await connection.execute(
    `SELECT s.show_id AS id, s.title, s.host, s.genre,
       b.slot_id AS slotId, b.day_of_week AS dayOfWeek,
       TIME_FORMAT(b.start_time, '%H:%i') AS start,
       TIME_FORMAT(b.end_time, '%H:%i') AS end
     FROM radio_shows s
     LEFT JOIN broadcast_slots b ON b.show_id = s.show_id
     ORDER BY s.show_id ASC, b.day_of_week ASC, b.start_time ASC`
  );
  const byId = new Map();
  for (const row of rows) {
    if (!byId.has(row.id)) byId.set(row.id, { id: row.id, title: row.title, host: row.host, genre: row.genre, slots: [] });
    if (row.slotId != null) byId.get(row.id).slots.push({ id: row.slotId, dayOfWeek: row.dayOfWeek, start: row.start, end: row.end });
  }
  return [...byId.values()];
}
async function getPublicShows() {
  const shows = await listShows();
  return shows.flatMap(show => show.slots.map(slot => ({
    id: slot.id, title: show.title, host: show.host, genre: show.genre,
    day: DAY_NAMES[slot.dayOfWeek], start: slot.start, end: slot.end
  }))).sort((a,b) => DAY_NAMES.indexOf(a.day) - DAY_NAMES.indexOf(b.day) || a.start.localeCompare(b.start));
}
async function withLockedSchedule(operation) {
  const connection = await pool.getConnection();
  let locked = false;
  try {
    const [[result]] = await connection.query('SELECT GET_LOCK(?, 5) AS acquired', [LOCK_NAME]);
    if (result.acquired !== 1) throw new HttpError(503, 'Schedule is busy. Try again.');
    locked = true;
    await connection.beginTransaction();
    try {
      const answer = await operation(connection);
      await connection.commit();
      return answer;
    } catch (err) { await connection.rollback(); throw err; }
  } finally {
    if (locked) {
      try { await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]); }
      catch (err) { console.error('Unable to release schedule lock:', err); connection.destroy(); locked = false; }
    }
    if (locked) connection.release();
  }
}
async function ensureNoConflict(connection, slots, excludedShowId = null) {
  const [rows] = await connection.execute(
    `SELECT show_id AS showId, day_of_week AS dayOfWeek,
      TIME_FORMAT(start_time, '%H:%i') AS start,
      TIME_FORMAT(end_time, '%H:%i') AS end
     FROM broadcast_slots`
  );
  for (const slot of slots) {
    const conflicting = rows.some(row => row.showId !== excludedShowId && row.dayOfWeek === slot.dayOfWeek && slot.start < row.end && row.start < slot.end);
    if (conflicting) throw new HttpError(409, `A different show already occupies that time on ${DAY_NAMES[slot.dayOfWeek]}.`);
  }
}
async function saveSlots(connection, showId, slots) {
  for (const slot of slots) {
    await connection.execute('INSERT INTO broadcast_slots (show_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
      [showId, slot.dayOfWeek, `${slot.start}:00`, `${slot.end}:00`]);
  }
}
async function handleSchedule(req, res, pathname) {
  try {
    const user = await sessionUser(req);
    if (!user) throw new HttpError(401, 'Log in to continue.');
    if (user.role !== 'admin') throw new HttpError(403, 'Admin access required.');
    const match = pathname.match(/^\/api\/admin\/schedule(?:\/(\d+))?$/);
    if (!match) throw new HttpError(404, 'Unknown schedule route.');
    const showId = match[1] ? Number(match[1]) : null;
    if (showId !== null && (!Number.isSafeInteger(showId) || showId < 1)) throw new HttpError(400, 'Invalid show ID.');
    if (req.method === 'GET' && showId === null) return respond(res, 200, { shows: await listShows() });
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) throw new HttpError(405, 'Method not allowed.');
    requireSameOrigin(req);
    if ((req.method === 'POST' && showId !== null) || (req.method !== 'POST' && showId === null))
      throw new HttpError(405, 'Method not allowed.');
    if (req.method === 'DELETE') {
      const removed = await withLockedSchedule(async connection => {
        const [result] = await connection.execute('DELETE FROM radio_shows WHERE show_id = ?', [showId]);
        if (result.affectedRows === 0) throw new HttpError(404, 'Show not found.');
        return true;
      });
      return respond(res, 200, { deleted: removed });
    }
    const input = validateShow(await readJson(req));
    const resultId = await withLockedSchedule(async connection => {
      await ensureNoConflict(connection, input.slots, showId);
      if (req.method === 'POST') {
        const [result] = await connection.execute('INSERT INTO radio_shows (title, host, genre) VALUES (?, ?, ?)', [input.title, input.host, input.genre]);
        await saveSlots(connection, result.insertId, input.slots);
        return result.insertId;
      }
      const [result] = await connection.execute('UPDATE radio_shows SET title=?, host=?, genre=? WHERE show_id=?', [input.title, input.host, input.genre, showId]);
      if (!result.affectedRows) throw new HttpError(404, 'Show not found.');
      await connection.execute('DELETE FROM broadcast_slots WHERE show_id=?', [showId]);
      await saveSlots(connection, showId, input.slots);
      return showId;
    });
    return respond(res, req.method === 'POST' ? 201 : 200, { id: resultId, message: 'Schedule saved.' });
  } catch (err) {
    if (err.status) return respond(res, err.status, { error: err.message });
    console.error('Schedule API error:', err);
    if (!res.headersSent) respond(res, 500, { error: 'Unable to update the schedule.' });
  }
}
module.exports = { handleSchedule, getPublicShows, validateShow, checkOverlaps };
