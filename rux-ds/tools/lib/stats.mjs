//
// THE FIGURES README PUBLISHES, READ FROM THE REPOSITORY.
//
// WHY THIS EXISTS. README carried a table of counts typed by hand, and on
// 2026-09-01 every figure in it was wrong: 37 components against 50, 60.9 KB
// against 70.4, twelve behaviour modules against fourteen. The sixteen
// admissions of 2026-08-31 moved all of them at once and nothing said so, for
// eleven commits.
//
// That is not a new failure. tools/build-portal.mjs opens with the same
// argument and cites the same history -- "a hand-written status page would be a
// SECOND copy" -- and CI already fails when css/, kitchen-sink.html or
// portal.html is not regenerated. The mechanism was built, proved, and pointed
// at three files. README was not one of them.
//
// AND GENERATION ALONE IS NOT ENOUGH, which this file exists to fix properly.
// portal.html is generated, gated by CI, and STILL said "12 modules, 127.4 KB"
// on 2026-09-01 -- because the count was a literal in a template string and the
// byte total summed a hardcoded twelve-name array that copy-button and
// date-picker were never added to. A generator with a hand-written list inside
// it is a hand-written document that takes longer to update. Every figure below
// is read from the filesystem or from a file a gate already owns; none is a
// literal, and adding a module or a component changes them with no edit here.
//
// WHAT IS DELIBERATELY NOT HERE: the tripwire values. Those are DECISIONS, with
// fifty lines of justification attached to tools/build.mjs, which is what
// enforces them. A measurement belongs to whatever measures it; a decision
// belongs beside its reasoning. Splitting the 85 from the argument for 85 to
// fill a table cell would be the trade this repository keeps declining.
//
// GZIP SIZE IS ENVIRONMENT-SENSITIVE, AND IT BROKE THE BUILD ONCE. Level 9 is
// pinned here because level 6 already produced a disagreeing figure (build-
// portal records that one), but the LEVEL is not the whole problem: the zlib
// the running Node bundles decides the last hundred bytes. Measured 2026-09-01,
// on byte-identical css/rux.min.css: Node 26.7 reads 70.4 KB where Node 22
// reads 70.5. CI pins 22 (.github/workflows/gates.yml), regenerates, and diffs
// the committed pages -- so a contributor on a newer Node commits a figure CI
// cannot reproduce and the build fails on a file nobody edited. That is exactly
// what happened at 59bcffd, on the very check this module had just been wired
// into.
//
// SO THE PUBLISHED FIGURE IS WHOLE KB, FLOORED, and the exact byte count stays
// here for callers that want it.
//
// FLOOR RATHER THAN ROUND, AND THE MARGINS ARE THE ARGUMENT. Measured
// 2026-09-01: css/ is 72125 B and js/ is 45507 B. Rounding leaves only 67 B and
// 61 B before the published figure changes -- SMALLER than the ~100 B the two
// Node versions already differ by, so round would have failed again on the very
// next push. Flooring leaves 579 B and 573 B, about six times the observed
// variance.
//
// It is a mitigation and not a proof. If a measurement ever lands within ~100 B
// of a whole KB the fix is not a third rounding rule: it is to stop publishing a
// COMPRESSED size from a committed file at all. Raw and minified are byte-exact
// and carry between machines. tools/build.mjs keeps measuring the exact value
// against the tripwire, where it belongs -- read at build time, never committed.
//
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { classNames, classesInMarkup, classesInJs, compiled } from './ownership.mjs';
import { pageFiles } from './sources.mjs';

