#!/usr/bin/env node
//
// THE BUILDER'S EXPORT MUST BE WHAT THE SCRIPT WRITES. builder/rewrites.mjs
// says so as a fact -- "exportPage() MUST REPRODUCE tools/new-project.sh
// BYTE FOR BYTE" -- and until this gate existed nothing held it. The claim was
// proved once by hand at stage 2, with default answers, and default answers is
// exactly the set that hides the divergence this gate found on its first run.
//   node tools/check-parity.mjs
//
// IT RUNS THE SCRIPT'S OWN LINES, NOT A COPY OF THEM. The whole script refuses
// a dirty tree and unpushed commits (new-project.sh, "the pin"), because a pin
// taken from a dirty tree names the wrong bytes -- so a gate that ran the whole
// thing would fail on every uncommitted change and be routed around, which is
// the gate nobody keeps. Instead the page-writing region is EXTRACTED from the
// script and executed verbatim under sh. What runs is the script's bytes; what
// is skipped is the vendoring, the PIN and the questions, none of which write
// the page.
//
// WHAT IT CHECKS, and what each rule is paid for by:
//
//   anchors     the extracted region is found and has the shape it must:
//               the esc() definition, eleven `-e` expressions, one awk, and the
//               template read. A REGION IT CANNOT FIND MUST NEVER READ AS A
//               PASS -- an extractor that silently matched nothing would turn
//               this whole gate green and mean nothing, which is the failure
//               mode every check here is written against.
//   parity      for every template and every answer set, the file the script's
//               own lines write equals exportPage() byte for byte. The first
//               differing line and column is reported, not just "differs".
//
// FOUR ANSWER SETS. THE THIRD IS THE ONE THAT EARNED THIS, and the fourth,
// added 2026-09-06, is the only one that asks for `--grid full`. The script
// escapes its answers with esc() and hands them to sed, where a replacement has
// no $-expansion; exportPage substitutes with String.replace(string, string),
// where JS expands $$, $&, $` and $'. So a name of A$&B is literal on one side
// and inserts the whole matched text on the other. Measured on
// templates/app-shell.html before this file was written, and it is worse than
// one wrong string: the header name is substituted with .replace() and the
// aria-label with .split().join(), so ONE answer produced two different strings
// on one page and the visible name disagreed with the accessible one.
//
// WHAT IT CANNOT CHECK.
//
//   Everything the script does outside those lines -- the vendored tree, the
//   PIN, the seeded brand and CSS files, the questions, the drift report.
//
//   Any answer it is not given. This is a fixture, not a proof over all inputs.
//
//   WHETHER EITHER SIDE PRODUCES VALID HTML. Neither escapes the answers, and
//   they land in element text and in an attribute value, so an answer carrying
//   " < > or & can produce a malformed attribute or interpreted markup that
//   both sides agree on byte for byte. The awkward set below keeps those
//   characters deliberately: agreement is what is measured, and agreement is
//   all it means. Whether to escape in both, reject in both, or leave it is
//   rux's, recorded in roadmap 4.12.
//
// RED RUN: revert content() in builder/rewrites.mjs to .replace(x, string) and
// the awkward set fails on every template; change one `-e` expression in a copy
// of the script; delete the `> "$DIR/$PAGE.html"` line so the end anchor is
// gone (expect ANCHORS, exit 1). Each must fail.
import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportPage } from '../builder/rewrites.mjs';

const SCRIPT = 'tools/new-project.sh';
const faults = [];

// ── the answers ────────────────────────────────────────────────────────────
// theme is not varied for its own sake: it is one of five the script validates,
// and the substitution is the same for all five. The third set is the fixture
// this gate exists for; see the header.
// grid: the first three sets stay `capped`, which must leave every template
// byte-identical to before the option existed -- that is the property the
// default is chosen for. The fourth exercises `full` alone, so a divergence
// there names the one substitution it can come from.
const ANSWERS = [
  { label: 'defaults', theme: 'white', grid: 'capped', prefix: 'Rux', name: 'DS', title: 'Rux DS', page: 'index' },
  { label: 'ordinary', theme: 'g100', grid: 'capped', prefix: 'Acme', name: 'Console', title: 'Acme Console', page: 'home' },
  {
    label: 'awkward',
    theme: 'g10',
    grid: 'capped',
    prefix: 'A&B|C\\D',
    name: "E$&F$$G$`H$'I",
    title: '<J>"K"&L — Ünïcøde',
    page: 'index',
  },
  { label: 'full width', theme: 'white', grid: 'full', prefix: 'Rux', name: 'DS', title: 'Rux DS', page: 'index' },
];

// ── extract the region ─────────────────────────────────────────────────────
// Anchored on the script's own text. Every failure here is a fault, never a
// skip: this gate reports nothing it did not measure.
const src = readFileSync(SCRIPT, 'utf8');
const lines = src.split('\n');

