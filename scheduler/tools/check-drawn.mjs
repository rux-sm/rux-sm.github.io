// Proves what the scheduler draws stands on Carbon's scales. Serves the
// site on a free port, opens `components.html`, every state of the trip
// bar, the bus tile, the crew and the tips drawn by the board's own code
// from invented trips, in headless Chrome with the account stood in, and
// reads what Chrome drew, in each theme asked for:
//   - no text under 12px, Carbon's smallest type;
//   - every size with a tracking the theme gives a type role of that size,
//     which in Carbon's themes is 0.32px at 12px, 0.16px at 14px and none
//     from 16px, a single letter aside, which has no tracking to speak of;
//   - every text 4.5 to 1 on what is behind it, 3 to 1 from 24px, a bar
//     being saved or dragged aside, which is dimmed on purpose for a moment;
//   - every gap in a row or a grid of the scheduler's own on Carbon's
//     spacing scale;
//   - every mark in a bar taking a press on 24px by its row's 18px.
// `--themes=g100,white` names the themes, `--themes=all` every one; Gray 100
// alone when none is named. Needs Chrome on this Mac, or `CHROME` naming
// one; says so and passes when there is none.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHROMES, connect, freePort, reachable, stub, waitFor } from './lib/headless.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const SERVER = join(ROOT, 'design', 'tools', 'serve.mjs');
const ALL = ['white', 'g10', 'g90', 'g100', 'rux-100', 'rux-dark', 'geist-dark', 'ant-dark', 'spotify-dark', 'apple-light', 'apple-dark'];
const asked = process.argv.find(a => a.startsWith('--themes='))?.slice(9);
const THEMES = asked === 'all' ? ALL : asked ? asked.split(',') : ['g100'];

const ok = (name, words) => console.log(`   ok   ${name.padEnd(7)} ${words}`);
const fail = (name, words) => { console.log(`  FAIL  ${name.padEnd(7)} ${words}`); process.exitCode = 1; };

/* What runs in the page: reads every drawn text, gap and mark under the
   page's main part and answers what is off, each kind as a list of
   `{ what, where, n }`, the same fault on the same kind of element counted
   once. */
