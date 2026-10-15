// Runs quote-request's handler, the company website's quote form's door to
// the scheduler, against sample requests: what it refuses and why, what it
// stores, and the New quote row it gives To do; then To do's Start trip, on
// requests as the database returns them. The handler is TypeScript with no
// imports; its types are taken off and the rest is run as a module.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';

// Taking the types off is new enough in Node to warn each time it is used.
process.removeAllListeners('warning');

const source = readFileSync(new URL('../quote-request/handler.ts', import.meta.url), 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'check-quote-request-'));
const file = join(scratch, 'handler.mjs');
writeFileSync(file, stripTypeScriptTypes(source));
const { handle, taskFor, requestFrom, LIMIT_PER_HOUR } = await import(pathToFileURL(file).href);
rmSync(scratch, { recursive: true, force: true });

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const TODAY = '2026-10-14';
const good = {
  lang: 'en', first: 'Ana', last: 'Lopez', phone: '(956) 555-0100', email: 'ana@example.org',
  org: 'Example High School Band', po: 'yes', trip: 'round', from: '100 Main St, McAllen',
  to: 'San Antonio', leave_date: '2026-11-13', leave_time: '07:30', return_date: '2026-11-15',
  return_time: '18:00', people: '45', lift: 'yes', details: 'Two stops for lunch.', token: 'tok',
};

