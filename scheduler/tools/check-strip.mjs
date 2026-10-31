// Proves the strip's growth draws what a whole draw draws. Serves the site
// on a free port, opens the scheduler in headless Chrome with the account
// and the database stood in by invented trips, scrolls the strip two weeks
// on and four weeks back so it grows each way, and compares every bar and
// yard card of the grown strip with a whole draw of the same week: the
// bar's row, trip, leg, assignment, slot, days, lane, classes and words.
// Needs Chrome on this Mac, or `CHROME` naming one; says so and passes
// when there is none, since the whole check runs where Chrome may not be.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const SERVER = join(ROOT, 'design', 'tools', 'serve.mjs');
const CHROMES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

const ok = (name, words) => console.log(`   ok   ${name.padEnd(7)} ${words}`);
const fail = (name, words) => { console.log(`  FAIL  ${name.padEnd(7)} ${words}`); process.exitCode = 1; };

/* ── Invented trips ──────────────────────────────────────────────────────
   Deterministic, from a seeded generator, so a failure is the same failure
   twice: twelve buses, ten drivers, and two or three trips a day across
   seven months either side of today, one to five days long, on one to
   three buses, some on no bus yet. The old trip shape, with no legs, is
   what the board reads without a route. */
function invented() {
  let seed = 7;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = list => list[Math.floor(rand() * list.length)];
  const iso = d => d.toISOString().slice(0, 10);
  const day = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
  const buses = Array.from({ length: 12 }, (_, i) => ({
    id: `b-${i + 1}`, number: String(100 + i * 7), capacity: i % 3 ? 56 : 52, type: i % 4 === 3 ? 'minibus' : 'coach', status: 'active',
    sort_order: i, ada_lift: i % 2 === 0, sleeper: i % 5 === 0, equipment: null, year: 2018 + (i % 6), make: 'Make', model: 'Model', color: 'White', vin: null, inspection_exp: null,
  }));
  const drivers = Array.from({ length: 10 }, (_, i) => ({
    id: `d-${i + 1}`, name: `Driver ${i + 1}`, short_name: `D${i + 1}`, status: 'active', priority: (i % 5) + 1, phone: null, texting_url: null,
    employment_type: 'full_time', license_exp: null, med_card_expiry: null, language: 'en',
  }));
  const places = ['Northfield', 'Eastport', 'Lakeside', 'Hillcrest', 'Riverton', 'Oakdale', 'Stonebridge', 'Westmere'];
  const schools = ['Maple High School', 'Cedar Academy', 'Pine Ridge ISD', 'Harbor Middle School', 'Summit Charter'];
  const trips = [];
  let n = 0;
  for (let at = -210; at <= 210; at++) {
    const count = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < count; k++) {
      const span = 1 + Math.floor(rand() * rand() * 5);
      const busCount = 1 + Math.floor(rand() * rand() * 3);
      const id = `t-${++n}`;
      const assignments = Array.from({ length: busCount }, (_, p) => ({
        id: `a-${id}-${p}`, bus_id: rand() < 0.15 ? null : pick(buses).id, position: p, leg: 'outbound', route_id: null, active_roles: null,
        needs: null, vehicle_type: null, fuel_card_number: null, pickup_at: null, actual_yard_depart_at: null, actual_yard_return_at: null, trip_drivers: [],
      }));
      trips.push({
        id, trip_ref: `R${1000 + n}`, destination: pick(places), customer: pick(schools), customer_id: null,
        start_date: iso(day(at)), end_date: iso(day(at + span - 1)), return_start_date: null, return_end_date: null,
        departure_time: `${String(5 + Math.floor(rand() * 8)).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}:00`,
        return_time: `${String(14 + Math.floor(rand() * 9)).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}:00`,
        trip_type: 'round_trip', confirmed: rand() < 0.7, trip_bar_color: null, bus_count: busCount, return_bus_count: null,
        updated_at: new Date(2026, 0, 1 + (n % 28)).toISOString(), trip_reqs: {}, vehicle_type: null, cancelled_at: null,
        hotel_booked_outbound: false, hotel_booked_return: false, hotel_itinerary_number_outbound: null, hotel_itinerary_number_return: null,
        trip_assignments: assignments, trip_prep: null, trip_stops: [], trip_updates: [], trip_payments: [], trip_pos: [], trip_invoices: [],
        trip_quote_lines: [], trip_documents: [], trip_contacts: [],
      });
    }
  }
  return { buses, drivers, trips, contacts: [], customers: [], locations: [], settings: [], bus_out_of_service: [], driver_time_off: [] };
}

