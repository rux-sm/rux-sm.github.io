// Runs pair.js's two saving functions, the ones every list-and-record page
// saves through, and away.js's save from the board, which writes through
// them, against a stand-in for the database, and fails when a save that stops
// partway, or whose answer is lost, would write a record or a row twice, lose
// one, or leave the page behind what was written, or when the board's save
// puts a range anywhere but where the page's Save would.
//
// The stand-in keeps tables in memory and answers the calls pair.js makes:
// insert, update, upsert and delete, with eq, in, select and single. A test
// can refuse a write, or let it land and lose its answer, which is what a
// dropped connection does.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../pair.js', import.meta.url), 'utf8'), { window, crypto: globalThis.crypto });
runInNewContext(readFileSync(new URL('../away.js', import.meta.url), 'utf8'), { window });
const { saveRecord, syncRows } = window.SchedulerPair;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

function standIn() {
  const tables = new Map();
  const rows = t => { if (!tables.has(t)) tables.set(t, []); return tables.get(t); };
  const db = { log: [], refuse: null, lose: null, rows };
  db.from = table => {
    const q = { op: null, payload: null, filters: [], single: false };
    const run = () => {
      const call = `${q.op} ${table}`;
      db.log.push(call);
      if (db.refuse?.(q, table)) return { data: null, error: { message: 'Refused by the test.', code: 'TEST' } };
      const all = rows(table);
      const hit = r => q.filters.every(([kind, col, v]) => (kind === 'eq' ? r[col] === v : v.includes(r[col])));
      let data = null;
      if (q.op === 'insert') {
        if (all.some(r => r.id === q.payload.id)) return { data: null, error: { message: `duplicate key value violates unique constraint "${table}_pkey"`, code: '23505' } };
        all.push({ ...q.payload });
        data = [{ ...q.payload }];
      } else if (q.op === 'upsert') {
        for (const r of q.payload) if (!all.some(x => x.id === r.id)) all.push({ ...r });
      } else if (q.op === 'update') {
        data = all.filter(hit).map(r => ({ ...Object.assign(r, q.payload) }));
      } else if (q.op === 'delete') {
        for (const r of all.filter(hit)) all.splice(all.indexOf(r), 1);
      } else if (q.op === 'select') {
        data = all.filter(hit).map(r => ({ ...r }));
      }
      // The write landed; its answer may not have.
      if (db.lose?.(q, table)) return { data: null, error: { message: 'The answer was lost.', code: 'LOST' } };
      return { data: q.single ? data?.[0] ?? null : data, error: null };
    };
    const chain = {
      insert: p => { q.op = 'insert'; q.payload = p; return chain; },
      update: p => { q.op = 'update'; q.payload = p; return chain; },
      upsert: p => { q.op = 'upsert'; q.payload = p; return chain; },
      delete: () => { q.op = 'delete'; return chain; },
      eq: (col, v) => { q.filters.push(['eq', col, v]); return chain; },
      in: (col, v) => { q.filters.push(['in', col, v]); return chain; },
      select: () => { q.op ??= 'select'; return chain; },
      order: () => chain,
      single: () => { q.single = true; return chain; },
      then: (ok, no) => Promise.resolve().then(run).then(ok, no),
    };
    return chain;
  };
  return db;
}
const thrown = async run => { try { await run(); return null; } catch (e) { return e.code ?? e.message; } };

// ── one record ──────────────────────────────────────────────────────────────
{
  const db = standIn();
  const saved = await saveRecord(db, 'things', { id: 'a', creating: true, row: { name: 'First' }, columns: '*' });
  expect('a new record goes in under the id the page made, and comes back as saved',
    [saved, db.rows('things')], [{ id: 'a', name: 'First' }, [{ id: 'a', name: 'First' }]]);

  db.lose = q => q.op === 'insert';
  const lostCode = await thrown(() => saveRecord(db, 'things', { id: 'b', creating: true, row: { name: 'Second' }, columns: '*' }));
  db.lose = null;
  db.log.length = 0;
  const again = await saveRecord(db, 'things', { id: 'b', creating: true, row: { name: 'Second, changed' }, columns: '*' });
  expect('a Save pressed again after an insert whose answer was lost updates that record and makes no second',
    [lostCode, db.log, again, db.rows('things').filter(r => r.id === 'b')],
    ['LOST', ['insert things', 'update things'], { id: 'b', name: 'Second, changed' }, [{ id: 'b', name: 'Second, changed' }]]);

  db.refuse = q => q.op === 'update';
  expect('a refused update is thrown with its code, and changes nothing',
    [await thrown(() => saveRecord(db, 'things', { id: 'a', creating: false, row: { name: 'Never' }, columns: '*' })), db.rows('things')[0]],
    ['TEST', { id: 'a', name: 'First' }]);
}

