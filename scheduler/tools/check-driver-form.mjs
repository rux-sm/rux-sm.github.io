// Runs driver-form's handler, a driver's answers and signature in and a
// filled PDF filed out, against an invented form: which answers it takes,
// which it sends back as problems, what it writes where, and when a signing is
// flagged. The handler is TypeScript with no imports; its types are taken off
// and the rest is run as a module.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

process.removeAllListeners('warning');

const source = readFileSync(new URL('../driver-form/handler.ts', import.meta.url), 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'check-driver-form-'));
const file = join(scratch, 'handler.mjs');
writeFileSync(file, stripTypeScriptTypes(source));
const { handle, problems, flagged, ops, plain, yearAfter, png } = await import(pathToFileURL(file).href);
rmSync(scratch, { recursive: true, force: true });

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

// An invented form: two questions, the second flagged on Yes and asking for
// the facts, a name, a date, the signature and the day.
const FIELDS = [
  { type: 'heading', en: 'Section 1' },
  { id: 'q1', type: 'yes_no', en: 'One?', marks: { yes: { page: 0, x: 10, y: 20 }, no: { page: 0, x: 30, y: 20 } } },
  { id: 'q2', type: 'yes_no', en: 'Two?', flag: 'yes', marks: { yes: { page: 0, x: 10, y: 40 }, no: { page: 0, x: 30, y: 40 } } },
  { id: 'facts', type: 'box', en: 'Facts', when: { any: ['q2'], is: 'yes' }, at: { page: 1, x: 5, y: 500, w: 400, h: 200 } },
  { id: 'name', type: 'line', en: 'Name', prefill: 'name', at: { page: 1, x: 5, y: 100 } },
  { id: 'dob', type: 'date', en: 'Born', prefill: 'dateOfBirth', at: { page: 1, x: 300, y: 100 } },
  { type: 'signature', at: { page: 1, x: 5, y: 50, w: 200, h: 30 } },
  { type: 'signed_on', at: { page: 1, x: 300, y: 50 } },
];
const FORM = { id: '11111111-2222-3333-4444-555555555555', kind_id: 'k', title: 'Invented form', version: 'v1', blank_path: 'b.pdf', yearly: true, fields: FIELDS };
const SHARE = { id: 's', driver_id: 'd', driver_name: 'Alex Example' };
// The smallest PNG there is, as the page would send a signature.
const SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const GOOD = { q1: 'yes', q2: 'no', name: 'Alex Example', dob: '03/14/1985' };

async function ask({ body = {}, share = SHARE, form = FORM, method = 'POST' } = {}) {
  const saved = [];
  const deps = {
    share: async () => share, form: async () => form, today: () => '2026-11-02',
    fill: async (path, list) => new TextEncoder().encode(JSON.stringify(list)),
    save: async s => { saved.push(s); },
  };
  const req = new Request('https://example.supabase.co/functions/v1/driver-form', {
    method, headers: { origin: 'https://rux-sm.github.io', 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    body: method === 'POST' ? JSON.stringify({ token: 'abcdef0123456789', formId: FORM.id, answers: GOOD, signature: SIG, ...body }) : undefined,
  });
  const res = await handle(req, deps);
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null, saved };
}

expect('every answer given, nothing is wrong', problems(FIELDS, GOOD), []);
expect('an unanswered question and an empty line are wrong', problems(FIELDS, { q2: 'no', dob: '03/14/1985' }), ['q1', 'name']);
expect('a box shown by a Yes must be filled', problems(FIELDS, { ...GOOD, q2: 'yes' }), ['facts']);
expect('a date is month, day and year', problems(FIELDS, { ...GOOD, dob: '1985-03-14' }), ['dob']);
expect('a date is taken as people type it', ['3/14/1985', '3-14-1985', '03.14.1985', '03141985'].map(dob => problems(FIELDS, { ...GOOD, dob })), [[], [], [], []]);
expect('a date must be a day on the calendar', problems(FIELDS, { ...GOOD, dob: '02/30/1985' }), ['dob']);
expect('a typed date is written MM/DD/YYYY', ops(FIELDS, { ...GOOD, dob: '3-4-1985' }, '2026-11-02').find(o => o.x === 300 && o.y === 100)?.text, '03/04/1985');
expect('an answer that is neither Yes nor No is wrong', problems(FIELDS, { ...GOOD, q1: 'maybe' }), ['q1']);

const drawn = ops(FIELDS, { ...GOOD, q2: 'yes', facts: 'It said ‘no’ — then left' }, '2026-11-02');
expect('a Yes is an X in its own box', drawn.filter(o => o.text === 'X').map(o => [o.x, o.y]), [[10, 20], [10, 40]]);
expect('a phone\'s curly quotes and dashes are written plainly', drawn.find(o => o.w)?.text, "It said 'no' - then left");
expect('the day is written as the form writes dates', drawn.find(o => o.y === 50 && o.kind === 'text')?.text, '11/02/2026');
expect('the signature is drawn in its box', drawn.find(o => o.kind === 'signature'), { kind: 'signature', page: 1, x: 5, y: 50, w: 200, h: 30 });
expect('a box not shown is not written', ops(FIELDS, { ...GOOD, facts: 'left over' }, '2026-11-02').some(o => o.kind === 'text' && o.w), false);
expect('a character the PDF font lacks becomes a ?', plain('ok 🚌 ñ'), 'ok ? ñ');
expect('a yearly copy ends a year on', yearAfter('2028-02-29'), '2029-03-01');
expect('a signature that is not a PNG is refused', png('data:image/gif;base64,R0lGODlh'), null);