/* The account and database stand-in, run in the page before its scripts:
   every table read answers from the invented rows, every write and call
   answers empty, and the log-in is a staff member called Preview. */
const stub = data => `(() => {
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
    functions: { invoke: async () => ({ data: null, error: null }) }, auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; } },
  };
  window.Rux = window.Rux || {};
  window.Rux.account = { client, staffProfile: async () => ({ id: 'p-1', name: 'Preview', staff: true }), person: async () => ({ id: 'p-1', name: 'Preview', staff: true }), drawAvatar() {}, onAuthChange() {}, getSession: async () => null, signOut() {} };
  try { localStorage.setItem('scheduler.view', JSON.stringify({ scroll: true })); } catch {}
})();`;

/* What runs in the page: waits for the strip, scrolls it on by two weeks and
   back by four, and after each grown strip has a whole draw of the same week
   to compare with. Returns the differences. */
const scenario = `(async () => {
  const sch = document.getElementById('scheduler-week');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (test, ms, what) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (test()) return true; await wait(50); } throw new Error('timed out waiting for ' + what); };
  const label = () => document.getElementById('scheduler-range')?.textContent ?? '';
  const bars = () => document.querySelectorAll('.scheduler-track > .scheduler-bar').length;
  await until(() => bars() > 0 && document.querySelectorAll('.scheduler-day').length === 35, 15000, 'the strip');
  await wait(800);
  const w = parseFloat(sch.style.getPropertyValue('--scheduler-day-w'));
  // The week input holds the picker's own format, m/d/yyyy here; a pick is written the same way.
  const toIso = v => { const m = /^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/.exec(v || ''); return m ? m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : (v || ''); };
  const fromIso = isoDay => { const [y, m, d] = isoDay.split('-'); return Number(m) + '/' + Number(d) + '/' + y; };
  const shift = (isoDay, n) => { const d = new Date(isoDay + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const days = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  const snap = () => ({
    first: document.querySelector('.scheduler-day').textContent, label: label(), week: toIso(document.getElementById('scheduler-week-date').value),
    at: Math.round(sch.scrollLeft / w * 100) / 100, stripStart: shift(toIso(document.getElementById('scheduler-week-date').value), -Math.round(sch.scrollLeft / w)),
    bars: [...document.querySelectorAll('.scheduler-track > .scheduler-bar')].map(b => ({
      key: (b.parentElement.dataset.busId ?? 'u') + '|' + b.dataset.tripId + '|' + b.dataset.legKey + '|' + (b.dataset.assignmentId || '') + '|' + b.dataset.slot,
      start: Number(b.dataset.start), span: Number(b.dataset.span), lane: b.style.getPropertyValue('--scheduler-lane'), varStart: b.style.getPropertyValue('--scheduler-start'),
      cls: [...b.classList].filter(c => !/--(road|watched|saving|pressed|open|same-trip|driver|saved)$/.test(c)).sort().join(' '),
      text: b.textContent, folded: b.hasAttribute('data-folded'),
    })),
    yards: [...document.querySelectorAll('.scheduler-track > .scheduler-yard')].map(y => (y.parentElement.dataset.busId ?? 'u') + '|' + y.dataset.start + '|' + y.style.getPropertyValue('--scheduler-lane') + '|' + y.className + '|' + y.title).sort(),
  });
  const swipe = async (dx, n) => { for (let i = 0; i < n; i++) { sch.dispatchEvent(new WheelEvent('wheel', { deltaX: dx, deltaY: 1, deltaMode: 0, bubbles: true, cancelable: true })); await wait(16); } };
  const settled = async () => { await wait(1800); };
  const pick = async isoDay => { const was = label(); const input = document.getElementById('scheduler-week-date'); input.value = fromIso(isoDay); input.dispatchEvent(new Event('change', { bubbles: true })); await until(() => label() !== was, 8000, 'the week ' + isoDay); await wait(600); };
  /* A whole draw with the same days on screen as the grown strip: a week far
     off is drawn first, so the way back is a draw and not a scroll; the pick
     lands on the week's first day, so the view is then scrolled on to the
     grown strip's day, which settles the rows the same way. */
  const whole = async grown => { await pick(shift(grown.week, 120)); const far = label(); await pick(grown.week); await until(() => label() !== far && bars() > 0, 8000, 'the week back'); await wait(1000);
    const on = days(toIso(document.getElementById('scheduler-week-date').value), grown.week);
    if (on) { await swipe(on > 0 ? 30 : -30, Math.round(Math.abs(on) * w / 30)); await settled(); }
    return snap(); };
  /* A gesture leaves the week in view on any day; the picker lands on a week's
     first day, so the whole draw's strip starts up to six days earlier. The
     two are compared on their common days, the whole draw's day indices moved
     by the difference, leaving out a bar either strip's edge cuts. */
  const compare = (name, grown, fresh) => {
    const delta = days(fresh.stripStart, grown.stripStart);
    const inside = (start, span) => start >= 1 && start + span <= 34;
    const out = { name, delta, sameDays: grown.week === fresh.week, grownBars: grown.bars.length, freshBars: fresh.bars.length, onEdge: Math.abs(grown.at - Math.round(grown.at)) < 0.01, diffs: [], laneDiffs: 0, compared: 0, unsettled: grown.bars.filter(b => Number(b.varStart) !== b.start).length };
    const f = new Map(fresh.bars.filter(b => inside(b.start, b.span) && inside(b.start - delta, b.span)).map(b => [b.key, { ...b, start: b.start - delta }]));
    for (const g of grown.bars.filter(b => inside(b.start, b.span) && inside(b.start + delta, b.span))) { const b = f.get(g.key); if (!b) { out.diffs.push({ key: g.key, only: 'grown' }); continue; } f.delete(g.key); out.compared++;
      for (const k of ['start', 'span', 'cls', 'text', 'folded']) if (g[k] !== b[k]) out.diffs.push({ key: g.key, field: k, grown: String(g[k]).slice(0, 60), fresh: String(b[k]).slice(0, 60) });
      if (g.lane !== b.lane) out.laneDiffs++; }
    for (const key of f.keys()) out.diffs.push({ key, only: 'fresh' });
    // A card is compared only where both strips hold its day, as a bar is.
    const yardsOf = (list, move) => list.map(y => { const [track, start, ...rest] = y.split('|'); return [track, Number(start) - move, ...rest]; }).filter(y => y[1] >= 1 && y[1] <= 33 && y[1] + move >= 1 && y[1] + move <= 33).map(y => y.join('|')).sort();
    const yg = yardsOf(grown.yards, 0).filter(y => { const i = Number(y.split('|')[1]); return i + delta >= 1 && i + delta <= 33; }), yf = yardsOf(fresh.yards, delta);
    out.yardsSame = JSON.stringify(yg) === JSON.stringify(yf);
    // A yard card is the pair of bars it stands between; one that only moved lane with its bars is the same card.
    const noLane = y => y.split('|').filter((_, i) => i !== 2).join('|');
    out.yardsSameButLane = JSON.stringify(yg.map(noLane).sort()) === JSON.stringify(yf.map(noLane).sort());
    out.yardDiffs = [...yg.filter(y => !yf.includes(y)).map(y => 'grown ' + y), ...yf.filter(y => !yg.includes(y)).map(y => 'fresh ' + y)].slice(0, 6);
    return out;
  };
  const results = [];
  const start = snap();
  await swipe(30, 110); await settled();
  const grownOn = snap();
  results.push(compare('on by two weeks', grownOn, await whole(grownOn)));
  await swipe(-30, 200); await settled();
  const grownBack = snap();
  results.push(compare('back by four weeks', grownBack, await whole(grownBack)));
  return { startWeek: start.week, startBars: start.bars.length, results };
})()`;