const DRAWN = `(async theme => {
  document.documentElement.dataset.theme = theme;
  // A page this long takes a while to restyle, and its colours move over Carbon's fast-01.
  await new Promise(r => setTimeout(r, 1500));
  const SCALE = new Set([0, 1, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 160]);
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const seen = new Map();
  // Any colour Chrome can compute, as red, green, blue and alpha.
  const rgba = s => {
    if (seen.has(s)) return seen.get(s);
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data, a = d[3] / 255;
    const v = a ? [d[0], d[1], d[2], a] : [0, 0, 0, 0];
    seen.set(s, v); return v;
  };
  const over = (top, under) => [0, 1, 2].map(i => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = c => '#' + [0, 1, 2].map(i => Math.round(c[i]).toString(16).padStart(2, '0')).join('');
  const cls = e => (typeof e.className === 'string' ? e.className : e.className?.baseVal ?? '');
  const name = e => e.tagName.toLowerCase() + (cls(e) ? '.' + cls(e).split(/\\s+/).filter(Boolean).slice(0, 2).join('.') : '');
  const where = e => [e.parentElement, e].filter(Boolean).map(name).join(' > ');
  const drawn = e => {
    if (!e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    for (let a = e; a; a = a.parentElement) if (getComputedStyle(a).clipPath !== 'none' && a.getBoundingClientRect().width <= 2) return false;
    return true;
  };
  /* What is behind an element: every ancestor's fill from the page up, and
     the card a tile draws behind its parts, a pseudo-element a layer under
     them. A gradient stands for itself and is not read. */
  const behind = e => {
    const layers = [];
    for (let a = e; a; a = a.parentElement) {
      const cs = getComputedStyle(a), b = rgba(cs.backgroundColor);
      if (b[3]) layers.push(b);
      if (a !== e) for (const part of ['::before', '::after']) {
        const p = getComputedStyle(a, part);
        if (p.content !== 'none' && p.position === 'absolute' && p.zIndex === '-1' && rgba(p.backgroundColor)[3]) layers.push(rgba(p.backgroundColor));
      }
      if (b[3] === 1) break;
    }
    return layers.reverse().reduce((under, top) => over(top, under), [255, 255, 255, 1]);
  };
  const strength = e => { let o = 1; for (let a = e; a; a = a.parentElement) o *= parseFloat(getComputedStyle(a).opacity); return o; };
  const faults = { small: new Map(), tracking: new Map(), contrast: new Map(), gap: new Map(), press: new Map() };
  const note = (kind, what, e) => { const k = what + ' — ' + where(e); const v = faults[kind].get(k) ?? { what, where: where(e), n: 0 }; v.n++; faults[kind].set(k, v); };
  const root = document.querySelector('main') ?? document.body;
  const counts = { text: 0, gaps: 0, marks: 0 };
  /* The trackings the theme gives each size, read off a probe set in every
     type role, since a theme with its own typeface sets its own and may
     track a heading and a body of one size apart. */
  const probe = document.body.appendChild(document.createElement('span'));
  const TRACK = new Map();
  for (const role of ['label-01', 'helper-text-01', 'body-compact-01', 'body-01', 'heading-compact-01', 'heading-01', 'body-compact-02', 'body-02', 'heading-compact-02', 'heading-02', 'heading-03', 'heading-04', 'heading-05']) {
    probe.style.cssText = 'position:absolute;font-size:var(--rux-' + role + '-font-size);letter-spacing:var(--rux-' + role + '-letter-spacing)';
    const cs = getComputedStyle(probe), size = parseFloat(cs.fontSize);
    TRACK.set(size, [...(TRACK.get(size) ?? []), cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing)]);
  }
  probe.remove();

  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const done = new Set();
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const words = n.nodeValue.trim(), e = n.parentElement;
    if (!words || !e || done.has(e) || e.closest('svg, script, style, .leaflet-pane') || !drawn(e)) continue;
    done.add(e);
    const cs = getComputedStyle(e), size = parseFloat(cs.fontSize);
    if (!size) continue;
    counts.text++;
    if (size < 12) note('small', size + 'px', e);
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    const want = TRACK.get(size);
    if (want && words.length > 1 && !want.some(v => Math.abs(ls - v) < 0.011)) note('tracking', size + 'px with ' + ls + 'px, not ' + [...new Set(want)].join(' or ') + 'px', e);
    // Design's content switcher fills its chosen button with a part this cannot read behind, and Design's own gates hold it.
    if (e.closest('[disabled], [aria-disabled="true"], .rux--btn--disabled, .rux--content-switcher, .scheduler-bar--saving, .scheduler-bar--dragging, .scheduler-ghost')) continue;
    const bg = behind(e), ink = rgba(cs.color), on = over([ink[0], ink[1], ink[2], ink[3] * strength(e)], bg);
    const r = ratio(on, bg), large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 600);
    if (r < (large ? 3 : 4.5)) note('contrast', (Math.round(r * 100) / 100) + ' to 1, ' + hex(on) + ' on ' + hex(bg) + ', ' + size + 'px', e);
  }

  for (const e of root.querySelectorAll('[class*="scheduler-"]')) {
    const cs = getComputedStyle(e);
    if (!/flex|grid/.test(cs.display) || !drawn(e)) continue;
    counts.gaps++;
    for (const side of ['rowGap', 'columnGap']) {
      if (cs[side] === 'normal') continue;
      const v = Math.round(parseFloat(cs[side]) * 100) / 100;
      if (!SCALE.has(v)) note('gap', v + 'px', e);
    }
  }

  /* A mark's press: 11px either side of its middle and 8px above and below
     must still be the mark, where its middle is, which an open tip or the
     page's header may cover. */
  for (const e of root.querySelectorAll('.scheduler-bar [data-card-opener]')) {
    if (!drawn(e) || e.closest('.scheduler-bar--saving, .scheduler-bar--dragging, .scheduler-ghost')) continue;
    e.scrollIntoView({ block: 'center', inline: 'center' });
    const r = e.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    const hit = (dx, dy) => { const at = document.elementFromPoint(x + dx, y + dy); return at === e || e.contains(at); };
    if (!hit(0, 0)) continue;
    counts.marks++;
    if (![[-11, 0], [11, 0], [0, -8], [0, 8]].every(([dx, dy]) => hit(dx, dy))) note('press', 'under 24px by 18px', e);
  }
  return { theme, counts, faults: Object.fromEntries(Object.entries(faults).map(([k, m]) => [k, [...m.values()].sort((a, b) => b.n - a.n)])) };
})`;

