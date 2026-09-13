#!/usr/bin/env node
//
// Per-component inventory: compiles each component alone against the same
// foundations as src/app.scss, and records the classes and size it contributes
// over that baseline.
//
// Serves Phase 1 (markup needs the real class vocabulary) and Phase 2 (the
// KEEP/CUT/DEFER inventory). Writes docs/inventory.json.
//
// Phase 2 wants three things per component: size, the `@use` graph, and the
// tokens it consumes. Size alone is famously misleading here — roadmap §2 warns
// that per-component figures are DEPENDENCY weight, and summing them overcounts
// the real bundle 4.2x — so the graph is what says whether cutting a component
// actually removes anything. `deps` is the transitive closure over sibling
// components; `exclusive` is the part of it nothing else needs, which is the
// only weight a cut genuinely reclaims.
//
// Carbon's own import depth distinguishes the two: from components/<name>/,
// `@use '../sibling'` is another component and `@use '../../theme'` is a
// foundation. Nothing else needs to be inferred.
//
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const COMP_DIR = 'node_modules/@carbon/styles/scss/components';
const comps = readdirSync(COMP_DIR).filter(d => !d.startsWith('_') && !d.startsWith('__')).sort();
const work = mkdtempSync(join(tmpdir(), 'ruxds-inv-'));

const FOUNDATION = [
  '@use "@carbon/styles/scss/config" with ($prefix: "rux");',
  '@use "@carbon/styles/scss/theme";',
  '@use "@carbon/styles/scss/themes";',
  '@use "@carbon/styles/scss/type";',
  '@use "@carbon/styles/scss/layout";',
].join('\n');
const EMIT = ':root { @include theme.theme(themes.$white); }';

function compile(name, extra) {
  const f = join(work, `${name}.scss`);
  writeFileSync(f, `${FOUNDATION}\n${extra}\n${EMIT}\n`);
  const out = join(work, `${name}.css`);
  execFileSync('npx', ['sass', '--load-path=node_modules', '--no-source-map',
    '--style=compressed', f, out], { stdio: ['ignore', 'pipe', 'pipe'] });
  return readFileSync(out, 'utf8');
}

const classesOf = css => new Set(css.match(/\.rux--[a-zA-Z0-9_\\:-]+/g)?.map(s => s.slice(1)) ?? []);
const tokensOf = css => new Set(css.match(/--rux-[a-zA-Z0-9-]+/g) ?? []);

// Direct sibling-component dependencies, read from the SCSS source. A single
// `../` from inside components/<name>/ lands on another component; `../../`
// lands on a foundation and is not a dependency for these purposes.
const compSet = new Set(comps);
function directDeps(name) {
  const dir = join(COMP_DIR, name);
  const out = new Set();
  for (const f of readdirSync(dir).filter(f => f.endsWith('.scss'))) {
    for (const m of readFileSync(join(dir, f), 'utf8').matchAll(/@use\s+'(\.\.\/[^']+)'/g)) {
      const path = m[1];
      if (path.startsWith('../../')) continue;              // foundation
      const target = path.slice(3).split('/')[0];           // '../x/y' -> 'x'
      if (target !== name && compSet.has(target)) out.add(target);
    }
  }
  return [...out].sort();
}
const DIRECT = Object.fromEntries(comps.map(c => [c, directDeps(c)]));
function closure(name, seen = new Set()) {
  for (const d of DIRECT[name] ?? []) if (!seen.has(d)) { seen.add(d); closure(d, seen); }
  return seen;
}

process.stdout.write('  baseline… ');
const base = compile('__base', '');
const baseClasses = classesOf(base);
console.log(`${baseClasses.size} classes, ${(base.length / 1024).toFixed(0)} KB`);

const rows = [];
for (const c of comps) {
  process.stdout.write(`  ${c.padEnd(22)}`);
  try {
    const css = compile(c, `@use "@carbon/styles/scss/components/${c}";`);
    const own = [...classesOf(css)].filter(x => !baseClasses.has(x)).sort();
    const tokens = [...tokensOf(css)].sort();
    rows.push({ component: c, classes: own, classCount: own.length,
                minBytes: css.length - base.length,
                gzipBytes: gzipSync(Buffer.from(css), { level: 9 }).length - gzipSync(Buffer.from(base), { level: 9 }).length,
                deps: DIRECT[c], depsAll: [...closure(c)].sort(), tokenCount: tokens.length });
    console.log(`${String(own.length).padStart(4)} classes  ${String(Math.round((css.length - base.length) / 1024)).padStart(4)} KB`);
  } catch (e) {
    rows.push({ component: c, error: String(e.message).split('\n')[0] });
    console.log('  FAILED');
  }
}
rmSync(work, { recursive: true, force: true });

// How many OTHER components depend on each one. A dependency nothing else wants
// is weight a cut reclaims; one that three components share is weight that stays
// until all three go, which is the 4.2x overcount made concrete.
const neededBy = Object.fromEntries(comps.map(c => [c, []]));
for (const c of comps) for (const d of closure(c)) neededBy[d].push(c);
for (const r of rows) {
  if (r.error) continue;
  r.neededByCount = neededBy[r.component].length;
  r.exclusiveDeps = (r.depsAll ?? []).filter(d => neededBy[d].length === 1);
}
// THE CARBON VERSION IS RECORDED, so check-inventory can refuse a file compiled
// from a Carbon that is no longer installed. Until 2026-09-02 nothing could say
// which Carbon this was compiled against, and nothing in verify regenerates it.
const carbon = JSON.parse(readFileSync('node_modules/@carbon/styles/package.json', 'utf8')).version;
writeFileSync('docs/inventory.json', JSON.stringify({ generated: new Date().toISOString().slice(0, 10), carbon, baselineClasses: [...baseClasses].sort(), components: rows }, null, 1));
console.log(`\n  ${rows.filter(r => !r.error).length}/${comps.length} components -> docs/inventory.json`);
