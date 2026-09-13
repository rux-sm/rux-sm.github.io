#!/usr/bin/env node
//
// Assembles portal.html — the design system's own status page, built out of
// the design system.
//
// WHY IT IS GENERATED. Every figure on this page already exists in a file the
// gates read: docs/inventory.json, docs/coverage.json, docs/gate-coverage.json
// and tools/lib/gates.mjs. A hand-written status page would be a SECOND copy of
// all of them, and README records what happened the last time a count lived in
// two places — its own Status block drifted, and f726cf1 exists to have fixed
// the same class of defect across four documents. So nothing here is typed by
// hand that can be read from the repository, and the page is regenerated on
// every `npm run verify` with CI failing if the committed copy is stale.
//
// WHAT GATES IT. portal.html is added to the four ASSEMBLED gates' roots —
// check-classes, check-co-classes, check-coverage, check-tokens — exactly as
// kitchen-sink.html is. That means it cannot use a class with no CSS behind it,
// a class whose component was stripped, a modifier without its base, or an
// unresolved token.
//
// WHAT DOES NOT GATE IT, AND WHY. The per-file gates (check-icons, check-tags,
// check-ancestry, check-compound) read tools/lib/sources.mjs, whose roots are
// `sink` and `templates` — DIRECTORIES OF EDITABLE FILES. sources.mjs states
// the reason it excludes kitchen-sink.html: a finding must name a file you can
// edit, and a generated file is overwritten by the next build. portal.html is
// generated for the same reason and is excluded on the same grounds.
//
// That leaves a real hole, because kitchen-sink.html's own cover for it does
// not apply here: the sink is assembled from sink/*.html fragments, and those
// fragments ARE per-file gated. This page has no fragments. Its markup is in
// this file, and no gate reads this file's output for structure.
//
// So this build carries its own icon assertion, the way tools/build.mjs
// carries the namespace check with no check-* file of its own. Every `#i-name`
// emitted below must be a <symbol> the committed sprite defines, or the build
// throws. CLAUDE.md is unambiguous about why that one is worth catching here:
// a <use> pointing at a symbol that does not exist paints NOTHING, silently,
// and the page still looks built.
//
// IT IS NOT REGISTERED AS A GATE. The registry says fourteen and three
// documents agree with it; adding a fifteenth is a decision, not a side effect
// of adding a page. Recorded in docs/audits.md as an unregistered build
// invariant so it is not merely undocumented.
//
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { shell, shellHead, shellScripts } from './lib/shell.mjs';
import { gzipSync } from 'node:zlib';
import { GATES, browserGates, cells } from './lib/gates.mjs';
import { markupFiles } from './lib/sources.mjs';
import { cellStates } from './lib/staleness.mjs';
import { compiled } from './lib/ownership.mjs';
import { stats } from './lib/stats.mjs';

const read = p => readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const kb = n => `${(n / 1024).toFixed(1)} KB`;
// Whole KB, FLOORED, for anything gzipped — see the header of tools/lib/stats.mjs
// for why it is not exact and why floor rather than round.
const kbz = n => `${Math.floor(n / 1024)} KB`;

// ── the facts, all read ─────────────────────────────────────────────────────
const inventory = json('docs/inventory.json');
const componentDocs = json('docs/component-docs.json').components;
const coverage = json('docs/coverage.json');
const ledger = json('docs/gate-coverage.json');
const css = read('css/rux.css');

const COMPILED = compiled();
const allComponents = Object.values(inventory.components).map(c => c.component).sort();

// EVERY SHARED FIGURE COMES FROM tools/lib/stats.mjs, and the names below are
// kept only so the markup that reads them does not have to change.
//
// They used to be computed here, correctly, which was still the wrong shape:
// README published the same figures from a hand-typed table and the two
// disagreed for eleven commits -- this page said 50/83 while README said 37/83.
// A second correct copy is still a second copy. One module now answers for
// both, so they cannot drift apart again.
const S = stats();
const tokenCount = S.tokensDefined;
const classCount = S.classes;
const cssSize = S.css.rawBytes;
const minSize = S.css.minBytes;
// Level 9 is pinned in stats.mjs, for the reason this comment used to carry:
// node's zlib defaults to 6 and returns a figure ~0.7 KB higher, which would
// disagree with the recorded measurement on this page's first render.
const gzipSize = S.css.gzipBytes;