const SAID = { small: 'text under 12px', tracking: 'a size without its tracking', contrast: 'text under 4.5 to 1', gap: 'a gap off the scale', press: 'a mark with too small a press' };

async function main() {
  const chrome = CHROMES.find(p => existsSync(p));
  if (!chrome) { ok('drawn', 'skipped: no Chrome here (set CHROME to one) to draw the components in'); return; }
  const port = await freePort();
  const server = spawn(process.execPath, [SERVER], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, HOST: 'localhost', PORT: String(port) } });
  const profile = mkdtempSync(join(tmpdir(), 'check-drawn-'));
  let browser = null;
  try {
    await waitFor(() => reachable(`http://localhost:${port}/scheduler/`), 10000, 'the site');
    browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1400,900', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
    const portFile = join(profile, 'DevToolsActivePort');
    await waitFor(() => existsSync(portFile) && readFileSync(portFile, 'utf8').trim().length > 0, 15000, 'Chrome');
    const devtools = Number(readFileSync(portFile, 'utf8').split('\n')[0]);
    let targets = [];
    await waitFor(async () => { try { targets = await (await fetch(`http://127.0.0.1:${devtools}/json`)).json(); } catch { return false; } return targets.some(t => t.type === 'page'); }, 10000, 'a page');
    const page = await connect(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    // funnel.js shows the page once the log-in lets it; its stand-in shows it at once.
    const standIn = url => (/\/funnel\.js/.test(url) ? "document.documentElement.setAttribute('data-rux-unlocked', '');" : '/* stood in by check-drawn */');
    page.on('Fetch.requestPaused', p => page.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body: Buffer.from(standIn(p.request.url)).toString('base64') }));
    await page.send('Runtime.enable');
    await page.send('Page.enable');
    await page.send('Fetch.enable', { patterns: [{ urlPattern: '*/funnel.js' }, { urlPattern: '*/account.js' }, { urlPattern: '*turnstile*' }] });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: stub({}) });
    const loaded = new Promise(r => page.on('Page.loadEventFired', r));
    await page.send('Page.navigate', { url: `http://localhost:${port}/scheduler/components.html` });
    await Promise.race([loaded, new Promise((_, f) => setTimeout(() => f(new Error('the page never loaded')), 20000))]);
    const run = async expression => {
      const { result, exceptionDetails } = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 90000 });
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      return result.value;
    };
    // The page has drawn its samples once its bars are there.
    await waitFor(() => run("document.querySelectorAll('.scheduler-bar').length > 100"), 20000, 'the components');
    await new Promise(r => setTimeout(r, 1500));
    for (const theme of THEMES) {
      const { counts, faults } = await run(`${DRAWN}(${JSON.stringify(theme)})`);
      const bad = Object.entries(faults).filter(([, list]) => list.length);
      if (!bad.length) { ok('drawn', `${theme}: ${counts.text} texts on their size, tracking and contrast, ${counts.gaps} rows and grids on the scale, ${counts.marks} marks pressed on 24px by 18px`); continue; }
      for (const [kind, list] of bad) {
        fail('drawn', `${theme}: ${SAID[kind]}, ${list.reduce((n, f) => n + f.n, 0)} in ${list.length} place${list.length > 1 ? 's' : ''}`);
        for (const f of list.slice(0, 8)) console.log(`          ${String(f.n).padStart(4)}× ${f.what}  ${f.where}`);
      }
    }
  } catch (e) {
    fail('drawn', e.message);
  } finally {
    if (browser) { const gone = new Promise(r => browser.once('exit', r)); browser.kill(); await Promise.race([gone, new Promise(r => setTimeout(r, 3000))]); }
    server.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still be closing its profile; the OS clears its temp folder. */ }
  }
}

main();
