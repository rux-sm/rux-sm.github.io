#!/usr/bin/env node
//
// Writes README's figure table from the repository, between STATS:BEGIN and
// STATS:END. Nothing else in README is touched.
//
// WHY ONLY THAT BLOCK. README is two documents wearing one hat: a status page
// and a decision log. The log's numbers are RECORDS -- "measured 2026-08-31,
// this is what the gates printed" -- and regenerating one would destroy the
// evidence it exists to preserve. So this tool owns the smallest region that
// is purely current state, and everything outside the markers stays hand-
// written on purpose. The failure being fixed is not that README contains
// numbers; it is that a current number and a historical one looked identical
// on the page, so a reader could not tell which had gone stale. Now one kind
// cannot.
//
// WHAT GATES IT. The same thing that gates css/, kitchen-sink.html and
// portal.html: .github/workflows/gates.yml re-runs the build and fails if the
// committed copy differs. Regenerating is `npm run verify`.
//
// THE FIGURES ARE NOT COMPUTED HERE. tools/lib/stats.mjs owns them, and
// build-portal.mjs reads the same module, so the status page and the README
// cannot disagree -- which they did on 2026-09-01, portal saying 50/83 while
// README said 37/83.
//
import { readFileSync, writeFileSync } from 'node:fs';
import { stats } from './lib/stats.mjs';

const BEGIN = '<!-- STATS:BEGIN -->';
const END = '<!-- STATS:END -->';
const FILE = 'README.md';

const kb = n => `${(n / 1024).toFixed(1)} KB`;
// Whole KB, FLOORED, for anything gzipped — see the header of tools/lib/stats.mjs
// for why it is not exact and why floor rather than round.
const kbz = n => `${Math.floor(n / 1024)} KB`;
const n = x => x.toLocaleString('en-US');

const s = stats();

const rows = [
  ['Components',
   `**${s.components.compiled} / ${s.components.total} compiled** in ${s.components.useLines} \`@use\` lines — \`data-table\` is four of them — and \`docs/inventory.md\` decides all ${s.components.total}, which \`check-inventory\` fails if it stops`],
  ['Themes',
   `${s.themes.count} — ${s.themes.names.join(', ')} — plus \`geist\`, \`linear\`, \`ant-dark\` and \`spotify\`, token override blocks in \`css/rux-theme.css\`, not a compile`],
  ['Tokens · classes',
   `**${n(s.tokensDefined)}** \`--rux-*\` defined, ${s.tokensFallbackOnly} more read through a fallback · **${n(s.classes)}** \`.rux--*\``],
  ['Kitchen sink',
   `**${s.sink.sections}** sections · **${n(s.sink.classesUsed)}** classes with \`templates/\` and \`js/\``],
  ['Class coverage',
   `**${n(s.coverage.hit)} / ${n(s.coverage.own)} (${s.coverage.pct}%)** — ratcheted in \`docs/coverage.json\``],
  ['Spacing scale',
   `${s.spacingTokens} \`--rux-spacing-*\` tokens, demoed in the \`spacing\` section`],
  ['Markup provenance',
   `**${s.provenance['rendered-dom']} \`rendered-dom\` · ${s.provenance.source} \`source\` · ${s.provenance.inferred} \`inferred\`** across ${s.provenance.files} files`],
  ['Icons',
   `${s.icons.symbols} symbols in a ${kb(s.icons.spriteBytes)} sprite — ${s.icons.referenced} referenced, ${s.icons.unreferenced} nothing points at`],
  ['Size',
   `${kb(s.css.rawBytes)} raw · ${kb(s.css.minBytes)} min · **${kbz(s.css.gzipBytes)} gzipped**`],
  ['Behaviour JS',
   `**${s.js.modules}** modules · **${kbz(s.js.gzipBytes)} gzipped** · ${kb(s.js.rawBytes)} raw, ${s.js.commentPct}% of it comment · ${kb(s.js.codeBytes)} of code`],
];

const table = ['| | |', '|---|---|', ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join('\n');

// The note is part of the generated block on purpose. A reader who finds this
// table needs to know it is not hand-maintained BEFORE deciding to correct it
// by hand, and a sentence outside the markers could drift away from the one
// inside them.
const note = [
  '',
  '**Every figure above is generated** by `tools/build-readme.mjs` from',
  '`tools/lib/stats.mjs`, rewritten on every `npm run verify`, and CI fails if the',
  'committed copy is stale — the same contract `css/`, `kitchen-sink.html` and',
  '`portal.html` are already under. Do not edit the table by hand; the next build',
  'overwrites it. The gzipped figures are whole KB on purpose: they are read at',
  'level 9 and the last hundred bytes still depend on the zlib the running Node',
  'bundles, so an exact figure makes the build fail on whichever machine did not',
  'generate it. The tripwires those',
  'sizes run against — 96 KB for `css/`, 60 KB for `js/` — are decisions rather',
  'than measurements and live with their reasoning in `tools/build.mjs`.',
].join('\n');

const src = readFileSync(FILE, 'utf8');
const a = src.indexOf(BEGIN);
const b = src.indexOf(END);
if (a === -1 || b === -1 || b < a) {
  console.error(`build-readme: ${FILE} has no ${BEGIN} … ${END} block.`);
  process.exit(1);
}

const next = `${src.slice(0, a + BEGIN.length)}\n${table}\n${note}\n${src.slice(b)}`;
if (next !== src) writeFileSync(FILE, next);
console.log(`\n  README.md — ${rows.length} figures${next === src ? ' (unchanged)' : ' (rewritten)'}\n`);
