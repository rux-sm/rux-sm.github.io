#!/usr/bin/env node
//
// THE SHARED APP CHECK. One implementation of what every consumer of rux-ds
// used to carry a copy of, vendored into each app under vendor/rux-ds/tools/
// by tools/new-project.sh and run from there by the app's tools/check.mjs.
// Standard library only; no npm install, no sibling checkout.
//
//   node tools/app-check.mjs [app-dir]     from anywhere; app-dir defaults to
//                                          the app this copy is vendored in,
//                                          else the working directory
//   node tools/app-check.mjs --ds <dir>    where rux-ds is, for an app that
//                                          LINKS it rather than vendoring it.
//                                          DS=<dir> is the same thing; a
//                                          sibling ../rux-ds is the default.
//                                          A RELATIVE VALUE IS RESOLVED
//                                          AGAINST THE APP, not the working
//                                          directory -- so ../rux-ds means
//                                          the same thing wherever it is run
//                                          from, and matches the default.
//   node tools/app-check.mjs --hub <dir>   where the account-root site is, so
//                                          /switcher.js and its siblings
//                                          resolve instead of being counted
//   node tools/app-check.mjs --self-test   drive every rule red in a scratch
//                                          app, then remove it
//   node tools/app-check.mjs --hash <dir>  print the tree checksum of <dir>
//                                          and nothing else; how
//                                          new-project.sh records one in a PIN
//
// TWO SHAPES, AND THE APP DECIDES WHICH -- roadmap §8.4, added 2026-09-09.
//   vendored  vendor/rux-ds/PIN is there. rux-ds is that tree, the pin rule
//             runs, and --ds is REFUSED: pointing a vendored app at another
//             copy would check its pages against bytes they do not link, and
//             pass. This is every app until §8.4 step 2.
//   served    no vendor/. The pages link /rux-ds/<path> on the shared origin,
//             and this needs a checkout to resolve them against: --ds, else
//             DS, else a sibling ../rux-ds. NOT FOUND IS A FAILURE, never a
//             skip -- the wording Notes' check-ancestry settled on: a gate
//             that cannot run says so rather than passing.
// The shape is read from the app, not from a flag, so one release serves both
// while the workspace is half-moved. Nothing here says which shape is right;
// that is §8.4's decision and rux's.
//
// WHY IT EXISTS. Until 2026-09-05 the hub carried an eight-line class check
// and Notes a ninety-nine-line one, and neither checked a token; the recipe
// for an app that wanted check-tokens was to copy its page into rux-ds's
// root, run `npm run verify`, and delete the copy. A consumer page in rux-ds
// is the one thing AGENTS.md says never enters it, even for a minute.
//
// WHAT IT CHECKS, and it is only what is genuinely the same in every app:
//   classes   every rux--* class a page or local script uses is compiled in
//             the pinned vendor/rux-ds/css/rux.css
//   tokens    every var(--rux-*) a page, local stylesheet or script reads is
//             declared in the pinned css or the app's own two delta files
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
//   pin       VENDORED SHAPE ONLY. vendor/rux-ds/PIN exists, names a tag, and
//             -- when it carries a sha256 line -- the bytes under
//             vendor/rux-ds/ still hash to it
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
//     PAGE. In the served shape the page links /rux-ds/… and gets whatever is
//     deployed; this reads a checkout on disk. Locally that is a sibling on
//     main, which is AHEAD of what is live -- so a class added since the last
//     tag passes here and 404s in a browser. CI is the honest reading, where
//     the checkout is the tag. Said here because it is the one thing the
//     vendored shape had that the served shape does not.
//   * an id built at runtime, a class an app-specific check knows better,
//     spacing, contrast, behaviour, or how the page LOOKS. It prints which
//     pages to open and names the five themes; the looking is the owner's.
//   * WHETHER THE PIN IS HONEST. The checksum is an INTEGRITY check, not
//     provenance: it catches an accidental or partial edit under vendor/, and
//     anyone who edits the tree and its PIN together can forge agreement. The
//     trusted tie to a tag is that new-project.sh exported that tag and wrote
//     the PIN in the same run. The checksum covers vendored paths and file
//     BYTES -- not permissions and not empty directories, so a vendored
//     githooks/commit-msg that lost its executable bit would hash identically
//     while no longer running. Hashing mode is umask- and platform-fragile,
//     so the limit is recorded here rather than chased.
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
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const SKIP = new Set(['vendor', 'node_modules', 'build', '.git', '.claude', '.github']);
const THEMES = 'white g10 g90 g100 rux';
// A resource carries a file the page needs to render; anything else with an
// href is navigation. The distinction only matters for root-absolute values:
// /rux-ds/css/rux.css is a file this can resolve, and <a href="/"> is the hub.
const RESOURCE = /<(link|script|img|use|source|iframe|video|audio|embed)\b([^>]*)>/gi;
const SYMBOL = /<symbol\b[^>]*\bid="(i-[a-zA-Z0-9_-]+)"[\s\S]*?<\/symbol>/g;

