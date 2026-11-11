// What the scheduler's headless checks share: where Chrome is, a free port,
// a wait, a DevTools connection, and the stand-in for the account and the
// database that lets a page draw from invented rows with nobody logged in.
import { createServer } from 'node:net';

export const CHROMES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

/* The account and database stand-in, run in the page before its scripts:
   every table read answers from the invented rows, samsara-now from the
   invented readings, every write and other call answers empty, and the
   log-in is a staff member called Preview. */
export const stub = data => `(() => {
  const rows = ${JSON.stringify(data)};
  const answer = table => ({ data: rows[table] ?? [], error: null });
  const query = table => new Proxy(() => {}, {
    get(_, name) {
      if (name === 'then') return (resolve, reject) => Promise.resolve(answer(table)).then(resolve, reject);
      if (name === 'single' || name === 'maybeSingle') return () => Promise.resolve({ data: (rows[table] ?? [])[0] ?? null, error: null });
      return () => query(table);
    },
    apply() { return query(table); },
  });
  const channel = () => ({ on() { return this; }, subscribe(cb) { setTimeout(() => cb?.('SUBSCRIBED'), 0); return this; }, track: async () => 'ok', untrack: async () => 'ok', send: async () => 'ok', presenceState: () => ({}), state: 'joined' });
  const client = {
    from: table => query(table), rpc: () => query('rpc'), channel, removeChannel() {}, schema: () => client,
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }), createSignedUrl: async () => ({ data: null, error: null }), upload: async () => ({ data: null, error: null }) }) },
    functions: { invoke: async name => ({ data: name === 'samsara-now' ? rows.live : null, error: null }) }, auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; } },
  };
  window.Rux = window.Rux || {};
  window.Rux.account = { client, staffProfile: async () => ({ id: 'p-1', name: 'Preview', staff: true }), person: async () => ({ id: 'p-1', name: 'Preview', staff: true }), drawAvatar() {}, onAuthChange() {}, getSession: async () => null, signOut() {} };
  try { localStorage.setItem('scheduler.view', JSON.stringify({ scroll: true })); } catch {}
})();`;

export async function freePort() {
  return new Promise((done, failed) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => done(port)); }); s.on('error', failed); });
}
export const reachable = async url => { try { const r = await fetch(url, { method: 'HEAD' }); return r.ok || r.status === 404; } catch { return false; } };
export async function waitFor(test, ms, what) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await test()) return; await new Promise(r => setTimeout(r, 100)); }
  throw new Error(`timed out waiting for ${what}`);
}

/* A DevTools connection: one socket, numbered calls, events by name. */
export function connect(url) {
  const ws = new WebSocket(url);
  let next = 1;
  const waiting = new Map(), listeners = new Map();
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { const { done, failed } = waiting.get(m.id); waiting.delete(m.id); if (m.error) failed(new Error(m.error.message)); else done(m.result); }
    else if (m.method) for (const fn of listeners.get(m.method) ?? []) fn(m.params);
  });
  const send = (method, params = {}) => new Promise((done, failed) => { const id = next++; waiting.set(id, { done, failed }); ws.send(JSON.stringify({ id, method, params })); });
  const on = (method, fn) => { if (!listeners.has(method)) listeners.set(method, []); listeners.get(method).push(fn); };
  return new Promise((done, failed) => { ws.addEventListener('open', () => done({ send, on, close: () => ws.close() })); ws.addEventListener('error', () => failed(new Error(`could not open ${url}`))); });
}
