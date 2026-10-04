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

// Carbon's React draws an icon as an <svg> holding its <path>s, and some of
// its rules colour the icon through them: `.x svg path { fill: … }`. An icon
// here is an <svg> holding a <use> of a sprite symbol, whose paths no selector
// outside the symbol can reach, so those rules matched nothing and the icon
// kept the colour of the text around it. A <use> hands its fill down to the
// symbol it draws, so every selector that ends at ALL of an icon's paths gets
// a twin ending at `use`. A selector that picks ONE path of several, by
// position or by attribute, is answered below.
const ALL_PATHS = /(^|[\s>+~])path(?::not\(\[data-icon-path\]\):not\(\[fill=none\]\))?(\s*)$/;

// One selector list, split at the commas that are not inside brackets.
function selectors(list) {
  const parts = [];
  let depth = 0, from = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { parts.push(list.slice(from, i)); from = i + 1; }
  }
  parts.push(list.slice(from));
  return parts;
}

// A selector that picks ONE path sets a custom property on the `use` instead,
// which the symbol's path reads: tools/build-icons.mjs writes that half and
// names the three properties. `:first-of-type` and `:nth-of-type(2)` are the
// path's place; every other form Carbon uses names the path it marks
// `inner-path`, which alone carries a `fill` or an `opacity` attribute.
const ONE_PATH = /(^|[\s>+~])path(:first-of-type|:nth-of-type\(2\)|\[data-icon-path=inner-path\]|\[opacity="0"\]|\[fill\]|\[fill=none\])\s*$/;
const HOOK = {
  ':first-of-type': '--rux-icon-path-1',
  ':nth-of-type(2)': '--rux-icon-path-2',
};
const hookOf = pick => HOOK[pick] ?? '--rux-icon-inner';
// Any other way of ending at a path is one this file has no answer for.
const SOME_PATH = /(^|[\s>+~])path(?![\w-])[^\s>+~]*\s*$/;
const RULE = /([^{}]*)\{([^{}]*)\}/g;

function twinIconPaths(css) {
  let twins = 0, hooks = 0;
  const unread = [];
  const out = css.replace(RULE, (whole, head, body) => {
    if (!head.includes('path')) return whole;
    // A comment may sit before the selectors; only what follows it is a list.
    const at = head.includes('*/') ? head.lastIndexOf('*/') + 2 : 0;
    const list = head.slice(at);
    if (list.trimStart().startsWith('@')) return whole;
    const fill = body.match(/(?:^|;)\s*fill:\s*([^;]+?)\s*(?:;|$)/)?.[1];
    const spread = body.includes('\n');
    const set = {};   // custom property -> the selectors that set it
    const parts = selectors(list).map(part => {
      const one = part.match(ONE_PATH);
      if (one) {
        if (fill) (set[hookOf(one[2])] ??= []).push(part.trim().replace(ONE_PATH, '$1use'));
        return part;
      }
      if (!ALL_PATHS.test(part)) {
        if (SOME_PATH.test(part)) unread.push(part.trim());
        return part;
      }
      twins++;
      // The twin goes on a line of its own at the selector's indent, without
      // the blank line that parts one rule from the last.
      const space = part.match(/^\s*/)[0];
      const lead = space.includes('\n') ? '\n' + space.split('\n').pop() : space;
      return part.replace(/\s*$/, '') + ',' + lead + part.trim().replace(ALL_PATHS, '$1use') + part.match(/\s*$/)[0];
    });
    const indent = spread ? list.match(/^\s*/)[0].split('\n').pop() : '';
    const rules = Object.entries(set).map(([property, sels]) => {
      hooks += sels.length;
      return spread
        ? `\n${indent}${sels.join(`,\n${indent}`)} {\n${indent}  ${property}: ${fill};\n${indent}}`
        : `${sels.join(',')}{${property}:${fill}}`;
    });
    return head.slice(0, at) + parts.join(',') + '{' + body + '}' + rules.join('');
  });
  return { css: out, twins, hooks, unread };
}

export function transform(css) {
  const focus = (css.match(FOCUS) ?? []).length;
  const gridded = css.replace(GRID_TOKEN, '--rux-grid-');
  const references = [...new Set([...gridded.matchAll(HARD_REFERENCE)].map(m => m[1]))];
  const renamed = gridded.replace(HARD_REFERENCE, 'var(--rux-$1').replace(FOCUS, ':focus-visible');
  const { css: out, twins, hooks, unread } = twinIconPaths(renamed);
  return {
    css: out,
    focus,
    twins,
    hooks,
    unread,
    references,
    undeclared: references.filter(name => !out.includes(`--rux-${name}:`)),
  };
}

// Anything matching FOCUS after the transform, which a build must not ship.
export const leftoverFocus = css => (css.match(FOCUS) ?? []).length;
