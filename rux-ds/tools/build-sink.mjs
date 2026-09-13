#!/usr/bin/env node
//
// Assembles kitchen-sink.html from sink/*.html fragments.
//
// One fragment per component keeps 75 sections editable in isolation and keeps the
// nav in sync automatically — a hand-maintained nav for 75 entries drifts the first
// time a section is renamed.
//
// Order comes from sink/ORDER; anything not listed there is appended alphabetically
// and reported, so a new fragment can never be silently invisible.
//
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { shell, shellHead, shellScripts } from './lib/shell.mjs';

const frags = readdirSync('sink').filter(f => f.endsWith('.html')).map(f => f.replace(/\.html$/, ''));
const order = existsSync('sink/ORDER')
  ? readFileSync('sink/ORDER', 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'))
  : [];
const known = order.filter(o => frags.includes(o));
const extra = frags.filter(f => !order.includes(f)).sort();
if (extra.length) console.log(`  not in sink/ORDER, appended: ${extra.join(' ')}`);
const missing = order.filter(o => !frags.includes(o));
if (missing.length) console.log(`  in ORDER but no fragment yet: ${missing.length} (${missing.slice(0,8).join(' ')}${missing.length>8?' …':''})`);
const seq = [...known, ...extra];

const titleOf = html => (html.match(/<h2>([^<]+)<\/h2>/) ?? [, '?'])[1];
const idOf = html => (html.match(/id="([^"]+)"/) ?? [, '?'])[1];

const sections = seq.map(n => readFileSync(`sink/${n}.html`, 'utf8').trim());
const sprite = existsSync('assets/icons.svg')
  ? readFileSync('assets/icons.svg', 'utf8').trim()
  : '<!-- no assets/icons.svg; run tools/icons.mjs -->';
// THE NAV IS SORTED AND THE PAGE IS NOT, and the split is the point.
// sink/ORDER groups the page by kind, so the form controls sit together and
// the overlays sit together and a reader comparing two of a kind has them side
// by side. That is worth keeping and it is useless for FINDING one of 68 by
// name, which is what the nav is for. Asked for 2026-09-11 after the whole
// list was read looking for one entry. Sorted on the visible TITLE rather than
// the fragment name, because the title is what is on screen to scan --
// `combo-button` and `Combo button` sort the same here, but `ui-shell` and
// `UI shell` do not, and the reader only ever sees the second. localeCompare
// so case does not split the alphabet into two runs.
const nav = sections
  .slice()
  .sort((a, b) => titleOf(a).localeCompare(titleOf(b), 'en', { sensitivity: 'base' }))
  .map(s => `    <a href="#${idOf(s)}">${titleOf(s)}</a>`).join('\n');

const page = `<!doctype html>
<html lang="en" data-theme="white">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>rux-ds — kitchen sink</title>
<link rel="icon" href="brand/favicon.svg" type="image/svg+xml">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/IBMPlexSans-Regular-Latin1.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/IBMPlexSans-SemiBold-Latin1.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/IBMPlexMono-Regular-Latin1.woff2">
<link rel="stylesheet" href="assets/fonts/plex.css">
<link rel="stylesheet" href="css/rux.css">
<link rel="stylesheet" href="css/rux-theme.css">
<link rel="stylesheet" href="css/rux-overrides.css">
${shellHead()}
<link rel="stylesheet" href="sink/harness.css">
</head>
<body>

${sprite}

${shell('kitchen-sink')}

<main id="main-content" class="rux--content ks-main">
  <h1>Kitchen sink</h1>
  <p class="ks-count">${sections.length} sections · every component this system compiles, on one page</p>

  <!-- THE SECTION INDEX, IN THE PAGE WHERE IT BELONGS. Not a shell part and
       not pretending to be one: ks- chrome, 19px rows, sorted by title while
       sink/ORDER groups the page below it. It lived in the left panel for one
       afternoon and Carbon's own guidance says that tier is for pages. -->
  <nav class="ks-index" aria-label="Sections">
${nav}
  </nav>

${sections.join('\n\n')}
</main>

<!-- Phase 5 behaviour layer. The kernel loads FIRST; modules delegate to it.
     These are the system's, not the sink's — a page from templates/ loads the
     same two files. sink/harness.js is scaffolding for whatever Phase 5 has
     not reached yet, and shrinks with every module that lands. -->
<script src="js/overlay.js"></script>
<script src="js/popover.js"></script>
<script src="js/menu.js"></script>
<script src="js/list-box.js"></script>
<script src="js/date-picker.js"></script>
<script src="js/copy-button.js"></script>
<script src="js/tabs.js"></script>
<script src="js/accordion.js"></script>
<script src="js/data-table.js"></script>
<script src="js/form-controls.js"></script>
<script src="js/ui-shell.js"></script>
<script src="js/dismiss.js"></script>
<script src="js/tile.js"></script>
<script src="js/scroll-gradient.js"></script>
<script src="js/modal.js"></script>
${shellScripts()}
<script src="sink/harness.js"></script>
</body>
</html>
`;
writeFileSync('kitchen-sink.html', page);
console.log(`  kitchen-sink.html — ${sections.length} sections, ${(page.length/1024).toFixed(0)} KB`);