const escLine = lines.findIndex(l => l.startsWith('esc() {'));
const start = lines.findIndex(l => l.includes('N="$(esc "$NAME")"'));
const end = lines.findIndex(l => l.trim() === '> "$DIR/$PAGE.html"');

if (escLine === -1) faults.push(['ANCHORS', SCRIPT, 'no `esc() {` definition — the page-writing region cannot be run without it']);
if (start === -1) faults.push(['ANCHORS', SCRIPT, 'no line containing `N="$(esc "$NAME")"` — the region\'s first line has moved']);
if (end === -1) faults.push(['ANCHORS', SCRIPT, 'no line `> "$DIR/$PAGE.html"` — the region\'s last line has moved']);
if (start !== -1 && end !== -1 && end < start) faults.push(['ANCHORS', SCRIPT, `the end anchor (:${end + 1}) is above the start (:${start + 1})`]);

let region = null, where = '';
if (!faults.length) {
  region = lines.slice(start, end + 1).join('\n');
  where = `${SCRIPT}:${start + 1}-${end + 1}`;
  const dashE = (region.match(/-e /g) ?? []).length;
  if (dashE !== 11) faults.push(['ANCHORS', where, `${dashE} \`-e\` expressions, expected 11 — the substitutions have changed and this gate no longer covers them`]);
  if (!/\|\s*awk /.test(region)) faults.push(['ANCHORS', where, 'no `| awk` in the region — the two project stylesheet links are inserted there']);
  if (!region.includes('"$HERE/templates/$TPL.html"')) faults.push(['ANCHORS', where, 'the region does not read `$HERE/templates/$TPL.html` — it is not reading a template']);
}

// ── run it, per template per answer set ────────────────────────────────────
const q = s => `'${String(s).split("'").join("'\\''")}'`;
const templates = faults.length ? [] : readdirSync('templates').filter(f => f.endsWith('.html')).sort();
let compared = 0;
let work = null;

try {
  if (templates.length) work = mkdtempSync(join(tmpdir(), 'ruxds-parity-'));

  for (const file of templates) {
    const tpl = file.replace(/\.html$/, '');
    const source = readFileSync(join('templates', file), 'utf8');

    for (const a of ANSWERS) {
      const prog = [
        'set -e',
        lines[escLine],
        `HERE=${q(process.cwd())}`,
        `TPL=${q(tpl)}`,
        `DIR=${q(work)}`,
        `PAGE=${q(a.page)}`,
        `THEME=${q(a.theme)}`,
        `GRID=${q(a.grid)}`,
        `NAME=${q(a.name)}`,
        `PREFIX=${q(a.prefix)}`,
        `TITLE=${q(a.title)}`,
        region,
      ].join('\n');

      let theirs;
      try {
        execFileSync('sh', ['-c', prog], { stdio: ['ignore', 'pipe', 'pipe'] });
        theirs = readFileSync(join(work, `${a.page}.html`), 'utf8');
      } catch (e) {
        faults.push(['SCRIPT', `${where} · ${tpl} · ${a.label}`, `the extracted region did not write a page: ${(e.stderr?.toString() || e.message).trim()}`]);
        continue;
      }

      const ours = exportPage(source, a);
      compared++;
      if (ours === theirs) continue;

      // Where they part, in the script's coordinates.
      let i = 0;
      while (i < ours.length && i < theirs.length && ours[i] === theirs[i]) i++;
      const before = theirs.slice(0, i);
      const line = before.split('\n').length;
      const col = i - (before.lastIndexOf('\n') + 1) + 1;
      // WINDOWED ON THE DIVERGENCE, not the start of the line. A shell header
      // line runs past 200 characters, so a fixed head-slice printed two
      // identical excerpts for a difference at column 198 — measured, on this
      // gate's own first red run.
      const from = Math.max(0, col - 40), to = col + 80;
      const cut = s => {
        const l = s.split('\n')[line - 1] ?? '';
        return (from ? '…' : '') + JSON.stringify(l.slice(from, to)) + (l.length > to ? '…' : '');
      };
      faults.push(['PARITY', `templates/${file} · ${a.label} · line ${line}, column ${col}`,
        `exportPage and ${where} disagree.\n  ${''.padEnd(14)}script     ${cut(theirs)}\n  ${''.padEnd(14)}exportPage ${cut(ours)}`]);
    }
  }
} finally {
  if (work) rmSync(work, { recursive: true, force: true });
}

for (const [tag, at, why] of faults) {
  console.log(`  ${tag.padEnd(14)}${at}`);
  console.log(`  ${''.padEnd(14)}${why}`);
}
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const region_ = where || `${SCRIPT} — region not found`;
console.log(`  check-parity: ${plural(compared, 'page')} compared · ${plural(templates.length, 'template')} × ${ANSWERS.length} answer sets · ${region_} · ${plural(faults.length, 'fault')}`);
console.log('  This says exportPage reproduces the script\'s page-writing lines for these answers. It does not say the rest of the script is right, and it does not say either side produces valid HTML — neither escapes the answers.');
process.exit(faults.length ? 1 : 0);