// ── where the app is ────────────────────────────────────────────────────────
const self = fileURLToPath(import.meta.url);
function defaultRoot() {
  // Vendored copy: <app>/vendor/rux-ds/tools/app-check.mjs → <app>.
  const up3 = resolve(dirname(self), '..', '..', '..');
  if (basename(dirname(dirname(self))) === 'rux-ds' && basename(dirname(dirname(dirname(self)))) === 'vendor') return up3;
  return process.cwd();
}

// ── the vendored tree's checksum ────────────────────────────────────────────
// THE SAME SHAPE rux-ln-notes/tools/check-data.mjs USES for data/guides/, so
// there is one format in the family rather than two: sha256 of each file's
// BYTES, a listing of `<hash>  <relative path>` sorted by path, then sha256 of
// that listing. Bytes, never decoded text -- the fonts and icons.svg are
// binary. Sorted with an explicit comparator so it does not depend on a
// locale. The root PIN is the one exclusion, because it carries the answer.
//
// It is deliberately NOT a hash of the tag's tree: new-project.sh rewrites the
// templates' brand paths on the way in, so the vendored bytes are their own
// thing and this hashes what is actually there.
export function treeHash(dir) {
  const files = [];
  const collect = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const p = join(d, e.name);
      if (e.isDirectory()) collect(p);
      else if (!(d === dir && e.name === 'PIN')) files.push(p);
    }
  };
  collect(dir);
  const sha = (buf) => createHash('sha256').update(buf).digest('hex');
  const lines = files
    .map((p) => [relative(dir, p), sha(readFileSync(p))])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([path, h]) => `${h}  ${path}\n`);
  return sha(lines.join(''));
}
const shortHash = h => (h ? h.slice(0, 12) : h);

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
// opts: { ds, hub } -- where rux-ds is for a SERVED app, and where the
// account-root site is. Both may be absent; the shape below decides whether
// that matters.
export function check(root, opts = {}) {
  const failures = [], notes = [];
  const fail = (rule, where, what) => failures.push({ rule, where, what });
  const rel = p => relative(root, p) || '.';

  // ── which shape this app is, and where rux-ds is for it ──────────────────
  // READ FROM THE APP, AND FROM THE DIRECTORY RATHER THAN THE PIN. A vendored
  // app is one with a vendor/rux-ds/ tree; that tree is what its pages link,
  // so that tree is what they are checked against, and --ds is refused rather
  // than quietly ignored. A served app links /rux-ds/ and must be told, or
  // have a sibling.
  //
  // KEYING THIS ON THE PIN FILE WAS WRONG AND THE SELF-TEST SAID SO: deleting
  // the PIN from a vendored app made it look served, so "vendor/ was not
  // committed" -- a broken app -- reported as "no rux-ds found" instead. The
  // tree is the shape; the PIN is a rule about it.
  const vendored = existsSync(join(root, 'vendor/rux-ds'));
  let ds = null, dsFrom = null;
  if (vendored) {
    if (opts.ds) fail('ds', 'vendor/rux-ds/PIN', `this app vendors rux-ds, and --ds names ${opts.ds}. Its pages link vendor/rux-ds/, so checking them against another copy would pass on bytes they do not load. Drop --ds, or delete vendor/ if this app was meant to link /rux-ds/.`);
    ds = join(root, 'vendor/rux-ds');
    dsFrom = 'vendor/rux-ds';
  } else {
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
    if (existsSync(join(abs, 'css/rux.css'))) { ds = abs; dsFrom = `${where} ${abs}`; }
    if (!ds) {
      // NOT SKIPPED. The same wording Notes' check-ancestry uses: a gate that
      // cannot run says so. Everything downstream needs this directory, so
      // there is nothing to report but this.
      fail('ds', 'rux-ds', named
        ? `${where} names ${abs}, which holds no css/rux.css -- that is not a rux-ds checkout. A path you name is a claim about where rux-ds is, so a wrong one fails rather than falling through to a sibling and passing against a different copy.`
        : `this app has no vendor/rux-ds, so it links /rux-ds/ on the shared origin and needs a rux-ds checkout to resolve that against. Looked for a sibling at ${abs}, which holds no css/rux.css. Clone rux-ds beside this app, or pass --ds <dir> / DS=<dir>. Not skipped -- a check that cannot resolve a class is not a check.`);
      // ONLY `ds` RAN. Everything else needs this directory, so it is reported
      // as not run rather than as zero-and-green. `unresolvable` is here
      // because report() subtracts it: omitting it made that arithmetic NaN,
      // which printed nothing and threw nothing -- a second thing this early
      // return got quietly wrong.
      return { failures, notes, pages: [], classUses: 0, tokenUses: 0, defined: 0, vendored, ds, dsFrom, pinTag: null, pinRecorded: null, pinComputed: null, absolute: 0, unresolvable: 0, symbols: 0,
        ran: ['ds'],
        notRun: Object.fromEntries(['pin','classes','tokens','files','sprite','ids'].map(k => [k, 'no rux-ds was found, so there is nothing to check this app against'])) };
    }
  }
  const hub = opts.hub ? resolve(root, opts.hub) : null;
  if (hub && !existsSync(join(hub, 'switcher.json'))) fail('ds', 'hub', `--hub names ${hub}, which has no switcher.json; that is not the account-root site`);

  // pin -- the vendored shape only. A served app has no bytes of its own to
  // verify: it loads whatever /rux-ds/ is serving, and the tag that answers
  // "which version is this" is the deployed one, not a file here.
  const pinPath = join(root, 'vendor/rux-ds/PIN');
  let pinTag = null, pinRecorded = null, pinComputed = null;
  if (!vendored) {
    notes.push(`served shape: no vendor/, so the pin rule does not apply. rux-ds read from ${dsFrom}. What is LIVE at /rux-ds/ is not read here.`);
  } else if (!existsSync(pinPath)) {
    fail('pin', 'vendor/rux-ds/PIN', 'missing -- this is not a project on rux-ds, or vendor/ was not committed');
  } else {
    const pinText = readFileSync(pinPath, 'utf8');
    pinTag = pinText.match(/^tag\s+(v\d\S*)/m)?.[1] ?? null;
    if (!pinTag) fail('pin', 'vendor/rux-ds/PIN', 'names no tag; a pin between tags is not a release a consumer can be on');
    // THE BYTES, not only the label. Only reached with a PIN present, so the
    // missing-PIN message above stays the controlled diagnostic rather than
    // becoming an uncaught error from hashing a directory that is not there.
    //
    // MALFORMED IS NOT MISSING, and the difference is the whole rule. Matching
    // only a well-formed value and letting everything else fall through to the
    // legacy note would mean truncating or upper-casing the checksum SWITCHES
    // VERIFICATION OFF -- the one edit this field exists to catch, rewarded
    // with a pass. So every sha256 line is collected first and the shape is
    // judged after: none is the legacy case, one well-formed is the check,
    // and anything else fails. Two lines fail even when one of them is
    // correct, because a PIN that records two answers records none.
    const shaLines = pinText.match(/^sha256\b.*$/gm) ?? [];
    if (shaLines.length > 1) {
      fail('pin', 'vendor/rux-ds/PIN', `carries ${shaLines.length} sha256 lines; a PIN that records two checksums records none. Re-run rux-ds tools/new-project.sh against this app.`);
    } else if (shaLines.length === 1) {
      pinRecorded = shaLines[0].match(/^sha256[ \t]+([0-9a-f]{64})[ \t]*$/)?.[1] ?? null;
      if (!pinRecorded) {
        fail('pin', 'vendor/rux-ds/PIN', `its sha256 line is not 64 lowercase hex characters: "${shaLines[0].trim().slice(0, 80)}". A malformed checksum is not an absent one -- it would otherwise disable the very check it names. Re-run rux-ds tools/new-project.sh against this app.`);
      }
    }
    if (pinRecorded) {
      try {
        pinComputed = treeHash(join(root, 'vendor/rux-ds'));
      } catch (e) {
        fail('pin', 'vendor/rux-ds', `its checksum could not be computed: ${e.message}`);
      }
      if (pinComputed && pinComputed !== pinRecorded) {
        fail('pin', 'vendor/rux-ds',
          `the vendored tree does not match its PIN -- recorded ${shortHash(pinRecorded)}, found ${shortHash(pinComputed)}. ` +
          'Something under vendor/ was edited or partially copied; re-run rux-ds tools/new-project.sh against this app to put the release back.');
      }
    } else if (shaLines.length === 0) {
      notes.push('vendor/rux-ds/PIN carries no sha256 line, so its bytes cannot be verified -- a pin written before checksums. The next pin move records one.');
    }
  }

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
  // the design system wherever it was found -- in the vendored shape that is
  // the app's own copy, which is right: an app that vendors AND links /rux-ds/
  // is checked against the bytes it committed.
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

  return { failures, notes, pages: pages.map(rel), classUses, tokenUses, defined: defined.size, vendored, ds, dsFrom, pinTag, pinRecorded, pinComputed, absolute, unresolvable, symbols,
    // Every rule executed except pin in the served shape, where there are no
    // vendored bytes to verify. Named rather than inferred from a zero.
    ran: ['ds', ...(vendored ? ['pin'] : []), 'classes', 'tokens', 'files', 'sprite', 'ids'],
    notRun: vendored ? {} : { pin: 'this app vendors nothing, so there are no pinned bytes to verify -- it loads whatever /rux-ds/ serves' } };
}

