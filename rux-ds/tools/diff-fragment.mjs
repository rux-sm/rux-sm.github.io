#!/usr/bin/env node
//
// Where does a fragment's NESTING disagree with Carbon's rendered DOM?
//
// check-tags answers "is this class on the right element type". This answers
// the next question in roadmap §4.1.11's list of what a name-based gate cannot
// see: "wrong nesting *order*, a missing wrapper". It is the machine half of
// the reference diff that promoted multiselect and ui-shell to `rendered-dom`,
// and it exists because doing that by eye for 51 fragments is how the first
// pass got tabs wrong.
//
// THE COMPARISON IS NEAREST CLASSED PARENT. For every element carrying a
// Carbon class, walk up to the first ancestor that also carries one. That pair
// — child class, parent class — is the smallest fact about nesting that is
// still meaningful, and it is what a missing wrapper or an inverted pair
// changes. Full ancestry was tried in check-tags and abandoned: the Storybook
// wraps every story in chrome we have no reason to reproduce, so deep paths
// disagree for reasons that are not defects. Nearest-parent survives that
// because the chrome sits above the component, not inside it.
//
// A finding is: our parent for class X is never a parent of X in ANY reference
// story. Pooling across stories is the same bargain check-tags makes — it
// accepts a placement some variant uses even when the demoed variant would not,
// so this under-reports rather than crying wolf.
//
// TWO EXCLUSIONS, both measured rather than guessed. The first draft reported
// 427 findings and the top fragments were almost pure noise of one shape:
//
//   AN UNCLASSED PARENT ON OUR SIDE IS NOT A FINDING. The sink puts components
//   directly inside its own `ks-row` / `ks-grid` demo divs, which carry no
//   Carbon class by design, so the honest answer for those is "no wrapper" —
//   indistinguishable from a genuinely missing one. Every button in
//   buttons.html reported against `action-set`, `form-item`, `card__action`
//   and friends for exactly this reason. So this tool checks nesting that
//   DISAGREES, not nesting that is ABSENT; the missing-wrapper case belongs to
//   check-co-classes and to looking at the page.
//
//   STORY CHROME IS NOT A PARENT. Storybook wraps every story in
//   `div.cds--layout` and its layout-constraint siblings. They are the reason
//   check-tags abandoned ancestry outright; here they are simply not counted
//   as parents, which keeps the rest of ancestry usable.
//
// DIAGNOSTIC, NOT A GATE, and unlike check-tags it should probably stay one:
// the reference is 642 captures of the variants Carbon happens to demo, so a
// legitimate composition nobody stories looks identical to a mistake. Read the
// findings, confirm each against the story named, then fix or record. The
// count is a worklist, not a score.
//
// THE OTHER DIRECTION IS --omissions: classes the reference emits that we
// never use. Nesting and tag checks both start from what we wrote, so neither
// can see something absent — and absence is what the multiselect diff found
// (§4.1.11: no __wrapper, no __field--wrapper). It picks the reference stories
// for a fragment by class overlap rather than a hand-written map, on
// check-tags' reasoning that the class is the join key, then lists what those
// stories carry and we do not.
//
// Read it as a prompt, never as a defect list. Much of what it prints is a
// variant the fragment deliberately does not demo, a skeleton, or story
// furniture. The question it answers is "is there something here I did not
// know Carbon renders", and for a fragment written by inference the answer is
// often yes.
//
//   node tools/diff-fragment.mjs                  every fragment, summary
//   node tools/diff-fragment.mjs radio            one fragment, with detail
//   node tools/diff-fragment.mjs --unreferenced   classes no story emits
//   node tools/diff-fragment.mjs radio --omissions  what Carbon renders and we do not
//
import { readFileSync, readdirSync } from 'node:fs';

const REF_PATHS = [
  'docs/carbon-react-dom.json',
  'docs/carbon-ibm-products-dom.json',
  'docs/carbon-react-states.json',
  'docs/carbon-ibm-products-states.json',
];
const PREFIX = /^(?:cds|c4p)--/;
// Storybook's own wrapper, present in every capture and meaningless to us.
const CHROME = /^(layout|layout-constraint--.*|sb-.*)$/;
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
  'use', 'path', 'circle', 'rect', 'polygon', 'stop', 'ellipse', 'line']);

