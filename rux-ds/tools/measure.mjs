#!/usr/bin/env node
//
// What does a candidate component set actually cost?
//
// Roadmap §2 cites this file and Phase 2 is where it was owed. It exists because
// the inventory's per-component sizes CANNOT be added up: §2 measured the sum at
// 3,534 KB against a real 837 KB bundle, a 4.2x overcount, because every
// component drags its transitive `@use` graph and the graphs overlap heavily.
// The only honest way to price a subset is to compile that subset.
//
// It also settles the one number §2.1 admits is a hypothesis — "≤40 KB gzipped
// for ~24 components and 2 themes" — and §5 asks to "record the floor you
// actually hit" rather than defend the estimate.
//
//   node tools/measure.mjs                       full vs the proposed keep-set
//   node tools/measure.mjs button tag link       an ad-hoc set
//   node tools/measure.mjs --themes 1 <names…>   with a different theme count
//
// Dependencies are NOT resolved for you. A set that names `dropdown` without
// `list-box` compiles anyway, because Sass pulls the dependency in whether or
// not the manifest lists it — so the measured size is honest while the NAMED
// set is short. Read the reported "pulled in unnamed" line: it is the list of
// components a strip would keep by accident.
//
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { classNames, compiledModules } from './lib/ownership.mjs';

// "ALL" IS CARBON'S OWN LIST, NOT A DIRECTORY LISTING. Reading the directory
// gives `data-table` and misses `data-table/sort`, `/expandable` and `/action`,
// which Carbon @uses separately — so the full-Carbon baseline was understating
// itself by exactly the modules the shipped set was missing.
const COMP_INDEX = 'node_modules/@carbon/styles/scss/components/_index.scss';
const ALL = [...readFileSync(COMP_INDEX, 'utf8').matchAll(/^@use '([^']+)'/gm)]
  .map(m => m[1]).filter(m => !m.startsWith('.')).sort();
const inv = JSON.parse(readFileSync('docs/inventory.json', 'utf8'));
const DEPS = Object.fromEntries(inv.components.filter(c => !c.error).map(c => [c.component, c.depsAll ?? []]));

// READ FROM THE MANIFEST, not mirrored. src/app.scss is the strip, and it now
// carries module lines as well as component lines — data-table is compiled as
// four. A hardcoded list of component names would silently stop matching what
// ships the moment a sub-module is admitted, which is the same failure the theme
// pair had.
const PROPOSED = compiledModules();

// THE THEMES COME FROM THE MANIFEST, NOT FROM A HARDCODED ORDER.
//
// This file used to take the first N of ['white','g10','g90','g100'], so every
// 2-theme figure it produced priced white + g10 — while src/app.scss has shipped
// white + g100 since Phase 3 pass 3 chose "the furthest point from" white. g10 is
// a near-neighbour of white and compresses against it far better, so the numbers
// this tool fed into docs/inventory.md and roadmap §2.1 were ~1.3 KB gzipped
// optimistic for the SHIPPED configuration: 51.5 KB where the built artifact is
// 52.7 KB. The tool that prices every decision must price what actually ships,
// so the pair is read from the manifest for the same reason check-coverage reads
// it — a second copy is a second thing to forget.
//
// `--themes N` still works for comparing configurations. Asking for MORE themes
// than ship measures a hypothetical, so that case uses Carbon's canonical order
// instead — order changes gzip (a theme adjacent to its near-neighbour compresses
// better), and the 4-theme baseline in roadmap §2 was measured that way.
const CANONICAL = ['white', 'g10', 'g90', 'g100'];