// ── printing ────────────────────────────────────────────────────────────────
function report(root, r) {
  const rules = ['ds', 'pin', 'classes', 'tokens', 'files', 'sprite', 'ids'];
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
      pin: `vendor/rux-ds at ${r.pinTag}${r.pinRecorded ? `, bytes verified ${shortHash(r.pinRecorded)}` : ''}`,
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
  console.log(`  This says the page CAN render from ${r.vendored ? 'the pin' : 'the rux-ds it found'}. Whether it looks right is yours: open`);
  for (const p of r.pages) console.log(`    ${p}`);
  console.log(`  in each theme -- ${THEMES} -- from the account panel.\n`);
}

// ── the red-run proof ───────────────────────────────────────────────────────
function selfTest() {
  const work = mkdtempSync(join(tmpdir(), 'rux-app-check-'));
  const w = (p, s) => { mkdirSync(dirname(join(work, p)), { recursive: true }); writeFileSync(join(work, p), s); };
  // A rux-ds checkout that is NOT inside the app, for the served cases and for
  // the one that proves a vendored app refuses to be pointed at another copy.
  let away = null, dsOpt = {};
  const elsewhere = () => {
    away = mkdtempSync(join(tmpdir(), 'rux-ds-away-'));
    mkdirSync(join(away, 'css'), { recursive: true });
    mkdirSync(join(away, 'assets'), { recursive: true });
    writeFileSync(join(away, 'css/rux.css'), '.rux--btn{--rux-x:1}.rux--btn--primary{color:var(--rux-x)}.rux--lg\\:col-span-8{}');
    writeFileSync(join(away, 'css/rux-theme.css'), '[data-theme=white]{--rux-y:2}');
    writeFileSync(join(away, 'css/rux-overrides.css'), '');
    writeFileSync(join(away, 'assets/icons.svg'), '<svg></svg>');
    return away;
  };
  // The PIN records the bytes under vendor/, so a case that writes there must
  // rewrite it or the pin rule fires instead of the rule under test.
  const repin = () => w('vendor/rux-ds/PIN', `tag     v0.0.0\ncommit  0000000\nsha256  ${treeHash(join(work, 'vendor/rux-ds'))}\n`);
  // THE PIN IS WRITTEN LAST, and its checksum is computed from the fixture that
  // was just built -- exactly the order new-project.sh uses. Writing it first
  // with a hand-typed hash would make every case fail on a mismatch nobody
  // meant to test.
  const good = () => {
    rmSync(work, { recursive: true, force: true });
    if (away) { rmSync(away, { recursive: true, force: true }); away = null; }
    dsOpt = {};
    delete process.env.DS;
    w('vendor/rux-ds/assets/icons.svg', '<svg><symbol id="i-a"><path d="M0 0h1"/></symbol></svg>');
    w('vendor/rux-ds/css/rux.css', '.rux--btn{--rux-x:1}.rux--btn--primary{color:var(--rux-x)}.rux--lg\\:col-span-8{}');
    w('vendor/rux-ds/css/rux-theme.css', '[data-theme=white]{--rux-y:2}');
    w('vendor/rux-ds/css/rux-overrides.css', '');
    w('rux-theme.css', '/* empty */');
    w('rux-overrides.css', '.rux--btn{color:var(--rux-y)}');
    w('app.js', '// rux--not-a-class in a comment is prose\ndocument.body.classList.add("rux--btn");');
    w('brand/logo.svg', '<svg/>');
    w('index.html', [
      '<!doctype html><html lang="en" data-theme="white"><head>',
      '<link rel="stylesheet" href="vendor/rux-ds/css/rux.css">',
      '<link rel="stylesheet" href="rux-overrides.css">',
      '<style>.x{color:var(--rux-x)}</style></head><body>',
      '<!-- rux--in-a-comment is prose, not a use -->',
      '<img src="brand/logo.svg" alt="">',
      '<button class="rux--btn rux--btn--primary rux--lg:col-span-8" aria-controls="panel" id="open">Open</button>',
      '<div id="panel"><label for="name">Name</label><input id="name"></div>',
      '<a href="#panel">Panel</a><a href="https://example.com/">Out</a><a href="/switcher.js">Root</a>',
      '<script src="app.js"></script><script>document.body.classList.add("rux--btn")</script>',
      '</body></html>',
    ].join('\n'));
    w('vendor/rux-ds/PIN', `tag     v0.0.0\ncommit  0000000\nsha256  ${treeHash(join(work, 'vendor/rux-ds'))}\n`);
  };
  const pinNoSha = 'tag     v0.0.0\ncommit  0000000\n';
  const cases = [
    ['a valid app passes', null, () => {}],
    // THE SERVED SHAPE, §8.4. Deleting the PIN alone is what a half-done move
    // looks like, and it must FAIL rather than fall back to the working
    // directory or to silence.
    ['served: no ds anywhere', 'ds', () => { rmSync(join(work, 'vendor'), { recursive: true, force: true }); }, null, ['ds']],
    ['served: --ds resolves', null, () => {
      const page = readFileSync(join(work, 'index.html'), 'utf8').replace('vendor/rux-ds/css/rux.css', '/rux-ds/css/rux.css');
      rmSync(join(work, 'vendor'), { recursive: true, force: true });
      w('index.html', page);
      dsOpt = { ds: elsewhere() };
    }, /served shape/],
    ['served: an absolute /rux-ds/ path that is not there', 'files', () => {
      rmSync(join(work, 'vendor'), { recursive: true, force: true });
      w('index.html', '<html><body><link rel="stylesheet" href="/rux-ds/css/gone.css"></body></html>');
      dsOpt = { ds: elsewhere() };
    }],
    ['served: an <a href="/"> is navigation, not a file', null, () => {
      rmSync(join(work, 'vendor'), { recursive: true, force: true });
      w('index.html', '<html><body><a href="/rux-ds/anything/">DS</a><a href="/">Home</a></body></html>');
      dsOpt = { ds: elsewhere() };
    }],
    ['vendored: --ds is refused', 'ds', () => { dsOpt = { ds: elsewhere() }; }],
    // A NAMED PATH DOES NOT FALL THROUGH TO ANOTHER SOURCE. The wrong --ds
    // here sits beside a PERFECTLY GOOD DS, so a fall-through would pass and
    // report the other source -- which is what the first draft did, with a
    // real sibling, and it is the reason this rule is written down. The
    // unnamed-sibling arm is covered by 'served: no ds anywhere' above.
    ['served: a wrong --ds does not fall through to DS', 'ds', () => {
      rmSync(join(work, 'vendor'), { recursive: true, force: true });
      process.env.DS = elsewhere();
      dsOpt = { ds: join(work, 'not-rux-ds') };
    }],
    // THE SPRITE. One symbol's paste left behind by a release that changed it.
    ['sprite: a stale inlined symbol', 'sprite', () => {
      w('index.html', '<html><body><svg><symbol id="i-x" viewBox="0 0 1 1"><path d="M0 0h1"/></symbol></svg><svg><use href="#i-x"/></svg></body></html>');
      w('vendor/rux-ds/assets/icons.svg', '<svg><symbol id="i-x" viewBox="0 0 2 2"><path d="M0 0h2"/></symbol></svg>');
      repin();
    }],
    ['sprite: a symbol rux-ds does not ship', 'sprite', () => {
      w('index.html', '<html><body><svg><symbol id="i-invented"><path d="M0 0h1"/></symbol></svg><svg><use href="#i-invented"/></svg></body></html>');
      repin();
    }],
    ['sprite: a page carrying a subset passes', null, () => {
      w('vendor/rux-ds/assets/icons.svg', '<svg><symbol id="i-a"><path d="M0 0h1"/></symbol><symbol id="i-b"><path d="M0 0h2"/></symbol></svg>');
      w('index.html', '<html><body><svg><symbol id="i-a"><path d="M0 0h1"/></symbol></svg><svg><use href="#i-a"/></svg></body></html>');
      repin();
    }],
    ['classes', 'classes', () => w('page.html', '<html><body class="rux--invented"></body></html>')],
    ['classes in a local script', 'classes', () => w('more.js', 'el.className = "rux--nope";')],
    ['tokens', 'tokens', () => w('rux-theme.css', '[data-theme=white]{color:var(--rux-unknown)}')],
    ['files', 'files', () => w('page.html', '<html><body><img src="missing.svg"></body></html>')],
    ['ids: dangling aria-controls', 'ids', () => w('page.html', '<html><body><button aria-controls="nowhere">x</button></body></html>')],
    ['ids: duplicate', 'ids', () => w('page.html', '<html><body><i id="a"></i><i id="a"></i></body></html>')],
    ['ids: dangling #fragment', 'ids', () => w('page.html', '<html><body><a href="#gone">x</a></body></html>')],
    ['pin without a tag', 'pin', () => w('vendor/rux-ds/PIN', 'tag     (none: a commit between tags)\ncommit  0000000\n')],
    ['pin missing', 'pin', () => rmSync(join(work, 'vendor/rux-ds/PIN'))],
    // The checksum rule. Drift is one appended byte under vendor/, which is
    // what a hand edit or a half-finished copy looks like from here.
    ['pin: tree drifted', 'pin', () => w('vendor/rux-ds/css/rux.css',
      readFileSync(join(work, 'vendor/rux-ds/css/rux.css'), 'utf8') + '\n')],
    // A pin written before checksums existed. It must NOT fail, and the note
    // is asserted rather than assumed: the harness compares rule sets, so
    // without this a silently missing note would read as a pass.
    ['pin: legacy, no sha256', null, () => w('vendor/rux-ds/PIN', pinNoSha), /cannot be verified/],
    // MALFORMED IS NOT MISSING. Each of these once passed as "legacy", which
    // made corrupting the checksum a way to switch the check off.
    ['pin: sha256 truncated', 'pin', () => w('vendor/rux-ds/PIN', pinNoSha + 'sha256  ' + treeHash(join(work, 'vendor/rux-ds')).slice(0, 40) + '\n')],
    ['pin: sha256 upper-cased', 'pin', () => w('vendor/rux-ds/PIN', pinNoSha + 'sha256  ' + treeHash(join(work, 'vendor/rux-ds')).toUpperCase() + '\n')],
    ['pin: two sha256 lines', 'pin', () => w('vendor/rux-ds/PIN', pinNoSha + `sha256  ${treeHash(join(work, 'vendor/rux-ds'))}\nsha256  ${'0'.repeat(64)}\n`)],
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
// ONE CHECKSUM ON STDOUT AND NOTHING ELSE, so tools/new-project.sh can capture
// it with a command substitution and record it in the PIN it is about to
// write. Exits non-zero rather than printing something a shell would happily
// store: a release whose checksum could not be computed must stop the run, not
// become a pin nobody can verify.
else if (args.includes('--hash')) {
  const dir = args[args.indexOf('--hash') + 1];
  if (!dir || dir.startsWith('--')) {
    console.error('--hash needs a directory: node tools/app-check.mjs --hash <vendor-dir>');
    process.exit(2);
  }
  try {
    process.stdout.write(treeHash(resolve(dir)) + '\n');
  } catch (e) {
    console.error(`--hash ${dir}: ${e.message}`);
    process.exit(2);
  }
}
else {
  // A flag's value is not a positional. --ds <dir> and --hub <dir> each eat the
  // argument after them, so the app directory is whatever bare argument is
  // left -- without this, `--ds ../rux-ds` would be read as the app.
  const flag = (name) => {
    const i = args.indexOf(name);
    if (i < 0) return null;
    const v = args[i + 1];
    if (!v || v.startsWith('--')) { console.error(`${name} needs a directory`); process.exit(2); }
    return v;
  };
  const ds = flag('--ds'), hub = flag('--hub');
  const taken = new Set([ds, hub].filter(Boolean));
  const root = resolve(args.find(a => !a.startsWith('--') && !taken.has(a)) ?? defaultRoot());
  const r = check(root, { ds, hub });
  report(root, r);
  if (r.failures.length) process.exit(1);
}
