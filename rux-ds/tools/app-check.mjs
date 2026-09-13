#!/usr/bin/env node
//
// THE SHARED APP CHECK. One implementation of what every consumer of rux-ds
// once carried a vendored copy of. Standard library only; no npm install, no
// sibling checkout required to load this file (one is required to run it).
//
//   node tools/app-check.mjs [app-dir]     from anywhere; app-dir defaults to
//                                          the working directory
//   node tools/app-check.mjs --ds <dir>    where rux-ds is. DS=<dir> is the
//                                          same thing; a sibling ../rux-ds is
//                                          the default. A RELATIVE VALUE IS
//                                          RESOLVED AGAINST THE APP, not the
//                                          working directory -- so ../rux-ds
//                                          means the same thing wherever it
//                                          is run from, and matches the
//                                          default.
//   node tools/app-check.mjs --hub <dir>   where the account-root site is, so
//                                          /switcher.js and its siblings
//                                          resolve instead of being counted
//   node tools/app-check.mjs --self-test   drive every rule red in a scratch
//                                          app, then remove it
//
// EVERY APP IS SERVED, NOT VENDORED -- roadmap §8.4, done 2026-09-10. A page
// links /rux-ds/<path> on the shared origin, and this needs a checkout to
// resolve that against: --ds, else DS, else a sibling ../rux-ds. NOT FOUND
// IS A FAILURE, never a skip -- the wording Notes' check-ancestry settled on:
// a gate that cannot run says so rather than passing.
//
// UNTIL 2026-09-10 THIS ALSO SUPPORTED A VENDORED SHAPE: an app could carry
// its own copy under vendor/rux-ds/, named by a PIN with a checksum of the
// bytes, and --ds was refused there rather than checking a page against bytes
// it did not load. That shape and everything about it -- the pin rule, the
// tree checksum, --hash, defaultRoot()'s vendored-copy detection -- is
// retired along with it: no app in the family carries one any more, and
// nothing here should describe a shape nothing is in. docs/log.md has the
// full account, including the review that found and fixed the false-green
// defect this branching once had.
//
// WHY IT EXISTS. Until 2026-09-05 the hub carried an eight-line class check
// and Notes a ninety-nine-line one, and neither checked a token; the recipe
// for an app that wanted check-tokens was to copy its page into rux-ds's
// root, run `npm run verify`, and delete the copy. A consumer page in rux-ds
// is the one thing AGENTS.md says never enters it, even for a minute.
//
// WHAT IT CHECKS, and it is only what is genuinely the same in every app:
//   classes   every rux--* class a page or local script uses is compiled in
//             rux-ds's css/rux.css, wherever this found it
//   tokens    every var(--rux-*) a page, local stylesheet or script reads is
//             declared in rux-ds's css or the app's own two delta files
//   files     every relative href/src on a page names a file that exists, and
//             so does every ROOT-ABSOLUTE RESOURCE it can resolve: /rux-ds/…
//             against the rux-ds it found, anything else against --hub when
//             that is given. A resource is a link, script, img, use, source,
//             iframe, video, audio or embed; an <a href="/…"> is navigation
//             to another site on the origin and is left alone, as it always
//             was
//   sprite    every <symbol id="i-…"> a page inlines is byte-identical to the
//             one rux-ds ships in assets/icons.svg. A page carries the subset
//             it uses -- the hub's account page carries four of sixty-three --
//             so this compares symbol by symbol and never the block as a whole
//   ids       ids are unique per page, and every aria-controls, aria-labelledby,
//             aria-describedby, aria-owns, for= and #fragment resolves to one
//
// WHAT IT CANNOT SEE, said plainly because a green run is easy to over-read:
//   * whether a class is the RIGHT one -- btn--secondary where btn--danger was
//     meant resolves fine; rux-ds diffs markup against Carbon captures, and
//     those are not vendored (Notes' check-ancestry says why).
//   * a root-absolute reference this has no directory for: /switcher.js names
//     a file on the account's ROOT site, which this app is not. Counted and
//     reported as not checked, never as resolved -- pass --hub and it is
//     checked instead. WHY THIS IS NOT A HARD FAILURE: an app is checked
//     alone, in CI, with no hub beside it, and a rule that needs a second
//     checkout to pass would be switched off the first time it was
//     inconvenient.
//   * WHETHER THE rux-ds IT RESOLVED AGAINST IS THE ONE THAT WILL SERVE THE
//     PAGE. The page links /rux-ds/… and gets whatever is deployed; this
//     reads a checkout on disk. Locally that is a sibling on main, which is
//     AHEAD of what is live -- so a class added since the last tag passes
//     here and 404s in a browser. CI is the honest reading, where the
//     checkout is the newest tag (rux-ds's own Pages workflow checks every
//     served app this way before a tag goes live).
//   * an id built at runtime, a class an app-specific check knows better,
//     spacing, contrast, behaviour, or how the page LOOKS. It prints which
//     pages to open and names the five themes; the looking is the owner's.
//
// The hub keeps its registry rules and Notes its privacy, data, order,
// ancestry and generator gates beside this; nothing app-specific lives here.
//
// ON IMPORT IT RUNS, exits 1 on a failure, and RETURNS on a pass so the app's
// wrapper can run its own gates after it. --self-test is the red-run proof,
// kept with the implementation rather than in a fixture tree: it builds a
// scratch app in the system temp directory, breaks one rule at a time, asserts
// that exactly that rule fails, and removes the directory.
//
import { readFileSync, readdirSync, existsSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

// APP_CHECK_SKIP names extra top-level folders to leave out: the repository
// root is the hub AND holds every other app, so the hub's own check skips them.
const SKIP = new Set(['node_modules', 'build', '.git', '.claude', '.github', ...(process.env.APP_CHECK_SKIP ? process.env.APP_CHECK_SKIP.split(',') : [])]);
const THEMES = 'white g10 g90 g100 geist linear ant-dark spotify';
// A resource carries a file the page needs to render; anything else with an
// href is navigation. The distinction only matters for root-absolute values:
// /rux-ds/css/rux.css is a file this can resolve, and <a href="/"> is the hub.
const RESOURCE = /<(link|script|img|use|source|iframe|video|audio|embed)\b([^>]*)>/gi;
const SYMBOL = /<symbol\b[^>]*\bid="(i-[a-zA-Z0-9_-]+)"[\s\S]*?<\/symbol>/g;

const defaultRoot = () => process.cwd();

// ── reading ─────────────────────────────────────────────────────────────────
function walk(dir, ext, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(join(dir, e.name), ext, out); continue; }
    if (ext.some(x => e.name.endsWith(x))) out.push(join(dir, e.name));
  }
  return out.sort();
}
const stripHtmlComments = s => s.replace(/<!--[\s\S]*?-->/g, '');
const stripJsComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
// THREE EXTRACTORS, because a class is written three ways. In a class="…"
// attribute it is a whitespace-separated token and may carry a colon --
// `rux--lg:col-span-8` -- so the attribute is split, never scanned. In a
// script it is a string, scanned with the colon allowed. In a stylesheet it is
// a selector, where an unescaped colon starts a pseudo-class and the escaped
// one (`.rux--lg\:col-span-8`) is part of the name. Scanning the attribute
// with the selector pattern reported every responsive class as `rux--lg`,
// measured on the hub and Notes 2026-09-05 before this was split.
const inAttrs = html => new Set([...html.matchAll(/\bclass="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/)).filter(c => c.startsWith('rux--')));
const inScript = js => new Set([...js.matchAll(/\brux--[A-Za-z0-9_:-]+/g)].map(m => m[0].replace(/:+$/, '')));
const inSheet = css => new Set([...css.matchAll(/\.(rux--(?:\\.|[A-Za-z0-9_-])+)/g)].map(m => m[1].replace(/\\/g, '')));
const skipRef = v => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(v) || v === '';

// ── the rules ───────────────────────────────────────────────────────────────
// Returns { failures: [{rule, where, what}], notes: [...], pages: [...] }.
// opts: { ds, hub } -- where rux-ds is, and where the account-root site is.
// Both may be absent; ds falls back to a sibling, hub does not.
export function check(root, opts = {}) {
  const failures = [], notes = [];
  const fail = (rule, where, what) => failures.push({ rule, where, what });
  const rel = p => relative(root, p) || '.';

  // ── where rux-ds is ───────────────────────────────────────────────────────
  // A PATH YOU NAME IS A CLAIM, AND A WRONG CLAIM FAILS HERE RATHER THAN
  // FALLING THROUGH. The first draft tried --ds, then DS, then a sibling, and
  // took whichever worked. So `--ds /tmp` beside a real sibling PASSED, and
  // said `rux-ds from a sibling` while the operator watched their own flag be
  // ignored -- measured 2026-09-09 on a scratch app, and it is the exact
  // shape this repository keeps being bitten by: a confident wrong answer
  // that reads clean. It matters most in CI, where --ds names a checked-out
  // TAG: a checkout that failed or moved would leave the check passing
  // against whatever else was on disk.
  //
  // So only the UNNAMED sibling is a fallback. Name a path and it must be
  // right.
  const named = opts.ds ? ['--ds', opts.ds] : process.env.DS ? ['DS', process.env.DS] : null;
  if (named && opts.ds && process.env.DS && resolve(root, process.env.DS) !== resolve(root, opts.ds))
    notes.push(`DS=${process.env.DS} is set and ignored: --ds wins, and it names ${resolve(root, opts.ds)}`);
  const [where, dir] = named ?? ['a sibling', join(root, '..', 'rux-ds')];
  const abs = resolve(root, dir);
  let ds = null, dsFrom = null;
  if (existsSync(join(abs, 'css/rux.css'))) { ds = abs; dsFrom = `${where} ${abs}`; }
  if (!ds) {
    // NOT SKIPPED. The same wording Notes' check-ancestry uses: a gate that
    // cannot run says so. Everything downstream needs this directory, so
    // there is nothing to report but this.
    fail('ds', 'rux-ds', named
      ? `${where} names ${abs}, which holds no css/rux.css -- that is not a rux-ds checkout. A path you name is a claim about where rux-ds is, so a wrong one fails rather than falling through to a sibling and passing against a different copy.`
      : `no rux-ds checkout to resolve this app's /rux-ds/ links against. Looked for a sibling at ${abs}, which holds no css/rux.css. Clone rux-ds beside this app, or pass --ds <dir> / DS=<dir>. Not skipped -- a check that cannot resolve a class is not a check.`);
    // ONLY `ds` RAN. Everything else needs this directory, so it is reported
    // as not run rather than as zero-and-green. `unresolvable` is here
    // because report() subtracts it: omitting it made that arithmetic NaN,
    // which printed nothing and threw nothing -- a second thing an early
    // return once got quietly wrong.
    return { failures, notes, pages: [], classUses: 0, tokenUses: 0, defined: 0, ds, dsFrom, absolute: 0, unresolvable: 0, symbols: 0,
      ran: ['ds'],
      notRun: Object.fromEntries(['classes','tokens','files','sprite','ids'].map(k => [k, 'no rux-ds was found, so there is nothing to check this app against'])) };
  }
  const hub = opts.hub ? resolve(root, opts.hub) : null;
  if (hub && !existsSync(join(hub, 'switcher.json'))) fail('ds', 'hub', `--hub names ${hub}, which has no switcher.json; that is not the account-root site`);

  // what rux-ds defines, wherever it was found
  const vendorCss = ['rux.css', 'rux-theme.css', 'rux-overrides.css'].map(f => join(ds, 'css', f));
  const cssText = f => existsSync(f) ? readFileSync(f, 'utf8') : '';
  const ruxCss = cssText(vendorCss[0]);
  if (!ruxCss) fail('classes', rel(vendorCss[0]), 'missing; nothing to resolve a class against');
  const defined = new Set([...ruxCss.matchAll(/\.(rux--(?:\\.|[A-Za-z0-9_-])+)/g)].map(m => m[1].replace(/\\/g, '')));

  const pages = walk(root, ['.html']);
  const scripts = walk(root, ['.js', '.mjs']);
  const sheets = walk(root, ['.css']);
  const declared = new Set();
  for (const t of [...vendorCss.map(cssText), ...sheets.map(f => readFileSync(f, 'utf8')), ...pages.map(f => readFileSync(f, 'utf8'))])
    for (const m of t.matchAll(/(--rux-[A-Za-z0-9_-]+)\s*:/g)) declared.add(m[1]);

  // classes and tokens, over every page and local script
  let classUses = 0, tokenUses = 0, absolute = 0;
  const tokensIn = (text) => new Set([...text.matchAll(/var\(\s*(--rux-[A-Za-z0-9_-]+)/g)].map(m => m[1]));
  const sources = [
    ...pages.map(f => [f, stripHtmlComments(readFileSync(f, 'utf8')), 'html']),
    ...scripts.map(f => [f, stripJsComments(readFileSync(f, 'utf8')), 'js']),
    ...sheets.map(f => [f, stripJsComments(readFileSync(f, 'utf8')), 'css']),
  ];
  for (const [f, text, kind] of sources) {
    // A page's classes are its class attributes plus its inline scripts; the
    // prose between tags is never scanned, so a comment naming a class is not
    // a use.
    const used = kind === 'html'
      ? new Set([...inAttrs(text), ...[...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m => [...inScript(stripJsComments(m[1]))])])
      : kind === 'js' ? inScript(text) : inSheet(text);
    classUses += used.size;
    for (const c of used) if (!defined.has(c)) fail('classes', rel(f), `${c} is not compiled in ${dsFrom}'s rux.css`);
    const toks = tokensIn(text);
    tokenUses += toks.size;
    for (const t of toks) if (!declared.has(t)) fail('tokens', rel(f), `var(${t}) is declared nowhere -- not in rux-ds's css, not in this app's own two files`);
  }

  // files, sprite and ids, per page
  const IDREF = /\b(aria-controls|aria-labelledby|aria-describedby|aria-owns|for)="([^"]*)"/g;
  // The sprite as rux-ds ships it, by symbol id. Read once; a page carries the
  // subset it uses, so the comparison is per symbol and a page that carries
  // fewer is not stale.
  const spritePath = join(ds, 'assets/icons.svg');
  const shipped = existsSync(spritePath)
    ? new Map([...readFileSync(spritePath, 'utf8').matchAll(SYMBOL)].map(m => [m[1], m[0]]))
    : null;
  if (!shipped) fail('sprite', rel(spritePath), 'missing; nothing to compare an inlined symbol against');
  // WHICH ABSOLUTE RESOURCES CAN BE RESOLVED, and against what. /rux-ds/ is
  // the design system wherever this found it.
  const absoluteBase = (raw) => raw.startsWith('/rux-ds/') ? [ds, raw.slice('/rux-ds/'.length)]
    : hub ? [hub, raw.slice(1)] : null;
  let symbols = 0, unresolvable = 0;
  for (const f of pages) {
    const html = stripHtmlComments(readFileSync(f, 'utf8'));
    const dir = dirname(f);
    // A resource's href/src only. An <a href> is navigation: on this origin
    // "/" is the hub and "/name/" is another app, and neither is a file this
    // app can be asked for.
    const resources = new Set();
    for (const m of html.matchAll(RESOURCE))
      for (const a of m[2].matchAll(/\b(?:href|src)="([^"]*)"/g)) resources.add(a[1]);
    for (const m of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
      const raw = m[1];
      let base = dir, path = raw;
      if (raw.startsWith('/') && !raw.startsWith('//')) {
        if (!resources.has(raw)) continue;              // navigation, as before
        absolute++;
        const at = absoluteBase(raw);
        if (!at) { unresolvable++; continue; }
        [base, path] = at;
      } else if (skipRef(raw)) continue;
      path = path.split(/[?#]/)[0];
      if (!path) continue;
      const target = resolve(base, decodeURIComponent(path));
      const ok = existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html')));
      if (!ok) fail('files', rel(f), `${raw} names nothing on disk${base === dir ? '' : ` (resolved under ${relative(root, base) || base})`}`);
    }
    // THE INLINED SPRITE. A page pastes symbols because WebKit will not follow
    // <use> into another document, and nothing re-reads that paste: rux-ds
    // ships a new glyph, the page keeps the old one, every other rule passes
    // and the icon renders stale or empty. Found by hand in the scheduler,
    // 2026-09-06, moving to v0.1.8.
    if (shipped) for (const m of html.matchAll(SYMBOL)) {
      symbols++;
      const [markup, id] = [m[0], m[1]];
      if (!shipped.has(id)) fail('sprite', rel(f), `<symbol id="${id}"> is inlined here and rux-ds ships no such symbol; it was renamed or removed, or invented locally`);
      else if (shipped.get(id) !== markup) fail('sprite', rel(f), `<symbol id="${id}"> differs from the one rux-ds ships -- the paste is stale. Re-inline the sprite from ${relative(root, spritePath) || spritePath}.`);
    }
    const ids = new Map();
    for (const m of html.matchAll(/\bid="([^"]*)"/g)) ids.set(m[1], (ids.get(m[1]) ?? 0) + 1);
    for (const [id, n] of ids) if (n > 1) fail('ids', rel(f), `id="${id}" appears ${n} times; aria-controls and for= can only reach one`);
    const refs = new Set();
    for (const m of html.matchAll(IDREF)) for (const id of m[2].split(/\s+/).filter(Boolean)) refs.add([m[1], id]);
    for (const m of html.matchAll(/\bhref="#([^"]+)"/g)) refs.add(['href', m[1]]);
    for (const [attr, id] of refs) if (!ids.has(id)) fail('ids', rel(f), `${attr} points at #${id}, and no element on the page has that id`);
  }
  if (unresolvable) notes.push(`${unresolvable} root-absolute resource${unresolvable === 1 ? '' : 's'} (/…) not checked: ${hub ? 'not under /rux-ds/ and not in the hub' : 'they name files on the account\'s root site, which is not this app -- pass --hub <dir> to check them'}`);

  return { failures, notes, pages: pages.map(rel), classUses, tokenUses, defined: defined.size, ds, dsFrom, absolute, unresolvable, symbols,
    ran: ['ds', 'classes', 'tokens', 'files', 'sprite', 'ids'],
    notRun: {} };
}

// ── printing ────────────────────────────────────────────────────────────────
function report(root, r) {
  const rules = ['ds', 'classes', 'tokens', 'files', 'sprite', 'ids'];
  // NOT RUN IS NOT A PASS, AND SAYING SO TOOK A REVIEWER. Until 2026-09-09
  // this printed a green ` ok ` for every rule whose figure happened to be
  // zero, so an app where the ds rule failed -- no rux-ds found, nothing to
  // check anything against -- read:
  //     FAIL  ds
  //      ok   classes 0 uses resolve against 0 compiled
  //      ok   tokens  0 var(--rux-*) reads resolve      ... and three more
  // Five greens for five rules that never executed. The exit code was right,
  // so CI was never fooled; a person reading the output was. It is exactly the
  // fault this file's own comment claimed to have avoided, guarded on `pin`
  // and `ds` and nowhere else. Found in review by a session that did not write
  // this branch.
  //
  // So check() now says which rules RAN, and anything else prints as not run
  // with the reason. A rule that did not execute can no longer look like one
  // that passed.
  const ran = new Set(r.ran ?? rules);
  for (const rule of rules) {
    const fs = r.failures.filter(f => f.rule === rule);
    if (!ran.has(rule)) {
      console.log(`  ----  ${rule.padEnd(8)}NOT RUN -- ${(r.notRun ?? {})[rule] ?? 'a rule it depends on failed first'}`);
      for (const f of fs) console.log(`          ${f.where}: ${f.what}`);
      continue;
    }
    console.log(`  ${fs.length ? 'FAIL' : ' ok '}  ${rule.padEnd(8)}${fs.length ? '' : ({
      ds: `rux-ds from ${r.dsFrom}`,
      classes: `${r.classUses} uses resolve against ${r.defined} compiled`,
      tokens: `${r.tokenUses} var(--rux-*) reads resolve`,
      files: `every relative href and src on ${r.pages.length} page${r.pages.length === 1 ? '' : 's'} exists${r.absolute - r.unresolvable > 0 ? `, and ${r.absolute - r.unresolvable} root-absolute resource${r.absolute - r.unresolvable === 1 ? '' : 's'}` : ''}`,
      sprite: r.symbols ? `${r.symbols} inlined symbol${r.symbols === 1 ? '' : 's'} match the sprite rux-ds ships` : 'no page inlines a symbol',
      ids: 'unique, and every reference to one resolves',
    })[rule]}`);
    for (const f of fs) console.log(`          ${f.where}: ${f.what}`);
  }
  for (const n of r.notes) console.log(`  note  ${n}`);
  console.log(`\n  ${r.failures.length ? `${r.failures.length} failure${r.failures.length === 1 ? '' : 's'}` : 'passes'} in ${root}`);
  // AND THE CLOSING LINE IS EARNED OR IT IS NOT PRINTED. It says the page can
  // render and invites a person to go and look; after a run where most rules
  // never executed it would be describing a check that did not happen.
  const skipped = rules.filter(x => !ran.has(x));
  if (skipped.length > 2) {
    console.log(`  ${skipped.length} of ${rules.length} rules did not run, so this says almost nothing about the page.`);
    console.log(`  Fix the failure above and run it again.\n`);
    return;
  }
  console.log(`  This says the page CAN render from the rux-ds it found. Whether it looks right is yours: open`);
  for (const p of r.pages) console.log(`    ${p}`);
  console.log(`  in each theme -- ${THEMES} -- from the account panel.\n`);
}

// ── the red-run proof ───────────────────────────────────────────────────────
function selfTest() {
  const work = mkdtempSync(join(tmpdir(), 'rux-app-check-'));
  const w = (p, s) => { mkdirSync(dirname(join(work, p)), { recursive: true }); writeFileSync(join(work, p), s); };
  // A rux-ds checkout beside the app, the way every served app finds one.
  let away = null, dsOpt = {};
  const buildDs = (dir) => {
    mkdirSync(join(dir, 'css'), { recursive: true });
    mkdirSync(join(dir, 'assets'), { recursive: true });
    writeFileSync(join(dir, 'css/rux.css'), '.rux--btn{--rux-x:1}.rux--btn--primary{color:var(--rux-x)}.rux--lg\\:col-span-8{}');
    writeFileSync(join(dir, 'css/rux-theme.css'), '[data-theme=white]{--rux-y:2}');
    writeFileSync(join(dir, 'css/rux-overrides.css'), '');
    writeFileSync(join(dir, 'assets/icons.svg'), '<svg><symbol id="i-a"><path d="M0 0h1"/></symbol></svg>');
  };
  const elsewhere = () => {
    away = mkdtempSync(join(tmpdir(), 'rux-ds-away-'));
    buildDs(away);
    return away;
  };
  const good = () => {
    rmSync(work, { recursive: true, force: true });
    if (away) { rmSync(away, { recursive: true, force: true }); away = null; }
    dsOpt = { ds: elsewhere() };
    delete process.env.DS;
    w('rux-theme.css', '/* empty */');
    w('rux-overrides.css', '.rux--btn{color:var(--rux-y)}');
    w('app.js', '// rux--not-a-class in a comment is prose\ndocument.body.classList.add("rux--btn");');
    w('brand/logo.svg', '<svg/>');
    w('index.html', [
      '<!doctype html><html lang="en" data-theme="white"><head>',
      '<link rel="stylesheet" href="/rux-ds/css/rux.css">',
      '<link rel="stylesheet" href="rux-overrides.css">',
      '<style>.x{color:var(--rux-x)}</style></head><body>',
      '<!-- rux--in-a-comment is prose, not a use -->',
      '<img src="brand/logo.svg" alt="">',
      '<button class="rux--btn rux--btn--primary rux--lg:col-span-8" aria-controls="panel" id="open">Open</button>',
      '<div id="panel"><label for="name">Name</label><input id="name"></div>',
      '<a href="#panel">Panel</a><a href="https://example.com/">Out</a><a href="/switcher.js">Root</a>',
      '<svg><symbol id="i-a"><path d="M0 0h1"/></symbol></svg><svg><use href="#i-a"/></svg>',
      '<script src="app.js"></script><script>document.body.classList.add("rux--btn")</script>',
      '</body></html>',
    ].join('\n'));
  };
  const cases = [
    ['a valid app passes', null, () => {}],
    // NO DS ANYWHERE MUST FAIL RATHER THAN FALL BACK TO SILENCE. Also clears
    // the unnamed-sibling fallback path, in case it exists from outside this
    // run -- the same defensive read the original vendored-shape case took.
    ['no ds anywhere', 'ds', () => {
      rmSync(away, { recursive: true, force: true }); away = null; dsOpt = {};
      rmSync(join(work, '..', 'rux-ds'), { recursive: true, force: true });
    }, null, ['ds']],
    ['--ds resolves', null, () => {}],
    ['an absolute /rux-ds/ path that is not there', 'files', () => {
      w('index.html', '<html><body><link rel="stylesheet" href="/rux-ds/css/gone.css"></body></html>');
    }],
    ['an <a href="/"> is navigation, not a file', null, () => {
      w('index.html', '<html><body><a href="/rux-ds/anything/">DS</a><a href="/">Home</a></body></html>');
    }],
    // A NAMED PATH DOES NOT FALL THROUGH TO ANOTHER SOURCE. The wrong --ds
    // here sits beside a PERFECTLY GOOD DS, so a fall-through would pass and
    // report the other source -- which is what the first draft did, with a
    // real sibling, and it is the reason this rule is written down.
    ['a wrong --ds does not fall through to DS', 'ds', () => {
      process.env.DS = away;
      dsOpt = { ds: join(work, 'not-rux-ds') };
    }],
    // THE SPRITE. One symbol's paste left behind by a release that changed it.
    ['sprite: a stale inlined symbol', 'sprite', () => {
      w('index.html', '<html><body><svg><symbol id="i-x" viewBox="0 0 1 1"><path d="M0 0h1"/></symbol></svg><svg><use href="#i-x"/></svg></body></html>');
      writeFileSync(join(away, 'assets/icons.svg'), '<svg><symbol id="i-x" viewBox="0 0 2 2"><path d="M0 0h2"/></symbol></svg>');
    }],
    ['sprite: a symbol rux-ds does not ship', 'sprite', () => {
      w('index.html', '<html><body><svg><symbol id="i-invented"><path d="M0 0h1"/></symbol></svg><svg><use href="#i-invented"/></svg></body></html>');
    }],
    ['sprite: a page carrying a subset passes', null, () => {
      writeFileSync(join(away, 'assets/icons.svg'), '<svg><symbol id="i-a"><path d="M0 0h1"/></symbol><symbol id="i-b"><path d="M0 0h2"/></symbol></svg>');
      w('index.html', '<html><body><svg><symbol id="i-a"><path d="M0 0h1"/></symbol></svg><svg><use href="#i-a"/></svg></body></html>');
    }],
    ['classes', 'classes', () => w('page.html', '<html><body class="rux--invented"></body></html>')],
    ['classes in a local script', 'classes', () => w('more.js', 'el.className = "rux--nope";')],
    ['tokens', 'tokens', () => w('rux-theme.css', '[data-theme=white]{color:var(--rux-unknown)}')],
    ['files', 'files', () => w('page.html', '<html><body><img src="missing.svg"></body></html>')],
    ['ids: dangling aria-controls', 'ids', () => w('page.html', '<html><body><button aria-controls="nowhere">x</button></body></html>')],
    ['ids: duplicate', 'ids', () => w('page.html', '<html><body><i id="a"></i><i id="a"></i></body></html>')],
    ['ids: dangling #fragment', 'ids', () => w('page.html', '<html><body><a href="#gone">x</a></body></html>')],
  ];
  let bad = 0;
  try {
    for (const [label, rule, mutate, wantNote, wantRan] of cases) {
      good(); mutate();
      const r = check(work, dsOpt);
      const rules = [...new Set(r.failures.map(f => f.rule))];
      const rulesOk = rule === null ? rules.length === 0 : rules.length === 1 && rules[0] === rule;
      const noteOk = !wantNote || r.notes.some(n => wantNote.test(n));
      // WHICH RULES RAN, asserted rather than inferred from a zero. A run that
      // stops at `ds` used to print five green rules that never executed, and
      // no case here could see it because the harness only ever compared
      // FAILURES. This is the assertion that would have caught it.
      const ranOk = !wantRan || (Array.isArray(r.ran) && r.ran.length === wantRan.length && wantRan.every(x => r.ran.includes(x)));
      const ok = rulesOk && noteOk && ranOk;
      if (!ok) bad++;
      const want = rule === null ? 'no failure' : `only ${rule}`;
      const got = rules.length ? rules.join(', ') : 'none';
      console.log(`  ${ok ? ' ok ' : 'FAIL'}  ${label.padEnd(30)} expected ${want}${wantNote ? ' and the note' : ''}${wantRan ? `, ran only ${wantRan.join('+')}` : ''}, got ${got}${wantNote ? (noteOk ? ' and the note' : ' and NO note') : ''}${wantRan ? `, ran ${(r.ran ?? []).join('+')}` : ''}`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
    if (away) rmSync(away, { recursive: true, force: true });
  }
  console.log(`\n  ${cases.length} cases, ${bad} wrong. The scratch app is removed.`);
  console.log(`  This proves each rule CAN go red; it is the author's own proof. A session that`);
  console.log(`  did not write this file re-runs it and reads which line went red.\n`);
  process.exit(bad ? 1 : 0);
}

// ── main ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--self-test')) selfTest();
else {
  // A flag's value is not a positional. --ds <dir> and --hub <dir> each eat the
  // argument after them, so the app directory is whatever bare argument is
  // left -- without this, `--ds ../rux-ds` would be read as the app.
  //
  // EXCLUDED BY POSITION, NOT BY VALUE -- found live, 2026-09-10, cutting
  // v0.1.16. A Set of the flags' VALUES meant that checking the hub against
  // itself, `app-check.mjs <hub> --ds <rux-ds> --hub <hub>` -- the shape
  // rux-ds's own consumers job always uses, since a served app's own entry
  // in the loop passes --hub pointing at itself -- excluded the positional
  // app path too, because it read identical to the --hub value. `find`
  // then matched nothing and silently fell back to defaultRoot(), which
  // checked THIS repository's own sink/deferred/ fragments against
  // themselves and failed on every uncompiled class in them: a confident
  // wrong answer, not a crash. Reproduced locally before this was written:
  // `node tools/app-check.mjs <hub> --ds <rux-ds> --hub <hub>` failed on
  // sink/deferred/page-header.html, which the hub does not even carry.
  const takenAt = new Set();
  const flag = (name) => {
    const i = args.indexOf(name);
    if (i < 0) return null;
    const v = args[i + 1];
    if (!v || v.startsWith('--')) { console.error(`${name} needs a directory`); process.exit(2); }
    takenAt.add(i + 1);
    return v;
  };
  const ds = flag('--ds'), hub = flag('--hub');
  const root = resolve(args.find((a, i) => !a.startsWith('--') && !takenAt.has(i)) ?? defaultRoot());
  const r = check(root, { ds, hub });
  report(root, r);
  if (r.failures.length) process.exit(1);
}
