// What the scheduler's headless checks share: where Chrome is, the site
// served and Chrome opened on it, a wait, a deadline, a DevTools connection,
// a page's settling, and the stand-in for the account and the database that
// lets a page draw from invented rows with nobody logged in.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

/* A promise held to a deadline. The timer is cleared once the promise
   settles, since a timer left running keeps Node open until it fires and a
   check would end that much after its work. `said` is the error's words, or
   a function giving them at the deadline. */
export function within(promise, ms, said) {
  let timer;
  const late = new Promise((_, failed) => { timer = setTimeout(() => failed(new Error(typeof said === 'function' ? said() : said)), ms); });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

/* Chrome says on stderr where its DevTools listen once it is up, and a
   Chrome that exits first says why there too, so the start is waited on by
   Chrome's own word and fails at once with it. The minute is only for a
   Chrome that hangs. */
function listening(browser) {
  let said = '';
  const last = () => said.trim().split('\n').slice(-3).join(' | ') || 'nothing';
  const up = new Promise((done, failed) => {
    browser.stderr.setEncoding('utf8');
    // Read for as long as Chrome runs, so its pipe never fills; the last few thousand characters are kept to say why it stopped.
    browser.stderr.on('data', s => {
      said = (said + s).slice(-4000);
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(said);
      if (m) done(m[1]);
    });
    browser.once('error', failed);
    browser.once('exit', (code, signal) => failed(new Error(`Chrome stopped (${signal ?? `exit ${code}`}) before it was up; it said: ${last()}`)));
  });
  return within(up, 60000, () => `Chrome was not up after a minute; it said: ${last()}`);
}

/* The site served on a free port and headless Chrome opened on a blank page,
   with the log-in, the account script and Turnstile stood in and the
   database answering from `data` by `stub`. `name` names the check, in the
   stand-in's words and its profile's folder. `close` ends Chrome and the
   server and clears the profile; a start that fails has closed them. */
export async function openHeadless({ root, chrome, name, data }) {
  const port = await freePort();
  const server = spawn(process.execPath, [join(root, 'design', 'tools', 'serve.mjs')], { cwd: root, stdio: 'ignore', env: { ...process.env, HOST: 'localhost', PORT: String(port) } });
  const profile = mkdtempSync(join(tmpdir(), `${name}-`));
  let browser = null, page = null;
  const close = async () => {
    if (page) await within(page.close(), 3000, 'the DevTools socket did not close').catch(() => {});
    if (browser && browser.exitCode === null && browser.signalCode === null) {
      const gone = new Promise(r => browser.once('exit', r));
      browser.kill();
      await within(gone, 3000, 'Chrome did not stop').catch(() => {});
    }
    // Chrome's helpers hold its stderr open a while after it stops, and an open pipe holds Node open.
    browser?.stderr.destroy();
    server.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still be closing its profile; the OS clears its temp folder. */ }
  };
  try {
    await waitFor(() => reachable(`http://localhost:${port}/scheduler/`), 10000, 'the site');
    browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1400,900', '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
    const devtools = new URL(await listening(browser)).port;
    let targets = [];
    await waitFor(async () => { try { targets = await (await fetch(`http://127.0.0.1:${devtools}/json`)).json(); } catch { return false; } return targets.some(t => t.type === 'page'); }, 10000, 'a page');
    page = await connect(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    // funnel.js shows the page once the log-in lets it; its stand-in shows it at once.
    const standIn = url => (/\/funnel\.js/.test(url) ? "document.documentElement.setAttribute('data-rux-unlocked', '');" : `/* stood in by ${name} */`);
    page.on('Fetch.requestPaused', p => page.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body: Buffer.from(standIn(p.request.url)).toString('base64') }));
    await page.send('Runtime.enable');
    await page.send('Page.enable');
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*/funnel.js' }, { urlPattern: '*/account.js' }, { urlPattern: '*turnstile*' }] });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: stub(data) });
    return { port, page, close };
  } catch (e) {
    await close();
    throw e;
  }
}

/* In the page, an async function that resolves once what is drawn has
   settled: two frames on, so a style just changed is computed and its
   transitions started, the fonts it asked for are in, and no transition or
   animation that ends is still running, asked again after each has ended,
   since one may start another. Only those on the document's clock count: a
   scroll-driven one, as the board's day band follows its scroll, runs as
   long as its scroller does and never ends. */
export const SETTLE = `async () => {
  const frames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  for (;;) {
    await frames();
    await document.fonts.ready;
    const running = document.getAnimations().filter(a => a.playState === 'running' && a.timeline instanceof DocumentTimeline && a.effect?.getComputedTiming().endTime !== Infinity);
    if (!running.length) return;
    await Promise.allSettled(running.map(a => a.finished));
  }
}`;

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
  // Closing answers once the socket has closed, since a socket still closing when Chrome stops holds Node open until it gives up.
  const close = () => new Promise(done => { if (ws.readyState === WebSocket.CLOSED) return done(); ws.addEventListener('close', () => done(), { once: true }); ws.close(); });
  return new Promise((done, failed) => { ws.addEventListener('open', () => done({ send, on, close })); ws.addEventListener('error', () => failed(new Error(`could not open ${url}`))); });
}