function shippedThemes() {
  const body = readFileSync('src/app.scss', 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  const found = [...body.matchAll(/@include theme\.theme\(themes\.\$([a-z0-9]+)\)/g)].map(m => m[1]);
  return [...new Set(found)];
}

const SHIPPED = shippedThemes();
const themeList = n => n <= SHIPPED.length ? SHIPPED.slice(0, n) : CANONICAL.slice(0, n);

// THE EMIT-INCLUDES COME FROM THE MANIFEST TOO, for the reason directly above.
//
// This list was hardcoded as reset + default-type, and drifted the moment
// src/app.scss admitted `type.type-classes` (4beac65). The tool then priced a
// configuration the project does not ship: 558 KB min / 1152 classes against a
// real 582 KB / 1225, so docs/inventory.md's Shipped row and the note under it
// claiming this output "matches css/rux.min.css byte for byte" were both false
// for as long as the utility classes had been shipping. A hardcoded include list
// is the same second copy the theme pair was, and fails the same way.
//
// Only the ORDER-INDEPENDENT emit includes are mirrored. `theme.theme` is not:
// it is per-selector and themeList already owns it above.
function shippedEmits() {
  const body = readFileSync('src/app.scss', 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  return [...body.matchAll(/@include ((?:reset|type)\.[a-z-]+);/g)].map(m => m[1]);
}

const EMITS = shippedEmits();
const work = mkdtempSync(join(tmpdir(), 'ruxds-measure-'));

function build(comps, themeCount) {
  const themes = themeList(themeCount);
  const src = [
    '@use "@carbon/styles/scss/config" with ($prefix: "rux");',
    '@use "@carbon/styles/scss/theme";',
    '@use "@carbon/styles/scss/themes";',
    '@use "@carbon/styles/scss/reset";',
    '@use "@carbon/styles/scss/type";',
    '@use "@carbon/styles/scss/grid";',
    '@use "@carbon/styles/scss/layout";',
    ...comps.map(c => `@use "@carbon/styles/scss/components/${c}";`),
    ...EMITS.map(e => `@include ${e};`),
    `:root { @include theme.theme(themes.$${themes[0]}); }`,
    ...themes.slice(1).map(t => `[data-theme="${t}"] { @include theme.theme(themes.$${t}); }`),
  ].join('\n');
  const f = join(work, 'in.scss'), out = join(work, 'out.css');
  writeFileSync(f, src);
  execFileSync('npx', ['sass', '--load-path=node_modules', '--no-source-map',
    '--style=compressed', f, out], { stdio: ['ignore', 'pipe', 'pipe'] });
  // The same post-transform build.mjs applies — @carbon/grid hardcodes literal
  // `--cds-grid-*` names that $prefix cannot reach. Without it this tool measures
  // a file the project never ships.
  const css = readFileSync(out, 'utf8').replace(/--cds-grid-/g, '--rux-grid-');
  return { min: Buffer.byteLength(css), gzip: gzipSync(Buffer.from(css), { level: 9 }).length,
           classes: classNames(css).size };
}

const argv = process.argv.slice(2);
let themeCount = SHIPPED.length;
const ti = argv.indexOf('--themes');
if (ti !== -1) { themeCount = Number(argv[ti + 1]); argv.splice(ti, 2); }
const adhoc = argv.filter(a => !a.startsWith('-'));
const count = list => new Set(list.map(c => c.split('/')[0])).size;

const jobs = adhoc.length
  ? [[`ad-hoc — ${count(adhoc)} components / ${adhoc.length} modules, ${themeCount} theme(s)`, adhoc, themeCount]]
  : [[`full — ${count(ALL)} components / ${ALL.length} modules, 4 themes`, ALL, 4],
     [`shipped — ${count(PROPOSED)} components / ${PROPOSED.length} modules, ${SHIPPED.length} themes`, PROPOSED, SHIPPED.length],
     [`shipped — ${count(PROPOSED)} components / ${PROPOSED.length} modules, 1 theme`, PROPOSED, 1]];

console.log(`\n  themes from src/app.scss: ${SHIPPED.join(' + ')}`);
for (const [label, comps, themes] of jobs) {
  process.stdout.write(`  ${label.padEnd(52)}`);
  const r = build(comps, themes);
  console.log(`${String(Math.round(r.min / 1024)).padStart(5)} KB min  `
    + `${(r.gzip / 1024).toFixed(1).padStart(6)} KB gzip  ${String(r.classes).padStart(5)} classes`);
  // What Sass pulled in that the set did not name — the accidental keeps.
  const named = new Set(comps);
  const pulled = [...new Set(comps.flatMap(c => DEPS[c] ?? []))].filter(d => !named.has(d)).sort();
  if (pulled.length) console.log(`  ${''.padEnd(52)}pulled in unnamed: ${pulled.join(' ')}`);
}
rmSync(work, { recursive: true, force: true });
console.log();
