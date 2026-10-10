// Runs pair.js's two saving functions, the ones every list-and-record page
// saves through, against a stand-in for the database, and fails when a save
// that stops partway, or whose answer is lost, would write a record or a row
// twice, lose one, or leave the page behind what was written.
//
// The stand-in keeps tables in memory and answers the calls pair.js makes:
// insert, update, upsert and delete, with eq, in, select and single. A test
// can refuse a write, or let it land and lose its answer, which is what a
// dropped connection does.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../pair.js', import.meta.url), 'utf8'), { window, crypto: globalThis.crypto });
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
      select: () => chain,
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

console.log(failed ? `\n  ${failed} pair case(s) failed` : '\n  pair: every case passed');
process.exit(failed ? 1 : 0);