// ── the rows that hang off it ───────────────────────────────────────────────
const key = r => `${r.from}>${r.to}`;
const rowOf = (w, index) => ({ from: w.from, to: w.to, place: index });
{
  const db = standIn();
  db.rows('ranges').push({ id: 'r1', from: 1, to: 2, place: 0 }, { id: 'r2', from: 5, to: 6, place: 1 });
  const have = db.rows('ranges').map(r => ({ ...r }));
  const landings = [];
  await syncRows(db, 'ranges', { have, want: [{ from: 1, to: 2 }, { from: 5, to: 6 }], key, rowOf, order: 'place', landed: n => landings.push(n.length) });
  expect('rows that did not change are neither written nor moved', [db.log, landings], [[], []]);

  const want = [{ from: 9, to: 9 }, { from: 5, to: 6 }];
  const now = await syncRows(db, 'ranges', { have, want, key, rowOf, order: 'place', landed: n => landings.push(n.length) });
  expect('a new row goes in before the old one comes out, the page told after each write, and a kept row takes its place',
    [db.log, landings, now.map(r => `${key(r)}@${r.place}`).sort(), db.rows('ranges').map(r => `${key(r)}@${r.place}`).sort()],
    [['upsert ranges', 'delete ranges'], [3, 2], ['5>6@1', '9>9@0'], ['5>6@1', '9>9@0']]);
}
{
  // A save that stops after the new row landed: the next one sends only what has not.
  const db = standIn();
  db.rows('ranges').push({ id: 'r1', from: 1, to: 2, place: 0 });
  const want = [{ from: 3, to: 4 }];
  let page = db.rows('ranges').map(r => ({ ...r }));
  db.refuse = q => q.op === 'delete';
  const stopped = await thrown(() => syncRows(db, 'ranges', { have: page, want, key, rowOf, landed: n => { page = n; } }));
  db.refuse = null;
  db.log.length = 0;
  await syncRows(db, 'ranges', { have: page, want, key, rowOf, landed: n => { page = n; } });
  expect('a save that stops partway is finished by the next, which sends only what has not landed',
    [stopped, db.log, db.rows('ranges').map(key), page.map(key)], ['TEST', ['delete ranges'], ['3>4'], ['3>4']]);
}
{
  // The new row landed and its answer was lost, so the page still holds the old rows: the same insert is sent, and makes no second copy.
  const db = standIn();
  const want = [{ from: 7, to: 8 }];
  db.lose = q => q.op === 'upsert';
  const lostCode = await thrown(() => syncRows(db, 'ranges', { have: [], want, key, rowOf, landed: () => {} }));
  db.lose = null;
  await syncRows(db, 'ranges', { have: [], want, key, rowOf, landed: () => {} });
  expect('an insert sent again after a lost answer is the same insert', [lostCode, db.rows('ranges').map(key)], ['LOST', ['7>8']]);
}
{
  const db = standIn();
  db.rows('ranges').push({ id: 'r1', from: 1, to: 2, place: 0 }, { id: 'r2', from: 5, to: 6, place: 1 });
  const have = db.rows('ranges').map(r => ({ ...r }));
  await syncRows(db, 'ranges', { have, want: [{ from: 5, to: 6 }, { from: 1, to: 2 }], key, rowOf, order: 'place', landed: () => {} });
  expect('rows put in another order are each given their place, and nothing is added or removed',
    [db.log, db.rows('ranges').map(r => `${r.id}@${r.place}`)], [['update ranges', 'update ranges'], ['r1@1', 'r2@0']]);
}

// ── away.js's save from the board ────────────────────────────────────────────
{
  // Time off goes in among the driver's ranges in date order, each range given its place as the Drivers page's Save gives it.
  const db = standIn();
  db.rows('driver_time_off').push(
    { id: 't1', driver_id: 'd1', start_date: '2026-01-05', end_date: '2026-01-06', reason: 'sick', notes: null, position: 0 },
    { id: 't2', driver_id: 'd1', start_date: '2026-03-10', end_date: '2026-03-12', reason: 'vacation', notes: 'Cruise', position: 1 },
    { id: 't9', driver_id: 'd2', start_date: '2026-02-01', end_date: '2026-02-01', reason: 'other', notes: null, position: 0 });
  await window.SchedulerAway.add(db, 'driver', 'd1', { start_date: '2026-02-01', end_date: '2026-02-03', reason: 'personal', notes: null });
  expect('time off from the board goes in between, in date order, and the ranges after it move down a place',
    db.rows('driver_time_off').filter(r => r.driver_id === 'd1').sort((a, b) => a.position - b.position)
      .map(r => `${r.start_date}@${r.position} ${r.reason}${r.notes ? ` ${r.notes}` : ''}`),
    ['2026-01-05@0 sick', '2026-02-01@1 personal', '2026-03-10@2 vacation Cruise']);
  expect("another driver's time off is left as it was", db.rows('driver_time_off').filter(r => r.driver_id === 'd2').map(r => `${r.id}@${r.position}`), ['t9@0']);
}
{
  // Days out have no place of their own; the new range goes in and nothing else is touched.
  const db = standIn();
  db.rows('bus_out_of_service').push({ id: 'o1', bus_id: 'b1', start_date: '2026-04-01', end_date: '2026-04-02', reason: 'Brakes' });
  await window.SchedulerAway.add(db, 'bus', 'b1', { start_date: '2026-03-01', end_date: '2026-03-01', reason: null });
  expect('days out from the board go in beside the ones there, and nothing is updated or removed',
    [db.log.filter(l => l !== 'select bus_out_of_service'), db.rows('bus_out_of_service').map(r => `${r.bus_id} ${r.start_date}>${r.end_date} ${r.reason}`).sort()],
    [['upsert bus_out_of_service'], ['b1 2026-03-01>2026-03-01 null', 'b1 2026-04-01>2026-04-02 Brakes']]);
}

console.log(failed ? `\n  ${failed} pair case(s) failed` : '\n  pair: every case passed');
process.exit(failed ? 1 : 0);
