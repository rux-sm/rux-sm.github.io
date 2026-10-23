// Runs document-status.js, the rule that says whether a document is in force,
// against sample documents and fails when a row would say the wrong thing.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../document-status.js', import.meta.url), 'utf8'), { window });
const { of } = window.SchedulerDocumentStatus;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

// A fixed today, so the check says the same thing on any day.
const TODAY = '2026-10-23';
const said = doc => { const s = of(doc, TODAY); return [s.state, s.text]; };
const cert = (gl, wc) => ({ ends_on: [gl, wc].sort()[0], parts: [
  { name: 'General liability', ends_on: gl }, { name: 'Auto', ends_on: gl },
  { name: 'Umbrella', ends_on: gl }, { name: "Workers' comp", ends_on: wc }] });

expect('a certificate with every part a long way off is up to date',
  said(cert('2027-02-05', '2027-09-20')), ['ok', 'Up to date']);
expect('a part past its day names itself as expired',
  said(cert('2027-02-05', '2026-09-20')), ['ended', "Workers' comp expired"]);
expect('a part within 30 days says the day it ends',
  said(cert('2027-02-05', '2026-11-02')), ['soon', "Workers' comp ends Nov 2"]);
expect('the 30th day is still soon, and the 31st is not',
  [said(cert('2027-02-05', '2026-11-22'))[0], said(cert('2027-02-05', '2026-11-23'))[0]], ['soon', 'ok']);
expect('a part ending today ends today, and yesterday it expired',
  [said(cert('2027-02-05', TODAY))[1], said(cert('2027-02-05', '2026-10-22'))[1]], ["Workers' comp ends today", "Workers' comp expired"]);
expect('three parts ending together are named together',
  said(cert('2026-11-02', '2027-09-20')), ['soon', 'General liability, auto and umbrella end Nov 2']);
expect('parts ending on different days each say their day, soonest first',
  said({ parts: [{ name: 'Auto', ends_on: '2026-11-09' }, { name: "Workers' comp", ends_on: '2026-11-02' }] }),
  ['soon', "Workers' comp ends Nov 2, auto ends Nov 9"]);
expect('an expired part outranks one ending soon',
  said({ parts: [{ name: 'Auto', ends_on: '2026-11-02' }, { name: "Workers' comp", ends_on: '2026-09-20' }] }),
  ['ended', "Workers' comp expired"]);
expect('two expired parts are named together',
  said({ parts: [{ name: 'Auto', ends_on: '2026-10-01' }, { name: "Workers' comp", ends_on: '2026-09-20' }] }),
  ['ended', "Auto and workers' comp expired"]);
expect('a part left empty is one the document does not cover',
  said({ parts: [{ name: 'Auto', ends_on: '2027-02-05' }, { name: 'Umbrella', ends_on: null }] }), ['ok', 'Up to date']);
expect('a kind with no parts reads its one Ends day',
  [said({ ends_on: '2027-01-01', parts: [] }), said({ ends_on: '2026-11-02' }), said({ ends_on: '2026-10-01' })],
  [['ok', 'Up to date'], ['soon', 'Ends Nov 2'], ['ended', 'Expired']]);
expect('a document with no end date says nothing',
  said({ ends_on: null, parts: [] }), ['none', '']);
expect('rank is the days until the earliest part ends',
  [of(cert('2027-02-05', '2026-10-20'), TODAY).rank, of({ ends_on: null }, TODAY).rank], [-3, Infinity]);

console.log(failed ? `\n  ${failed} failed` : '\n  every document says what it should');
process.exit(failed ? 1 : 0);
