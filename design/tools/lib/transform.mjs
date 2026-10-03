// The changes made to Carbon's compiled CSS after Sass, the only ones made
// outside Carbon's own configuration. tools/build.mjs applies them to what
// ships and tools/measure.mjs to what it measures, so the two measure the
// same file. README.md, "The one rule", lists them.

// @carbon/grid hardcodes its custom properties as literal `--cds-grid-*`
// strings (node_modules/@carbon/grid/scss/_css-grid.scss:43 and following).
// $prefix governs grid's class names but never these, so configuration alone
// cannot rename them. Safe because the tokens are self-contained: declared and
// consumed only within grid's own rules, referenced by no component in
// @carbon/styles; tools/build.mjs re-proves that on every build.
const GRID_TOKEN = /--cds-grid-/g;

// A component can hardcode the prefix the same way in a REFERENCE: Tearsheet's
// AI border gradient reads `var(--cds-layer)`, `var(--cds-ai-border-start)` and
// `var(--cds-ai-border-end)` as literals (Tearsheet/_tearsheet.scss:139-147),
// which under another prefix name tokens nobody declares, so the gradient
// would draw nothing. Each such reference is renamed, and `undeclared` lists
// any whose token the stylesheet does not declare under our prefix, which
// tools/build.mjs fails on rather than ship a reference to nothing.
const HARD_REFERENCE = /var\(--cds-([a-z0-9-]+)/g;

// Carbon styles a focused control with `:focus`, which matches however focus
// arrived, so a click or a tap leaves a ring on what it pressed, and a dialog
// or menu that moves focus on opening rings the control it lands on. Browsers
// mark the focus a person should see with `:focus-visible`: always in a text
// field, otherwise only when it came from the keyboard. Every `:focus` in a
// selector becomes `:focus-visible`, the rules that are not rings with them:
// each one means "while focused", for the keyboard user it serves, and a
// `:not(:focus)` partner stays the exact complement of its ring.
// `:focus-within` is left alone. Sass emits no `:focus` outside a selector.
const FOCUS = /:focus(?![-\w])/g;

export function transform(css) {
  const focus = (css.match(FOCUS) ?? []).length;
  const gridded = css.replace(GRID_TOKEN, '--rux-grid-');
  const references = [...new Set([...gridded.matchAll(HARD_REFERENCE)].map(m => m[1]))];
  const out = gridded.replace(HARD_REFERENCE, 'var(--rux-$1').replace(FOCUS, ':focus-visible');
  return {
    css: out,
    focus,
    references,
    undeclared: references.filter(name => !out.includes(`--rux-${name}:`)),
  };
}

// Anything matching FOCUS after the transform, which a build must not ship.
export const leftoverFocus = css => (css.match(FOCUS) ?? []).length;
