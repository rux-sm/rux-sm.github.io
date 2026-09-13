#!/usr/bin/env node
//
// What still stands between these pages and a PUBLIC repository?
//
// WHY IT EXISTS. This repository is public, served from main, so the question
// that decides a commit is: is there anything on this page that should not be
// on the open internet? Its predecessor gate, check-export-safe, asked whether
// a page carried guide data bound for rux-ds -- a question about a different
// repository, and one the generator had made vacuous by stamping every page
// it wrote as exempt. It was retired on 2026-09-01; this is the one gate.
//
// IT REFUSES. tools/githooks/pre-commit runs it over the staged bytes of
// every staged page and Markdown file and a non-zero exit stops the commit.
// There is no exemption and no filename list: a public page cannot opt out
// of being public.
//
// THE NAMES COME FROM ATLAS, NOT FROM A COPY. `export.py`'s PEOPLE tuple is
// the one list of who must not be named, and a second copy here would drift
// from it -- which is the failure this whole project is arranged against. If
// the sibling checkout is missing the class is reported `unavailable` rather
// than passing quietly, because a check that silently skips is worse than one
// that is absent.
//
// WHAT THE SYNC ROUTE ALREADY HOLDS, AND WHAT IT DOES NOT. Atlas's emit.py
// sweeps every document it writes against that same tuple and writes nothing
// if a name survives, so a name cannot arrive through sync-guides.sh. It can
// still arrive by hand: an edit to data/guides/*.json, a generator that
// injects text, or a hand-written page or Markdown file. This class is what
// catches those, and it runs only where the tuple can be read -- the commit
// hook on a machine with the sibling checkout. CI cannot read it, so a commit
// that skips the hook is not re-checked for names anywhere.
//
// WHAT IT CANNOT SEE, said plainly:
//   * whether a paraphrase of Infor's documentation is still too close to it.
//     It counts verbatim quotation, which is the part a regex can find.
//   * a person named in a way the PEOPLE list does not spell.
//   * whether an item or partner code belongs to Infor's shipped training data
//     or was entered by a client. That is a question for a person and the
//     answer changes what belongs in this file.
//   * anything about licensing. Counting quotations is not legal advice.
//
//   node tools/check-publishable.mjs <page.html> [more.html ...]
//   node tools/check-publishable.mjs            # every .html in the repository
//
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'vendor', 'build', '.git']);

function pages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : pages(path);
    // .md TOO, AND THAT WAS A REAL GAP. Reading only pages assumed the site is
    // the only thing published, and a public repository publishes every
    // tracked file. `SEND-BACK.md` quoted the PEOPLE tuple literally to argue
    // about it -- four spellings of one person, in a document about to become
    // world-readable, invisible to a gate that read pages.
    return /\.(?:html|md)$/.test(entry.name) ? [path] : [];
  });
}

