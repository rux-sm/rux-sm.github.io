// WHAT THE CATALOGUE HOLDS AND WHAT IT DOES NOT — the table on
// docs/builder-coverage.md.
//
// Imported by BOTH tools/build-blocks.mjs, which writes it, and
// tools/check-blocks.mjs, which re-derives and compares. That is the same
// arrangement lib/blocks.mjs has for the manifest and it is here for the same
// reason: a generated file and the check on it must not be able to describe the
// repository differently.
//
// WHY THIS EXISTS. 60 of the 68 shipped sink fragments carry no block marker,
// and until this table nothing counted them, so which to admit next was a guess
// against memory. Every column is DERIVED — there is no list here for anyone to
// maintain — because a hand-kept table is exactly the thing that goes quietly
// wrong: `deps` read `[]` on all 33 blocks for four stages and no one noticed.
//
// THE ROW KEY IS THE FRAGMENT, not the component, and that is forced rather
// than chosen. sink/fluid.html demos thirteen components; `form` owns no
// fragment at all and appears only inside other people's; grid and spacing are
// foundations with no component row in the inventory. Components are resolved
// INTO a row by owner(), the resolver check-classes and check-coverage already
// share, so the mapping is computed and not asserted.
//
// A CANDIDATE REGION is an element carrying a rux-- class none of whose
// ancestors carries one. The rule lives here, in code, rather than in prose:
// an undefined "specimen" produced two different counts for the same corpus
// while this stage was being planned, and a number offered as evidence needs
// the algorithm that made it. It is an UPPER BOUND on what could be marked and
// not a forecast of blocks — roadmap §4.12's rule, "a region that can stand as
// a direct child of a page's stack", disqualifies most of them.
import { readFileSync, readdirSync } from 'node:fs';
import { owner, compiled, classesInMarkup, classesInJs } from './ownership.mjs';
import { textFieldsOf, variantsOf } from '../../builder/rewrites.mjs';

export const COVERAGE = 'docs/builder-coverage.md';
export const BEGIN = '<!-- COVERAGE:BEGIN -->';
export const END = '<!-- COVERAGE:END -->';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);
const TAGS = /<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<svg\b[\s\S]*?<\/svg\s*>|<\/?[a-zA-Z][^>]*>/g;

export function candidateRegions(html) {
  const stack = [];
  let n = 0;
  TAGS.lastIndex = 0;
  for (let m; (m = TAGS.exec(html));) {
    const t = m[0];
    if (t.startsWith('<!--') || /^<(script|style|svg)\b/i.test(t)) continue;
    if (t.startsWith('</')) {
      const name = t.slice(2).replace(/[\s>].*/, '').toLowerCase();
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].name === name) { stack.length = i; break; }
      continue;
    }
    const name = t.slice(1).replace(/[\s/>].*/, '').toLowerCase();
    const cls = (t.match(/\sclass="([^"]*)"/) ?? [, ''])[1];
    const rux = /\brux--/.test(cls);
    const inside = stack.some(x => x.rux);
    if (rux && !inside) n++;
    if (!VOID.has(name) && !/\/\s*>$/.test(t)) stack.push({ name, rux: rux || inside });
  }
  return n;
}

export const fragments = () => readdirSync('sink').filter(f => f.endsWith('.html'))
  .map(f => f.replace(/\.html$/, '')).sort();

export function coverageRows(blocks) {
  const modules = readdirSync('js').filter(f => f.endsWith('.js')).map(f => ({
    name: f.replace(/\.js$/, ''),
    owns: new Set([...classesInJs(readFileSync(`js/${f}`, 'utf8'))].map(owner).filter(Boolean)),
  }));
  const live = new Set(compiled());
  const bySource = new Map();
  for (const b of blocks) {
    if (!bySource.has(b.source)) bySource.set(b.source, []);
    bySource.get(b.source).push(b);
  }
  return fragments().map(name => {
    const path = `sink/${name}.html`;
    const html = readFileSync(path, 'utf8');
    const components = [...new Set([...classesInMarkup(html)].map(owner).filter(Boolean))].sort();
    const mine = bySource.get(path) ?? [];
    return {
      fragment: name,
      components,
      compiled: components.filter(c => live.has(c)).length,
      blocks: mine.length,
      candidates: candidateRegions(html),
      // PER MARKED BLOCK, never per fragment: an unmarked fragment has no block,
      // and counting its whole demo catalogue would be a number about nothing.
      text: mine.length ? mine.reduce((n, b) => n + textFieldsOf(b.html).length, 0) : null,
      variants: mine.length ? mine.reduce((n, b) => n + variantsOf(b.html).length, 0) : null,
      behaviour: modules.filter(m => components.some(c => m.owns.has(c))).map(m => m.name).sort(),
    };
  });
}

export function coverageTable(blocks) {
  const rows = coverageRows(blocks);
  const marked = rows.filter(r => r.blocks);
  const unmarked = rows.filter(r => !r.blocks);
  const cell = v => (v === null ? '—' : String(v));
  return [
    `_${rows.length} shipped fragments · ${marked.length} marked, holding `
    + `${marked.reduce((n, r) => n + r.blocks, 0)} of the catalogue's ${blocks.length} blocks · `
    + `${unmarked.reduce((n, r) => n + r.candidates, 0)} candidate regions in the ${unmarked.length} unmarked._`,
    '',
    '| fragment | components | blocks | candidates | text | variants | behaviour | in the builder |',
    '|---|---|---|---|---|---|---|---|',
    ...rows.map(r => `| \`${r.fragment}\` | ${r.components.join(', ') || '—'} | ${cell(r.blocks || null)}`
      + ` | ${r.candidates} | ${cell(r.text)} | ${cell(r.variants)}`
      + ` | ${r.behaviour.join(', ') || '—'} | ${r.blocks ? 'yes' : 'no'} |`),
  ].join('\n');
}

// The hand-kept eligibility notes, `- \`name\` — reason`. Returned as names so
// check-blocks can fault one no shipped fragment answers to — which is what
// keeps a decision list from rotting into prose about files that moved.
export const reasonsIn = md => [...md.matchAll(/^- `([a-z0-9-]+)`\s+—/gm)].map(m => m[1]);
