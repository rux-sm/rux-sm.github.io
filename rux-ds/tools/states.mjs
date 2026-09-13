#!/usr/bin/env node
//
// Which STATES does each component have, and which has the sink ever drawn?
//
// check-coverage answers "is this component in the sink at all". It says COVERED
// 75/75, and that is true and not enough: a component drawn once, closed and
// valid, is one of its states. 789 of 1,356 classes with a rule have never
// appeared in kitchen-sink.html, and most of the interesting ones are the second
// half of a component nothing has opened.
//
// THE SPLIT IS CARBON'S OWN NAMING, not a list kept here. Carbon writes
// `--component__part` for structure and `--component--modifier` for state, so
// splitting a class on `--` is exact:
//
//   rux--dropdown                    2 segments  base
//   rux--dropdown__wrapper           2 segments  part
//   rux--dropdown--open              3 segments  STATE  open
//   rux--list-box__field--invalid    3 segments  STATE  invalid, on a part
//   rux--combo-box--invalid--focused 4 segments  STATE  invalid+focused
//
// Single hyphens inside a name (date-picker, side-nav) never split, which is why
// this works where a regex over modifier words would not.
//
// OWNERSHIP IS check-coverage's, imported rather than reimplemented. Getting it
// wrong is the documented trap: `dropdown` is a dependency of combo-box,
// multiselect and the fluid-* family, so a naive metric gives it five owners or
// none. Two tools disagreeing about who owns a class is worse than either.
//
// This is a MAP, not a gate. It says what exists and what has been drawn; it does
// not say a state must be drawn. Some genuinely need not be — `--fluid` variants
// have their own components, and the grid utilities are not component states at
// all. Deciding which to demo is a person's job. Phase 5 is the consumer: every
// state listed here is one a behavior module has to be able to produce.
//
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const inv = JSON.parse(readFileSync('docs/inventory.json', 'utf8'));
const ROOTS = ['kitchen-sink.html', 'templates'];
const OUT = 'docs/states.json';

// Verbatim from check-coverage.mjs. If these drift, the two tools disagree.
const ALIAS = {
  'button': ['btn'], 'number-input': ['number'],
  'data-table': ['data-table', 'table'],
  'notification': ['inline-notification', 'toast-notification', 'actionable-notification'],
  'ui-shell': ['header', 'side-nav', 'switcher', 'navigation', 'skip-to-content'],
  'treeview': ['tree'], 'skeleton-styles': ['skeleton'],
  'progress-indicator': ['progress-indicator', 'progress-step'],
  'file-uploader': ['file'], 'code-snippet': ['snippet'],
  'truncated-text': ['truncated'], 'chat-button': ['chat-btn'],
  'copy-button': ['copy-btn', 'copy'], 'multiselect': ['multi-select'],
};
const MARKER = {
  'fluid-text-input': 'rux--text-input--fluid', 'fluid-text-area': 'rux--text-area--fluid',
  'fluid-select': 'rux--select--fluid', 'fluid-search': 'rux--search--fluid',
  'fluid-number-input': 'rux--number-input--fluid', 'fluid-date-picker': 'rux--date-picker--fluid',
  'fluid-time-picker': 'rux--time-picker--fluid', 'fluid-dropdown': 'rux--list-box__wrapper--fluid',
  'fluid-combo-box': 'rux--list-box__wrapper--fluid', 'fluid-multiselect': 'rux--list-box__wrapper--fluid',
  'fluid-list-box': 'rux--list-box__wrapper--fluid',
};
const stems = n => ALIAS[n] ?? [n];

