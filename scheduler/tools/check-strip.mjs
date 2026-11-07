// Proves the strip draws near the view what a whole draw draws. Serves the
// site on a free port, opens the scheduler in headless Chrome with the
// account and the database stood in by invented trips, scrolls the strip
// two weeks on and four weeks back with the browser's own wheel, as a
// trackpad does, timing its frames, and compares every bar and yard card
// within two weeks of the view with those of the page loaded again and
// brought to the same day: the bar's row, trip, leg, assignment, slot,
// days, lane, classes and words, and the out-of-service marks and stripes.
// Says too where a bar is drawn twice. Then turns the bar's rows off one by
// one, six lines to one, as the view menu does, and in each says whether
// every bar is a whole number of 16px and every open bus row, its line
// inside it, of 8px, Carbon's grid, whether every box a bus's head or a bar
// in view paints stands on whole pixels, and at six lines whether the driver
// rail's rows are 48px and three of them stand level with a one-lane bus row.
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
  // One bus out of service for five days, two weeks back, where the check scrolls to.
  const out = [{ bus_id: 'b-3', start_date: iso(day(-17)), end_date: iso(day(-13)), reason: 'Brakes' }];
  /* What samsara-now says of each bus, in turn moving, idling on a low tank,
     off on a critical tank with a low DEF, and with no signal, so every
     head draws its readings in each of their shapes. */
  const ago = min => new Date(Date.now() - min * 60e3).toISOString();
  const states = [
    { engine: 'on', mph: 52, fuel: 68, def: 80 },
    { engine: 'idle', mph: 0, fuel: 22, def: 80 },
    { engine: 'off', mph: 0, fuel: 8, def: 4 },
    { engine: null, mph: 0, fuel: 55, def: 80 },
  ];
  const live = { buses: buses.map((b, i) => ({ bus_id: b.id, ...states[i % states.length], engine_at: ago(12), seen: ago(90), drivers: [] })), drivers: [] };
  return { buses, drivers, trips, contacts: [], customers: [], locations: [], settings: [], bus_out_of_service: out, driver_time_off: [], live };
}