// A second invented form: a choice, a number of digits, one answer on two
// pages and its last four on a third, a line a Yes opens, and fixed words.
const MORE = [
  { id: 'first', type: 'line', en: 'First', at: { page: 1, x: 300, y: 500 } },
  { id: 'last', type: 'line', en: 'Last', at: { page: 1, x: 100, y: 500 } },
  { id: 'id9', type: 'line', en: 'Nine digits', digits: 9, at: [{ page: 1, x: 400, y: 450 }, { page: 0, x: 280, y: 490, part: 'last4' }] },
  { id: 'pick', type: 'choice', en: 'Pick', flag: 'maybe', options: [{ value: 'yes', en: 'Yes' }, { value: 'no', en: 'No' }, { value: 'maybe', en: 'Maybe' }],
    marks: { yes: { page: 3, x: 466, y: 432 }, no: { page: 3, x: 502, y: 432 }, maybe: { page: 3, x: 538, y: 432 } } },
  { id: 'where', type: 'line', en: 'Where?', when: { any: ['pick'], is: 'yes' }, at: { page: 3, x: 236, y: 346 } },
  { type: 'fixed', value: 'Invented Buses', at: { page: 0, x: 222, y: 634 } },
  { type: 'fixed', of: ['first', 'last'], at: [{ page: 0, x: 222, y: 656 }, { page: 2, x: 179, y: 665 }] },
  { type: 'signature', at: [{ page: 1, x: 62, y: 266, w: 180, h: 30 }, { page: 2, x: 60, y: 340, w: 180, h: 30 }] },
  { type: 'signed_on', at: [{ page: 1, x: 100, y: 216 }, { page: 3, x: 83, y: 703 }] },
];
const MORE_GOOD = { first: 'Alex', last: 'Example', id9: '123-45-6789', pick: 'no' };
expect('a choice must be one of its options', problems(MORE, { ...MORE_GOOD, pick: 'perhaps' }), ['pick']);
expect('a number must have its digits, however they are parted', [problems(MORE, MORE_GOOD), problems(MORE, { ...MORE_GOOD, id9: '12345678' })], [[], ['id9']]);
expect('a line a Yes opens is asked once it is open', problems(MORE, { ...MORE_GOOD, pick: 'yes' }), ['where']);
expect('a flagged choice flags the signing', [flagged(MORE, MORE_GOOD), flagged(MORE, { ...MORE_GOOD, pick: 'maybe' })], [false, true]);
const more = ops(MORE, MORE_GOOD, '2026-11-02');
expect('an answer is written in each of its places, a last-four place with only its last four',
  more.filter(o => o.kind === 'text' && /\d{4}/.test(o.text) && !o.text.includes('/')).map(o => [o.page, o.text]), [[1, '123-45-6789'], [0, '6789']]);
expect('a choice is an X in the box of its answer', more.filter(o => o.text === 'X').map(o => [o.x, o.y]), [[502, 432]]);
expect('fixed words are written as they are, or as the answers they join',
  more.filter(o => o.page !== 1 && /[a-z]/.test(o.text ?? '')).map(o => [o.page, o.text]), [[0, 'Invented Buses'], [0, 'Alex Example'], [2, 'Alex Example']]);
expect('the signature and the day go in each of their places',
  [more.filter(o => o.kind === 'signature').map(o => o.page), more.filter(o => o.text === '11/02/2026').map(o => o.page)], [[1, 2], [1, 3]]);
expect('a line not shown is not written', ops(MORE, { ...MORE_GOOD, where: 'left over' }, '2026-11-02').some(o => o.text === 'left over'), false);

let r = await ask();
expect('a good signing is filed', [r.status, r.json], [200, { signed: '2026-11-02' }]);
expect('it ends a year on, unflagged, with the first address of the caller', [r.saved[0].endsOn, r.saved[0].flagged, r.saved[0].ip], ['2027-11-02', false, '203.0.113.9']);
r = await ask({ body: { answers: { ...GOOD, q2: 'yes', facts: 'What happened.' } } });
expect('a flagged answer flags the signing', [r.status, r.saved[0].flagged], [200, true]);
r = await ask({ body: { answers: { q1: 'yes' }, signature: null } });
expect('what is missing comes back by field, the signature too', [r.status, r.json], [422, { error: 'problems', fields: ['q2', 'name', 'dob', 'signature'] }]);
expect('nothing is filed while anything is missing', r.saved.length, 0);
expect('a link no longer live is refused', (await ask({ share: null })).status, 410);
expect('a form not waiting for this driver is refused', (await ask({ form: null })).status, 409);
expect('a body with no token is refused', (await ask({ body: { token: 'nope' } })).status, 400);
expect('only a POST is answered', (await ask({ method: 'GET' })).status, 405);

console.log(failed ? `\n  ${failed} fault(s) in driver-form` : '\n  driver-form: every case passed');
process.exit(failed ? 1 : 0);
