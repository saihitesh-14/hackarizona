// Self-check for statusFor in src/data/site.js: every branch, and the America/Phoenix (UTC-7, no DST) boundaries.
// Run: node scripts/check-site.mjs
import assert from 'node:assert/strict';
import { site, statusFor } from '../src/data/site.js';

const withUrl = { ...site, registration: { ...site.registration, url: 'https://example.invalid/register' } };
const withTimes = { ...site, event: { ...site.event, startTime: '09:00', endTime: '17:00' } };
const at = (iso, config) => statusFor(new Date(iso), config);

const cases = [
  // Before January 2027 (Phoenix midnight on 1 Jan is 07:00 UTC).
  ['2026-10-24T18:00:00Z', undefined, 'Registration opens in January'],
  ['2027-01-01T06:59:00Z', undefined, 'Registration opens in January'],
  ['2027-01-01T07:00:00Z', undefined, 'Registration opening soon'],
  ['2027-01-01T07:00:00Z', withUrl, 'Registration open'],
  // UTC midnight on 27 March is still 26 March in Phoenix.
  ['2027-03-27T00:00:00Z', undefined, 'Registration opening soon'],
  ['2027-03-27T06:59:00Z', withUrl, 'Registration open'],
  ['2027-03-27T07:00:00Z', undefined, 'Happening now'],
  ['2027-03-27T07:00:00Z', withUrl, 'Happening now'],
  // The last day runs to Phoenix midnight (07:00 UTC on 29 March).
  ['2027-03-29T06:59:00Z', undefined, 'Happening now'],
  ['2027-03-29T07:00:00Z', undefined, 'See you next year'],
  ['2028-01-10T12:00:00Z', undefined, 'See you next year'],
  // With confirmed times: 09:00 MST is 16:00 UTC, 17:00 MST is 00:00 UTC the next day.
  ['2027-03-27T15:59:00Z', withTimes, 'Registration opening soon'],
  ['2027-03-27T16:00:00Z', withTimes, 'Happening now'],
  ['2027-03-28T23:59:00Z', withTimes, 'Happening now'],
  ['2027-03-29T00:00:00Z', withTimes, 'See you next year'],
];

for (const [iso, config, expected] of cases) assert.equal(at(iso, config), expected, `${iso}`);
console.log(`statusFor: ${cases.length} cases pass`);