// Families exist to rank the work, not to define it. A state's family says how
// it is reached: FEEDBACK and VARIANT are markup a fragment can just write,
// INTERACTION is markup only a behavior module produces.
//
// `--slug` is a VARIANT, not a size. It marks a field that carries an AI slug and
// adjusts padding to make room for it (text-input/_text-input.scss:439). It sat in
// the size family in the first cut of this file, which put 20 decorator states in
// front of the cheap density work and overstated what `--sm` and `--lg` would cost.
const FAMILY = [
  ['interaction', /^(open|closed|expanded|collapsed|selected|active|focused|focus|pressed|checked|current|highlighted|dragover|drag-over|is-.*)$/],
  ['feedback',    /^(invalid|warn|warning|error|success|disabled|readonly|read-only|loading|inactive|skeleton)$/],
  ['size',        /^(xs|sm|md|lg|xl|2xl|expressive|compact|short|tall)$/],
];
const familyOf = mods => {
  for (const [name, re] of FAMILY) if (mods.some(m => re.test(m))) return name;
  return 'variant';
};

function walk(p, out = []) {
  if (!statSync(p, { throwIfNoEntry: false })) return out;
  if (statSync(p).isDirectory()) { for (const f of readdirSync(p)) walk(join(p, f), out); return out; }
  if (extname(p) === '.html') out.push(p);
  return out;
}

const used = new Set();
for (const f of ROOTS.flatMap(r => walk(r)))
  for (const m of readFileSync(f, 'utf8').matchAll(/class="([^"]*)"/g))
    for (const c of m[1].split(/\s+/)) if (c.startsWith('rux--')) used.add(c);

const allClasses = new Set(inv.components.flatMap(c => c.classes ?? []).filter(c => !c.includes(':')));

const rows = [];
for (const c of inv.components) {
  if (c.error) continue;
  const own = MARKER[c.component]
    ? [...allClasses].filter(cl => cl === MARKER[c.component])
    : [...allClasses].filter(cl => stems(c.component).some(s =>
        cl === `rux--${s}` || cl.startsWith(`rux--${s}-`) || cl.startsWith(`rux--${s}__`)));

  const states = [];
  for (const cl of own) {
    const seg = cl.split('--');
    if (seg.length < 3) continue;                       // base or part, not a state
    const mods = seg.slice(2);
    states.push({ class: cl, on: seg[1], modifiers: mods, family: familyOf(mods), drawn: used.has(cl) });
  }
  states.sort((a, b) => a.family.localeCompare(b.family) || a.class.localeCompare(b.class));
  rows.push({
    component: c.component,
    states: states.length,
    drawn: states.filter(s => s.drawn).length,
    byFamily: Object.fromEntries(['interaction', 'feedback', 'size', 'variant'].map(f => {
      const s = states.filter(x => x.family === f);
      return [f, { total: s.length, drawn: s.filter(x => x.drawn).length }];
    })),
    list: states,
  });
}

rows.sort((a, b) => (b.states - b.drawn) - (a.states - a.drawn) || a.component.localeCompare(b.component));
writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), components: rows }, null, 2) + '\n');

const T = rows.reduce((a, r) => a + r.states, 0), D = rows.reduce((a, r) => a + r.drawn, 0);
const fam = f => { const t = rows.reduce((a, r) => a + r.byFamily[f].total, 0), d = rows.reduce((a, r) => a + r.byFamily[f].drawn, 0); return `${d}/${t}`; };
console.log(`
  ${OUT} — ${rows.length} components

  states           ${T}
  drawn in sink    ${D}  (${Math.round(100 * D / T)}%)
  never drawn      ${T - D}

  interaction  ${fam('interaction').padEnd(9)} feedback  ${fam('feedback').padEnd(9)} size  ${fam('size').padEnd(9)} variant  ${fam('variant')}
`);
if (process.argv[2] === '--component' && process.argv[3]) {
  const r = rows.find(x => x.component === process.argv[3]);
  if (!r) { console.log('no such component'); process.exit(1); }
  for (const s of r.list) console.log(`  ${s.drawn ? '·' : 'MISSING'}  ${s.family.padEnd(12)} ${s.class}`);
  console.log();
}
