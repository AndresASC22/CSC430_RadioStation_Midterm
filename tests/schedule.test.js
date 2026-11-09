'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateShow } = require('../schedule');
const valid = () => ({ title: 'Evening Sessions', host: 'Casey Rivera', genre: 'Indie', slots: [ { dayOfWeek: 1, start: '18:00', end: '20:00' } ] });
test('accepts a valid radio show', () => assert.equal(validateShow(valid()).slots.length, 1));
test('rejects backwards slots', () => { const show = valid(); show.slots[0].end = '17:00'; assert.throws(() => validateShow(show), /start\/end/); });
test('rejects overlapping slots within a show', () => { const show = valid(); show.slots.push({ dayOfWeek: 1, start: '19:00', end: '21:00' }); assert.throws(() => validateShow(show), /Overlapping/); });
test('rejects invalid days', () => { const show = valid(); show.slots[0].dayOfWeek = 7; assert.throws(() => validateShow(show), /valid day/); });
