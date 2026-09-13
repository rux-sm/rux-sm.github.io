//
// ONE DEFINITION OF WHAT css/rux.css DECLARES, imported by the tool that writes
// docs/token-values.json and by the gate that checks it. They must never
// disagree: a baseline written by one parser and checked by another is a gate
// that reports on a file it did not read, which is the drift tools/lib/
// staleness.mjs was extracted to end after portal.html and npm run gates
// contradicted each other in the same working tree.
//
// The reasoning for the snapshot itself -- what it pins, what it cannot see,
// and why the context is part of the key -- is in tools/build-token-values.mjs.
//
import fs from 'node:fs';

export const SRC = 'css/rux.css';

// Strip comments without letting a comment marker inside a string do it, and
// without letting a brace inside a comment move the depth below.
function stripComments(css) {
  let out = '', i = 0, quote = null;
  while (i < css.length) {
    const c = css[i], next = css[i + 1];
    if (quote) {
      if (c === '\\') { out += c + (next ?? ''); i += 2; continue; }
      if (c === quote) quote = null;
      out += c; i++; continue;
    }
    if (c === '"' || c === "'") { quote = c; out += c; i++; continue; }
    if (c === '/' && next === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 2;
      out += ' ';
      continue;
    }
    out += c; i++;
  }
  return out;
}

// Walk the stylesheet, keeping a stack of the preludes we are inside. A
// declaration is recorded against the whole stack joined, so
// "@media (min-width: 42rem) › .rux--grid" and ".rux--grid" are different keys.
//
// DEPTH IS TRACKED FOR ( AND [ AS WELL AS BRACES, and the reason is a real
// value in real Carbon CSS: an UNQUOTED data URL contains a semicolon --
// url(data:image/svg+xml;base64,AAAA). Terminating a declaration on any `;`
// truncated that to `url(data:image/svg+xml`, recorded the fragment as the
// value and dropped the rest, so the snapshot pinned a string the stylesheet
// never declared. Found by fixture in review, 2026-09-02. Quoted strings were
// always safe; unquoted parenthesised ones were not.
function declarations(css, file) {
  const found = [];
  const stack = [];
  let buf = '', i = 0, quote = null, paren = 0;

  // COLLAPSE RUNS OF WHITESPACE, BUT NEVER INSIDE A QUOTED STRING. A bare
  // .replace(/\s+/g, ' ') over the whole value rewrote `"a  b"` to `"a b"`, so
  // the snapshot recorded a string the stylesheet does not declare and a real
  // change from `"a  b"` to `"a b"` would have compared equal -- a gate whose
  // whole job is noticing a moved value, blind to that one. Found by fixture in
  // review, 2026-09-02. Outside quotes the collapsing is wanted: it is what
  // makes a reformatted build produce no diff.
  const normalise = value => {
    let out = '', quote = null, prevSpace = false;
    for (let k = 0; k < value.length; k++) {
      const c = value[k];
      if (quote) {
        out += c;
        if (c === '\\') { out += value[++k] ?? ''; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'") { quote = c; out += c; prevSpace = false; continue; }
      if (/\s/.test(c)) { if (!prevSpace) out += ' '; prevSpace = true; continue; }
      out += c; prevSpace = false;
    }
    return out.trim();
  };

  const flushDecl = text => {
    const t = text.trim();
    if (!t.startsWith('--rux-')) return;
    const colon = t.indexOf(':');
    if (colon === -1) return;
    const name = t.slice(0, colon).trim();
    const value = normalise(t.slice(colon + 1).trim());
    if (!/^--rux-[A-Za-z0-9_-]+$/.test(name)) return;
    found.push({ context: stack.join(' › '), name, value });
  };

  while (i < css.length) {
    const c = css[i];
    if (quote) {
      if (c === '\\') { buf += c + (css[i + 1] ?? ''); i += 2; continue; }
      if (c === quote) quote = null;
      buf += c; i++; continue;
    }
    if (c === '"' || c === "'") { quote = c; buf += c; i++; continue; }

    if (c === '(' || c === '[') { paren++; buf += c; i++; continue; }
    if (c === ')' || c === ']') { if (paren > 0) paren--; buf += c; i++; continue; }

    // Inside a component value nothing terminates: a brace or semicolon there
    // belongs to the value, not to the stylesheet's structure.
    if (paren > 0) { buf += c; i++; continue; }

    if (c === '{') { stack.push(buf.trim().replace(/\s+/g, ' ')); buf = ''; i++; continue; }
    if (c === '}') { flushDecl(buf); stack.pop(); buf = ''; i++; continue; }
    if (c === ';') { flushDecl(buf); buf = ''; i++; continue; }
    buf += c; i++;
  }
  if (stack.length) {
    throw new Error(`unbalanced braces in ${file}: ${stack.length} block(s) left open`);
  }
  if (paren > 0) {
    throw new Error(`unbalanced parentheses in ${file}`);
  }
  return found;
}

// { values, declarations, duplicates } for the stylesheet at SRC.
//
// EVERY REPEAT IS RECORDED, INCLUDING AN IDENTICAL ONE, AND EVERY VALUE IS KEPT.
// The first version reported a repeat only when the value DIFFERED, and stored
// one value per context and name. Both were wrong, and the second one mattered:
// a declaration ADDED as a duplicate of an existing one left the object
// byte-identical, so the gate that claims to catch added declarations would
// have passed it in silence.
//
// A repeated declaration is therefore an ARRAY of every value in source order;
// a declaration made once stays a bare string, because 2,726 of the 2,741 are
// made once and wrapping them all would be noise in a file whose whole purpose
// is being read as a diff. Callers normalise with [].concat(value).
//
// WHY A REPEAT IS NOT A FAILURE. It was proposed as one in review. css/rux.css
// declares 15 tokens twice, all in :root, all with identical values, because
// Carbon emits TWO SEPARATE :root BLOCKS -- one at line 1914 carrying the
// contextual layer tokens, one at line 31372 carrying the white theme -- and
// both set --rux-layer and its family. That is ordinary compiled output, the
// remedy would be editing a Carbon file, and no Carbon file is ever edited
// (AGENTS.md, the one rule). A gate that can only pass once someone breaks the
// project's central rule is a gate that gets switched off. They are recorded
// faithfully and reported instead, which is what closes the hole.
export function extract(file = SRC) {
  const css = stripComments(fs.readFileSync(file, 'utf8'));
  const found = declarations(css, file);

  const order = new Map();
  for (const { context, name, value } of found) {
    const key = `${context}\u0000${name}`;
    if (!order.has(key)) order.set(key, { context, name, values: [] });
    order.get(key).values.push(value);
  }

  const duplicates = [];
  for (const { context, name, values } of order.values()) {
    if (values.length < 2) continue;
    const same = values.every(v => v === values[0]);
    duplicates.push(same
      ? `${context} · ${name} declared ${values.length}×, same value each time: ${values[0]}`
      : `${context} · ${name} declared ${values.length}×: ${values.join(' then ')}`);
  }

  const values = {};
  for (const { context, name, values: vs } of order.values()) {
    values[context] ??= {};
    values[context][name] = vs.length === 1 ? vs[0] : vs;
  }

  // Sorted, so a re-run cannot produce a diff that is only ordering.
  const sorted = {};
  for (const context of Object.keys(values).sort()) {
    sorted[context] = Object.fromEntries(
      Object.keys(values[context]).sort().map(n => [n, values[context][n]]));
  }
  return { values: sorted, declarations: found.length, duplicates };
}