// PEOPLE, read out of atlas rather than restated here -- AT THE PINNED COMMIT.
// It read atlas HEAD until 2026-09-01. data/guides/ is emitted at one commit
// and named in its PIN; if atlas later shortened the list, HEAD would have
// judged data emitted under the longer one and passed it. The list that
// applies to this data is the one at the commit that emitted it. The names
// are never shipped here in any form: a list of who must not be named, in a
// public repository, would publish them.
function peoplePattern() {
  const atlas = process.env.ATLAS ?? join(ROOT, '..', '..', 'rux-ln-atlas');
  if (!existsSync(join(atlas, 'tools', 'export.py'))) return null;
  const pinFile = join(ROOT, 'data', 'guides', 'PIN');
  const pin = existsSync(pinFile)
    ? /^commit\s+([0-9a-f]{7,40})/m.exec(readFileSync(pinFile, 'utf8'))?.[1] : null;
  if (!pin) return null;
  try {
    const src = execFileSync('git', ['-C', atlas, 'show', `${pin}:tools/export.py`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const block = /PEOPLE\s*=\s*\(([^)]*)\)/s.exec(src);
    if (!block) return null;
    const names = [...block[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
    return names.length ? new RegExp(names.map(n =>
      n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g') : null;
  } catch { return null; }
}

const PEOPLE = peoplePattern();

// A DOCUMENT ABOUT THE LIBRARY IS NOT A PAGE OF IT. `OI-101` and a `GAP —`
// marker expose nothing -- they are bookkeeping meaningless outside a tracker
// nobody else can read -- and the exchange documents discuss them by name
// because that is what those documents are for. On a rendered PAGE they mean
// something else entirely: that the emitter leaked. So the bookkeeping classes
// are checked on pages only, and the exposure classes everywhere.
const EXPOSURE_ONLY = new Set(['an issue reference', 'a gap marker']);

const CLASSES = [
  ['a person named', PEOPLE],
  ['a vendor document filename', /\b[A-Za-z0-9_.-]+\.pdf\b/g],
  ['an evidence filename', /\b(?:SS|EX|ME|VI)_[\w.-]+/g],
  ['an issue reference', /\bOI-\d{3}\b/g],
  ['a gap marker', /GAP\s*(?:—|&#8212;)/g],
  // NOT CHECKED, AND THE REASON IS RECORDED. Forty-eight timestamped
  // quotations were counted here while the reviews still named people, because
  // a quotation beside a name is attributable to a person. The reviews name
  // roles now. A reader of the published page sees a sentence at (03:45)
  // attributed to "the consultant" and has no way to reach an individual --
  // and the quotations are the most useful teaching content in the reviews,
  // because they are how the concept was actually explained.
  //
  // This is a judgement, not a measurement, and it is the one line in this
  // file that is. If the reviews ever name people again it comes back with
  // them; the two were only ever a problem together.
  // NOT CHECKED, AND THE REASON IS RECORDED SO IT IS NOT ASKED AGAIN.
  // `BP4000006`, `CSADNA01`, `ADNA02`, `FAIRFIELD ENGINEERING CO.`,
  // `VISTA MACHINES INC.` and the `BAM-*` item family read like a customer's
  // master data and are not: every one of the 46 source attributions in the
  // library says "LN training environment", and the owner confirmed the
  // partners, companies and items are invented training data. They were the
  // largest class this file counted -- 104 identifiers and 9 company names --
  // and counting them was measuring nothing.
  //
  // If real customer data ever enters the library this has to come back. The
  // condition is the environment, not the shape of the string.
];

const files = process.argv.slice(2).length ? process.argv.slice(2) : pages(ROOT).sort();

const totals = new Map();
let flagged = 0;

// THE NAMES CLASS IS REPOSITORY-WIDE; THE OTHERS ARE THIS FOLDER'S. Since
// 2026-09-12 the whole family lives in one public repository and the root
// check passes every text file in it through here. A person's name is a
// disclosure wherever it appears. A `.pdf` filename, an evidence stem, an
// issue id or a gap marker are shapes from this project's domain, meaningless
// outside it: rux-ds's file-uploader specimen names an invented document by filename,
// and that is not a vendor document. Measured the first time the sweep ran
// repository-wide: three files, all that one class, none a name.
for (const path of files) {
  const html = readFileSync(path, 'utf8');
  const hits = [];
  const isPage = path.endsWith('.html');
  const inNotes = !relative(ROOT, resolve(path)).startsWith('..');
  for (const [what, pattern] of CLASSES) {
    if (!pattern) { totals.set(what, 'unavailable'); continue; }
    if (!inNotes && what !== 'a person named') continue;
    if (!isPage && EXPOSURE_ONLY.has(what)) continue;
    const found = html.match(pattern) ?? [];
    if (found.length) {
      hits.push([what, found.length, [...new Set(found)].slice(0, 3)]);
      if (totals.get(what) !== 'unavailable') {
        totals.set(what, (totals.get(what) ?? 0) + found.length);
      }
    }
  }
  const name = relative(ROOT, path);
  if (hits.length) {
    flagged++;
    console.error(`  ${name}`);
    for (const [what, n, sample] of hits) {
      console.error(`      ${String(n).padStart(4)} × ${what}  e.g. ${sample.join(', ').slice(0, 70)}`);
    }
  }
}

console.log(`\n  ${files.length} page(s) · ${flagged} carrying something not yet publishable\n`);
for (const [what, n] of [...totals].sort((a, b) => (b[1] === 'unavailable' ? -1 : b[1]) - (a[1] === 'unavailable' ? -1 : a[1]))) {
  console.log(`  ${String(n).padStart(6)}  ${what}`);
}
if (!PEOPLE) {
  console.log('\n  NAMES WERE NOT CHECKED: ../../rux-ln-atlas is missing, or the commit');
  console.log('  data/guides/PIN names is not in it, so PEOPLE could not be read.');
  console.log('  Nothing else re-checks names: the sync route is held by atlas emit.py,');
  console.log('  and a hand edit to data, the generator or a page is not.');
}
// A GAP IS A REFUSAL OUTSIDE CI. Measured 2026-09-02 on a fresh clone with no
// atlas beside it: the gap printed and check.mjs still said every gate passed,
// so a half-set-up machine read as healthy. CI is the one place the names
// cannot be read by design -- pages.yml says why -- and GitHub sets CI there.
const gap = !PEOPLE && !process.env.CI;
if (gap) console.log('  Outside CI that is a refusal: clone rux-ln-atlas beside this repository, or set ATLAS=<dir>.');
console.log('\n  A clean run says a regex found nothing, and nothing about whether a');
console.log('  paraphrase is close enough to still be a copy. See the header.\n');

// IT REFUSES NOW. It reported while the reviews still carried names, because
// blocking every commit until a content rewrite landed would have stopped work
// rather than protected anything. The rewrite has landed and every class reads
// zero, so the job changes from measuring the distance to holding it.
process.exit(flagged || gap ? 1 : 0);
