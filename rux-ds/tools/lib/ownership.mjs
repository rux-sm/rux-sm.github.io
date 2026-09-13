//
// Facts about rux classes: what a class is, which component owns it, and which
// components are compiled.
//
// Carbon namespaces every class by component name, so the class stem IS the
// ownership record — `rux--dropdown__wrapper` belongs to dropdown no matter
// which compile emitted it. check-coverage established that metric; this file
// is where it lives now, because check-classes needs the same table and a
// second copy of it is a second thing to forget.
//
// The component universe comes from docs/inventory.json rather than from
// node_modules, so the gates read a tracked file and do not depend on an
// install having happened.
//
import { readFileSync } from 'node:fs';

// Carbon's class stem differs from the package name for these.
export const ALIAS = {
  // v11 wraps a dismissible tag's contents in `interactive--tag-children`,
  // which begins with neither `tag` nor any other component name.
  'tag': ['tag', 'interactive--tag-children'],
  'button': ['btn'], 'number-input': ['number'],
  // data-table is four modules and its classes do not all start with `table`.
  // sort and expandable add row stems; action adds the toolbar and the batch bar.
  'data-table': ['data-table', 'table', 'expandable-row', 'parent-row',
                 'child-row-inner-container', 'batch-actions', 'batch-download',
                 'batch-summary', 'action-list', 'toolbar-content',
                 'toolbar-action', 'toolbar-search-container'],
  'notification': ['inline-notification', 'toast-notification', 'actionable-notification'],
  'ui-shell': ['header', 'side-nav', 'switcher', 'navigation', 'skip-to-content'],
  'treeview': ['tree'], 'skeleton-styles': ['skeleton'],
  // v11 renders the tablist as `tab--list` and the panels as `tab-content`;
  // neither begins with `tabs`, so ownership could not see them.
  'tabs': ['tabs', 'tab--list', 'tab-content', 'tab--overflow-nav-button'],
  'progress-indicator': ['progress-indicator', 'progress-step'],
  'file-uploader': ['file'], 'code-snippet': ['snippet'],
  'truncated-text': ['truncated'], 'chat-button': ['chat-btn'],
  'copy-button': ['copy-btn', 'copy'], 'multiselect': ['multi-select'],
  // These partial directories use ibm-products' PascalCase names while their
  // absorbed Carbon classes use kebab-case stems.
  'EditInPlace': ['edit-in-place'],
  'FullPageError': ['full-page-error'],
  'OptionsTile': ['options-tile'],
};

export function stems(name) { return ALIAS[name] ?? [name]; }

const inv = JSON.parse(readFileSync('docs/inventory.json', 'utf8'));

// Longest stem first, so `list-box` claims `rux--list-box__field` before `list`
// can, and `data-table` claims `rux--data-table--zebra` before `table`.
const OWNERS = inv.components
  .flatMap(c => stems(c.component).map(s => [s, c.component]))
  .sort((a, b) => b[0].length - a[0].length);

// The component a class belongs to, or null for a class no component owns —
// the foundation classes from reset, type, grid and layout, which are always
// compiled and therefore always legitimate.
export function owner(cls) {
  if (!cls.startsWith('rux--')) return null;
  const n = cls.slice(5);
  for (const [s, c] of OWNERS)
    if (n === s || n.startsWith(`${s}-`) || n.startsWith(`${s}__`)) return c;
  return null;
}

// The strip is src/app.scss, so the manifest is read directly rather than
// mirrored in a list here (roadmap §4.3, and the same reasoning as check-coverage).
//
// A COMPONENT CAN BE SEVERAL MODULES. data-table is compiled as four @use lines —
// the base plus sort, expandable and action — and Carbon namespaces all of their
// classes under the one component name, so ownership is by the FIRST path segment.
// Anything deeper is a module of a component already in the set.
export function compiled() {
  const manifest = readFileSync('src/app.scss', 'utf8');
  return new Set([...manifest.matchAll(/^@use "@carbon\/styles\/scss\/components\/([^"]+)"/gm)]
    .map(m => m[1].split('/')[0]));
}

// Every module line, sub-paths included — what a compile of the manifest is.
export function compiledModules() {
  const manifest = readFileSync('src/app.scss', 'utf8');
  return [...manifest.matchAll(/^@use "@carbon\/styles\/scss\/components\/([^"]+)"/gm)].map(m => m[1]);
}

// What counts as a class name in the built CSS.
//
// THREE TOOLS USED THREE DIFFERENT PATTERNS and reported 534, 824 and 1,609 for
// the same stylesheet. Each was wrong in its own way:
//   * `[a-z0-9-]` omitted `_`, so every BEM element truncated at its `__` and
//     collapsed into its block — `.rux--data-table__foo` counted as `.rux--data-table`.
//   * `[a-zA-Z0-9_-]` stopped at the backslash in the grid's escaped responsive
//     classes, so `.rux--md\:col-span-4` was seen as `.rux--md`.
//   * `[a-zA-Z0-9_\\:-]` admitted a BARE colon too, so `.rux--btn--xs:hover`
//     counted as a class distinct from `.rux--btn--xs` and inflated the total.
// The escape `\:` is part of the name; a bare `:` starts a pseudo-class and ends it.
const CLASS_RE = /\.rux--(?:[a-zA-Z0-9_-]|\\:)+/g;

export function classNames(css) {
  return new Set((css.match(CLASS_RE) ?? []).map(s => s.slice(1)));
}

// The same question asked of MARKUP and of JS, which is not the same regex.
//
// WHY THEY LIVE HERE. This file is where "what counts as a class name" is
// defined once so the gates cannot disagree, and until now that promise covered
// only the CSS side: check-classes carried the markup and JS patterns inline,
// so anything else wanting the used-class count had to copy them. tools/lib/
// stats.mjs now wants exactly that count for a figure README publishes, and a
// second copy of a regex is how the count in a document starts disagreeing with
// the count in a gate.
//
// THEY RETURN ARRAYS, NOT SETS, AND THAT IS LOAD-BEARING. check-classes prints
// one line per OCCURRENCE, so a class used twice in one file names both sites.
// Deduplicating here would silently drop the second, which is the kind of help
// a gate does not want. Callers that want uniqueness build their own Set.
export function classesInMarkup(html) {
  const out = [];
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/).filter(c => c.startsWith('rux--'))) out.push(cls);
  }
  return out;
}

// Class names in JS live in string literals, so the match is the bare name
// rather than a `class="..."` attribute. Only rux-- names are found; a state
// hook like `is-visible` is Carbon's own and carries no prefix to find.
export function classesInJs(src) {
  return [...src.matchAll(/['"`.]((?:rux--)[a-zA-Z0-9_-]+)/g)].map(m => m[1]);
}
