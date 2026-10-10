/* ==========================================================================
   record-writes.js — A SAVE, RECORDED AND NOT SENT
   --------------------------------------------------------------------------
   Pasted into a logged-in Scheduler tab on the preview, by a session, to
   prove what a Save writes without writing it. `scheduler/docs/proving-a-save.md`
   is how it is used. No page loads it.

   Every page's database client is the one object `Rux.account.client`, and
   every write goes through `from(table).insert|update|upsert|delete`, an
   `rpc`, or a storage `upload` or `remove`. This puts a stand-in in front of
   those: a read passes through to the database as before, and a write is
   kept in `__writes` and answered here as if it had landed.

     __writes        each write, in order: { table, op, payload, filters }.
                     An rpc is `rpc:<name>` and a file is `storage:<bucket>`.
     __failOn        a function of a write that says whether to refuse it,
                     for a save that stops partway.
     __stampMoves    a function of how many times a trip's `updated_at` has
                     been read that says whether to answer with a new stamp,
                     for a save somebody else got in ahead of.
     __wait(ms)      a wait Chrome does not slow in a tab left in the
                     background, as it slows a timer.

   A trip the test inserts is read back from what was recorded, because the
   editor reads a new trip again by its id before it names the trip's files.
   A reload puts the page's own client back.
   ========================================================================== */
(() => {
  'use strict';

  const client = window.Rux?.account?.client;
  if (!client) throw new Error('No database client on this page: open a Scheduler page, logged in.');
  if (window.__writes) throw new Error('Writes are already being recorded in this tab. Reload to start again.');

  const realFrom = client.from.bind(client);
  const realRpc = client.rpc.bind(client);
  const realStorage = client.storage.from.bind(client.storage);
  window.__writes = [];
  window.__failOn = null;
  window.__stampMoves = null;
  let stampReads = 0;
  let made = 0;

  const tick = () => new Promise(done => {
    const c = new MessageChannel();
    c.port1.onmessage = () => done();
    c.port2.postMessage(0);
  });
  window.__wait = async ms => { const end = Date.now() + ms; while (Date.now() < end) await tick(); };

  const REFUSED = { data: null, error: { message: 'Refused by the test.', code: 'TEST' } };
  // A write's answer: the row it sent, with an id where it had none, or the refusal a test asked for.
  const landed = (rec, row) => {
    const answer = new Proxy(function () {}, {
      get(_, method) {
        if (method === 'then') {
          return (ok, no) => Promise.resolve(window.__failOn?.(rec) ? REFUSED
            : { data: rec.op === 'delete' ? null : rec.single ? row : [row], error: null }).then(ok, no);
        }
        if (method === 'single' || method === 'maybeSingle') return () => { rec.single = true; return answer; };
        return (...args) => {
          rec.filters.push([method, ...args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a))].join(' '));
          return answer;
        };
      },
    });
    return answer;
  };

  client.from = table => {
    const real = realFrom(table);
    return new Proxy(real, {
      get(target, method) {
        if (['insert', 'update', 'upsert', 'delete'].includes(method)) {
          return payload => {
            const rec = { table, op: method, payload: payload ?? null, filters: [] };
            window.__writes.push(rec);
            return landed(rec, { id: `recorded-${++made}`, ...(Array.isArray(payload) ? payload[0] : payload) });
          };
        }
        if (table === 'trips' && method === 'select') {
          return (...columns) => {
            const calls = [];
            let single = false;
            const read = new Proxy(function () {}, {
              get(_, m) {
                if (m === 'then') {
                  return (ok, no) => {
                    const byId = calls.find(c => c[0] === 'eq' && c[1] === 'id');
                    const mine = byId && window.__writes.find(w => w.table === 'trips' && w.op === 'insert' && w.payload?.id === byId[2]);
                    if (mine) return Promise.resolve({ data: single ? mine.payload : [mine.payload], error: null }).then(ok, no);
                    if (columns[0] === 'updated_at' && window.__stampMoves?.(++stampReads)) {
                      return Promise.resolve({ data: { updated_at: new Date().toISOString() }, error: null }).then(ok, no);
                    }
                    let query = target.select(...columns);
                    for (const [name, ...args] of calls) query = query[name](...args);
                    return query.then(ok, no);
                  };
                }
                return (...args) => {
                  if (m === 'single' || m === 'maybeSingle') single = true;
                  calls.push([m, ...args]);
                  return read;
                };
              },
            });
            return read;
          };
        }
        const value = target[method];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };

  // A function that only reads is named get_ and passes; any other is a write.
  client.rpc = (name, args) => {
    if (/^get_/.test(name)) return realRpc(name, args);
    window.__writes.push({ table: `rpc:${name}`, op: 'rpc', payload: args ?? null, filters: [] });
    return Promise.resolve({ data: null, error: null });
  };

  client.storage.from = bucket => {
    const real = realStorage(bucket);
    return {
      upload: async (path, file) => {
        window.__writes.push({ table: `storage:${bucket}`, op: 'upload', payload: { path, name: file?.name ?? null }, filters: [] });
        return { data: { path }, error: null };
      },
      remove: async paths => {
        window.__writes.push({ table: `storage:${bucket}`, op: 'remove', payload: paths, filters: [] });
        return { data: [], error: null };
      },
      createSignedUrl: (...args) => real.createSignedUrl(...args),
    };
  };
})();