// --- our side: parse a fragment into {classes, parentClasses} pairs ----------
// A real stack this time, because the question IS ancestry. Comments go first
// so the explanation blocks the fragments carry are not read as markup.
function pairs(html) {
  const src = html.replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  const stack = [];                       // classed ancestors, innermost last
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let m;
  while ((m = re.exec(src))) {
    const [, closing, rawTag, attrs, selfClose] = m;
    const tag = rawTag.toLowerCase();
    if (closing) { if (stack.length && stack[stack.length - 1].tag === tag) stack.pop(); continue; }
    const classes = (attrs.match(/\sclass="([^"]*)"/) ?? [, ''])[1]
      .split(/\s+/).filter(c => c.startsWith('rux--')).map(c => c.slice(5));
    const parent = stack.length ? stack[stack.length - 1].classes : null;
    for (const c of classes) out.push({ cls: c, parents: parent });
    const empty = selfClose || VOID.has(tag);
    if (!empty) stack.push({ tag, classes: classes.length ? classes : (stack.length ? stack[stack.length - 1].classes : null) });
  }
  return out;
}

// --- reference side: class -> set of nearest-classed-parent classes ----------
// Lines are '  '*depth + tag.class.class[role=…]{aria=…}, so depth is indent/2.
const PARENTS = new Map();                // class -> Set(parent class | '(root)')
const STORY_OF = new Map();               // class -> a story id that shows it
const STORY_CLASSES = new Map();          // story id -> Set(class), for --omissions
let stories = 0;
for (const path of REF_PATHS) {
  for (const [id, lines] of Object.entries(JSON.parse(readFileSync(path, 'utf8')))) {
    if (id.startsWith('_')) continue;           // `_meta` is provenance, not a story
    if (lines[0]?.startsWith('(')) continue;
    stories++;
    STORY_CLASSES.set(id, new Set());
    const openAt = [];                    // depth -> classes of nearest classed ancestor
    for (const line of lines) {
      const depth = (line.match(/^ */)[0].length) / 2;
      const body = line.trim().replace(/\[role=[^\]]*\]/, '').replace(/\{[^}]*\}/, '');
      const classes = body.split('.').slice(1).filter(Boolean).map(c => c.replace(PREFIX, ''));
      // nearest classed ancestor = the closest shallower entry that had classes
      let parent = null;
      for (let d = depth - 1; d >= 0; d--) if (openAt[d]) { parent = openAt[d]; break; }
      for (const c of classes) {
        if (CHROME.test(c)) continue;
        STORY_CLASSES.get(id).add(c);
        if (!PARENTS.has(c)) PARENTS.set(c, new Set());
        if (parent) for (const p of parent) PARENTS.get(c).add(p);
        else PARENTS.get(c).add('(root)');
        if (!STORY_OF.has(c)) STORY_OF.set(c, id);
      }
      const real = classes.filter(c => !CHROME.test(c));
      openAt[depth] = real.length ? real : null;
      openAt.length = depth + 1;          // anything deeper is out of scope now
    }
  }
}

const only = process.argv.find(a => !a.startsWith('-') && !a.endsWith('.mjs') && !a.includes('/'));
const wantUnref = process.argv.includes('--unreferenced');
const files = readdirSync('sink').filter(f => f.endsWith('.html'))
  .filter(f => !only || f === `${only}.html`).sort();

const wantOmissions = process.argv.includes('--omissions');