// A run of the handler with stand-in parts, keeping what it stored.
async function post(body, { verify = true, recent = 0, fail = false, method = 'POST', origin = 'https://rux-sm.github.io' } = {}) {
  const stored = [];
  const deps = {
    verify: async () => { if (fail) throw new Error('down'); return verify; },
    sender: async ip => (ip ? `hash:${ip}` : null),
    recent: async () => recent,
    add: async (request, task) => { stored.push({ request, task }); return 1001; },
    today: () => TODAY,
  };
  const req = new Request('https://example.supabase.co/functions/v1/quote-request', {
    method,
    headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
  const res = await handle(req, deps);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, stored, allow: res.headers.get('access-control-allow-origin') };
}

let r = await post(good);
expect('a good request is stored and its number goes back', [r.status, r.body], [200, { number: 1001 }]);
expect('the address is kept only as its hash', r.stored[0].request.sender, 'hash:203.0.113.9');
expect('its To do row is who, the trip in a line, and today', [r.stored[0].task.who, r.stored[0].task.body, r.stored[0].task.due_on],
  ['Example High School Band', 'Round trip from 100 Main St, McAllen to San Antonio, Fri, Nov 13 to Sun, Nov 15, 45 passengers', TODAY]);
expect('its detail lists the facts, one to a line', r.stored[0].task.detail.split('\n'), [
  'Website request {number}', 'Name: Ana Lopez', 'Phone: (956) 555-0100', 'Email: ana@example.org',
  'Organization: Example High School Band', 'Purchase order: Yes', 'Leaves: Fri, Nov 13, 7:30 a.m.',
  'Returns: Sun, Nov 15, 6 p.m.', 'Wheelchair lift: needed', 'Details: Two stops for lunch.',
]);

r = await post({ ...good, lang: 'es', org: '', trip: 'oneway', return_date: '', return_time: '', people: '1', lift: '' });
expect('a one-way request needs no return, and names the person with no organization',
  [r.status, r.stored[0].task.who, r.stored[0].task.body],
  [200, 'Ana Lopez', 'One way from 100 Main St, McAllen to San Antonio, Fri, Nov 13, 1 passenger']);
expect('a Spanish request says so, so the office answers in Spanish', r.stored[0].task.detail.split('\n')[0], 'Website request {number}, sent in Spanish');
expect('a one-way request stores no return', [r.stored[0].request.return_on, r.stored[0].request.return_at], [null, null]);

r = await post({ ...good, return_date: '2026-11-13' });
expect('a round trip back the same day reads as one day', r.stored[0].task.body, 'Round trip from 100 Main St, McAllen to San Antonio, Fri, Nov 13, 45 passengers');

r = await post({ lang: 'en', token: 'tok' });
expect('an empty form names every field it needs, a round trip\'s return among them', [r.status, r.body], [400, { error: 'fields', fields: ['first', 'last', 'phone', 'email', 'po', 'trip', 'from', 'to', 'leave_date', 'return_date', 'people'] }]);
expect('and stores nothing', r.stored.length, 0);

r = await post({ ...good, leave_date: '2026-10-13' });
expect('a trip leaving in the past is refused', r.body.fields, ['leave_date']);
r = await post({ ...good, return_date: '2026-11-12' });
expect('a return before the trip leaves is refused', r.body.fields, ['return_date']);
r = await post({ ...good, return_date: '2026-11-13', return_time: '07:00' });
expect('a same-day return at or before the time it leaves is refused', r.body.fields, ['return_time']);
r = await post({ ...good, return_time: '07:00' });
expect('a later day may be back at an earlier hour', r.status, 200);
r = await post({ ...good, leave_date: '2026-02-30' });
expect('a date that does not exist is refused', r.body.fields, ['leave_date']);
for (const people of ['0', '1001', '12a', '']) {
  r = await post({ ...good, people });
  expect(`${JSON.stringify(people)} passengers is refused`, r.body.fields, ['people']);
}
r = await post({ ...good, phone: '555-0100' });
expect('a phone number of fewer than ten digits is refused', r.body.fields, ['phone']);
r = await post({ ...good, leave_time: '25:00' });
expect('a time that does not exist is refused', r.body.fields, ['leave_time']);

r = await post({ ...good, website: 'http://spam.example' });
expect('a filled hidden field is told it worked, and nothing is stored', [r.status, r.body, r.stored.length], [200, { number: null }, 0]);
r = await post(good, { verify: false });
expect('a token Cloudflare does not vouch for is refused', [r.status, r.body, r.stored.length], [403, { error: 'captcha' }, 0]);
r = await post(good, { recent: LIMIT_PER_HOUR });
expect(`a request past ${LIMIT_PER_HOUR} from one address in an hour is refused`, [r.status, r.body, r.stored.length], [429, { error: 'limit' }, 0]);
r = await post(good, { recent: LIMIT_PER_HOUR - 1 });
expect('one short of the limit is not', r.status, 200);
r = await post(good, { fail: true });
expect('a part that fails is a failed send, not a lost one the page cannot tell', [r.status, r.body], [502, { error: 'unavailable' }]);

r = await post(good, { method: 'GET' });
expect('only a POST is answered', r.status, 405);
r = await post(good, { method: 'OPTIONS', origin: 'https://www.escamillatourbuses.com' });
expect('the company\'s address may ask', [r.status, r.allow], [204, 'https://www.escamillatourbuses.com']);
r = await post(good, { origin: 'https://elsewhere.example' });
expect('another site is answered for the site\'s own address', r.allow, 'https://rux-sm.github.io');

const long = requestFrom({ ...good, details: 'x'.repeat(2000) }, TODAY).request;
expect('a long request still fits the 1000 characters a To do row\'s detail holds', taskFor(long, TODAY).detail.length <= 1000, true);

// ── Start trip's draft ──────────────────────────────────────────────────────
/* To do's Start trip turns a stored request into a draft for the trip editor.
   Its draft is read out of to-do-list.js and run on requests as the database
   returns them, and every field it fills must have a place in the editor. */
const list = readFileSync(new URL('../to-do-list.js', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const from = list.indexOf('  const PO_WORDS');
const to = list.indexOf('  async function startTrip');
const box = {};
if (from < 0 || to < from) { failed++; console.log('   FAIL  Start trip\'s draft could not be read from to-do-list.js'); }
else runInNewContext(`${list.slice(from, to)}\nbox.draftOf = draftOf;`, { box });
const table = editor.slice(editor.indexOf('const DRAFT_CONTROLS = {'), editor.indexOf('\n  };', editor.indexOf('const DRAFT_CONTROLS = {')));
const places = new Set([...table.matchAll(/^\s{4}([a-z0-9_]+):\s*\{/gm)].map(m => m[1]).concat('stops'));
const stored = {
  id: 'r1', number: 1001, lang: 'es', first_name: 'Ana', last_name: 'Lopez', phone: '(956) 555-0100',
  email: 'ana@example.org', organization: 'Example High School Band', purchase_order: 'yes', trip_type: 'round',
  pickup: '100 Main St, McAllen', destination: 'San Antonio', leave_on: '2026-11-13', leave_at: '07:30:00',
  return_on: '2026-11-15', return_at: '18:00:00', passengers: 45, wheelchair_lift: true, details: 'Two stops for lunch.',
};
if (box.draftOf) {
  let d = box.draftOf(stored);
  expect('a round trip\'s draft fills the editor from the request', JSON.parse(JSON.stringify(d.fields)), {
    destination: 'San Antonio', customer: 'Example High School Band', trip_type: 'round_trip',
    start_date: '2026-11-13', end_date: '2026-11-15', passengers: '45', pickup_address: '100 Main St, McAllen',
    booking_contact_name: 'Ana Lopez', booking_contact_phone: '(956) 555-0100', booking_contact_email: 'ana@example.org',
    departure_time: '07:30', return_time: '18:00', req_ada: true, stops: [{ name: 'San Antonio' }],
  });
  expect('its notes give the number, the language, the purchase order and their words', d.notes,
    'Website request 1001, sent in Spanish. Purchase order: Yes. Two stops for lunch.');
  expect('it names the request, which the saved trip takes', d.quote_request_id, 'r1');
  d = box.draftOf({ ...stored, lang: 'en', organization: null, trip_type: 'oneway', return_on: null, return_at: null, leave_at: null, wheelchair_lift: false, details: null });
  expect('a one-way draft ends at the destination, with the person as the customer', JSON.parse(JSON.stringify(d.fields)), {
    destination: 'San Antonio', customer: 'Ana Lopez', trip_type: 'one_way', start_date: '2026-11-13', end_date: '2026-11-13',
    passengers: '45', pickup_address: '100 Main St, McAllen', booking_contact_name: 'Ana Lopez',
    booking_contact_phone: '(956) 555-0100', booking_contact_email: 'ana@example.org', dropoff_address: 'San Antonio',
  });
  const both = [box.draftOf(stored), d].flatMap(x => Object.keys(x.fields));
  expect('every field a draft fills has a place in the editor', [...new Set(both)].filter(k => !places.has(k)), []);
}

console.log(failed ? `\n  ${failed} fault(s) in quote-request` : '');
process.exit(failed ? 1 : 0);