async function freePort() {
  return new Promise((done, failed) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => done(port)); }); s.on('error', failed); });
}
const reachable = async url => { try { const r = await fetch(url, { method: 'HEAD' }); return r.ok || r.status === 404; } catch { return false; } };
async function waitFor(test, ms, what) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await test()) return; await new Promise(r => setTimeout(r, 100)); }
  throw new Error(`timed out waiting for ${what}`);
}

/* A DevTools connection: one socket, numbered calls, events by name. */
function connect(url) {
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

async function main() {
  const chrome = CHROMES.find(p => existsSync(p));
  if (!chrome) { ok('strip', 'skipped: no Chrome here (set CHROME to one) to grow the strip in'); return; }
  const port = await freePort();
  const server = spawn(process.execPath, [SERVER], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, HOST: 'localhost', PORT: String(port) } });
  const profile = mkdtempSync(join(tmpdir(), 'check-strip-'));
  let browser = null;
  const t0 = Date.now();
  try {
    await waitFor(() => reachable(`http://localhost:${port}/scheduler/`), 10000, 'the site');
    browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1400,900', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
    const portFile = join(profile, 'DevToolsActivePort');
    await waitFor(() => existsSync(portFile) && readFileSync(portFile, 'utf8').trim().length > 0, 15000, 'Chrome');
    const devtools = Number(readFileSync(portFile, 'utf8').split('\n')[0]);
    let targets = [];
    await waitFor(async () => { try { targets = await (await fetch(`http://127.0.0.1:${devtools}/json`)).json(); } catch { return false; } return targets.some(t => t.type === 'page'); }, 10000, 'a page');
    const page = await connect(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    const errors = [];
    page.on('Runtime.exceptionThrown', p => errors.push(p.exceptionDetails?.exception?.description?.split('\n')[0] ?? p.exceptionDetails?.text));
    page.on('Runtime.consoleAPICalled', p => { if (p.type === 'error') errors.push(p.args.map(a => a.value ?? a.description).join(' ').slice(0, 160)); });
    page.on('Fetch.requestPaused', p => page.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body: Buffer.from('/* stood in by check-strip */').toString('base64') }));
    await page.send('Runtime.enable');
    await page.send('Page.enable');
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*/funnel.js' }, { urlPattern: '*/account.js' }, { urlPattern: '*turnstile*' }] });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: stub(invented()) });
    // The scenario must run in the scheduler's own document, not the blank one before it.
    const loaded = new Promise(r => page.on('Page.loadEventFired', r));
    await page.send('Page.navigate', { url: `http://localhost:${port}/scheduler/` });
    await Promise.race([loaded, new Promise((_, f) => setTimeout(() => f(new Error('the page never loaded')), 20000))]);
    if (process.env.STRIP_DEBUG) { await new Promise(r => setTimeout(r, 4000)); const d = await page.send('Runtime.evaluate', { expression: 'JSON.stringify({ href: location.href, title: document.title, week: !!document.getElementById(\'scheduler-week\'), account: !!window.Rux?.account?.staffProfile, status: document.getElementById(\'scheduler-status\')?.textContent?.slice(0, 200), bars: document.querySelectorAll(\'.scheduler-bar\').length, weekValue: document.getElementById(\'scheduler-week-date\')?.value, label: document.getElementById(\'scheduler-range\')?.textContent, body: document.body?.textContent?.replace(/\\s+/g, \' \').slice(0, 300) })', returnByValue: true }); console.log('debug', d.result.value); console.log('errors', errors.slice(0, 8)); }
    const { result, exceptionDetails } = await page.send('Runtime.evaluate', { expression: scenario, awaitPromise: true, returnByValue: true, timeout: 90000 });
    page.close();
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    const seconds = ((Date.now() - t0) / 1000).toFixed(1);
    let bad = false;
    for (const r of result.value.results) {
      const words = `${r.name}: ${r.compared} bars the same as a whole draw${r.laneDiffs ? `, ${r.laneDiffs} in another lane` : ''}${!r.yardsSame && r.yardsSameButLane ? ', yard cards moved with them' : ''}`;
      if (!r.onEdge) { fail('strip', `${r.name}: the strip settled off a day edge`); bad = true; }
      if (!r.sameDays) { fail('strip', `${r.name}: the whole draw could not be brought to the same day`); bad = true; }
      if (r.unsettled) { fail('strip', `${r.name}: ${r.unsettled} bars not where their data-start says`); bad = true; }
      if (!r.yardsSame && !r.yardsSameButLane) { bad = true; fail('strip', `${r.name}: the yard cards differ from a whole draw`); for (const y of r.yardDiffs) console.log(`          ${y}`); }
      if (r.diffs.length) { bad = true; fail('strip', `${r.name}: ${r.diffs.length} bars differ from a whole draw`); for (const d of r.diffs.slice(0, 8)) console.log(`          ${JSON.stringify(d)}`); }
      if (!bad) ok('strip', words);
    }
    const noise = errors.filter(e => e && !/Samsara|presence|turnstile|favicon/i.test(e));
    if (noise.length) { fail('strip', `${noise.length} page errors`); for (const e of noise.slice(0, 6)) console.log(`          ${e}`); }
    if (!bad && !noise.length) ok('strip', `${result.value.startBars} bars from ${result.value.startWeek}, grown each way in ${seconds}s`);
  } catch (e) {
    fail('strip', e.message);
  } finally {
    if (browser) { const gone = new Promise(r => browser.once('exit', r)); browser.kill(); await Promise.race([gone, new Promise(r => setTimeout(r, 3000))]); }
    server.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still be closing its profile; the OS clears its temp folder. */ }
  }
}

main();