// Stories that best cover a fragment's classes, then what they add on top.
//
// PREFER THE COMPONENT'S OWN STORIES. Ranking every story by raw overlap picks
// composite pages — links scored highest against a data-table batch-actions
// story, textarea against a whole form — and then reports that whole page as
// "missing", which is noise of the least useful kind. So candidates are first
// narrowed to stories whose id names this component, falling back to the open
// field only when nothing matches. Names are compared with hyphens stripped,
// which is what turns `text-input` into Carbon's `textinput`; ALIAS carries the
// handful where the fragment and the story disagree outright.
const ALIAS = {
  buttons: 'button', links: 'link', tags: 'tag', number: 'numberinput',
  radio: 'radiobutton', table: 'datatable', 'page-header': 'pageheader',
  'side-panel': 'sidepanel', treeview: 'treeview', notification: 'notifications',
  'code-snippet': 'codesnippet', 'file-uploader': 'fileuploader',
  'progress-bar': 'progressbar', 'progress-indicator': 'progressindicator',
  'inline-loading': 'inlineloading', 'content-switcher': 'contentswitcher',
  'contained-list': 'containedlist', 'structured-list': 'structuredlist',
  'overflow-menu': 'overflowmenu', 'menu-button': 'menubutton',
  'combo-button': 'combobutton', 'combo-box': 'combobox', 'list-box': 'listbox',
  'date-picker': 'datepicker', 'time-picker': 'timepicker', 'ai-label': 'ailabel',
  'aspect-ratio': 'aspectratio', 'badge-indicator': 'badgeindicator',
  'icon-indicator': 'iconindicator', 'shape-indicator': 'shapeindicator',
  'truncated-text': 'truncatedtext', 'chat-button': 'chatbutton',
  'copy-button': 'copybutton', 'text-input': 'textinput', 'textarea': 'textarea',
};
function omissions(ours, fragment) {
  const token = (ALIAS[fragment] ?? fragment).replace(/-/g, '');
  const named = [...STORY_CLASSES.keys()].filter(id => id.replace(/-/g, '').includes(token));
  const pool = named.length ? new Map(named.map(id => [id, STORY_CLASSES.get(id)])) : STORY_CLASSES;
  const scored = [];
  for (const [id, cls] of pool) {
    let hit = 0;
    for (const c of ours) if (cls.has(c)) hit++;
    if (hit) scored.push([hit / ours.size, hit, id, cls]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  const top = scored.slice(0, 4);
  const missing = new Map();              // class -> story that shows it
  for (const [, , id, cls] of top)
    for (const c of cls) if (!ours.has(c) && !missing.has(c)) missing.set(c, id);
  return { top: top.map(([r, h, id]) => `${id} (${h} of ${ours.size})`), missing };
}

let totalFindings = 0, totalUnref = 0;
const summary = [];
for (const file of files) {
  const rows = [], unref = new Set();
  const seen = new Set();
  for (const { cls, parents } of pairs(readFileSync(`sink/${file}`, 'utf8'))) {
    if (!PARENTS.has(cls)) { unref.add(cls); continue; }
    if (!parents) continue;                            // no wrapper on our side; see header
    const ours = parents;
    const theirs = PARENTS.get(cls);
    if (ours.some(p => theirs.has(p))) continue;      // one match is enough
    const key = cls + '<' + ours.join('+');
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([cls, ours.join('+'), [...theirs].sort().slice(0, 4).join(' | '), STORY_OF.get(cls)]);
  }
  totalFindings += rows.length;
  totalUnref += unref.size;
  summary.push([file.replace('.html', ''), rows.length, unref.size]);
  if (!rows.length && !(wantUnref && unref.size) && !wantOmissions) continue;
  if (only || rows.length) {
    console.log(`\n  ${file}`);
    for (const [c, ours, theirs, story] of rows.sort()) {
      console.log(`      rux--${c}`);
      console.log(`         ours   inside .${ours}`);
      console.log(`         Carbon inside ${theirs}`);
      console.log(`         see    ${story}`);
    }
    if (wantUnref && unref.size) console.log(`      no reference: ${[...unref].sort().join(' ')}`);
  }
  if (wantOmissions) {
    const ours = new Set(pairs(readFileSync(`sink/${file}`, 'utf8')).map(p => p.cls));
    const { top, missing } = omissions(ours, file.replace('.html', ''));
    console.log(`\n  ${file} — closest stories`);
    for (const t of top) console.log(`      ${t}`);
    console.log(`      Carbon renders, we do not (${missing.size}):`);
    for (const [c, id] of [...missing].sort())
      console.log(`         ${c.padEnd(46)} ${id.replace(/^components-|^preview-/, '')}`);
  }
}

if (!only) {
  const worst = summary.filter(s => s[1]).sort((a, b) => b[1] - a[1]);
  console.log('\n  fragments by nesting findings');
  for (const [name, n, u] of worst) console.log(`      ${String(n).padStart(3)}  ${name}${u ? `   (+${u} unreferenced)` : ''}`);
}
console.log(`\n  ${stories} stories · ${files.length} fragments · ${totalFindings} nesting findings`
  + ` · ${totalUnref} class uses with no reference`);
console.log('  diagnostic — confirm each against the story named before changing markup');