/* The account and database stand-in, run in the page before its scripts:
   every table read answers from the invented rows, samsara-now from the
   invented readings, every write and other call answers empty, and the
   log-in is a staff member called Preview. */
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
    functions: { invoke: async name => ({ data: name === 'samsara-now' ? rows.live : null, error: null }) }, auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; } },
  };
  window.Rux = window.Rux || {};
  window.Rux.account = { client, staffProfile: async () => ({ id: 'p-1', name: 'Preview', staff: true }), person: async () => ({ id: 'p-1', name: 'Preview', staff: true }), drawAvatar() {}, onAuthChange() {}, getSession: async () => null, signOut() {} };
  try { localStorage.setItem('scheduler.view', JSON.stringify({ scroll: true })); } catch {}
})();`;

/* What runs in the page: `window.__strip`, put there once the page has
   loaded, which waits for the strip, says where it stands and what it has
   drawn, picks a week, and times the frames while a scroll runs. The scroll
   itself is sent from outside the page, as the trackpad's would be. */
const helpers = `window.__strip = (() => {
  const sch = document.getElementById('scheduler-week');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const until = async (test, ms, what) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (test()) return true; await wait(50); } throw new Error('timed out waiting for ' + what); };
  const label = () => document.getElementById('scheduler-range-text')?.textContent ?? '';
  const bars = () => document.querySelectorAll('.scheduler-track > .scheduler-bar').length;
  const w = () => window.Rux.schedule.day();
  const toIso = v => { const m = /^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/.exec(v || ''); return m ? m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : (v || ''); };
  const snap = () => ({
    at: Math.round(sch.scrollLeft / w() * 100) / 100, left: sch.scrollLeft, week: toIso(document.getElementById('scheduler-week-date').value), inView: Number(sch.dataset.daysInView) || 7,
    bars: [...document.querySelectorAll('.scheduler-track > .scheduler-bar')].map(b => ({
      key: (b.parentElement.dataset.busId ?? 'u') + '|' + b.dataset.tripId + '|' + b.dataset.legKey + '|' + (b.dataset.assignmentId || '') + '|' + b.dataset.slot,
      start: Number(b.dataset.start), span: Number(b.dataset.span), lane: b.style.getPropertyValue('--scheduler-lane'), varStart: b.style.getPropertyValue('--scheduler-start'),
      cls: [...b.classList].filter(c => !/--(road|watched|saving|pressed|open|same-trip|driver|saved)$/.test(c)).sort().join(' '),
      text: b.textContent, folded: b.hasAttribute('data-folded'),
    })),
    yards: [...document.querySelectorAll('.scheduler-track > .scheduler-yard')].map(y => ({ start: Number(y.dataset.start), key: (y.parentElement.dataset.busId ?? 'u') + '|' + y.dataset.start + '|' + y.style.getPropertyValue('--scheduler-lane') + '|' + y.className + '|' + y.title })),
    marks: [...document.querySelectorAll('.scheduler-row-head[data-bus-id]')].filter(h => h.querySelector('.scheduler-row-head__oos')).map(h => h.dataset.busId),
    stripes: [...document.querySelectorAll('.scheduler-track > .scheduler-oos')].map(o => (o.parentElement.dataset.busId ?? 'u') + '|' + o.style.getPropertyValue('--scheduler-start') + '|' + o.style.getPropertyValue('--scheduler-span')),
  });
  // Once the strip has stood still for half a second, and the trips owed near it have had their frames.
  const rest = async () => { let last = NaN, still = 0; while (still < 10) { await wait(50); still = sch.scrollLeft === last ? still + 1 : 0; last = sch.scrollLeft; } await wait(1200); };
  // Each frame's work, from its start to after it is drawn.
  let frames = [], on = false, t0 = 0;
  const ch = new MessageChannel();
  ch.port1.onmessage = () => frames.push(performance.now() - t0);
  const tick = () => { if (!on) return; t0 = performance.now(); ch.port2.postMessage(0); requestAnimationFrame(tick); };
  return {
    ready: async () => {
      // The strip runs a year and more, so its day header has more than a year of days.
      await until(() => bars() > 0 && document.querySelectorAll('.scheduler-day').length > 365, 15000, 'the strip');
      await wait(800);
      // A point over the first rows, inside the window whatever the board's height.
      const box = sch.getBoundingClientRect();
      return { x: Math.round(box.left + Math.min(box.width, innerWidth - box.left) / 2), y: Math.round(box.top + 120), w: w() };
    },
    snap, rest,
    // How many pixels short of a place the strip stands.
    short: left => left - sch.scrollLeft,
    // Picks the week of a day, as many days from the strip's first.
    pick: async at => {
      const input = document.getElementById('scheduler-week-date');
      const was = label();
      const strip = new Date(toIso(input.value) + 'T12:00:00'); strip.setDate(strip.getDate() - Math.round(sch.scrollLeft / w()));
      const target = new Date(strip); target.setDate(target.getDate() + at);
      // Written back in the input's own format, m/d/yyyy or ISO.
      const day = target.toISOString().slice(0, 10);
      input.value = input.value.includes('/') ? day.split('-').map(Number).slice(1).join('/') + '/' + day.slice(0, 4) : day;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await until(() => label() !== was, 8000, 'the week picked');
      await rest();
    },
    framesOn: () => { frames = []; on = true; requestAnimationFrame(tick); },
    framesOff: () => { on = false; const f = [...frames].sort((a, b) => a - b); const q = p => Math.round(f[Math.min(f.length - 1, Math.floor(p * f.length))] * 10) / 10; return { n: f.length, p50: q(0.5), p90: q(0.9), max: q(1) }; },
  };
})(); 'ok'`;

/* Compares what the two drew within NEAR days of the first's view, a day
   inside the two weeks either side where both have drawn every trip; past
   that, the first may still hold trips it drew on its way, and the second
   has yet to draw them. */
const NEAR = 13;
function compare(name, scrolledTo, whole) {
  const near = x => x.start + (x.span ?? 0) >= scrolledTo.at - NEAR && x.start <= scrolledTo.at + scrolledTo.inView + NEAR;
  const out = { name, samePlace: Math.abs(scrolledTo.left - whole.left) < 1, diffs: [], compared: 0 };
  const twice = list => list.map(b => b.key).filter((k, i, all) => all.indexOf(k) !== i);
  out.twice = [...new Set([...twice(scrolledTo.bars), ...twice(whole.bars)])];
  out.unplaced = scrolledTo.bars.filter(b => Number(b.varStart) !== b.start).length;
  const f = new Map(whole.bars.filter(near).map(b => [b.key, b]));
  for (const g of scrolledTo.bars.filter(near)) {
    const b = f.get(g.key);
    if (!b) { out.diffs.push({ key: g.key, only: 'scrolled' }); continue; }
    f.delete(g.key);
    out.compared++;
    for (const k of ['start', 'span', 'lane', 'cls', 'text', 'folded']) if (g[k] !== b[k]) out.diffs.push({ key: g.key, field: k, scrolled: String(g[k]).slice(0, 60), whole: String(b[k]).slice(0, 60) });
  }
  for (const key of f.keys()) out.diffs.push({ key, only: 'whole' });
  const yards = list => list.filter(near).map(y => y.key).sort();
  const ys = yards(scrolledTo.yards), yw = yards(whole.yards);
  out.yards = ys.length;
  out.yardDiffs = [...ys.filter(y => !yw.includes(y)).map(y => 'scrolled ' + y), ...yw.filter(y => !ys.includes(y)).map(y => 'whole ' + y)].slice(0, 6);
  // The out-of-service mark is on the heads whose windows are in view, and only there; the stripes are every window held.
  out.marks = scrolledTo.marks.join() === whole.marks.join() && scrolledTo.marks.includes('b-3') && !scrolledTo.marksBefore.includes('b-3');
  out.stripes = scrolledTo.stripes.join() === whole.stripes.join() && scrolledTo.stripes.length > 0;
  return out;
}

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

/* What runs in the page for the views: the bar's rows turned off in the
   view menu's order, written as applyView in data.js writes them, the week's
   class for each row, its count and its data attribute, and the view the
   page had put back after. A box paints when it has a background, a border,
   a shadow or is a drawing; text is drawn at its font's own widths and is
   not measured, and a box clipped away, as a screen reader's words are,
   paints nothing. */
const VIEWS = `(async () => {
  const sch = document.getElementById('scheduler-week');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const ROWS = ['update', 'contact', 'client', 'time', 'drivers'];
  const before = { cls: sch.className, rows: sch.style.getPropertyValue('--scheduler-bar-rows'), data: sch.dataset.barRows };
  const whole = v => Math.abs(v - Math.round(v)) < 0.01;
  const paints = (e, cs) => e.tagName.toLowerCase() === 'svg' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none'
    || ['Top', 'Right', 'Bottom', 'Left'].some(side => parseFloat(cs['border' + side + 'Width']) > 0);
  const clipped = (e, root) => { for (let a = e; a && a !== root; a = a.parentElement) if (getComputedStyle(a).clipPath !== 'none') return true; return false; };
  // Every box a head or bar paints, counted, and those off whole pixels named.
  const measure = (root, who, v) => {
    for (const e of [root, ...root.querySelectorAll('*')]) {
      const cs = getComputedStyle(e);
      if (!e.checkVisibility() || !paints(e, cs) || clipped(e, root)) continue;
      const r = e.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      v.painted++;
      if (![r.left, r.top, r.width, r.height].every(whole)) v.boxes.push({ bus: who, part: (e.className.baseVal ?? e.className).split(' ')[0] || e.tagName.toLowerCase(), box: [r.left, r.top, r.width, r.height].map(n => +n.toFixed(2)).join(', ') });
    }
  };
  const inView = r => r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
  const out = [];
  for (let off = 0; off < ROWS.length + 1; off++) {
    const lines = 6 - off;
    for (const r of ROWS) sch.classList.toggle('scheduler-week--no-' + r, ROWS.indexOf(r) < off);
    sch.style.setProperty('--scheduler-bar-rows', String(lines));
    sch.dataset.barRows = String(lines);
    await wait(400);
    const v = { lines, bars: [], rows: [], boxes: [], heads: 0, inView: 0, painted: 0, height: null };
    for (const b of sch.querySelectorAll('.scheduler-bar')) {
      const r = b.getBoundingClientRect();
      if (r.height && r.height % 16) v.bars.push(+r.height.toFixed(2));
      if (r.height && inView(r)) { v.inView++; measure(b, 'the bar ' + (b.querySelector('.scheduler-bar__dest')?.textContent ?? '').replace(/\\s+/g, ' ').trim().slice(0, 24), v); }
    }
    for (const head of sch.querySelectorAll('.scheduler-row:not([data-shut]) > .scheduler-row-head')) {
      const box = head.getBoundingClientRect();
      if (!box.height) continue;
      const bus = (head.querySelector('.scheduler-row-head__num')?.textContent ?? '').replace(/\\s+/g, ' ').trim() || 'a head';
      const h = box.height;
      v.heads++;
      v.height = v.height === null ? h : Math.min(v.height, h);
      if (h % 8) v.rows.push({ bus, h: +h.toFixed(2) });
      measure(head, bus, v);
    }
    /* The rail beside six lines: every row 48px, and a one-lane bus row,
       144px, three of them, its top level with a driver row's. */
    if (lines === 6) {
      const tops = new Set();
      for (const n of document.querySelectorAll('.scheduler-avail__name')) {
        const b = n.getBoundingClientRect();
        if (!b.height) continue;
        tops.add(b.top);
        if (b.height !== 48) v.rows.push({ bus: 'a driver', h: b.height });
      }
      const first = [...tops].length ? Math.min(...tops) : null;
      for (const head of sch.querySelectorAll('.scheduler-row:not([data-shut]) > .scheduler-row-head')) {
        const b = head.getBoundingClientRect();
        if (first == null || b.height !== 144 || b.top < first || b.top > Math.max(...tops)) continue;
        if (!tops.has(b.top)) v.rows.push({ bus: 'a bus level with no driver row', h: b.top });
      }
      v.rail = tops.size;
    }
    out.push(v);
  }
  sch.className = before.cls;
  sch.style.setProperty('--scheduler-bar-rows', before.rows);
  sch.dataset.barRows = before.data;
  return out;
})()`;

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
    // funnel.js shows the page once the log-in lets it; its stand-in shows it at once, so the browser's wheel can reach the board.
    const standIn = url => (/\/funnel\.js/.test(url) ? "document.documentElement.setAttribute('data-rux-unlocked', '');" : '/* stood in by check-strip */');
    page.on('Fetch.requestPaused', p => page.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body: Buffer.from(standIn(p.request.url)).toString('base64') }));
    await page.send('Runtime.enable');
    await page.send('Page.enable');
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*/funnel.js' }, { urlPattern: '*/account.js' }, { urlPattern: '*turnstile*' }] });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: stub(invented()) });
    // The scenario must run in the scheduler's own document, not the blank one before it.
    const loaded = new Promise(r => page.on('Page.loadEventFired', r));
    await page.send('Page.navigate', { url: `http://localhost:${port}/scheduler/` });
    await Promise.race([loaded, new Promise((_, f) => setTimeout(() => f(new Error('the page never loaded')), 20000))]);
    if (process.env.STRIP_DEBUG) { await new Promise(r => setTimeout(r, 4000)); const d = await page.send('Runtime.evaluate', { expression: 'JSON.stringify({ href: location.href, title: document.title, week: !!document.getElementById(\'scheduler-week\'), account: !!window.Rux?.account?.staffProfile, status: document.getElementById(\'scheduler-status\')?.textContent?.slice(0, 200), bars: document.querySelectorAll(\'.scheduler-bar\').length, weekValue: document.getElementById(\'scheduler-week-date\')?.value, label: document.getElementById(\'scheduler-range\')?.textContent, body: document.body?.textContent?.replace(/\\s+/g, \' \').slice(0, 300) })', returnByValue: true }); console.log('debug', d.result.value); console.log('errors', errors.slice(0, 8)); }
    const run = async expression => {
      const { result, exceptionDetails } = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 90000 });
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      return result.value;
    };
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    // A trackpad's swipe sideways: steps of the browser's own wheel, which it scrolls itself, and a last step of what is left over.
    const swipe = async (at, dx, steps, last = 0) => {
      for (const d of [...Array(steps).fill(dx), ...(last ? [last] : [])]) { await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: at.x, y: at.y, deltaX: d, deltaY: 0 }); await sleep(16); }
      await run('window.__strip.rest()');
    };
    await run(helpers);
    const at = await run('window.__strip.ready()');
    const before = await run('window.__strip.snap()');
    await run('window.__strip.framesOn()');
    await swipe(at, 30, 110);
    await swipe(at, -30, 200);
    const frames = await run('window.__strip.framesOff()');
    const first = { ...await run('window.__strip.snap()'), marksBefore: before.marks };
    const again = new Promise(r => page.on('Page.loadEventFired', r));
    await page.send('Page.reload');
    await Promise.race([again, new Promise((_, f) => setTimeout(() => f(new Error('the page never loaded again')), 20000))]);
    await run(helpers);
    const there = await run('window.__strip.ready()');
    // The week of the day it stood on, then the wheel the rest of the way, to the pixel, as the strip stops wherever a swipe leaves it.
    await run(`window.__strip.pick(${Math.floor(first.at)})`);
    const off = await run(`window.__strip.short(${first.left})`);
    if (Math.abs(off) >= 1) await swipe(there, Math.sign(off) * 25, Math.floor(Math.abs(off) / 25), Math.sign(off) * (Math.abs(off) % 25));
    const second = await run('window.__strip.snap()');
    const views = await run(VIEWS);
    page.close();
    const seconds = ((Date.now() - t0) / 1000).toFixed(1);
    const r = compare('on two weeks and back four', first, second);
    let bad = false;
    // Two weeks on and four back leave it two weeks back; a wheel that moved nothing would compare a page with itself.
    if (Math.abs(first.at - before.at) < 7) { fail('strip', `the browser's wheel did not scroll the strip (${before.at} to ${first.at})`); bad = true; }
    if (!r.samePlace) { fail('strip', `${r.name}: the page loaded again could not be brought to the same place (${first.left}px, ${second.left}px)`); bad = true; }
    if (r.twice.length) { fail('strip', `${r.name}: ${r.twice.length} bars drawn twice`); for (const k of r.twice.slice(0, 6)) console.log(`          ${k}`); bad = true; }
    if (r.unplaced) { fail('strip', `${r.name}: ${r.unplaced} bars not where their data-start says`); bad = true; }
    if (!r.marks) { fail('strip', `${r.name}: the out-of-service mark is not on the heads of the days in view (${first.marksBefore} then ${first.marks}, whole ${second.marks})`); bad = true; }
    if (!r.stripes) { fail('strip', `${r.name}: the out-of-service stripes differ from a whole draw (${first.stripes} against ${second.stripes})`); bad = true; }
    if (r.yardDiffs.length) { bad = true; fail('strip', `${r.name}: the yard cards differ from a whole draw`); for (const y of r.yardDiffs) console.log(`          ${y}`); }
    if (r.diffs.length) { bad = true; fail('strip', `${r.name}: ${r.diffs.length} bars differ from a whole draw`); for (const d of r.diffs.slice(0, 8)) console.log(`          ${JSON.stringify(d)}`); }
    if (!bad) ok('strip', `${r.name}: ${r.compared} bars and ${r.yards} yard cards near the view the same as a whole draw`);
    for (const v of views) {
      const bad = [...v.bars.map(h => `a bar ${h}px tall`), ...v.rows.map(r => `${r.bus}'s row ${r.h}px tall`), ...v.boxes.map(x => `${x.bus}: ${x.part} at ${x.box}`)];
      if (bad.length) { fail('tile', `${v.lines} line${v.lines > 1 ? 's' : ''}: ${bad.length} off the grid or off whole pixels`); for (const w of bad.slice(0, 6)) console.log(`          ${w}`); }
      else ok('tile', `${v.lines} line${v.lines > 1 ? 's' : ''}: ${v.heads} rows of ${v.height}px and their bars on the grid, ${v.painted} painted boxes in the heads and the ${v.inView} bars in view on whole pixels${v.rail ? `, ${v.rail} driver rows of 48px level with the buses` : ''}`);
    }
    const noise = errors.filter(e => e && !/Samsara|presence|turnstile|favicon/i.test(e));
    if (noise.length) { fail('strip', `${noise.length} page errors`); for (const e of noise.slice(0, 6)) console.log(`          ${e}`); }
    if (!bad && !noise.length) ok('strip', `scrolled by the browser and drawn whole in ${seconds}s; frames while scrolling, headless: p50 ${frames.p50}ms, p90 ${frames.p90}ms, worst ${frames.max}ms of ${frames.n}`);
  } catch (e) {
    fail('strip', e.message);
  } finally {
    if (browser) { const gone = new Promise(r => browser.once('exit', r)); browser.kill(); await Promise.race([gone, new Promise(r => setTimeout(r, 3000))]); }
    server.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still be closing its profile; the OS clears its temp folder. */ }
  }
}

main();
