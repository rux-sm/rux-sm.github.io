/* ==========================================================================
   pair.js — WHAT EVERY PAGE PAIR SAVES THE SAME WAY
   --------------------------------------------------------------------------
   A page pair writes a record and the rows that hang off it, such as a bus's
   days out or a driver's time off. Each write here hands back what the
   database now holds, so the page's idea of the saved record is never behind
   it: a Save that stops partway is finished by the next Save, which sends
   only what has not landed, and never takes the page's own write for someone
   else's.

   `window.SchedulerPair.saveRecord(client, table, { id, creating, row,
   columns })` inserts or updates one record and returns it as saved.
   `.syncRows(client, table, { have, want, key, rowOf, order, landed })`
   makes the child rows match `want`, calling `landed` with the rows as they
   stand after each write.
   ========================================================================== */
(() => {
  'use strict';

  const pkeyTaken = error => error?.code === '23505' && /_pkey/.test(error.message || '');
  const fail = error => Object.assign(new Error(error.message || 'The write failed.'), { code: error.code });

  /* A new record carries an id made before its insert, the caller's `id`, so
     a Save pressed again after an insert whose answer was lost sends the
     same id: the database refuses the second row, which says the first
     landed, and the record is updated instead. */
  async function saveRecord(client, table, { id, creating, row, columns }) {
    const update = () => client.from(table).update(row).eq('id', id).select(columns).single();
    let written = creating
      ? await client.from(table).insert({ id, ...row }).select(columns).single()
      : await update();
    if (creating && pkeyTaken(written.error)) written = await update();
    if (written.error) throw fail(written.error);
    return written.data;
  }

  /* The id a new child row is inserted under, kept per page row and per
     content, so an insert sent again after a lost answer is the same insert,
     and a row edited in between is a new one. */
  const pending = new WeakMap();
  function pendingId(row, k) {
    let ids = pending.get(row);
    if (!ids) pending.set(row, ids = new Map());
    if (!ids.has(k)) ids.set(k, crypto.randomUUID());
    return ids.get(k);
  }

  /* Child rows are matched by `key`, their content, so a row that did not
     change is neither written nor moved. New rows go in before the old ones
     come out, so a failure partway never loses a range; the insert skips an
     id already there, so sending it again never makes a second copy. With
     `order`, each row kept is then given its place on the page. */
  async function syncRows(client, table, { have, want, key, rowOf, order, landed }) {
    const now = have.map(r => ({ ...r }));
    const free = [...now];
    const kept = [];
    const fresh = [];
    want.forEach((w, index) => {
      const k = key(w);
      const at = free.findIndex(r => key(r) === k);
      if (at >= 0) kept.push({ row: free.splice(at, 1)[0], index });
      else fresh.push({ row: { ...rowOf(w, index), id: pendingId(w, k) }, index });
    });

    if (fresh.length) {
      const { error } = await client.from(table)
        .upsert(fresh.map(f => f.row), { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw fail(error);
      now.push(...fresh.map(f => ({ ...f.row })));
      landed(now.map(r => ({ ...r })));
    }
    if (free.length) {
      const gone = free.map(r => r.id);
      const { error } = await client.from(table).delete().in('id', gone);
      if (error) throw fail(error);
      for (const id of gone) now.splice(now.findIndex(r => r.id === id), 1);
      landed(now.map(r => ({ ...r })));
    }
    if (order) {
      for (const { row, index } of kept) {
        if (row[order] === index) continue;
        const { error } = await client.from(table).update({ [order]: index }).eq('id', row.id);
        if (error) throw fail(error);
        now.find(r => r.id === row.id)[order] = index;
        landed(now.map(r => ({ ...r })));
      }
    }
    return now;
  }

  window.SchedulerPair = { saveRecord, syncRows };
})();
