'use strict';
// Optional one-time sample data import. Refuses to run if shows already exist.
const pool = require('../db');
const seed = [
  { title: 'Morning Frequency', host: 'Jordan Lee', genre: 'Music & news', days: [1,2,3,4,5], start: '08:00', end: '10:00' },
  { title: 'Midday Mix', host: 'Taylor Morgan', genre: 'Pop & requests', days: [1,2,3,4,5], start: '12:00', end: '14:00' },
  { title: 'Evening Sessions', host: 'Casey Rivera', genre: 'Indie & interviews', days: [1,2,3,4,5], start: '18:00', end: '20:00' },
  { title: 'Weekend Spotlight', host: 'Jordan Lee', genre: 'Community', days: [6], start: '11:00', end: '13:00' }
];
async function main() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[{ count }]] = await connection.query('SELECT COUNT(*) AS count FROM radio_shows');
    if (count > 0) {
      await connection.rollback();
      console.log('Schedule already contains shows. No sample data inserted.');
      return;
    }
    for (const show of seed) {
      const [result] = await connection.execute('INSERT INTO radio_shows (title, host, genre) VALUES (?, ?, ?)', [show.title, show.host, show.genre]);
      for (const day of show.days) {
        await connection.execute('INSERT INTO broadcast_slots (show_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)', [result.insertId, day, show.start+':00', show.end+':00']);
      }
    }
    await connection.commit();
    console.log('Imported 4 sample shows with 16 weekly broadcast slots.');
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); await pool.end(); }
}
main().catch(err => { console.error('Seed failed:', err.message); process.exitCode = 1; });