const read = p => readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const htmlIn = dir => (existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.html')).sort() : []);

// GZIP AT LEVEL 9, NOT THE DEFAULT. node's zlib defaults to 6, which reads
// ~0.7 KB higher; `gzip -9` is what every recorded measurement here used.
const gzip = buf => gzipSync(buf, { level: 9 }).length;

export function stats() {
  const css = read('css/rux.css');
  const tokensAll = new Set(css.match(/--rux-[a-z0-9-]+/g) ?? []);
  const tokensDefined = new Set(css.match(/--rux-[a-z0-9-]+(?=\s*:)/g) ?? []);
  const scss = read('src/app.scss');
  const inventory = json('docs/inventory.json');
  const coverage = json('docs/coverage.json');

  // Components: what compiles, out of what Carbon ships. `compiled()` and the
  // inventory are the same two sources check-inventory insists must agree, so a
  // figure here cannot drift from the gate that enforces it.
  const COMPILED = compiled();
  const total = Object.keys(inventory.components).length;

  // The @use lines are NOT the component count and the gap is the interesting
  // part: data-table is four modules (base, sort, expandable, action), so the
  // manifest carries more lines than components. Counting lines and calling
  // them components is a mistake this table has room to make.
  const useLines = (scss.match(/^@use "@carbon\/styles\/scss\/components\//gm) ?? []).length;

  // Themes are counted where they are INCLUDED, not where they are imported --
  // `@use ".../themes"` is one line whether two themes ship or four.
  const themes = [...scss.matchAll(/theme\.theme\(themes\.\$([a-z0-9]+)\)/g)].map(m => m[1]);

  // Sink sections: sink/ORDER is the manifest build-sink reads, so the count is
  // what will actually assemble, not what happens to be lying in sink/.
  const sections = read('sink/ORDER').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#')).length;

  // Classes USED, over exactly the files check-classes reads, with exactly the
  // patterns it uses -- file set from sources.mjs, patterns from ownership.mjs,
  // neither restated here.
  //
  // THE FILE SET IS THE ASSEMBLED PAGES, NOT sink/*.html, and the difference is
  // one class. check-classes reads pageFiles() -- every *.html at the root plus
  // templates/ -- so kitchen-sink.html and portal.html are in and the fragments
  // they were assembled from are not. Counting the fragments instead reads 653
  // against the gate's 654, because portal.html carries a class no fragment does.
  // An off-by-one between a published figure and the gate that owns it is the
  // whole failure this file exists to end.
  const used = new Set();
  const walkHtml = root => (root.endsWith('.html') ? [root]
    : htmlIn(root).map(f => join(root, f)));
  for (const root of pageFiles()) for (const f of walkHtml(root)) {
    for (const c of classesInMarkup(read(f))) used.add(c);
  }
  const jsNames = readdirSync('js').filter(f => f.endsWith('.js')).sort();
  for (const f of jsNames) for (const c of classesInJs(read(join('js', f)))) used.add(c);

  const covHit = Object.values(coverage.components).reduce((a, c) => a + c.hit, 0);
  const covOwn = Object.values(coverage.components).reduce((a, c) => a + c.own, 0);

  // Provenance labels, over the same three roots check-provenance labels.
  const prov = { 'rendered-dom': 0, source: 0, inferred: 0 };
  let labelled = 0;
  for (const [dir, names] of [['sink', htmlIn('sink')], ['templates', htmlIn('templates')], ['js', jsNames]]) {
    for (const f of names) {
      const m = read(join(dir, f)).match(/PROVENANCE:\s*([a-z-]+)/);
      if (m && m[1] in prov) { prov[m[1]]++; labelled++; }
    }
  }

  // Icons: symbols the sprite DEFINES against symbols the pages REFERENCE. The
  // match is on `<use href="#i-...">` alone -- a template inlines the sprite, so
  // counting `<symbol id=` there would count definitions as references.
  const sprite = read('assets/icons.svg');
  const symbols = new Set([...sprite.matchAll(/<symbol[^>]*\bid="(i-[^"]+)"/g)].map(m => m[1]));
  const referenced = new Set();
  for (const [dir, names] of [['sink', htmlIn('sink')], ['templates', htmlIn('templates')]]) {
    for (const f of names) {
      for (const m of read(join(dir, f)).matchAll(/href="#(i-[^"]+)"/g)) {
        if (symbols.has(m[1])) referenced.add(m[1]);
      }
    }
  }

  const jsBufs = jsNames.map(f => readFileSync(join('js', f)));
  const jsRaw = jsBufs.reduce((a, b) => a + b.length, 0);

  // Comment share, counted the way build.mjs's tripwire comment states it: this
  // layer is 61% comment on purpose, and a figure that hid that would make the
  // raw size look like code.
  let commentBytes = 0;
  for (const b of jsBufs) {
    let inBlock = false;
    for (const line of b.toString('utf8').split('\n')) {
      const t = line.trim(), n = Buffer.byteLength(line) + 1;
      if (inBlock) { commentBytes += n; if (t.includes('*/')) inBlock = false; continue; }
      if (t.startsWith('/*')) { commentBytes += n; if (!t.includes('*/')) inBlock = true; continue; }
      if (t.startsWith('//')) commentBytes += n;
    }
  }

  return {
    components: { compiled: COMPILED.size, total, useLines, notCompiled: total - COMPILED.size },
    themes: { count: themes.length, names: themes },
    // DEFINED tokens, which is check-tokens' number and not build.mjs's.
    // build.mjs matches every `--rux-` NAME in the file and reads 616; nine of
    // those are referenced and never defined here -- four Carbon popover and
    // tooltip customisation hooks it reads through `var(name, default)`, and
    // five `--rux--card--*` that arrived with card's admission. check-tokens
    // adjudicates all nine as fallback-carrying or known-unset and reports 0
    // unresolved, so both numbers are honest and they count different things.
    // A table cell labelled "Tokens" cannot say which, so it says both.
    // Computed, not stated. A literal nine here would be the same defect the
    // header describes -- a hand-written number inside a generator.
    tokensDefined: tokensDefined.size,
    tokensFallbackOnly: [...tokensAll].filter(t => !tokensDefined.has(t)).length,
    classes: classNames(css).size,
    spacingTokens: new Set(css.match(/--rux-spacing-[0-9a-z-]+/g) ?? []).size,
    sink: { sections, classesUsed: used.size },
    coverage: { hit: covHit, own: covOwn, pct: Math.round((covHit / covOwn) * 100) },
    provenance: { ...prov, files: labelled },
    icons: { symbols: symbols.size, referenced: referenced.size,
             unreferenced: symbols.size - referenced.size, spriteBytes: statSync('assets/icons.svg').size },
    css: { rawBytes: statSync('css/rux.css').size,
           minBytes: existsSync('css/rux.min.css') ? statSync('css/rux.min.css').size : 0,
           gzipBytes: gzip(read('css/rux.min.css')) },
    js: { modules: jsNames.length, rawBytes: jsRaw, gzipBytes: gzip(Buffer.concat(jsBufs)),
          commentBytes, codeBytes: jsRaw - commentBytes,
          commentPct: Math.round((commentBytes / jsRaw) * 100) },
  };
}