// THE MODULE LIST WAS HARDCODED HERE AND IT DRIFTED, which is the finding that
// produced stats.mjs. This read a twelve-name array and the paragraph below it
// read the literal "12 modules"; copy-button and date-picker were admitted on
// 2026-08-31 and added to neither, so a GENERATED page that CI checks for
// staleness published "12 modules, 127.4 KB raw" against a real 14 and 149.6 KB.
// CI could not see it: the file regenerated cleanly, because the generator's own
// input was wrong. Generation is not enough if a list inside the generator is
// typed by hand. This now reads the directory.
const jsModules = S.js.modules;
const jsBytes = S.js.rawBytes;

const templates = markupFiles(['templates']).map(f => {
  const src = read(f.path);
  const m = src.match(/BEHAVIOUR:\s*([a-z-]+)[\s\S]*?(\d{4}-\d{2}-\d{2})/);
  return { name: f.name.replace('templates/', ''), path: f.path, label: m?.[1] ?? '—', date: m?.[2] ?? '—' };
});

const covHit = Object.values(coverage.components).reduce((a, c) => a + c.hit, 0);
const covOwn = Object.values(coverage.components).reduce((a, c) => a + c.own, 0);
const covPct = Math.round((covHit / covOwn) * 100);

// Browser-gate matrix: every cell the registry says a sweep has to fill.
//
// STATE COMES FROM tools/lib/staleness.mjs, NOT FROM "is there a row in the
// ledger". The first version of this page asked the weaker question and
// answered "25 / 25 · 0 never run" while `npm run gates` reported 22 stale in
// the same tree — a status page contradicting the tool it reports on. A reading
// whose inputs have moved since is not coverage; `js/` changing invalidates
// every browser cell, which is how 22 of them went stale in one commit.
// DIRTY IS RENDERED AS STALE, AND THE REASON IS THAT THIS FILE IS COMMITTED.
// A cell is DIRTY when an input has uncommitted changes -- true of the working
// tree at build time, never true of the commit the page is committed in. On
// 2026-09-01 (32818b0) the page was built on a dirty tree, committed with 38
// "dirty" tags, and CI rebuilt it on a clean checkout as 38 "stale": a 76-line
// diff and a red run for a page that described a moment rather than a commit.
// `npm run gates` still says dirty; the committed page says what the commit
// can say.
const matrix = cellStates().map(r => {
  const rec = ledger[r.id]?.[r.page];
  // AND THE REASON IS A CONSTANT, for the same reason. 2583f4a mapped the state
  // but carried the dirty reason's wording ("css/rux.css, js changed since")
  // where a clean checkout computes "css/rux.css changed since": another
  // 76-line diff and another red run. What moved is `npm run gates`' to say.
  if (r.state === 'DIRTY' || r.state === 'STALE') r = { ...r, state: 'STALE', why: 'an input changed since' };
  return { gate: r.id, page: r.page, state: r.state, why: r.why,
           current: r.state === 'ok', date: rec?.date ?? null, result: rec?.result ?? null };
});

// THIS PAGE CANNOT RENDER THE STATE OF ITS OWN BROWSER CELLS. portal.html is
// generated from this matrix and is itself an input to each cell swept on it.
// Commit 2529e48 recorded the a3f25e1 sweep, rebuilt all 38 rows, and thereby
// changed portal.html after the three portal readings it recorded: they were
// stale in the commit that introduced them. Repeating the sweep and record
// would repeat the change forever.
//
// The page remains an input in staleness.mjs. That is what makes a real portal
// change age its three readings, and removing it would reopen the under-ageing
// d63771c fixed. Instead, the self-cell set is derived from the registry and
// its state, date and result are omitted from this output. The invariant row
// below tells the reader where the complete answer lives. Changing
// any other rendered row still changes portal.html and ages the three cells,
// so a full sweep terminates in two passes: record the other pages, commit,
// then sweep and record the final portal.
const PORTAL_PAGE = 'portal.html';
const portalCellKeys = new Set(cells()
  .filter(({ page }) => page === PORTAL_PAGE)
  .map(({ gate, page }) => `${gate}\0${page}`));
const isPortalCell = cell => portalCellKeys.has(`${cell.gate}\0${cell.page}`);
const shownMatrix = matrix.filter(cell => !isPortalCell(cell));
const portalCellCount = portalCellKeys.size;
const currentCells = shownMatrix.filter(c => c.current).length;
// "Stale" here is everything that is neither current nor never run, which is
// the set `npm run gates` tells you to re-sweep. NO COMMIT and UNKNOWN COMMIT
// used to fall into no bucket at all and vanished from the tile.
const staleCells = shownMatrix.filter(c => !c.current && c.state !== 'NEVER RUN').length;
const neverRun = shownMatrix.filter(c => c.state === 'NEVER RUN').length;

// ── icons, asserted ─────────────────────────────────────────────────────────
const sprite = read('assets/icons.svg').trim();
const spriteSymbols = new Set([...sprite.matchAll(/<symbol[^>]*\bid="([^"]+)"/g)].map(m => m[1]));
const icon = (name, size = 16, box = 32) => {
  if (!spriteSymbols.has(`i-${name}`)) {
    console.error(`build-portal: no <symbol id="i-${name}"> in assets/icons.svg`);
    process.exit(1);
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${box} ${box}" fill="currentColor" aria-hidden="true"><use href="#i-${name}"/></svg>`;
};

// ── page pieces ─────────────────────────────────────────────────────────────
// The VALUE is not a section heading. It was an <h3>, which put bare numbers --
// "37 / 83", "69%" -- into the outline under h1 with the label left behind, and
// skipped h2 to do it. Same defect as detail-page, dashboard-page and
// wizard-page; type-heading-04 is exactly what the h3 element already computed.
// The template card below was an <h4> under <h2>Templates</h2>, a real skip;
// h3 + type-heading-03 keeps h4's appearance and fixes the level.
const tile = (label, value, note) =>
`          <div class="rux--css-grid-column rux--sm:col-span-4 rux--md:col-span-4 rux--lg:col-span-4">
            <div class="rux--tile">
              <p>${esc(label)}</p>
              <p class="rux--type-heading-04">${esc(value)}</p>
              <p>${esc(note)}</p>
            </div>
          </div>`;

const tag = (text, colour) => `<span class="rux--tag rux--tag--${colour} rux--tag--sm"><span class="rux--tag__label">${esc(text)}</span></span>`;

// THE REFERENCE CELL SAYS WHAT KIND OF LINK IT IS, and the four kinds are not
// interchangeable. `page` is IBM's own usage guidance for this component;
// `alias` is guidance for the page it is documented ON, which is a different
// claim and is labelled with that page's name; `story` is a captured SPECIMEN
// and not guidance at all; `none` is the honest answer for the two components
// that have neither. Collapsing these into one "docs" link would be the same
// mistake docs/component-docs.json exists to avoid.
const reference = name => {
  const d = componentDocs[name];
  if (!d) return '—';
  if (d.kind === 'none') return `${tag('no reference', 'warm-gray')}`;
  if (d.kind === 'story') return `<a class="rux--link" href="${esc(d.specimen)}">specimen</a> ${tag(d.site, 'purple')}`;
  const links = ['usage', 'style', 'accessibility']
    .map(k => `<a class="rux--link" href="${esc(d[k])}">${k}</a>`).join(' · ');
  return d.kind === 'alias' ? `${links} ${tag(`on ${d.page}`, 'blue')}` : links;
};

const componentRows = allComponents.map(name => {
  const on = COMPILED.has(name);
  const cov = coverage.components[name];
  return `                <tr>
                  <td>${esc(name)}</td>
                  <td>${on ? tag('compiled', 'green') : tag('not compiled', 'cool-gray')}</td>
                  <td>${cov ? `${cov.hit} / ${cov.own}` : '—'}</td>
                  <td>${on ? reference(name) : '—'}</td>
                </tr>`;
}).join('\n');

const gateRows = GATES.map(g =>
`                <tr>
                  <td>${esc(g.id)}</td>
                  <td>${g.kind === 'node' ? tag('node', 'blue') : tag('browser', 'purple')}</td>
                  <td>${g.inVerify ? tag('in verify', 'green') : tag('by hand', 'warm-gray')}</td>
                  <td>${esc(g.catches)}</td>
                  <td>${esc(g.blindTo ?? '—')}</td>
                </tr>`).join('\n');

const STATE_TAG = { 'ok': ['current', 'green'], 'STALE': ['stale', 'red'],
  'DIRTY': ['dirty', 'magenta'], 'NEVER RUN': ['never run', 'red'],
  'NO COMMIT': ['no commit', 'warm-gray'], 'UNKNOWN COMMIT': ['unknown commit', 'warm-gray'] };
const matrixRows = shownMatrix.map(c => {
  const [label, colour] = STATE_TAG[c.state] ?? [c.state, 'cool-gray'];
  return `                <tr>
                  <td>${esc(c.gate)}</td>
                  <td>${esc(c.page)}</td>
                  <td>${tag(label, colour)}</td>
                  <td>${esc(c.date ?? '—')}</td>
                  <td>${esc(c.why || c.result || 'no result recorded')}</td>
                </tr>`;
}).concat(`                <tr>
                  <td colspan="5">${portalCellCount} ${portalCellCount === 1 ? 'cell' : 'cells'} for <code>${PORTAL_PAGE}</code> ${portalCellCount === 1 ? 'is' : 'are'} reported by <code>npm run gates</code> only. Rendering ${portalCellCount === 1 ? 'its' : 'their'} state here would change the page ${portalCellCount === 1 ? 'it measures' : 'they measure'}.</td>
                </tr>`).join('\n');

const templateCards = templates.map(t =>
`          <div class="rux--css-grid-column rux--sm:col-span-4 rux--md:col-span-4 rux--lg:col-span-4">
            <a class="rux--tile rux--tile--clickable" href="${esc(t.path)}">
              <h3 class="rux--type-heading-03">${esc(t.name)}</h3>
              <p>BEHAVIOUR ${esc(t.label)} · ${esc(t.date)}</p>
            </a>
          </div>`).join('\n');

// NO `--side-nav__item--icon` HERE, even though every item carries an icon.
// That modifier does not mean "this item has an icon"; it means "this item's
// SUBMENU sits under an icon", and its whole effect is to indent the nested
// links to 4.5rem so they clear the parent's glyph. Put it on an item whose
// direct child is a link and the 4.5rem lands on that link instead, pushing
// its own icon to 72px and its text to 112px. Carbon's top-level icon links
// are a bare `side-nav__item`; measured on the running fixed-side-nav-w-icons
// story, 2026-08-29 — padding 16px, icon at 16px, text at 56px.
const navItem = (id, label, ic, current) =>
`      <li class="rux--side-nav__item${current ? ' rux--side-nav__item--active' : ''}">
        <a class="rux--side-nav__link" href="#${id}"${current ? ' aria-current="page"' : ''}>
          <div class="rux--side-nav__icon">${icon(ic, 20)}</div>
          <span class="rux--side-nav__link-text">${esc(label)}</span>
        </a>
      </li>`;

// ── the page ────────────────────────────────────────────────────────────────
const page = `<!doctype html>
<html lang="en" data-theme="white">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>rux-ds — portal</title>
<link rel="icon" href="brand/favicon.svg" type="image/svg+xml">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/IBMPlexSans-Regular-Latin1.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/IBMPlexSans-SemiBold-Latin1.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/IBMPlexMono-Regular-Latin1.woff2">
<link rel="stylesheet" href="assets/fonts/plex.css">
<link rel="stylesheet" href="css/rux.css">
<!-- THE CUSTOMIZATION LAYER, after css/rux.css and in this order, because
     AGENTS.md requires every page to link both and this page linked neither
     until 2026-09-02 (audit finding 13). It rendered without the layer the
     other eleven swept pages have, and while that was true neither file could
     honestly be called an input shared by all browser cells, which is what
     finding 11 is still open on.

     ADDING THEM CHANGES NOTHING ON THIS PAGE TODAY, and that is measured, not
     assumed: css/rux-overrides.css carries no live rule at all, and
     css/rux-theme.css carries four blocks, [data-theme="geist"],
     [data-theme="linear"], [data-theme="ant-dark"] and
     [data-theme="spotify"], none of which this page matches -- it is
     data-theme="white" above. The point is
     that the portal stops being the exception. The moment a rule lands in
     overrides, or this page's theme changes, it moves with every other page
     instead of silently diverging. -->
<link rel="stylesheet" href="css/rux-theme.css">
<link rel="stylesheet" href="css/rux-overrides.css">
${shellHead()}
<style>
/* THE PAGE INDEX, in the page. This page's four section links were in the
   left panel until 2026-09-11, which is the tier IBM reserves for a product's
   PAGES; content beneath that tier belongs in the page. Same shape as the
   kitchen sink's, one row rather than columns because four fit.

   AND NO 18rem CONTENT OFFSET ANY MORE. It was copied from
   templates/app-shell.html, correctly, while this page carried the persistent
   shell. tools/lib/shell.mjs emits the collapsible one: the nav overlays
   instead of standing beside the content, so the offset would be a permanent
   gap next to nothing. */
.ks-index { display: flex; flex-wrap: wrap; gap: .125rem 1.5rem;
            margin-block-end: 2rem; padding-block: 1rem;
            border-block: 1px solid var(--rux-border-subtle); }
.ks-index a { font-size: .8125rem; color: var(--rux-text-secondary);
              text-decoration: none; }
.ks-index a:hover { color: var(--rux-link-primary); text-decoration: underline; }
.ks-index a:focus-visible { outline: 2px solid var(--rux-focus);
                            outline-offset: -2px; }
</style>
</head>
<body>
<!-- GENERATED by tools/build-portal.mjs — do not edit. Every figure is read
     from docs/inventory.json, docs/coverage.json, docs/gate-coverage.json,
     tools/lib/gates.mjs and the files on disk. Edit the generator. -->

${sprite}

${shell('portal')}

<main id="main-content" class="rux--content">
  <nav class="ks-index" aria-label="Sections">
    <a href="#status">Status</a>
    <a href="#components">Components</a>
    <a href="#templates">Templates</a>
    <a href="#gates">Gates</a>
  </nav>
  <div class="rux--css-grid">
    <div class="rux--css-grid-column rux--col-span-100">

      <!-- STACK IS THE PAGE'S ONLY VERTICAL RHYTHM, and it is not optional.
           templates/detail-page.html states the rule this page was built
           without: Carbon components carry no margin, because the spacing
           overview has them "delegate the responsibility of positioning and
           layout to parent components". Without a stack every child of this
           column measures margin 0 and gapToNext 0 -- which is exactly what
           this page shipped at 14db75d, and no gate saw it. check-spacing
           compares CLASSED elements against Carbon's computed signatures; the
           gap between an h2 and the section under it belongs to neither.

           NESTED, as templates/empty-state.html nests four. The outer stack
           separates sections at scale 8 (2.5rem); each section groups its
           heading, its intro and its content at scale 5 (1rem), so a heading
           sits nearer the thing it names than the section above it. -->
      <div class="rux--stack-vertical rux--stack-scale-8">

        <div class="rux--stack-vertical rux--stack-scale-5">
          <h1 id="status">rux-ds</h1>
          <p>A framework-free CSS/HTML/JS design system, built from Carbon v11, kept as complete as its markup allows. Every figure below is read from this repository at build time.</p>
          <!-- with-row-gap: the tiles wrap at md and below, and without it the
               rows butt together into one unbroken slab of layer colour. -->
          <div class="rux--subgrid rux--subgrid--wide rux--subgrid--with-row-gap">
${tile('Components compiled', `${COMPILED.size} / ${allComponents.length}`, `${allComponents.length - COMPILED.size} cut or deferred`)}
${tile('Class coverage', `${covPct}%`, `${covHit} of ${covOwn} classes exercised`)}
${tile('Stylesheet', kbz(gzipSize), `${kb(cssSize)} raw · ${kb(minSize)} minified`)}
${tile('Browser gates current', `${currentCells} of ${shownMatrix.length} shown`, `${portalCellCount} portal ${portalCellCount === 1 ? 'cell' : 'cells'} reported by npm run gates only`)}
          </div>
        </div>

        <div class="rux--stack-vertical rux--stack-scale-5">
          <h2 id="components">Components</h2>
          <p>${COMPILED.size} of ${allComponents.length} compile into <code>css/rux.css</code>. Coverage is what the kitchen sink and templates actually exercise, ratcheted in <code>docs/coverage.json</code>.</p>
          <section class="rux--data-table-container">
            <div class="rux--data-table-header">
              <div>
                <div class="rux--data-table-header__title">All ${allComponents.length} components</div>
                <p class="rux--data-table-header__description">Disposition for every Carbon component, decided in docs/inventory.md.</p>
              </div>
            </div>
            <div class="rux--data-table-content">
              <table class="rux--data-table rux--data-table--lg">
                <thead>
                  <tr>
                    <th scope="col"><div class="rux--table-header-label">Component</div></th>
                    <th scope="col"><div class="rux--table-header-label">State</div></th>
                    <th scope="col"><div class="rux--table-header-label">Classes exercised</div></th>
                    <th scope="col"><div class="rux--table-header-label">Reference</div></th>
                  </tr>
                </thead>
                <tbody>
${componentRows}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="rux--stack-vertical rux--stack-scale-5">
          <h2 id="templates">Templates</h2>
          <p>${templates.length} complete pages. Each carries the shell and declares what its behaviour was verified against.</p>
          <div class="rux--subgrid rux--subgrid--wide rux--subgrid--with-row-gap">
${templateCards}
          </div>
        </div>

        <div class="rux--stack-vertical rux--stack-scale-5">
          <h2 id="gates">Gates</h2>
          <p>${GATES.length} gates. ${GATES.filter(g => g.inVerify).length} run in <code>npm run verify</code>; ${browserGates().length} need a browser and are recorded by hand in <code>docs/gate-coverage.json</code>.</p>
          <section class="rux--data-table-container">
            <div class="rux--data-table-header">
              <div>
                <div class="rux--data-table-header__title">The registry</div>
                <p class="rux--data-table-header__description">What each gate catches, and what it is blind to. Read from tools/lib/gates.mjs.</p>
              </div>
            </div>
            <div class="rux--data-table-content">
              <table class="rux--data-table rux--data-table--lg">
                <thead>
                  <tr>
                    <th scope="col"><div class="rux--table-header-label">Gate</div></th>
                    <th scope="col"><div class="rux--table-header-label">Kind</div></th>
                    <th scope="col"><div class="rux--table-header-label">Runs</div></th>
                    <th scope="col"><div class="rux--table-header-label">Catches</div></th>
                    <th scope="col"><div class="rux--table-header-label">Blind to</div></th>
                  </tr>
                </thead>
                <tbody>
${gateRows}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="rux--stack-vertical rux--stack-scale-5">
          <h3>Browser gate coverage</h3>
          <p>A gate never run against a target is indistinguishable from one that passed, and a reading whose inputs have moved since is not coverage either. Of the cells this page can report without describing itself, ${currentCells} of ${shownMatrix.length} are current; ${staleCells} not current, ${neverRun} never run. <code>npm run gates</code> reports all ${matrix.length}, including ${portalCellCount} for this portal that are omitted below to prevent self-invalidation.</p>
          <section class="rux--data-table-container">
            <div class="rux--data-table-content">
              <table class="rux--data-table rux--data-table--lg">
                <thead>
                  <tr>
                    <th scope="col"><div class="rux--table-header-label">Gate</div></th>
                    <th scope="col"><div class="rux--table-header-label">Page</div></th>
                    <th scope="col"><div class="rux--table-header-label">State</div></th>
                    <th scope="col"><div class="rux--table-header-label">Last run</div></th>
                    <th scope="col"><div class="rux--table-header-label">Result or reason</div></th>
                  </tr>
                </thead>
                <tbody>
${matrixRows}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div class="rux--stack-vertical rux--stack-scale-5">
          <h2>Behaviour</h2>
          <p>${jsModules} modules, ${kb(jsBytes)} raw. The markup is the API — a page built from a template needs no script of its own.</p>
          <ul class="rux--list--unordered">
            <li class="rux--list__item"><a class="rux--link" href="kitchen-sink.html">Kitchen sink</a> — ${COMPILED.size} compiled components as live specimens</li>
            <li class="rux--list__item"><a class="rux--link" href="templates/app-shell.html">App shell</a> — the frame every template is built on</li>
            <li class="rux--list__item"><a class="rux--link" href="builder.html">Page builder</a> — start from a template, add and edit sections, take the page away</li>
            <li class="rux--list__item"><a class="rux--link" href="theme-creator.html">Theme creator</a> — pick a Carbon hue family or fine-tune each token by hex, preview live, take the CSS block away</li>
            <li class="rux--list__item">${tokenCount} <code>--rux-*</code> tokens · ${classCount} <code>.rux--*</code> classes</li>
          </ul>
        </div>

      </div>
    </div>
  </div>
</main>

<script src="js/overlay.js"></script>
<script src="js/popover.js"></script>
<script src="js/menu.js"></script>
<script src="js/list-box.js"></script>
<script src="js/tabs.js"></script>
<script src="js/accordion.js"></script>
<script src="js/data-table.js"></script>
<script src="js/form-controls.js"></script>
<script src="js/ui-shell.js"></script>
<script src="js/dismiss.js"></script>
<script src="js/tile.js"></script>
<script src="js/modal.js"></script>
${shellScripts()}
</body>
</html>
`;

writeFileSync('portal.html', page);
console.log(`  portal.html — ${COMPILED.size}/${allComponents.length} components · ${GATES.length} gates · ${currentCells} of ${shownMatrix.length} shown browser cells current, ${staleCells} not current, ${neverRun} never run · ${portalCellCount} portal cells in npm run gates only`);
